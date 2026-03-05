import {
  callOpenRouter,
  type OpenRouterMessage,
  type OpenRouterOptions,
} from "@/lib/openrouter"

type OpenRouterWithTimeoutOptions = OpenRouterOptions & {
  timeoutMs?: number
  retries?: number
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function callOpenRouterWithTimeout(
  messages: OpenRouterMessage[],
  options: OpenRouterWithTimeoutOptions,
): Promise<string> {
  const { timeoutMs = 30_000, retries = 2, ...rest } = options
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await callOpenRouter(messages, {
        ...rest,
        signal: controller.signal,
      })
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("LLM call failed")
      if (attempt < retries) {
        await delay(1000 * (attempt + 1))
      }
    } finally {
      clearTimeout(timer)
    }
  }

  throw lastError ?? new Error("LLM call failed after retries")
}
