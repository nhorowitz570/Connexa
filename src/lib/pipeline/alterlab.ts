import { PIPELINE_LIMITS, type PipelineLimits, type SearchDepth } from "@/lib/constants"

type EvidencePage = {
  url: string
  raw_content: string
}

type AlterlabScrapeOptions = {
  limits?: PipelineLimits
  searchDepth?: SearchDepth
  onBatchProgress?: (batchNumber: number, totalBatches: number) => Promise<void> | void
}

type AlterlabConfig = {
  apiKey: string
  baseUrl: string
}

class HttpStatusError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "HttpStatusError"
    this.status = status
  }
}

function getAlterlabConfig(): AlterlabConfig | null {
  const apiKey = process.env.ALTERLAB_API_KEY
  if (!apiKey) return null

  const baseUrl = (process.env.ALTERLAB_BASE_URL ?? "https://api.alterlab.io/api/v0").replace(/\/+$/, "")
  return { apiKey, baseUrl }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function extractMarkdown(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const objectLike = payload as Record<string, unknown>
  const candidateValues = [
    objectLike.markdown,
    (objectLike.data as Record<string, unknown> | undefined)?.markdown,
    ((objectLike.data as Record<string, unknown> | undefined)?.content as Record<string, unknown> | undefined)
      ?.markdown,
    (objectLike.result as Record<string, unknown> | undefined)?.markdown,
    ((objectLike.data as Record<string, unknown> | undefined)?.result as Record<string, unknown> | undefined)
      ?.markdown,
  ]

  for (const value of candidateValues) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value
    }
  }

  return null
}

function extractErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const objectLike = payload as Record<string, unknown>
  const directError = objectLike.error
  if (typeof directError === "string" && directError.trim().length > 0) return directError

  const dataError = (objectLike.data as Record<string, unknown> | undefined)?.error
  if (typeof dataError === "string" && dataError.trim().length > 0) return dataError

  const message = objectLike.message
  if (typeof message === "string" && message.trim().length > 0) return message

  return null
}

function isRateLimitError(error: unknown): boolean {
  const maybe = error as { status?: number; message?: string }
  if (maybe?.status === 429) return true
  return typeof maybe?.message === "string" && maybe.message.includes("429")
}

async function scrapeOnce(config: AlterlabConfig, url: string, limits: PipelineLimits): Promise<EvidencePage | null> {
  const response = await fetch(`${config.baseUrl}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
      timeout: 30000,
    }),
  })

  const payload = (await response.json().catch(() => null)) as unknown
  if (!response.ok) {
    const message = extractErrorMessage(payload) ?? `AlterLab scrape failed with status ${response.status}`
    throw new HttpStatusError(response.status, message)
  }

  const markdown = extractMarkdown(payload)
  if (!markdown) return null

  return {
    url,
    raw_content: markdown.slice(0, limits.MAX_TOKENS_PER_PAGE * 4),
  }
}

async function scrapeWithRetry(
  config: AlterlabConfig,
  url: string,
  limits: PipelineLimits,
): Promise<EvidencePage | null> {
  try {
    return await scrapeOnce(config, url, limits)
  } catch (error) {
    if (!isRateLimitError(error)) throw error
    await sleep(1500)
    return scrapeOnce(config, url, limits)
  }
}

export async function alterlabScrape(
  urls: string[],
  options: AlterlabScrapeOptions = {},
): Promise<EvidencePage[]> {
  const config = getAlterlabConfig()
  if (!config || urls.length === 0) return []

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
      chunk.map((url) => scrapeWithRetry(config, url, limits)),
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
