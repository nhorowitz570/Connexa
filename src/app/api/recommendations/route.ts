import { NextResponse } from "next/server"
import { z } from "zod"

import { MODELS } from "@/lib/constants"
import { callOpenRouterWithTimeout } from "@/lib/openrouter-with-timeout"
import { createClient } from "@/lib/supabase/server"
import { getQuarterContext, getTemporalContext } from "@/lib/temporal-context"

type Recommendation = {
  id: string
  prompt: string
  reason: string
  category: string
  confidence: number
}

type BriefRow = {
  id: string
  name: string | null
  category: string | null
  status: string
  normalized_brief: unknown
  created_at: string
}

type ResultRow = {
  brief_id: string
  score_overall: number
}

const CACHE_MS = 60 * 60 * 1000
const recommendationCache = new Map<string, { expiresAt: number; items: Recommendation[] }>()

const RecommendationPayloadSchema = z.object({
  recommendations: z
    .array(
      z.object({
        prompt: z.string().min(8),
        reason: z.string().min(8),
        category: z.string().min(2),
        confidence: z.number().min(0).max(1),
      }),
    )
    .min(1)
    .max(5),
})

const CATEGORY_ADJACENCY: Record<string, string> = {
  "marketing agency": "Design Studio",
  "development partner": "DevOps Partner",
  "design studio": "Marketing Agency",
  "consulting firm": "Analytics Provider",
  "cloud provider": "Security Vendor",
  "analytics provider": "Consulting Firm",
  "devops partner": "Security Vendor",
  "security vendor": "Cloud Provider",
}

const CORE_CATEGORIES = [
  "Marketing Agency",
  "Development Partner",
  "Design Studio",
  "Consulting Firm",
  "Analytics Provider",
  "DevOps Partner",
  "Security Vendor",
]

function normalizeCategory(value: string | null): string {
  return (value ?? "").trim().toLowerCase()
}

function getPrimaryIndustry(brief: BriefRow): string {
  if (!brief.normalized_brief || typeof brief.normalized_brief !== "object") return "B2B"
  const industry = (brief.normalized_brief as { industry?: unknown }).industry
  if (Array.isArray(industry)) {
    const first = industry.find((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    if (first) return first
  }
  return "B2B"
}

function getPrimaryServiceType(brief: BriefRow): string {
  if (!brief.normalized_brief || typeof brief.normalized_brief !== "object") {
    return brief.category ?? "B2B service provider"
  }
  const serviceType = (brief.normalized_brief as { service_type?: unknown }).service_type
  if (typeof serviceType === "string" && serviceType.trim().length > 0) {
    return serviceType.trim()
  }
  return brief.category ?? "B2B service provider"
}

function quarterPrompt(): { prompt: string; reason: string; category: string } {
  const { quarter, nextQuarter } = getQuarterContext()
  return {
    prompt: `Need a strategic partner for Q${nextQuarter} planning with measurable delivery milestones and B2B case studies.`,
    reason: `Teams often prepare Q${nextQuarter} initiatives during Q${quarter}, so this catches planning windows early.`,
    category: "Strategic Planning",
  }
}

function ruleBasedRecommendations(briefs: BriefRow[], results: ResultRow[]): Recommendation[] {
  if (briefs.length === 0) return []

  const categoryCounts = new Map<string, number>()
  for (const brief of briefs) {
    const normalizedCategory = normalizeCategory(brief.category ?? getPrimaryServiceType(brief))
    if (!normalizedCategory) continue
    categoryCounts.set(normalizedCategory, (categoryCounts.get(normalizedCategory) ?? 0) + 1)
  }

  const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])
  const topCategory = sortedCategories[0]?.[0] ?? "marketing agency"
  const topCategoryTitle =
    briefs.find((brief) => normalizeCategory(brief.category) === topCategory)?.category ?? topCategory

  const seenCategoryTitles = new Set(
    briefs
      .map((brief) => brief.category)
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0),
  )

  const lowScoreBriefIds = new Set(
    results.filter((row) => row.score_overall < 70).map((row) => row.brief_id),
  )
  const lowScoreBrief = briefs.find((brief) => lowScoreBriefIds.has(brief.id))

  const industry = getPrimaryIndustry(briefs[0])
  const adjacentCategory = CATEGORY_ADJACENCY[topCategory] ?? "Consulting Firm"
  const gapCategory = CORE_CATEGORIES.find((category) => !seenCategoryTitles.has(category)) ?? "Design Studio"

  const suggestions: Recommendation[] = [
    {
      id: "rec-refine-top",
      prompt: `Find a ${topCategoryTitle} for ${industry} with proven ROI case studies, transparent pricing, and a defined implementation timeline.`,
      reason: `You frequently search in ${topCategoryTitle}; this narrows the criteria for stronger matches.`,
      category: topCategoryTitle,
      confidence: 0.86,
    },
    {
      id: "rec-adjacent",
      prompt: `Looking for a ${adjacentCategory} that complements current ${topCategoryTitle} initiatives and can collaborate with existing vendors.`,
      reason: `Adjacent category coverage helps fill capability gaps around your most common search area.`,
      category: adjacentCategory,
      confidence: 0.74,
    },
    {
      id: "rec-gap",
      prompt: `Need a ${gapCategory} partner with B2B experience, clear communication cadence, and references from mid-market teams.`,
      reason: `You have limited recent activity in ${gapCategory}, so this broadens your sourcing portfolio.`,
      category: gapCategory,
      confidence: 0.69,
    },
  ]

  if (lowScoreBrief) {
    suggestions.push({
      id: "rec-low-score",
      prompt: `Refine this search: ${getPrimaryServiceType(lowScoreBrief)} specialist for ${getPrimaryIndustry(lowScoreBrief)} with explicit pricing tiers and industry certifications.`,
      reason: `A previous brief had lower scoring matches, so this prompt adds precision that typically improves result quality.`,
      category: lowScoreBrief.category ?? "Refinement",
      confidence: 0.81,
    })
  }

  const seasonal = quarterPrompt()
  suggestions.push({
    id: "rec-seasonal",
    prompt: seasonal.prompt,
    reason: seasonal.reason,
    category: seasonal.category,
    confidence: 0.62,
  })

  return suggestions.slice(0, 5)
}

