export type OpenRouterMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type OpenRouterOptions = {
  model: string
  response_format?: { type: "json_object" }
  max_tokens?: number
  temperature?: number
  signal?: AbortSignal
}

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

type OpenRouterContent = string | Array<{ type?: string; text?: string }> | undefined

function normalizeContent(content: OpenRouterContent) {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
  }
  return ""
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options: OpenRouterOptions,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.max_tokens ?? 1200,
      response_format: options.response_format,
    }),
    signal: options.signal ?? AbortSignal.timeout(60000),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter error (${response.status}): ${text}`)
  }

  const payload = (await response.json()) as OpenRouterResponse
  const message = payload.choices?.[0]?.message?.content
  const content = normalizeContent(message)
  if (!content) {
    throw new Error("OpenRouter returned an empty response")
  }
  return content
}
