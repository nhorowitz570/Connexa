import { Paperclip } from "lucide-react"

import type { ChatMessage } from "@/components/assistant/types"
import { cn } from "@/lib/utils"

type ChatMessageProps = {
  message: ChatMessage
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg border border-[#1F1F1F] px-3 py-2",
          isUser ? "bg-indigo-600 text-white" : "bg-[#161B22] text-white",
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.content}</p>

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
