import { randomUUID } from "node:crypto"

import { after, NextResponse } from "next/server"

import {
  contextAwareFallback,
  normalizeQuestionPayload,
  salvagePartialQuestions,
} from "@/lib/clarifications"
import { MODELS, parseSearchDepth } from "@/lib/constants"
import { coerceNormalizedBrief } from "@/lib/brief-coerce"
import { callOpenRouterWithTimeout } from "@/lib/openrouter-with-timeout"
import { runPipeline } from "@/lib/pipeline/orchestrator"
import { NormalizedBriefSchema, QuestionsPayloadSchema, RerunOverridesSchema } from "@/lib/schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { NormalizedBrief, QuestionsPayload, RerunOverrides } from "@/types"

type StartInput = {
  brief_id?: string
  overrides?: unknown
}

type ClarificationGenerationResult = {
  payload: QuestionsPayload
  method: "llm" | "fallback"
  error?: string
}

export const maxDuration = 3600

function withOverrides(normalized: NormalizedBrief, overrides: RerunOverrides | null): NormalizedBrief {
  if (!overrides) return normalized

  const next = structuredClone(normalized)

  if (Array.isArray(overrides.constraints)) {
    next.constraints = overrides.constraints
  }

  if (typeof overrides.geography_region === "string") {
    next.geography = {
      ...next.geography,
      region: overrides.geography_region,
    }
  }

  if (typeof overrides.search_depth === "string") {
    next.optional = {
      ...next.optional,
      search_depth: overrides.search_depth,
    }
  }

  return NormalizedBriefSchema.parse(next)
}

