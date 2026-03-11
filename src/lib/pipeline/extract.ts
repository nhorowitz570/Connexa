import { MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { CandidateSchema } from "@/lib/schemas"
import { getTemporalContext } from "@/lib/temporal-context"
import type { BriefMode, Candidate, NormalizedBrief } from "@/types"

type EvidencePage = {
  url: string
  raw_content: string
}

type ExtractCandidatesOptions = {
  onBatchProgress?: (batchNumber: number, totalBatches: number) => Promise<void> | void
  mode?: BriefMode
}

const EXTRACT_CONCURRENCY = 5
const STRONG_REEXTRACT_CONCURRENCY = 2
const STRONG_REEXTRACT_CAP = 8
const STRONG_REEXTRACT_CONFIDENCE_THRESHOLD = 0.72

function groupByDomain(pages: EvidencePage[]): Record<string, EvidencePage[]> {
  return pages.reduce<Record<string, EvidencePage[]>>((acc, page) => {
    try {
      const domain = new URL(page.url).hostname.replace(/^www\./, "")
      if (!acc[domain]) acc[domain] = []
      acc[domain].push(page)
    } catch {
      // Skip invalid URLs.
    }
    return acc
  }, {})
}

function fallbackCandidateFromDomain(domain: string, pages: EvidencePage[]): Candidate {
  const homepage = pages[0]?.url ?? `https://${domain}`
  return {
    company_name: domain.replace(/\.[a-z]{2,}$/i, "").replace(/[-_]/g, " "),
    website_url: homepage.startsWith("http") ? homepage : `https://${domain}`,
    services: [],
    industries: [],
    geography: null,
    pricing_signals: null,
    portfolio_signals: null,
    team_size: null,
    contact: {
      contact_url: `https://${domain}/contact`,
      email: null,
    },
    evidence_links: pages.map((p) => p.url),
    extraction_confidence: 0.35,
  }
}

async function extractSingleDomain(
  domain: string,
  pages: EvidencePage[],
  brief: NormalizedBrief,
  model: string,
): Promise<Candidate> {
  if (!process.env.OPENROUTER_API_KEY) {
    return fallbackCandidateFromDomain(domain, pages)
  }

  try {
    const temporalContext = getTemporalContext()
    const context = pages
      .map((page) => `URL: ${page.url}\n${page.raw_content.slice(0, 5000)}`)
      .join("\n---\n")

    const response = await callOpenRouter(
      [
        {
          role: "system",
          content: `Extract structured provider information from these web pages.
${temporalContext}
Content extraction date is the current UTC date in the temporal context above.
Only include explicitly stated facts. Return JSON with:
{
  company_name, website_url, services: [], industries: [],
  geography, pricing_signals: {type, value, evidence} | null,
  portfolio_signals: [] | null, team_size,
  contact: {contact_url, email},
  evidence_links: [], extraction_confidence
}
Set extraction_confidence between 0 and 1 using this rubric:
- 0.9-1.0: company name, services, and pricing or portfolio evidence directly confirmed
- 0.7-0.89: company name and services confirmed, some other fields inferred
- 0.5-0.69: company name confirmed, services partially inferred
- 0.3-0.49: most fields inferred from limited evidence
- 0.0-0.29: very limited evidence found`,
        },
        {
          role: "user",
          content: `Brief: ${JSON.stringify(brief)}\n\nPages:\n${context}`,
        },
      ],
      {
        model,
        response_format: { type: "json_object" },
        max_tokens: 1500,
      },
    )

    const candidate = CandidateSchema.safeParse(JSON.parse(response))
    if (candidate.success) {
      return candidate.data
    }
    return fallbackCandidateFromDomain(domain, pages)
  } catch {
    return fallbackCandidateFromDomain(domain, pages)
  }
}

function dataCompleteness(candidate: Candidate): number {
  return (
    candidate.services.length +
    candidate.industries.length +
    (candidate.geography ? 1 : 0) +
    (candidate.pricing_signals ? 1 : 0) +
    (candidate.portfolio_signals?.length ?? 0) +
    (candidate.contact?.email ? 1 : 0)
  )
}

function shouldReextractWithStrong(candidate: Candidate): boolean {
  if (candidate.extraction_confidence < STRONG_REEXTRACT_CONFIDENCE_THRESHOLD) return true
  if (candidate.services.length === 0) return true
  if (candidate.industries.length === 0) return true
  return false
}

function pickBestCandidate(original: Candidate, refined: Candidate): Candidate {
  const originalCompleteness = dataCompleteness(original)
  const refinedCompleteness = dataCompleteness(refined)

  if (refined.extraction_confidence > original.extraction_confidence + 0.05) return refined
  if (refinedCompleteness > originalCompleteness) return refined
  if (refined.extraction_confidence >= original.extraction_confidence) return refined
  return original
}

export async function extractCandidates(
  evidence: EvidencePage[],
  brief: NormalizedBrief,
  options: ExtractCandidatesOptions = {},
): Promise<Candidate[]> {
  const mode = options.mode ?? "simple"
  const byDomain = groupByDomain(evidence)
  const domainEntries = Object.entries(byDomain)

  if (domainEntries.length === 0) return []

  const candidatesByDomain = new Map<string, Candidate>()
  const totalBatches = Math.max(1, Math.ceil(domainEntries.length / EXTRACT_CONCURRENCY))

  // Process domains in parallel batches of EXTRACT_CONCURRENCY
  for (let i = 0; i < domainEntries.length; i += EXTRACT_CONCURRENCY) {
    const batchNumber = Math.floor(i / EXTRACT_CONCURRENCY) + 1
    await options.onBatchProgress?.(batchNumber, totalBatches)
    const batch = domainEntries.slice(i, i + EXTRACT_CONCURRENCY)
    const results = await Promise.allSettled(
      batch.map(([domain, pages]) => extractSingleDomain(domain, pages, brief, MODELS.WEAK)),
    )

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        const domain = batch[index]?.[0]
        if (domain) {
          candidatesByDomain.set(domain, result.value)
        }
      }
    }
  }

  if (mode === "detailed" && candidatesByDomain.size > 0) {
    const targets = domainEntries
      .map(([domain, pages]) => ({ domain, pages, candidate: candidatesByDomain.get(domain) }))
      .filter(
        (
          entry,
        ): entry is {
          domain: string
          pages: EvidencePage[]
          candidate: Candidate
        } => Boolean(entry.candidate),
      )
      .filter((entry) => shouldReextractWithStrong(entry.candidate))
      .sort((a, b) => a.candidate.extraction_confidence - b.candidate.extraction_confidence)
      .slice(0, STRONG_REEXTRACT_CAP)

    for (let i = 0; i < targets.length; i += STRONG_REEXTRACT_CONCURRENCY) {
      const batch = targets.slice(i, i + STRONG_REEXTRACT_CONCURRENCY)
      const refined = await Promise.allSettled(
        batch.map(async ({ domain, pages, candidate }) => ({
          domain,
          candidate,
          refined: await extractSingleDomain(domain, pages, brief, MODELS.STRONG),
        })),
      )

      for (const result of refined) {
        if (result.status !== "fulfilled") continue
        const next = pickBestCandidate(result.value.candidate, result.value.refined)
        candidatesByDomain.set(result.value.domain, next)
      }
    }
  }

  return domainEntries
    .map(([domain]) => candidatesByDomain.get(domain))
    .filter((candidate): candidate is Candidate => Boolean(candidate))
}
