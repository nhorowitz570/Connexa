import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { MODELS, parseSearchDepth } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { runPipeline } from "@/lib/pipeline/orchestrator"
import { NormalizedBriefSchema, QuestionsPayloadSchema, RerunOverridesSchema } from "@/lib/schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { NormalizedBrief, QuestionsPayload, RerunOverrides } from "@/types"

type StartInput = {
  brief_id?: string
  overrides?: unknown
}

export const maxDuration = 300

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) return null

  const suffixMatch = cleaned.match(/^([0-9,.]+)\s*([km])$/)
  if (suffixMatch) {
    const base = Number(suffixMatch[1].replaceAll(",", ""))
    if (!Number.isFinite(base)) return null
    const multiplier = suffixMatch[2] === "m" ? 1_000_000 : 1_000
    return base * multiplier
  }

  const numeric = Number(cleaned.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
}

function parseBudgetRange(value: unknown): { min: number; max: number; currency: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as { min?: unknown; max?: unknown; currency?: unknown }
    const min = parseNumberLike(maybe.min) ?? 10000
    const max = parseNumberLike(maybe.max) ?? Math.max(min, 100000)
    const currency =
      typeof maybe.currency === "string" && maybe.currency.trim().length > 0
        ? maybe.currency.trim().toUpperCase()
        : "USD"
    return { min: Math.max(0, min), max: Math.max(min, max), currency }
  }

  if (typeof value === "string") {
    const matches = value.match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*[km]?)/gi) ?? []
    const parsed = matches
      .map((entry) => parseNumberLike(entry))
      .filter((entry): entry is number => entry !== null)
    if (parsed.length >= 2) {
      const min = Math.min(parsed[0], parsed[1])
      const max = Math.max(parsed[0], parsed[1])
      return { min, max, currency: /eur/i.test(value) ? "EUR" : "USD" }
    }
    if (parsed.length === 1) {
      return { min: parsed[0], max: parsed[0] * 5, currency: /eur/i.test(value) ? "EUR" : "USD" }
    }
  }

  return { min: 10000, max: 100000, currency: "USD" }
}

function parseTimeline(value: unknown): {
  type: "deadline" | "duration"
  start_date?: string
  deadline?: string
  duration?: string
} {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as {
      type?: unknown
      start_date?: unknown
      deadline?: unknown
      duration?: unknown
    }
    const type = maybe.type === "deadline" ? "deadline" : "duration"
    return {
      type,
      start_date: typeof maybe.start_date === "string" ? maybe.start_date : undefined,
      deadline: typeof maybe.deadline === "string" ? maybe.deadline : undefined,
      duration: typeof maybe.duration === "string" ? maybe.duration : undefined,
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return { type: "duration", duration: value.trim() }
  }

  return { type: "duration", duration: "3 months" }
}

function parseGeography(value: unknown): { region: string; remote_ok: boolean } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as { region?: unknown; remote_ok?: unknown }
    return {
      region:
        typeof maybe.region === "string" && maybe.region.trim().length > 0
          ? maybe.region.trim()
          : "Global",
      remote_ok: typeof maybe.remote_ok === "boolean" ? maybe.remote_ok : true,
    }
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return { region: value.trim(), remote_ok: true }
  }
  return { region: "Global", remote_ok: true }
}

