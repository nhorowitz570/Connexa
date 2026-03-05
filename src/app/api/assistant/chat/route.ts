import { NextResponse } from "next/server"

import { MODELS } from "@/lib/constants"
import { createClient } from "@/lib/supabase/server"

type ChatInput = {
  thread_id?: string
  message?: string
  attachments?: Array<Record<string, unknown>>
  brief_refs?: string[]
}

type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
    message?: {
      content?: string | Array<{ type?: string; text?: string }>
    }
  }>
}

const BRIEF_REF_REGEX = /@brief:([0-9a-f-]{36})/gi

export const maxDuration = 60

function toPlainText(content: string | Array<{ type?: string; text?: string }> | undefined): string {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("\n")
  }
  return ""
}

function extractBriefRefs(input: string): string[] {
  const matches = input.matchAll(BRIEF_REF_REGEX)
  const refs = new Set<string>()
  for (const match of matches) {
    if (match[1]) refs.add(match[1])
  }
  return Array.from(refs)
}

function sanitizeAssistantTitle(message: string): string {
  const cleaned = message.replace(/\s+/g, " ").trim()
  if (cleaned.length === 0) return "New Chat"
  return cleaned.slice(0, 60)
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value
  return `${value.slice(0, Math.max(0, limit - 1))}...`
}

function inferBriefRefsFromReply(
  reply: string,
  briefCandidates: Array<{ id: string; name: string | null }>,
): string[] {
  const lowerReply = reply.toLowerCase()
  const matched: string[] = []

  for (const brief of briefCandidates) {
    const name = brief.name?.trim()
    if (!name || name.length < 3) continue
    if (lowerReply.includes(name.toLowerCase())) {
      matched.push(brief.id)
    }
  }

  return [...new Set(matched)].slice(0, 6)
}

