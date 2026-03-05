import { NextResponse } from "next/server"

import { DEFAULT_BRIEF_WEIGHTS, MODELS } from "@/lib/constants"
import { callOpenRouterWithTimeout } from "@/lib/openrouter-with-timeout"
import { NormalizeResponseSchema, NormalizedBriefSchema } from "@/lib/schemas"
import type { BriefWeights, NormalizedBrief } from "@/types"

type NormalizeInput = {
  prompt?: string
  structured_input?: unknown
}

function heuristicNormalize(prompt: string): NormalizedBrief {
  const lower = prompt.toLowerCase()
  const hasBudget = /\$?\d{2,}/.test(prompt)
  const currency = lower.includes("eur") ? "EUR" : "USD"

  return {
    service_type: lower.includes("marketing")
      ? "marketing agency"
      : lower.includes("development")
        ? "software development"
        : "b2b service provider",
    budget_range: {
      min: hasBudget ? 5000 : 10000,
      max: hasBudget ? 50000 : 100000,
      currency,
    },
    timeline: {
      type: lower.includes("month") || lower.includes("week") ? "duration" : "deadline",
      duration: lower.includes("month") ? "3 months" : undefined,
      deadline: lower.includes("q") ? "end of quarter" : undefined,
    },
    industry: lower.includes("health") ? ["healthcare"] : ["general b2b"],
    geography: {
      region: lower.includes("europe") ? "Europe" : lower.includes("us") ? "United States" : "Global",
      remote_ok: !lower.includes("on-site"),
    },
    constraints: [],
    optional: {},
  }
}

function weightsFromPrompt(prompt: string): BriefWeights {
  const weights = { ...DEFAULT_BRIEF_WEIGHTS }
  const lower = prompt.toLowerCase()

  if (lower.includes("budget")) {
    weights.budget_fit += 0.05
    weights.service_match -= 0.05
  }
  if (lower.includes("timeline") || lower.includes("urgent")) {
    weights.timeline_fit += 0.05
    weights.service_match -= 0.05
  }
  if (lower.includes("industry")) {
    weights.industry_fit += 0.05
    weights.constraint_fit -= 0.05
  }

  const total = Object.values(weights).reduce((sum, value) => sum + value, 0)
  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total]),
  ) as BriefWeights
}

function estimateConfidence(prompt: string, normalized: NormalizedBrief): number {
  let score = 0.35
  const optional = normalized.optional ?? {}
  const rawCompanyContext = [
    optional.company_name,
    optional.project_description,
    optional.company_context,
    optional.business_context,
  ]
  const hasCompanyContext = rawCompanyContext.some(
    (value) => typeof value === "string" && value.trim().length > 2,
  )
  const minBudget = normalized.budget_range.min
  const maxBudget = normalized.budget_range.max
  const budgetSpread = minBudget > 0 ? maxBudget / minBudget : Number.POSITIVE_INFINITY

  if (prompt.length > 120) score += 0.1
  if (normalized.industry.length > 0) score += 0.1
  if (normalized.service_type.length > 3) score += 0.1
  if (normalized.budget_range.max > normalized.budget_range.min) score += 0.1
  if (normalized.geography.region !== "Global") score += 0.1
  if (normalized.constraints.length === 0) score -= 0.05
  if (!hasCompanyContext) score -= 0.05
  if (budgetSpread > 5) score -= 0.05

  return Math.max(0.2, Math.min(0.95, score))
}

function mergeStructuredInput(
  llmNormalized: NormalizedBrief,
  structuredInput: NormalizedBrief | null,
): NormalizedBrief {
  if (!structuredInput) return llmNormalized

  return NormalizedBriefSchema.parse({
    ...llmNormalized,
    service_type: structuredInput.service_type || llmNormalized.service_type,
    budget_range: structuredInput.budget_range,
    timeline: structuredInput.timeline,
    industry: structuredInput.industry,
    geography: structuredInput.geography,
    constraints: structuredInput.constraints,
    optional: {
      ...(llmNormalized.optional ?? {}),
      ...(structuredInput.optional ?? {}),
    },
  })
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    let fellBackToHeuristic = false
    let method: "llm" | "heuristic" = "heuristic"
    let llmError: string | null = null
    const body = (await request.json()) as NormalizeInput
    if (!body.prompt || body.prompt.trim().length < 10) {
      return NextResponse.json(
        { error: "Prompt must be at least 10 characters long." },
        { status: 400 },
      )
    }

    const prompt = body.prompt.trim()
    const structuredInput = body.structured_input
      ? NormalizedBriefSchema.safeParse(body.structured_input)
      : null

    let normalized = heuristicNormalize(prompt)

    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await callOpenRouterWithTimeout(
          [
            {
              role: "system",
              content: `Normalize this B2B sourcing request.
Return JSON exactly matching:
{
  "service_type": string,
  "budget_range": {"min": number, "max": number, "currency": string},
  "timeline": {"type": "deadline" | "duration", "start_date"?: string, "deadline"?: string, "duration"?: string},
  "industry": string[],
  "geography": {"region": string, "remote_ok": boolean},
  "constraints": string[],
  "optional": {}
}`,
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          {
            model: MODELS.CHEAP,
            response_format: { type: "json_object" },
            timeoutMs: 20_000,
            retries: 1,
          },
        )

        normalized = NormalizedBriefSchema.parse(JSON.parse(response))
        method = "llm"
      } catch (error) {
        fellBackToHeuristic = true
        llmError = error instanceof Error ? error.message : "Unknown LLM error"
      }
    } else {
      llmError = "No API key"
    }

    normalized = mergeStructuredInput(
      normalized,
      structuredInput?.success ? structuredInput.data : null,
    )

    const weights = weightsFromPrompt(prompt)
    const confidence = Math.min(
      0.98,
      estimateConfidence(prompt, normalized) + (structuredInput?.success ? 0.05 : 0),
    )
    const payload = NormalizeResponseSchema.parse({
      normalized_brief: normalized,
      weights,
      confidence,
      _meta: {
        method,
        llm_error: llmError,
        fell_back_to_heuristic: fellBackToHeuristic,
      },
    })

    console.info(
      "[normalize]",
      JSON.stringify({
        event: "normalize_complete",
        duration_ms: Date.now() - startTime,
        method,
        fell_back_to_heuristic: fellBackToHeuristic,
        llm_error: llmError,
        confidence,
        prompt_length: prompt.length,
        has_structured_input: structuredInput?.success ?? false,
      }),
    )

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to normalize brief."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