function parseObjectLike(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

function coerceNormalizedBrief(raw: unknown): NormalizedBrief | null {
  const direct = NormalizedBriefSchema.safeParse(raw)
  if (direct.success) return direct.data

  const objectLike = parseObjectLike(raw)
  if (!objectLike) return null

  const fallback = {
    service_type:
      typeof objectLike.service_type === "string" && objectLike.service_type.trim().length > 0
        ? objectLike.service_type.trim()
        : "b2b service provider",
    budget_range: parseBudgetRange(objectLike.budget_range),
    timeline: parseTimeline(objectLike.timeline),
    industry: parseStringList(objectLike.industry).slice(0, 8),
    geography: parseGeography(objectLike.geography),
    constraints: parseStringList(objectLike.constraints).slice(0, 20),
    optional:
      objectLike.optional && typeof objectLike.optional === "object" && !Array.isArray(objectLike.optional)
        ? objectLike.optional
        : {},
  }

  if (fallback.industry.length === 0) {
    fallback.industry = ["general b2b"]
  }

  const reparsed = NormalizedBriefSchema.safeParse(fallback)
  return reparsed.success ? reparsed.data : null
}

function fallbackClarifications(brief: NormalizedBrief): QuestionsPayload {
  return {
    type: "connexa.clarifications.v1",
    questions: [
      {
        id: "priority_focus",
        prompt: "What is the most important selection criterion?",
        type: "multiple_choice",
        options: ["Specialized expertise", "Lower cost", "Faster timeline", "Industry experience"],
        allowOther: false,
        required: true,
        fieldPath: "optional.priority_focus",
        priority: "high",
      },
      {
        id: "additional_context",
        prompt: "Any additional context we should factor in?",
        type: "text",
        allowOther: false,
        required: false,
        fieldPath: "optional.additional_context",
        priority: "medium",
        validation: {
          maxLength: 500,
        },
      },
      {
        id: "geo_preference",
        prompt: "Preferred provider geography",
        type: "select",
        options: [brief.geography.region, "United States", "North America", "Europe", "Global"],
        allowOther: false,
        required: false,
        fieldPath: "geography.region",
        priority: "medium",
      },
    ],
  }
}

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

async function generateClarifications(
  normalized: NormalizedBrief,
  prompt: string | null,
): Promise<QuestionsPayload> {
  if (!process.env.OPENROUTER_API_KEY) {
    return fallbackClarifications(normalized)
  }

  try {
    const response = await callOpenRouter(
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
        model: MODELS.WEAK,
        response_format: { type: "json_object" },
      },
    )

    return QuestionsPayloadSchema.parse(JSON.parse(response))
  } catch {
    return fallbackClarifications(normalized)
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartInput
    if (!body.brief_id) {
      return NextResponse.json({ error: "brief_id is required." }, { status: 400 })
    }
    const overridesResult = body.overrides
      ? RerunOverridesSchema.safeParse(body.overrides)
      : null
    if (overridesResult && !overridesResult.success) {
      return NextResponse.json({ error: "Invalid rerun overrides." }, { status: 400 })
    }
    const overrides = overridesResult?.success ? overridesResult.data : null

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id, mode, raw_prompt, normalized_brief")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    const parsedNormalized = coerceNormalizedBrief(brief.normalized_brief)
    if (!parsedNormalized) {
      return NextResponse.json(
        { error: "Brief cannot be re-run because normalized data is missing or invalid." },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const normalizedWithOverrides = withOverrides(parsedNormalized, overrides)
    const modeWithOverride = overrides?.mode ?? brief.mode
    const optional = normalizedWithOverrides.optional as Record<string, unknown>
    const searchDepth = parseSearchDepth(optional.search_depth)

    const { error: briefUpdateError } = await admin
      .from("briefs")
      .update({
        mode: modeWithOverride,
        normalized_brief: normalizedWithOverrides,
      })
      .eq("id", body.brief_id)
    if (briefUpdateError) {
      return NextResponse.json({ error: briefUpdateError.message }, { status: 500 })
    }

    if (overrides?.force_clarify) {
      const payload = await generateClarifications(normalizedWithOverrides, brief.raw_prompt)

      const { error: questionError } = await admin.from("brief_questions").insert({
        brief_id: body.brief_id,
        questions: payload,
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

      return NextResponse.json({
        clarify_required: true,
        brief_id: body.brief_id,
        questions: payload,
      })
    }

    const runId = randomUUID()

    const { error: runError } = await admin.from("runs").insert({
      id: runId,
      brief_id: body.brief_id,
      status: "running",
      notes: [],
    })
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

    const { error: updateError } = await admin
      .from("briefs")
      .update({ status: "running" })
      .eq("id", body.brief_id)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    void runPipeline(body.brief_id, runId, { searchDepth })

    return NextResponse.json({ run_id: runId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start pipeline."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
