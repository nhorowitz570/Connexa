import { MODELS, type SearchDepth } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import type { NormalizedBrief } from "@/types"

type GenerateQueryPlanOptions = {
  maxQueries?: number
  searchDepth?: SearchDepth
}

function getUsState(brief: NormalizedBrief): string | null {
  const value = brief.optional?.us_state
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue
    seen.add(trimmed.toLowerCase())
    output.push(trimmed)
  }
  return output
}

function fallbackQueries(brief: NormalizedBrief, maxQueries: number, searchDepth: SearchDepth): string[] {
  const industry = brief.industry[0] ?? "B2B"
  const region = brief.geography.region
  const service = brief.service_type
  const usState = getUsState(brief)
  const geoTerm = usState ? `${usState}, ${region}` : region
  const base = [
    `${service} agency ${geoTerm}`,
    `${service} provider ${industry}`,
    `${service} case study ${industry}`,
    `${service} consulting ${geoTerm}`,
    `${industry} ${service} partner`,
    `${service} portfolio ${geoTerm}`,
  ]

  if (searchDepth === "standard") {
    return unique(base).slice(0, maxQueries)
  }

  const variants = [
    `${service} company ${industry} ${geoTerm}`,
    `${service} specialist ${industry}`,
    `${industry} ${service} expert`,
    `${service} team with ${industry} experience`,
    `${service} agency serving ${industry}`,
    `${service} implementation partner ${geoTerm}`,
    `${service} top firms ${geoTerm}`,
    `${service} best practices ${industry}`,
    `${service} success stories ${industry}`,
    `${service} vendor shortlist ${industry}`,
    `${service} firms with transparent pricing`,
    `${service} provider enterprise ${industry}`,
    `${service} remote partner ${industry}`,
    `${service} nearshore ${industry}`,
    `${service} boutique agency ${industry}`,
    `${service} large scale provider ${industry}`,
    `${service} regulated industry ${industry}`,
    `${service} B2B services ${geoTerm}`,
    `${service} strategic partner ${industry}`,
    `${service} growth agency ${industry}`,
  ]

  return unique([...base, ...variants]).slice(0, maxQueries)
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

export async function generateQueryPlan(
  normalizedBrief: NormalizedBrief,
  options: GenerateQueryPlanOptions = {},
): Promise<string[]> {
  const searchDepth = options.searchDepth ?? "standard"
  const maxQueries = Math.max(1, options.maxQueries ?? 12)
  const usState = getUsState(normalizedBrief)

  try {
    const response = await callOpenRouter(
      [
        {
          role: "system",
          content:
            searchDepth === "deep"
              ? `Generate 30-40 diverse search queries for Exa to find B2B service providers.
Rules:
- Exa works best with natural-language semantic queries.
- Cover many angles: direct services, portfolios, case studies, industries, synonyms, buyer intent.
- Include geography modifiers where relevant.
- If optional.us_state exists, include it in at least 6 queries.
- Include vertical-specific variants and alternate terminology.
- Return JSON: { "queries": ["..."] }`
              : `Generate 5-12 search queries for Exa (a neural/semantic search engine) to find B2B service providers matching this brief.
Rules:
- Exa works best with natural-language, descriptive queries (not keyword-stuffed)
- Use singular nouns for roles: "software engineer" not "software engineers"
- Describe what providers do: "agency specializing in healthcare marketing"
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

    const queries = unique(parseQueries(response))
    if (queries.length > 0) {
      return queries.slice(0, maxQueries)
    }
  } catch {
    // Fall back to deterministic query generation.
  }

  return fallbackQueries(normalizedBrief, maxQueries, searchDepth)
}