async function generateClarificationsWithModel(
  normalized: NormalizedBrief,
  prompt: string | null,
): Promise<ClarificationGenerationResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      payload: contextAwareFallback(normalized, 0.84),
      method: "fallback",
      error: "No API key",
    }
  }

  try {
    const response = await callOpenRouterWithTimeout(
      [
        {
          role: "system",
          content: `Generate 1-5 targeted clarification questions for a B2B sourcing brief.
Return ONLY JSON with this schema:
{
  "type": "connexa.clarifications.v1",
  "questions": [
    {
      "id": "string",
      "prompt": "string",
      "type": "multiple_choice" | "text" | "select" | "number",
      "options": ["option A", "option B"],
      "allowOther": boolean,
      "required": boolean,
      "helpText": "optional string",
      "fieldPath": "dot.path.into.normalized_brief",
      "priority": "high" | "medium" | "low",
      "validation": {
        "min": "optional number",
        "max": "optional number",
        "minLength": "optional number",
        "maxLength": "optional number",
        "pattern": "optional regex string"
      }
    }
  ]
}
Rules:
- Max 5 questions.
- Ask only questions that materially change provider selection.
- For "multiple_choice" and "select", include at least 2 options.
- Prefer fieldPath values like constraints, geography.region, timeline.*, optional.*`,
        },
        {
          role: "user",
          content: `Prompt: ${prompt ?? "N/A"}\nBrief: ${JSON.stringify(normalized)}`,
        },
      ],
      {
        model: MODELS.CHEAP,
        response_format: { type: "json_object" },
        timeoutMs: 15_000,
        retries: 1,
      },
    )

    const parsed = JSON.parse(response) as unknown
    const validated = QuestionsPayloadSchema.safeParse(parsed)

    if (!validated.success) {
      console.warn("[clarify]", "LLM response failed validation", validated.error.message)
      const salvaged = salvagePartialQuestions(parsed, normalized, 0.84)
      if (salvaged) {
        return {
          payload: salvaged,
          method: "llm",
          error: "Partial validation failed; salvaged questions.",
        }
      }

      return {
        payload: contextAwareFallback(normalized, 0.84),
        method: "fallback",
        error: "Validation failed",
      }
    }

    return {
      payload: normalizeQuestionPayload(validated.data),
      method: "llm",
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown LLM error"
    console.warn("[clarify]", "LLM call failed", message)
    return {
      payload: contextAwareFallback(normalized, 0.84),
      method: "fallback",
      error: message,
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartInput
    if (!body.brief_id) {
      return NextResponse.json({ error: "brief_id is required." }, { status: 400 })
    }

    const overridesResult = body.overrides ? RerunOverridesSchema.safeParse(body.overrides) : null
    if (overridesResult && !overridesResult.success) {
      return NextResponse.json({ error: "Invalid rerun overrides." }, { status: 400 })
    }
    const overrides = overridesResult?.success ? overridesResult.data : null

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const [{ data: profile }, { data: brief, error: briefError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("search_credits_remaining, search_credits_purchased")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("briefs")
        .select("id, status, raw_prompt, normalized_brief")
        .eq("id", body.brief_id)
        .eq("user_id", user.id)
        .single(),
    ])

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    const creditsRemaining =
      typeof profile?.search_credits_remaining === "number" ? profile.search_credits_remaining : -1
    if (creditsRemaining === 0) {
      return NextResponse.json(
        {
          error: "No search credits remaining. Purchase additional credits to continue.",
          credits_exhausted: true,
        },
        { status: 402 },
      )
    }

    const parsedNormalized = coerceNormalizedBrief(brief.normalized_brief)
    if (!parsedNormalized) {
      return NextResponse.json(
        { error: "Brief cannot be re-run because normalized data is missing or invalid." },
        { status: 400 },
      )
    }

    if (
      brief.status !== "draft" &&
      brief.status !== "complete" &&
      brief.status !== "error" &&
      brief.status !== "cancelled"
    ) {
      return NextResponse.json(
        { error: "Brief must be completed, failed, or cancelled before re-running." },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const normalizedWithOverrides = withOverrides(parsedNormalized, overrides)
    const optional = normalizedWithOverrides.optional as Record<string, unknown>
    const searchDepth = parseSearchDepth(optional.search_depth)

    console.info(
      "[pipeline:start]",
      JSON.stringify({
        event: "pipeline_start",
        brief_id: body.brief_id,
        has_overrides: Boolean(overrides),
        force_clarify: Boolean(overrides?.force_clarify),
        search_depth: searchDepth,
        credits_remaining: creditsRemaining,
      }),
    )

    const { error: briefUpdateError } = await admin
      .from("briefs")
      .update({
        normalized_brief: normalizedWithOverrides,
      })
      .eq("id", body.brief_id)
    if (briefUpdateError) {
      return NextResponse.json({ error: briefUpdateError.message }, { status: 500 })
    }

    if (overrides?.force_clarify) {
      const generated = await generateClarificationsWithModel(normalizedWithOverrides, brief.raw_prompt)

      const { error: questionError } = await admin.from("brief_questions").insert({
        brief_id: body.brief_id,
        questions: generated.payload,
        confidence_before: 0.84,
      })
      if (questionError) {
        return NextResponse.json({ error: questionError.message }, { status: 500 })
      }

      const { error: clarifyStatusError } = await admin
        .from("briefs")
        .update({ status: "clarifying" })
        .eq("id", body.brief_id)
      if (clarifyStatusError) {
        return NextResponse.json({ error: clarifyStatusError.message }, { status: 500 })
      }

      console.info(
        "[clarify]",
        JSON.stringify({
          event: "clarify_complete",
          brief_id: body.brief_id,
          method: generated.method,
          fell_back: generated.method === "fallback",
          error: generated.error ?? null,
          question_count: generated.payload.questions.length,
          used_cache: false,
          confidence: 0.84,
        }),
      )

      return NextResponse.json({
        clarify_required: true,
        brief_id: body.brief_id,
        questions: generated.payload,
      })
    }

    let nextCredits = creditsRemaining
    if (creditsRemaining > 0) {
      const { data: decrementedProfile, error: decrementError } = await admin
        .from("profiles")
        .update({
          search_credits_remaining: creditsRemaining - 1,
          search_credits_purchased: profile?.search_credits_purchased ?? 0,
        })
        .eq("id", user.id)
        .eq("search_credits_remaining", creditsRemaining)
        .select("search_credits_remaining")
        .maybeSingle()

      if (decrementError) {
        return NextResponse.json({ error: decrementError.message }, { status: 500 })
      }

      if (!decrementedProfile) {
        return NextResponse.json(
          { error: "Search credits changed. Please refresh and try again." },
          { status: 409 },
        )
      }

      nextCredits = decrementedProfile.search_credits_remaining ?? creditsRemaining - 1
    }

    const runId = randomUUID()

    const { error: runError } = await admin.from("runs").insert({
      id: runId,
      brief_id: body.brief_id,
      status: "running",
      notes: [],
      started_at: new Date().toISOString(),
    })
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

    const { error: updateError } = await admin
      .from("briefs")
      .update({ status: "running" })
      .eq("id", body.brief_id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    const briefId = body.brief_id
    after(() => runPipeline(briefId, runId, { searchDepth }))

    return NextResponse.json({ run_id: runId, remaining_credits: nextCredits })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start pipeline."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
