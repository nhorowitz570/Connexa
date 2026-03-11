"use client"

import { SendHorizontal, X } from "lucide-react"
import { type FormEvent, useMemo, useState } from "react"

import { BriefMentionPicker } from "@/components/assistant/brief-mention-picker"
import { FileUploadButton } from "@/components/assistant/file-upload-button"
import { MentionCard } from "@/components/assistant/mention-card"
import { SpeechButton } from "@/components/assistant/speech-button"
import type { ChatAttachment } from "@/components/assistant/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

const BRIEF_REF_PATTERN = /@brief:([0-9a-f-]{36})/gi

type ChatInputProps = {
  disabled?: boolean
  onSend: (message: string, attachments: ChatAttachment[], briefRefs: string[]) => Promise<void>
}

function extractBriefRefs(message: string) {
  const refs = new Set<string>()
  const regex = new RegExp(BRIEF_REF_PATTERN)
  for (const match of message.matchAll(regex)) {
    if (match[1]) refs.add(match[1])
  }
  return Array.from(refs)
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")

  const canSend = useMemo(
    () => !disabled && (message.trim().length > 0 || attachments.length > 0),
    [attachments.length, disabled, message],
  )
  const composerRows = useMemo(() => {
    const lineCount = message.split("\n").length
    return Math.min(8, Math.max(2, lineCount))
  }, [message])
  const briefRefsInComposer = useMemo(() => extractBriefRefs(message), [message])

  const updateMentionState = (nextValue: string) => {
    const mentionMatch = nextValue.match(/(?:^|\s)@([^\s@]*)$/)
    if (mentionMatch && !nextValue.match(/@brief:[0-9a-f-]{36}$/i)) {
      setMentionQuery(mentionMatch[1] ?? "")
      setMentionOpen(true)
    } else {
      setMentionOpen(false)
      setMentionQuery("")
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSend) return

    const refs = extractBriefRefs(message)
    await onSend(message.trim(), attachments, refs)

    setMessage("")
    setAttachments([])
    setMentionOpen(false)
    setMentionQuery("")
  }

  return (
    <form
      className="glass-card sticky bottom-0 space-y-3 border-t border-border bg-card/95 p-3 backdrop-blur-2xl dark:border-white/10 dark:bg-[#0b1019]/95"
      onSubmit={(event) => void handleSubmit(event)}
    >
      {attachments.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <Badge key={`${attachment.name}-${index}`} variant="secondary" className="gap-1 pr-1">
              <span className="max-w-36 truncate">{attachment.name}</span>
              <button
                type="button"
                className="rounded p-0.5 hover:bg-muted"
                onClick={() => {
                  setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {briefRefsInComposer.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {briefRefsInComposer.map((briefId) => (
            <MentionCard key={briefId} briefId={briefId} compact />
          ))}
        </div>
      ) : null}

      <div className="relative">
        <Textarea
          value={message}
          onChange={(event) => {
            const next = event.target.value
            setMessage(next)
            updateMentionState(next)
          }}
          placeholder="Ask about your briefs, results, or strategy..."
          className="min-h-[88px] resize-none border-input bg-background pr-14 text-foreground placeholder:text-muted-foreground dark:border-white/10 dark:bg-[#0f1624] dark:text-white dark:placeholder:text-[#7f8aa3]"
          rows={composerRows}
          disabled={disabled}
        />
        <div className="absolute left-2 top-2">
          <BriefMentionPicker
            open={mentionOpen}
            query={mentionQuery}
            onOpenChange={setMentionOpen}
            onSelect={(briefId) => {
              setMessage((current) => {
                const updated = current.replace(/@([^\s@]*)$/, `@brief:${briefId} `)
                updateMentionState(updated)
                return updated
              })
              setMentionOpen(false)
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileUploadButton
            disabled={disabled}
            onUploaded={(attachment) => {
              setAttachments((current) => [...current, attachment])
            }}
          />
          <SpeechButton
            disabled={disabled}
            onTranscript={(text) => {
              setMessage((current) => {
                const next = `${current}${current.endsWith(" ") || current.length === 0 ? "" : " "}${text}`
                updateMentionState(next)
                return next
              })
            }}
          />
        </div>

        <Button
          type="submit"
          disabled={!canSend}
          className="h-11 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-500"
        >
          <SendHorizontal className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground">
        AI can make mistakes. Double-check important details before acting on suggestions.
      </p>
    </form>
  )
}
