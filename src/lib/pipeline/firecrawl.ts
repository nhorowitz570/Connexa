import Firecrawl from "@mendable/firecrawl-js"

import { PIPELINE_LIMITS, type PipelineLimits, type SearchDepth } from "@/lib/constants"

type EvidencePage = {
  url: string
  raw_content: string
}

type FirecrawlScrapeOptions = {
  limits?: PipelineLimits
  searchDepth?: SearchDepth
  onBatchProgress?: (batchNumber: number, totalBatches: number) => Promise<void> | void
}

let firecrawlClient: Firecrawl | null = null

function getFirecrawl(): Firecrawl | null {
  if (!process.env.FIRECRAWL_API_KEY) return null
  if (!firecrawlClient) {
    firecrawlClient = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
  }
  return firecrawlClient
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

async function scrapeWithRetry(
  firecrawl: Firecrawl,
  url: string,
  limits: PipelineLimits,
): Promise<EvidencePage | null> {
  try {
    const response = await firecrawl.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 30000,
    })

    if (typeof response.markdown !== "string" || response.markdown.trim().length === 0) {
      return null
    }

    return {
      url,
      raw_content: response.markdown.slice(0, limits.MAX_TOKENS_PER_PAGE * 4),
    }
  } catch (error) {
    if (!isRateLimitError(error)) throw error
    await sleep(1500)
    const retry = await firecrawl.scrape(url, {
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 30000,
    })
    if (typeof retry.markdown !== "string" || retry.markdown.trim().length === 0) {
      return null
    }
    return {
      url,
      raw_content: retry.markdown.slice(0, limits.MAX_TOKENS_PER_PAGE * 4),
    }
  }
}

export async function firecrawlScrape(
  urls: string[],
  options: FirecrawlScrapeOptions = {},
): Promise<EvidencePage[]> {
  const firecrawl = getFirecrawl()
  if (!firecrawl || urls.length === 0) return []

  const limits = options.limits ?? PIPELINE_LIMITS
  const searchDepth = options.searchDepth ?? "standard"
  const cappedUrls = urls.slice(0, limits.MAX_PAGE_FETCHES)
  const results: EvidencePage[] = []
  const chunks: string[][] = []

  for (let i = 0; i < cappedUrls.length; i += 5) {
    chunks.push(cappedUrls.slice(i, i + 5))
  }

  const totalBatches = Math.max(1, chunks.length)

  for (let batchNumber = 0; batchNumber < chunks.length; batchNumber += 1) {
    if (results.length >= limits.MAX_PAGE_FETCHES) break

    await options.onBatchProgress?.(batchNumber + 1, totalBatches)
    const chunk = chunks[batchNumber]
    const settlements = await Promise.allSettled(
      chunk.map((url) => scrapeWithRetry(firecrawl, url, limits)),
    )

    for (const item of settlements) {
      if (item.status === "fulfilled" && item.value) {
        results.push(item.value)
      }
    }

    if (searchDepth === "deep" && batchNumber + 1 < chunks.length) {
      await sleep(2000)
    }
  }

  return results.slice(0, limits.MAX_PAGE_FETCHES)
}