export async function POST(request: Request) {
  try {
    const startTime = Date.now()
    const body = (await request.json().catch(() => ({}))) as ChatInput
    if (!body.thread_id || !body.message || body.message.trim().length === 0) {
      return NextResponse.json({ error: "thread_id and message are required." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: thread, error: threadError } = await supabase
      .from("chat_threads")
      .select("id, title")
      .eq("id", body.thread_id)
      .eq("user_id", user.id)
      .single()

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 })
    }

    const message = body.message.trim()
    const attachments = Array.isArray(body.attachments) ? body.attachments : []
    const mentionRefs = extractBriefRefs(message)
    const providedRefs = Array.isArray(body.brief_refs) ? body.brief_refs : []
    const briefRefs = Array.from(new Set([...mentionRefs, ...providedRefs]))

    const { error: insertUserMessageError } = await supabase.from("chat_messages").insert({
      thread_id: body.thread_id,
      role: "user",
      content: message,
      attachments,
      brief_refs: briefRefs,
    })

    if (insertUserMessageError) {
      return NextResponse.json({ error: insertUserMessageError.message }, { status: 500 })
    }

    if (thread.title === "New Chat") {
      await supabase
        .from("chat_threads")
        .update({ title: sanitizeAssistantTitle(message), updated_at: new Date().toISOString() })
        .eq("id", thread.id)
    } else {
      await supabase
        .from("chat_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id)
    }

    const [
      { data: profile },
      { data: historyRaw },
      { data: referencedBriefsRaw },
      { data: recentBriefsRaw },
      { data: analyticsRaw },
    ] =
      await Promise.all([
        supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle(),
        supabase
          .from("chat_messages")
          .select("role, content")
          .eq("thread_id", body.thread_id)
          .order("created_at", { ascending: true })
          .limit(20),
        briefRefs.length > 0
          ? supabase
            .from("briefs")
            .select("id, name, status, raw_prompt, normalized_brief, weights, created_at, category")
            .eq("user_id", user.id)
            .in("id", briefRefs)
          : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
        supabase
          .from("briefs")
          .select("id, name, status, raw_prompt, normalized_brief, category, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("analytics_daily")
          .select("date, total_briefs, completed_briefs, failed_briefs, avg_score, avg_confidence, miss_reasons")
          .eq("user_id", user.id)
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

    const briefRows = (referencedBriefsRaw ?? []) as Array<{
      id: string
      name: string | null
      status: string
      raw_prompt: string | null
      normalized_brief: unknown
      weights: unknown
      created_at: string
      category: string | null
    }>

    const recentBriefRows = (recentBriefsRaw ?? []) as Array<{
      id: string
      name: string | null
      status: string
      raw_prompt: string | null
      normalized_brief: unknown
      category: string | null
      created_at: string
    }>

    const referencedBriefIds = briefRows.map((row) => row.id)
    const { data: resultRowsRaw } = referencedBriefIds.length
      ? await supabase
        .from("results")
        .select("brief_id, company_name, score_overall, reasoning_summary")
        .in("brief_id", referencedBriefIds)
        .order("score_overall", { ascending: false })
      : { data: [] as Array<Record<string, unknown>> }

    const topResultsByBrief = new Map<string, Array<{ company_name: string; score_overall: number; reasoning_summary: string }>>()
    for (const row of (resultRowsRaw ?? []) as Array<{
      brief_id: string
      company_name: string
      score_overall: number
      reasoning_summary: string
    }>) {
      const list = topResultsByBrief.get(row.brief_id) ?? []
      if (list.length < 3) {
        list.push({
          company_name: row.company_name,
          score_overall: row.score_overall,
          reasoning_summary: row.reasoning_summary,
        })
      }
      topResultsByBrief.set(row.brief_id, list)
    }

    const briefContext = briefRows.map((brief) => ({
      id: brief.id,
      name: brief.name,
      status: brief.status,
      category: brief.category,
      created_at: brief.created_at,
      raw_prompt:
        typeof brief.raw_prompt === "string" && brief.raw_prompt.trim().length > 0
          ? truncate(brief.raw_prompt, 320)
          : null,
      normalized_brief: brief.normalized_brief,
      weights: brief.weights,
      top_results: topResultsByBrief.get(brief.id) ?? [],
    }))

    const recentBriefsSummary = recentBriefRows.map((brief) => {
      const serviceType =
        brief.normalized_brief &&
          typeof brief.normalized_brief === "object" &&
          "service_type" in brief.normalized_brief
          ? String((brief.normalized_brief as { service_type?: unknown }).service_type ?? "")
          : ""

      return {
        id: brief.id,
        name: brief.name,
        status: brief.status,
        category: brief.category,
        created_at: brief.created_at,
        service_type: truncate(serviceType || "Untitled brief", 120),
      }
    })

    const allBriefIds = new Set([
      ...briefRows.map((brief) => brief.id),
      ...recentBriefRows.map((brief) => brief.id),
    ])

    const textAttachmentContext = attachments
      .map((attachment) => {
        const name = typeof attachment.name === "string" ? attachment.name : "attachment"
        const type = typeof attachment.type === "string" ? attachment.type : "unknown"
        const textContent =
          typeof attachment.text_content === "string" && attachment.text_content.trim().length > 0
            ? attachment.text_content.slice(0, 2000)
            : null
        return { name, type, textContent }
      })
      .filter((attachment) => attachment.textContent)

    const systemContext = {
      profile: {
        full_name: profile?.full_name ?? null,
        email: profile?.email ?? user.email ?? null,
      },
      referenced_briefs: briefContext,
      recent_briefs_summary: recentBriefsSummary,
      total_known_briefs: allBriefIds.size,
      latest_analytics: analyticsRaw ?? null,
      text_attachments: textAttachmentContext,
    }

    const historyMessages = (historyRaw ?? [])
      .map((row) => ({
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
      }))
      .slice(-20)

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      const fallback = "OpenRouter is not configured yet. Add OPENROUTER_API_KEY to enable assistant replies."

      await supabase.from("chat_messages").insert({
        thread_id: body.thread_id,
        role: "assistant",
        content: fallback,
        attachments: [],
        brief_refs: briefRefs,
      })

      console.info(
        "[assistant]",
        JSON.stringify({
          event: "chat_complete",
          duration_ms: Date.now() - startTime,
          thread_id: body.thread_id,
          brief_refs_count: briefRefs.length,
          reply_length: fallback.length,
          had_attachments: textAttachmentContext.length > 0,
          streamed: false,
        }),
      )

      return NextResponse.json({ data: { reply: fallback } })
    }

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELS.CHEAP,
        stream: true,
        temperature: 0.3,
        max_tokens: 1200,
        messages: [
          {
            role: "system",
            content:
              "You are ConnexaAI Assistant. Answer using only the current user's context. " +
              "When discussing specific briefs, reference them by their brief name when available. " +
              "If asked to summarize briefs, use recent_briefs_summary and highlight status/category concisely. " +
              "Never mention pipeline internals or other users. Be concise and actionable. Context: " +
              JSON.stringify(systemContext),
          },
          ...historyMessages,
        ],
      }),
    })

    if (!openRouterResponse.ok || !openRouterResponse.body) {
      const details = await openRouterResponse.text()
      return NextResponse.json(
        { error: `OpenRouter error (${openRouterResponse.status}): ${details}` },
        { status: 500 },
      )
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = openRouterResponse.body?.getReader()
        if (!reader) {
          controller.error(new Error("Unable to read stream."))
          return
        }

        let assistantReply = ""
        let buffer = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""

            for (const rawLine of lines) {
              const line = rawLine.trim()
              if (!line.startsWith("data:")) continue

              const payload = line.replace(/^data:\s*/, "")
              if (payload === "[DONE]") continue

              try {
                const json = JSON.parse(payload) as OpenRouterStreamChunk
                const piece =
                  toPlainText(json.choices?.[0]?.delta?.content) ||
                  toPlainText(json.choices?.[0]?.message?.content)

                if (!piece) continue

                assistantReply += piece
                controller.enqueue(encoder.encode(piece))
              } catch {
                // Ignore malformed chunks.
              }
            }
          }

          if (assistantReply.trim().length === 0) {
            assistantReply = "I could not generate a response for that message."
            controller.enqueue(encoder.encode(assistantReply))
          }

          const inferredBriefRefs = inferBriefRefsFromReply(assistantReply, recentBriefRows)
          const assistantBriefRefs = [...new Set([...briefRefs, ...inferredBriefRefs])]

          await supabase.from("chat_messages").insert({
            thread_id: body.thread_id,
            role: "assistant",
            content: assistantReply,
            attachments: [],
            brief_refs: assistantBriefRefs,
          })

          await supabase
            .from("chat_threads")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", body.thread_id)

          console.info(
            "[assistant]",
            JSON.stringify({
              event: "chat_complete",
              duration_ms: Date.now() - startTime,
              thread_id: body.thread_id,
              brief_refs_count: assistantBriefRefs.length,
              reply_length: assistantReply.length,
              had_attachments: textAttachmentContext.length > 0,
              streamed: true,
            }),
          )

          controller.close()
        } catch (error) {
          controller.error(error)
        } finally {
          reader.releaseLock()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send assistant message."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
