import { ScoredResultSchema } from "@/lib/schemas"
import type {
  BriefMode,
  BriefWeights,
  Candidate,
  NormalizedBrief,
  ScoredResult,
  ScoreBreakdown,
} from "@/types"

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function overlapScore(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0
  const setB = new Set(b.map(normalize))
  const hits = a.map(normalize).filter((item) => setB.has(item)).length
  return hits / a.length
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function scoreServiceMatch(candidate: Candidate, brief: NormalizedBrief): number {
  const service = normalize(brief.service_type)
  const services = candidate.services.map(normalize)
  if (services.length === 0) return 30
  if (services.some((entry) => entry.includes(service) || service.includes(entry))) return 95
  if (services.some((entry) => entry.includes(service.split(" ")[0] ?? ""))) return 70
  return 35
}

function scoreBudgetFit(candidate: Candidate): number {
  if (!candidate.pricing_signals) return 50
  return 70
}

function scoreIndustryFit(candidate: Candidate, brief: NormalizedBrief): number {
  if (candidate.industries.length === 0) return 40
  const overlap = overlapScore(brief.industry, candidate.industries)
  return clampScore(overlap * 100)
}

function scoreTimelineFit(): number {
  return 50
}

function scoreGeoFit(candidate: Candidate, brief: NormalizedBrief): number {
  const usStateRaw = brief.optional?.us_state
  const usState =
    typeof usStateRaw === "string" && usStateRaw.trim().length > 0
      ? normalize(usStateRaw)
      : null

  if (!candidate.geography) {
    if (usState) return brief.geography.remote_ok ? 58 : 38
    return brief.geography.remote_ok ? 65 : 45
  }

  const geography = normalize(candidate.geography)
  const region = normalize(brief.geography.region)
  if (usState && geography.includes(usState)) return 98
  if (usState && geography.includes(region)) return 78
  if (geography.includes(region)) return 95
  if (brief.geography.remote_ok) return 75
  return 40
}

function scoreConstraintFit(candidate: Candidate, brief: NormalizedBrief): number {
  if (brief.constraints.length === 0) return 50
  if (candidate.services.length === 0 && candidate.industries.length === 0) return 40
  const searchable = [...candidate.services, ...candidate.industries].map(normalize).join(" ")
  const matches = brief.constraints.filter((constraint) =>
    searchable.includes(normalize(constraint)),
  )
  return clampScore((matches.length / brief.constraints.length) * 100)
}

function computeBreakdown(candidate: Candidate, brief: NormalizedBrief): ScoreBreakdown {
  return {
    service_match: scoreServiceMatch(candidate, brief),
    budget_fit: scoreBudgetFit(candidate),
    industry_fit: scoreIndustryFit(candidate, brief),
    timeline_fit: scoreTimelineFit(),
    geo_fit: scoreGeoFit(candidate, brief),
    constraint_fit: scoreConstraintFit(candidate, brief),
  }
}

function weightedScore(breakdown: ScoreBreakdown, weights: BriefWeights): number {
  return clampScore(
    breakdown.service_match * weights.service_match +
      breakdown.budget_fit * weights.budget_fit +
      breakdown.industry_fit * weights.industry_fit +
      breakdown.timeline_fit * weights.timeline_fit +
      breakdown.geo_fit * weights.geo_fit +
      breakdown.constraint_fit * weights.constraint_fit,
  )
}

function reasoningSummary(candidate: Candidate, breakdown: ScoreBreakdown): string {
  const top = [
    ["service fit", breakdown.service_match],
    ["industry fit", breakdown.industry_fit],
    ["geo fit", breakdown.geo_fit],
  ] as Array<[string, number]>
  
  const summary = top
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([label, score]) => `${label} (${score})`)
    .join(", ")

  return `${candidate.company_name} ranked by strongest signals in ${summary}.`
}

function scoreConfidence(candidate: Candidate): number {
  let confidence = candidate.extraction_confidence
  if (candidate.services.length > 0) confidence += 0.05
  if (candidate.pricing_signals) confidence += 0.05
  if ((candidate.portfolio_signals ?? []).length > 0) confidence += 0.05
  if (candidate.geography) confidence += 0.03
  if (candidate.contact?.email || candidate.contact?.contact_url) confidence += 0.02
  return Math.max(0.2, Math.min(1, confidence))
}

export async function scoreCandidates(
  candidates: Candidate[],
  brief: NormalizedBrief,
  weights: BriefWeights,
  mode: BriefMode,
): Promise<ScoredResult[]> {
  const scored = candidates.map((candidate) => {
    const breakdown = computeBreakdown(candidate, brief)
    const score = weightedScore(breakdown, weights)
    const confidence = scoreConfidence(candidate)

    const row: ScoredResult = {
      company_name: candidate.company_name,
      website_url: candidate.website_url,
      contact_url: candidate.contact?.contact_url ?? null,
      contact_email: candidate.contact?.email ?? null,
      geography: candidate.geography ?? null,
      services: candidate.services,
      industries: candidate.industries,
      pricing_signals: candidate.pricing_signals,
      portfolio_signals: candidate.portfolio_signals ?? null,
      evidence_links: candidate.evidence_links,
      score_overall: score,
      score_breakdown: breakdown,
      reasoning_summary: reasoningSummary(candidate, breakdown),
      reasoning_detailed:
        mode === "detailed"
          ? {
              service_match: "Evaluated against stated service offerings.",
              budget_fit: "Estimated from available pricing signal evidence.",
              industry_fit: "Compared listed industries to brief target industries.",
              timeline_fit: "Defaulted to neutral due limited public delivery timing data.",
              geo_fit: "Compared published geography to requested operating region.",
              constraint_fit: "Measured direct mention match for constraints.",
            }
          : null,
      confidence,
    }

    return ScoredResultSchema.parse(row)
  })

  return scored
}
