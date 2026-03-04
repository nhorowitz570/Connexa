import { PIPELINE_LIMITS } from "@/lib/constants"

export interface TavilyResult {
  title: string
  url: string
  content: string
  score: number
}

type TavilySearchResponse = {
  results?: TavilyResult[]
}

type TavilyExtractResponse = {
  results?: Array<{ url?: string; raw_content?: string }>
}

export async function tavilySearch(queries: string[]): Promise<TavilyResult[]> {
  if (!process.env.TAVILY_API_KEY) return []

  const settlements = await Promise.allSettled(
    queries.map(async (query) => {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.TAVILY_API_KEY,
          query,
          search_depth: "advanced",
          max_results: PIPELINE_LIMITS.MAX_RESULTS_PER_QUERY,
          include_answer: false,
          include_raw_content: false,
        }),
      })

      if (!response.ok) return []

      const data = (await response.json()) as TavilySearchResponse
      return data.results ?? []
    }),
  )

  const all: TavilyResult[] = []
  for (const item of settlements) {
    if (item.status === "fulfilled") {
      all.push(...item.value)
    }
  }

  return all.slice(0, PIPELINE_LIMITS.MAX_TOTAL_RAW_RESULTS)
}

export async function tavilyExtract(
  urls: string[],
): Promise<Array<{ url: string; raw_content: string }>> {
  if (!process.env.TAVILY_API_KEY || urls.length === 0) return []

  const chunks: string[][] = []
  for (let i = 0; i < urls.length; i += 5) {
    chunks.push(urls.slice(i, i + 5))
  }

  const extracted: Array<{ url: string; raw_content: string }> = []
  for (const chunk of chunks) {
    if (extracted.length >= PIPELINE_LIMITS.MAX_PAGE_FETCHES) break

    const response = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        urls: chunk,
      }),
    })

    if (!response.ok) continue

    const payload = (await response.json()) as TavilyExtractResponse
    for (const result of payload.results ?? []) {
      if (!result.url) continue
      extracted.push({
        url: result.url,
        raw_content: (result.raw_content ?? "").slice(
          0,
          PIPELINE_LIMITS.MAX_TOKENS_PER_PAGE * 4,
        ),
      })
    }
  }

  return extracted.slice(0, PIPELINE_LIMITS.MAX_PAGE_FETCHES)
}
