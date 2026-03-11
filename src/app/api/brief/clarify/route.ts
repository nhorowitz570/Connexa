import { NextResponse } from "next/server"

import { MODELS } from "@/lib/constants"
import {
  contextAwareFallback,
  normalizeQuestionPayload,
  salvagePartialQuestions,
} from "@/lib/clarifications"
import { callOpenRouterWithTimeout } from "@/lib/openrouter-with-timeout"
import { NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/server"
import { getTemporalContext } from "@/lib/temporal-context"
import type { NormalizedBrief, QuestionsPayload } from "@/types"

type ClarifyInput = {
  normalized_brief?: unknown
  confidence?: number
  brief_id?: string
}

type ClarificationGenerationResult = {
  payload: QuestionsPayload
  method: "llm" | "fallback"
  error?: string
}

async function generateClarificationsWithModel(
  normalized: NormalizedBrief,
  confidence: number,
): Promise<ClarificationGenerationResult> {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      payload: contextAwareFallback(normalized, confidence),
      method: "fallback",
      error: "No API key",
    }
  }

  try {
    const temporalContext = getTemporalContext()
    const response = await callOpenRouterWithTimeout(
      [
        {
          role: "system",
          content: `You generate dynamic clarification questions for B2B sourcing briefs.
${temporalContext}
Return ONLY valid JSON matching:
{
  "type": "connexa.clarifications.v1",
  "questions": [
    {
      "id": "string",
      "prompt": "string",
      "type": "multiple_choice" | "text" | "select" | "number",
      "options": ["string"], 
      "allowOther": boolean,
      "required": boolean,
      "helpText": "optional string",
      "fieldPath": "dot.path",
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
- Generate 1-5 questions only.
- Only ask questions that materially change provider search/ranking outcomes.
- Do not ask for data already clearly specified in the brief.
- Use "high" priority for blockers, "medium" for meaningful refinements, "low" for nice-to-have.
- For "multiple_choice" and "select", include at least 2 options.
- Use fieldPath values that map into normalized brief structure (timeline.*, geography.*, constraints, optional.*).
- Do not ask timeline or deadline questions that are already in the past.
- Interpret relative time phrasing against today's date.`,
        },
        {
          role: "user",
          content: `Confidence score: ${confidence}\nNormalized brief:\n${JSON.stringify(normalized)}`,
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
      const salvaged = salvagePartialQuestions(parsed, normalized, confidence)
      if (salvaged) {
        return {
          payload: salvaged,
          method: "llm",
          error: "Partial validation failed; salvaged questions.",
        }
      }

      return {
        payload: contextAwareFallback(normalized, confidence),
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
      payload: contextAwareFallback(normalized, confidence),
      method: "fallback",
      error: message,
    }
  }
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body = (await request.json()) as ClarifyInput
    if (!body.brief_id || !body.normalized_brief || typeof body.confidence !== "number") {
      return NextResponse.json(
        { error: "brief_id, normalized_brief and confidence are required." },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const normalized = NormalizedBriefSchema.parse(body.normalized_brief)

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id, updated_at")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    const { data: cachedRow } = await supabase
      .from("brief_questions")
      .select("questions, created_at")
      .eq("brief_id", body.brief_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const briefUpdatedAt = new Date(brief.updated_at).getTime()
    const cachedCreatedAt =
      cachedRow?.created_at && typeof cachedRow.created_at === "string"
        ? new Date(cachedRow.created_at).getTime()
        : 0

    if (cachedRow && cachedCreatedAt >= briefUpdatedAt) {
      const cachedPayload = QuestionsPayloadSchema.safeParse(cachedRow.questions)
      if (cachedPayload.success) {
        await supabase.from("briefs").update({ status: "clarifying" }).eq("id", body.brief_id)
        const payload = normalizeQuestionPayload(cachedPayload.data)

        console.info(
          "[clarify]",
          JSON.stringify({
            event: "clarify_complete",
            duration_ms: Date.now() - startTime,
            method: "cache",
            fell_back: false,
            error: null,
            question_count: payload.questions.length,
            used_cache: true,
            brief_id: body.brief_id,
            confidence: body.confidence,
          }),
        )

        return NextResponse.json(payload)
      }
    }

    const generated = await generateClarificationsWithModel(normalized, body.confidence)
    const payload = generated.payload

    const { error: insertError } = await supabase.from("brief_questions").insert({
      brief_id: body.brief_id,
      questions: payload,
      confidence_before: body.confidence,
    })
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("briefs")
      .update({ status: "clarifying" })
      .eq("id", body.brief_id)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    console.info(
      "[clarify]",
      JSON.stringify({
        event: "clarify_complete",
        duration_ms: Date.now() - startTime,
        method: generated.method,
        fell_back: generated.method === "fallback",
        error: generated.error ?? null,
        question_count: payload.questions.length,
        used_cache: false,
        brief_id: body.brief_id,
        confidence: body.confidence,
      }),
    )

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create clarifications."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
