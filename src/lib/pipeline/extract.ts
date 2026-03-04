import { MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { CandidateSchema } from "@/lib/schemas"
import type { Candidate, NormalizedBrief } from "@/types"

type EvidencePage = {
  url: string
  raw_content: string
}

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

export async function extractCandidates(
  evidence: EvidencePage[],
  brief: NormalizedBrief,
): Promise<Candidate[]> {
  const byDomain = groupByDomain(evidence)
  const candidates: Candidate[] = []

  for (const [domain, pages] of Object.entries(byDomain)) {
    try {
      if (!process.env.OPENROUTER_API_KEY) {
        candidates.push(fallbackCandidateFromDomain(domain, pages))
        continue
      }

      const context = pages
        .map((page) => `URL: ${page.url}\n${page.raw_content.slice(0, 5000)}`)
        .join("\n---\n")

      const response = await callOpenRouter(
        [
          {
            role: "system",
            content: `Extract structured provider information from these web pages.
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
          model: MODELS.WEAK,
          response_format: { type: "json_object" },
          max_tokens: 1500,
        },
      )

      const candidate = CandidateSchema.safeParse(JSON.parse(response))
      if (candidate.success) {
        candidates.push(candidate.data)
      } else {
        candidates.push(fallbackCandidateFromDomain(domain, pages))
      }
    } catch {
      candidates.push(fallbackCandidateFromDomain(domain, pages))
    }
  }

  return candidates
}
