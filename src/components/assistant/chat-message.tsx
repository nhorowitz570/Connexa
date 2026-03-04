import { Paperclip } from "lucide-react"

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
  const segments = splitMessageByMentions(message.content)
  const hasMentions = segments.some((segment) => segment.type === "mention")

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border border-[#1F1F1F] px-3 py-2",
          isUser ? "bg-indigo-600 text-white" : "bg-[#161B22] text-white",
        )}
      >
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
                  className={isUser ? "[&_a]:text-white" : undefined}
                />
              )
            })}
          </div>
        ) : (
          <MarkdownContent content={message.content} className={isUser ? "[&_a]:text-white" : undefined} />
        )}

        {message.attachments.length > 0 ? (
          <div className="mt-2 space-y-1 text-xs">
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

        <p className="mt-2 text-[11px] opacity-80">{new Date(message.created_at).toLocaleString()}</p>
      </div>
    </div>
  )
}
