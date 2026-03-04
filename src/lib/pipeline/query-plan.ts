import { MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import type { NormalizedBrief } from "@/types"

function getUsState(brief: NormalizedBrief): string | null {
  const value = brief.optional?.us_state
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function fallbackQueries(brief: NormalizedBrief): string[] {
  const industry = brief.industry[0] ?? "B2B"
  const region = brief.geography.region
  const service = brief.service_type
  const usState = getUsState(brief)
  const geoTerm = usState ? `${usState}, ${region}` : region

  return [
    `${service} agency ${geoTerm}`,
    `${service} provider ${industry}`,
    `${service} case study ${industry}`,
    `${service} consulting ${geoTerm}`,
    `${industry} ${service} partner`,
    `${service} portfolio ${geoTerm}`,
  ]
}

function parseQueries(raw: string): string[] {
  const parsed = JSON.parse(raw) as unknown
  if (Array.isArray(parsed)) {
    return parsed.filter((q): q is string => typeof q === "string")
  }
  if (parsed && typeof parsed === "object" && "queries" in parsed) {
    const value = (parsed as { queries?: unknown }).queries
    if (Array.isArray(value)) {
      return value.filter((q): q is string => typeof q === "string")
    }
  }
  return []
}

export async function generateQueryPlan(normalizedBrief: NormalizedBrief): Promise<string[]> {
  const usState = getUsState(normalizedBrief)

  try {
    const response = await callOpenRouter(
      [
        {
          role: "system",
          content: `Generate 5-12 web search queries to find B2B service providers matching this brief.
Rules:
- Include geography modifiers if region is specified
- If optional.us_state exists, include it in at least 3 queries
- Include industry-specific terms
- Vary query angles: direct service search, portfolio/case-study discovery, industry + service combinations
- Avoid adding pricing modifiers unless explicitly requested
- Return JSON: { "queries": ["..."] }`,
        },
        {
          role: "user",
          content: `${JSON.stringify(normalizedBrief)}${usState ? `\nUS state preference: ${usState}` : ""}`,
        },
      ],
      {
        model: MODELS.CHEAP,
        response_format: { type: "json_object" },
      },
    )

    const queries = parseQueries(response)
    if (queries.length > 0) {
      return [...new Set(queries)].slice(0, 12)
    }
  } catch {
    // Fall back to deterministic query generation.
  }

  return fallbackQueries(normalizedBrief)
}