async function llmRecommendations(input: {
  briefs: BriefRow[]
  results: ResultRow[]
  analyticsRecommendations: unknown
}): Promise<Recommendation[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null

  try {
    const temporalContext = getTemporalContext()
    const { quarter, nextQuarter } = getQuarterContext()
    const briefSummaries = input.briefs.map((brief) => ({
      id: brief.id,
      name: brief.name,
      category: brief.category,
      status: brief.status,
      service_type: getPrimaryServiceType(brief),
      industry: getPrimaryIndustry(brief),
      created_at: brief.created_at,
    }))

    const response = await callOpenRouterWithTimeout(
      [
        {
          role: "system",
          content: `Generate personalized brief prompt recommendations.
${temporalContext}
Current planning cycle context: current quarter is Q${quarter}; next quarter is Q${nextQuarter}.
Return JSON only:
{
  "recommendations": [
    {
      "prompt": "string",
      "reason": "string",
      "category": "string",
      "confidence": number
    }
  ]
}
Rules:
- Return 3-5 recommendations.
- Use the user's brief history only.
- Include at least one refinement recommendation and one adjacent-category recommendation.
- Keep prompts ready to paste into a new brief.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            briefs: briefSummaries,
            result_scores: input.results,
            analytics_recommendations: input.analyticsRecommendations,
          }),
        },
      ],
      {
        model: MODELS.CHEAP,
        response_format: { type: "json_object" },
        timeoutMs: 12_000,
        retries: 1,
      },
    )

    const parsed = RecommendationPayloadSchema.parse(JSON.parse(response))
    return parsed.recommendations.map((item, index) => ({
      id: `rec-llm-${index + 1}`,
      prompt: item.prompt,
      reason: item.reason,
      category: item.category,
      confidence: item.confidence,
    }))
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const now = Date.now()
    const cached = recommendationCache.get(user.id)
    if (cached && cached.expiresAt > now) {
      return NextResponse.json({ data: { recommendations: cached.items } })
    }

    const [{ data: briefsRaw }, { data: analyticsRaw }] = await Promise.all([
      supabase
        .from("briefs")
        .select("id, name, category, status, normalized_brief, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("analytics_recommendations")
        .select("recommendations, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    const briefs = (briefsRaw ?? []) as BriefRow[]
    if (briefs.length === 0) {
      recommendationCache.set(user.id, {
        expiresAt: now + CACHE_MS,
        items: [],
      })
      return NextResponse.json({ data: { recommendations: [] } })
    }

    const briefIds = briefs.map((brief) => brief.id)
    const { data: resultsRaw } = await supabase
      .from("results")
      .select("brief_id, score_overall")
      .in("brief_id", briefIds)

    const results = (resultsRaw ?? []) as ResultRow[]
    const llm = await llmRecommendations({
      briefs,
      results,
      analyticsRecommendations: analyticsRaw?.recommendations ?? null,
    })
    const recommendations = (llm ?? ruleBasedRecommendations(briefs, results)).slice(0, 5)

    recommendationCache.set(user.id, {
      expiresAt: now + CACHE_MS,
      items: recommendations,
    })

    return NextResponse.json({ data: { recommendations } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate recommendations"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
