import { BLOCKLIST_DOMAINS, PIPELINE_LIMITS } from "@/lib/constants"
import { ShortlistPayloadSchema } from "@/lib/schemas"
import type { TavilyResult } from "@/lib/pipeline/tavily"
import type { NormalizedBrief, ShortlistPayload } from "@/types"

type CandidateBucket = {
  domain: string
  urls: TavilyResult[]
  bestScore: number
}

function normalizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl)
    const host = url.hostname.replace(/^www\./, "")
    const path = url.pathname.replace(/\/+$/, "")
    return `${url.protocol}//${host}${path}`
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

function summarizeReason(domain: string, brief: NormalizedBrief): string {
  return `${domain} ranked highly for ${brief.service_type} and ${brief.industry.join(", ")} relevance`
}

export async function triageCandidates(
  rawResults: TavilyResult[],
  brief: NormalizedBrief,
): Promise<ShortlistPayload> {
  const uniqueByUrl = new Map<string, TavilyResult>()
  for (const result of rawResults) {
    const normalized = normalizeUrl(result.url)
    if (!normalized) continue
    const existing = uniqueByUrl.get(normalized)
    if (!existing || existing.score < result.score) {
      uniqueByUrl.set(normalized, result)
    }
  }

  const byDomain = new Map<string, CandidateBucket>()
  for (const result of uniqueByUrl.values()) {
    const domain = getDomain(result.url)
    if (!domain || isBlockedDomain(domain)) continue

    const bucket = byDomain.get(domain)
    if (!bucket) {
      byDomain.set(domain, { domain, urls: [result], bestScore: result.score })
      continue
    }

    bucket.urls.push(result)
    bucket.bestScore = Math.max(bucket.bestScore, result.score)
  }

  const sorted = [...byDomain.values()]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, PIPELINE_LIMITS.MAX_SHORTLIST_CANDIDATES)

  const shortlist: ShortlistPayload = {
    type: "connexa.shortlist.v1",
    candidates: sorted.map((bucket) => {
      const topUrls = [...bucket.urls]
        .sort((a, b) => {
          const pathScore = scorePathPreference(b.url) - scorePathPreference(a.url)
          if (pathScore !== 0) return pathScore
          return b.score - a.score
        })
        .slice(0, 2)
        .map((item) => item.url)

      return {
        domain: bucket.domain,
        urls: topUrls.length > 0 ? topUrls : [bucket.urls[0].url],
        reason: summarizeReason(bucket.domain, brief),
        expected_signals: [brief.service_type, ...brief.industry].slice(0, 4),
      }
    }),
  }

  return ShortlistPayloadSchema.parse(shortlist)
}
