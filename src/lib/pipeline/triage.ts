import { BLOCKLIST_DOMAINS, PIPELINE_LIMITS } from "@/lib/constants"
import { ShortlistPayloadSchema } from "@/lib/schemas"
import type { SearchResult } from "@/lib/pipeline/exa"
import type { NormalizedBrief, ShortlistPayload } from "@/types"

type TriageOptions = {
  maxCandidates?: number
}

type CandidateBucket = {
  domain: string
  byPathPrefix: Map<string, SearchResult>
  bestScore: number
  relevanceScore: number
}

function normalizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.replace(/^www\./, "")
    const path = url.pathname.replace(/\/+$/, "")
    const filteredParams = new URLSearchParams()
    url.searchParams.forEach((value, key) => {
      if (/^utm_/i.test(key)) return
      if (key.toLowerCase() === "ref" || key.toLowerCase() === "source") return
      filteredParams.append(key, value)
    })
    const query = filteredParams.toString()
    return `${url.protocol}//${host}${path}${query ? `?${query}` : ""}`
  } catch {
    return null
  }
}

function getDomain(rawUrl: string): string | null {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

function getPathPrefix(rawUrl: string): string {
  try {
    const pathname = new URL(rawUrl).pathname
    const segments = pathname.split("/").filter(Boolean).slice(0, 2)
    return segments.join("/") || "__root__"
  } catch {
    return "__root__"
  }
}

function isBlockedDomain(domain: string): boolean {
  return BLOCKLIST_DOMAINS.some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  )
}

function scorePathPreference(url: string): number {
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase()
    } catch {
      return ""
    }
  })()

  const keywords = ["/services", "/service", "/case", "/portfolio", "/about", "/industries"]
  return keywords.some((keyword) => path.includes(keyword)) ? 1 : 0
}

function buildKeywordSet(brief: NormalizedBrief): Set<string> {
  const terms = [
    brief.service_type,
    brief.geography.region,
    ...brief.industry,
    ...brief.constraints,
  ]
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2)

  return new Set(terms)
}

function keywordOverlapScore(result: SearchResult, keywords: Set<string>): number {
  if (keywords.size === 0) return 0
  const haystack = `${result.title} ${result.content}`.toLowerCase()
  let matches = 0
  for (const keyword of keywords) {
    if (haystack.includes(keyword)) matches += 1
  }
  return matches / keywords.size
}

function summarizeReason(domain: string, brief: NormalizedBrief): string {
  return `${domain} ranked highly for ${brief.service_type} and ${brief.industry.join(", ")} relevance`
}

export async function triageCandidates(
  rawResults: SearchResult[],
  brief: NormalizedBrief,
  options: TriageOptions = {},
): Promise<ShortlistPayload> {
  const maxCandidates = options.maxCandidates ?? PIPELINE_LIMITS.MAX_SHORTLIST_CANDIDATES
  const uniqueByUrl = new Map<string, SearchResult>()
  const keywords = buildKeywordSet(brief)

  for (const result of rawResults) {
    const normalized = normalizeUrl(result.url)
    if (!normalized) continue
    const existing = uniqueByUrl.get(normalized)
    if (!existing || existing.score < result.score) {
      uniqueByUrl.set(normalized, { ...result, url: normalized })
    }
  }

  const byDomain = new Map<string, CandidateBucket>()
  for (const result of uniqueByUrl.values()) {
    const domain = getDomain(result.url)
    if (!domain || isBlockedDomain(domain)) continue

    const prefix = getPathPrefix(result.url)
    const bucket = byDomain.get(domain) ?? {
      domain,
      byPathPrefix: new Map<string, SearchResult>(),
      bestScore: 0,
      relevanceScore: 0,
    }
    const current = bucket.byPathPrefix.get(prefix)
    const overlap = keywordOverlapScore(result, keywords)
    if (!current || current.score < result.score + overlap * 0.15) {
      bucket.byPathPrefix.set(prefix, result)
    }
    bucket.bestScore = Math.max(bucket.bestScore, result.score)
    bucket.relevanceScore = Math.max(bucket.relevanceScore, overlap)
    byDomain.set(domain, bucket)
  }

  const sorted = [...byDomain.values()]
    .sort((a, b) => {
      const scoreA = a.bestScore * 0.75 + a.relevanceScore * 0.25
      const scoreB = b.bestScore * 0.75 + b.relevanceScore * 0.25
      return scoreB - scoreA
    })
    .slice(0, maxCandidates)

  const shortlist: ShortlistPayload = {
    type: "connexa.shortlist.v1",
    candidates: sorted.map((bucket) => {
      const topUrls = [...bucket.byPathPrefix.values()]
        .sort((a, b) => {
          const pathScore = scorePathPreference(b.url) - scorePathPreference(a.url)
          if (pathScore !== 0) return pathScore
          return b.score - a.score
        })
        .slice(0, 3)
        .map((item) => item.url)

      return {
        domain: bucket.domain,
        urls: topUrls.length > 0 ? topUrls : [],
        reason: summarizeReason(bucket.domain, brief),
        expected_signals: [brief.service_type, ...brief.industry].slice(0, 4),
      }
    }),
  }

  const normalizedShortlist = {
    ...shortlist,
    candidates: shortlist.candidates.filter((candidate) => candidate.urls.length > 0),
  }

  return ShortlistPayloadSchema.parse(normalizedShortlist)
}
