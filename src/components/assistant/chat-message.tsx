"use client"

import { Check, Copy, Loader2, Paperclip, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"

import { MarkdownContent } from "@/components/assistant/markdown-content"
import { MentionCard } from "@/components/assistant/mention-card"
import type { ChatMessage } from "@/components/assistant/types"
import { cn } from "@/lib/utils"

type ChatMessageProps = {
  message: ChatMessage
}

type MessageSegment =
  | { type: "text"; value: string }
  | { type: "mention"; briefId: string }

const BRIEF_REF_PATTERN = /@brief:([0-9a-f-]{36})/gi

function splitMessageByMentions(content: string): MessageSegment[] {
  const segments: MessageSegment[] = []
  let lastIndex = 0
  const mentionRegex = new RegExp(BRIEF_REF_PATTERN)

  for (const match of content.matchAll(mentionRegex)) {
    const start = match.index ?? 0
    const end = start + match[0].length

    if (start > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, start) })
    }

    if (match[1]) {
      segments.push({ type: "mention", briefId: match[1] })
    }
    lastIndex = end
  }

  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) })
  }

  if (segments.length === 0) {
    segments.push({ type: "text", value: content })
  }

  return segments
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"
  const isAssistantLoading = !isUser && message.content.trim().length === 0
  const isStreamingAssistant = !isUser && message.id.startsWith("temp-assistant-")
  const showAssistantSkeleton = !isUser && (isAssistantLoading || isStreamingAssistant)
  const isLongAssistantMessage = !isUser && message.content.length > 500
  const [expanded, setExpanded] = useState(false)
  const visibleAssistantContent =
    !isUser && !expanded && isLongAssistantMessage
      ? `${message.content.slice(0, 500).trimEnd()}...`
      : message.content
  const segments = splitMessageByMentions(message.content)
  const hasMentions = segments.some((segment) => segment.type === "mention")
  const briefRefs = Array.isArray(message.brief_refs)
    ? message.brief_refs.filter((briefId): briefId is string => typeof briefId === "string")
    : []
  const assistantBriefRefs = !isUser ? [...new Set(briefRefs)] : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[95%] rounded-xl border px-3 py-2 md:max-w-[85%]",
          isUser
            ? "border-indigo-400/20 bg-indigo-600 text-white"
            : "border-[#30363D] bg-[#161B22] text-white",
        )}
      >
        {!isUser ? (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-[#9fb3d9]">
            <Sparkles className="h-3 w-3" />
            Connexa Assistant
          </div>
        ) : null}

        {showAssistantSkeleton ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-[#9aa4b2]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
              <span>Generating response...</span>
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-white/10" />
            </div>
          </div>
        ) : (
          <motion.div key={message.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>
            {hasMentions ? (
              <div className="space-y-1 text-sm">
                {segments.map((segment, index) => {
                  if (segment.type === "mention") {
                    return <MentionCard key={`${segment.briefId}-${index}`} briefId={segment.briefId} />
                  }
                  return (
                    <MarkdownContent
                      key={`text-${index}`}
                      content={segment.value}
                      className={isUser ? "[&_a]:text-white" : "[&_p]:text-[#d6dce8]"}
                    />
                  )
                })}
              </div>
            ) : (
              <MarkdownContent
                content={visibleAssistantContent}
                className={isUser ? "[&_a]:text-white" : "[&_p]:text-[#d6dce8] [&_li]:text-[#d6dce8]"}
              />
            )}
          </motion.div>
        )}

        {!isUser && !isStreamingAssistant && isLongAssistantMessage && !hasMentions ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-1 text-xs text-indigo-300 transition-colors hover:text-indigo-200"
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}

        {message.attachments.length > 0 ? (
          <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-black/15 p-2 text-xs">
            {message.attachments.map((attachment, index) => (
              <div key={`${attachment.name}-${index}`} className="flex items-center gap-1">
                <Paperclip className="h-3 w-3" />
                {attachment.url ? (
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                    {attachment.name}
                  </a>
                ) : (
                  <span>{attachment.name}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {!isUser && !showAssistantSkeleton && assistantBriefRefs.length > 0 ? (
          <div className="mt-2 space-y-1">
            <p className="text-[11px] uppercase tracking-wide text-[#8B949E]">Referenced Briefs</p>
            <div className="flex flex-wrap gap-2">
              {assistantBriefRefs.map((briefId) => (
                <MentionCard
                  key={`ref-${briefId}`}
                  briefId={briefId}
                  compact
                />
              ))}
            </div>
          </div>
        ) : null}

        {!isUser && !showAssistantSkeleton && message.content.trim().length > 0 ? (
          <>
            <hr className="my-2 border-[#2A2A2A]" />
            <CopyButton text={message.content} />
          </>
        ) : null}

        <p className="mt-2 text-[11px] opacity-70">{new Date(message.created_at).toLocaleString()}</p>
      </div>
    </motion.div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-[#919191] transition-colors hover:text-white"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  )
}
