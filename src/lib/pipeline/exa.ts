import Exa from "exa-js"

import { PIPELINE_LIMITS, type PipelineLimits, type SearchDepth } from "@/lib/constants"

export interface SearchResult {
  title: string
  url: string
  content: string
  score: number
}

type ExaSearchResult = {
  title: string | null
  url: string
  text?: string
  highlights?: string[]
  score?: number
}

type ExaSearchOptions = {
  limits?: PipelineLimits
  searchDepth?: SearchDepth
  onBatchProgress?: (batchNumber: number, totalBatches: number) => Promise<void> | void
}

let exaClient: Exa | null = null

function getExa(): Exa | null {
  if (!process.env.EXA_API_KEY) return null
  if (!exaClient) {
    exaClient = new Exa(process.env.EXA_API_KEY)
  }
  return exaClient
}

function clampScore(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function mapResult(result: ExaSearchResult, index: number): SearchResult {
  const highlights = Array.isArray(result.highlights) ? result.highlights.filter(Boolean) : []
  const content = highlights.join(" ") || (typeof result.text === "string" ? result.text : "")
  const positionScore = clampScore(1 - index * 0.05)
  const score =
    typeof result.score === "number" && Number.isFinite(result.score)
      ? clampScore(result.score)
      : positionScore

  return {
    title: result.title ?? "",
    url: result.url,
    content,
    score,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isRateLimitError(error: unknown): boolean {
  const maybe = error as { status?: number; message?: string }
  if (maybe?.status === 429) return true
  return typeof maybe?.message === "string" && maybe.message.includes("429")
}

async function searchWithRetry(
  exa: Exa,
  query: string,
  limits: PipelineLimits,
): Promise<SearchResult[]> {
  try {
    const response = await exa.search(query, {
      type: "auto",
      numResults: limits.EXA_RESULTS_PER_QUERY,
      contents: {
        highlights: { numSentences: 3, maxCharacters: 600 },
        text: { maxCharacters: 1200 },
      },
    })

    return (response.results ?? []).map((result, index) => mapResult(result, index))
  } catch (error) {
    if (!isRateLimitError(error)) throw error
    await sleep(1200)
    const retry = await exa.search(query, {
      type: "auto",
      numResults: limits.EXA_RESULTS_PER_QUERY,
      contents: {
        highlights: { numSentences: 3, maxCharacters: 600 },
        text: { maxCharacters: 1200 },
      },
    })
    return (retry.results ?? []).map((result, index) => mapResult(result, index))
  }
}

export async function exaSearch(
  queries: string[],
  options: ExaSearchOptions = {},
): Promise<SearchResult[]> {
  const exa = getExa()
  if (!exa) return []

  const limits = options.limits ?? PIPELINE_LIMITS
  const searchDepth = options.searchDepth ?? "standard"
  const maxQueries = Math.min(queries.length, limits.MAX_SEARCH_QUERIES)
  const cappedQueries = queries.slice(0, maxQueries)
  const batchSize = searchDepth === "deep" ? 10 : Math.max(maxQueries, 1)
  const totalBatches = Math.max(1, Math.ceil(cappedQueries.length / batchSize))
  const all: SearchResult[] = []

  for (let offset = 0; offset < cappedQueries.length; offset += batchSize) {
    const batchNumber = Math.floor(offset / batchSize) + 1
    await options.onBatchProgress?.(batchNumber, totalBatches)

    const queryBatch = cappedQueries.slice(offset, offset + batchSize)
    const settlements = await Promise.allSettled(
      queryBatch.map((query) => searchWithRetry(exa, query, limits)),
    )

    for (const item of settlements) {
      if (item.status === "fulfilled") {
        all.push(...item.value)
      }
    }

    if (searchDepth === "deep" && batchNumber < totalBatches) {
      await sleep(1000)
    }
  }

  return all.slice(0, limits.MAX_TOTAL_RAW_RESULTS)
}
