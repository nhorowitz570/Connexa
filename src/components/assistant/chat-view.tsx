"use client"

import { Menu } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { ChatInput } from "@/components/assistant/chat-input"
import { ChatMessage } from "@/components/assistant/chat-message"
import { ThreadList } from "@/components/assistant/thread-list"
import type { ChatAttachment, ChatMessage as ChatMessageType, ChatThread } from "@/components/assistant/types"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

type ThreadsResponse = {
  data?: {
    threads: ChatThread[]
    messages: ChatMessageType[]
    active_thread_id: string | null
  }
  error?: string
}

function normalizeMessage(input: Record<string, unknown>): ChatMessageType {
  return {
    id: typeof input.id === "string" ? input.id : crypto.randomUUID(),
    role: input.role === "assistant" ? "assistant" : "user",
    content: typeof input.content === "string" ? input.content : "",
    attachments: Array.isArray(input.attachments) ? (input.attachments as ChatAttachment[]) : [],
    brief_refs: Array.isArray(input.brief_refs)
      ? input.brief_refs.filter((item): item is string => typeof item === "string")
      : [],
    created_at: typeof input.created_at === "string" ? input.created_at : new Date().toISOString(),
  }
}

export function ChatView() {
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [mobileThreadsOpen, setMobileThreadsOpen] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [activeThreadId, threads],
  )

  const loadThreadData = async (threadId?: string | null) => {
    setLoading(true)
    try {
      const url = threadId ? `/api/assistant/threads?thread_id=${threadId}` : "/api/assistant/threads"
      const response = await fetch(url)
      const payload = (await response.json()) as ThreadsResponse

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "Failed to load assistant threads.")
      }

      setThreads(payload.data.threads)
      setMessages(payload.data.messages.map((message) => normalizeMessage(message as Record<string, unknown>)))
      setActiveThreadId(payload.data.active_thread_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to load assistant data."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadThreadData()
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const createThread = async () => {
    const response = await fetch("/api/assistant/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })

    const payload = (await response.json()) as { data?: ChatThread; error?: string }
    if (!response.ok || !payload.data) {
      throw new Error(payload.error ?? "Failed to create thread.")
    }

    return payload.data
  }

  const sendMessage = async (message: string, attachments: ChatAttachment[], briefRefs: string[]) => {
    setSending(true)

    const now = new Date().toISOString()
    const userTemp: ChatMessageType = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: message,
      attachments,
      brief_refs: briefRefs,
      created_at: now,
    }

    const assistantTempId = `temp-assistant-${Date.now()}`
    const assistantTemp: ChatMessageType = {
      id: assistantTempId,
      role: "assistant",
      content: "",
      attachments: [],
      brief_refs: briefRefs,
      created_at: now,
    }

    setMessages((current) => [...current, userTemp, assistantTemp])

    try {
      let threadId = activeThreadId
      if (!threadId) {
        const newThread = await createThread()
        threadId = newThread.id
      }

      if (!threadId) throw new Error("No active thread available.")

      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          message,
          attachments,
          brief_refs: briefRefs,
        }),
      })

      const contentType = response.headers.get("content-type") ?? ""
      if (!response.ok) {
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as { error?: string }
          throw new Error(payload.error ?? "Failed to send message.")
        }
        throw new Error("Failed to send message.")
      }

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { data?: { reply?: string } }
        const reply = payload.data?.reply ?? ""
        setMessages((current) =>
          current.map((item) => (item.id === assistantTempId ? { ...item, content: reply } : item)),
        )
      } else {
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()

        if (!reader) throw new Error("Failed to read assistant response.")

        let streamed = ""
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          streamed += decoder.decode(value, { stream: true })
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantTempId
                ? {
                  ...item,
                  content: streamed,
                }
                : item,
            ),
          )
        }
      }

      await loadThreadData(threadId)
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Failed to send message."
      toast.error(messageText)
      setMessages((current) =>
        current.filter((item) => item.id !== assistantTempId && item.id !== userTemp.id),
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0D0D0D]">
      <div className="hidden w-72 md:block">
        <ThreadList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelect={(threadId) => {
            void loadThreadData(threadId)
          }}
          onNewThread={() => {
            void createThread().then((thread) => loadThreadData(thread.id)).catch((error: unknown) => {
              const message = error instanceof Error ? error.message : "Failed to create thread."
              toast.error(message)
            })
          }}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] px-3 py-2">
          <div className="flex items-center gap-2">
            <Sheet open={mobileThreadsOpen} onOpenChange={setMobileThreadsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0">
                <ThreadList
                  threads={threads}
                  activeThreadId={activeThreadId}
                  onSelect={(threadId) => {
                    setMobileThreadsOpen(false)
                    void loadThreadData(threadId)
                  }}
                  onNewThread={() => {
                    void createThread().then((thread) => {
                      setMobileThreadsOpen(false)
                      return loadThreadData(thread.id)
                    }).catch((error: unknown) => {
                      const message = error instanceof Error ? error.message : "Failed to create thread."
                      toast.error(message)
                    })
                  }}
                />
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-semibold">{activeThread?.title ?? "Assistant"}</p>
              <p className="text-xs text-[#919191]">Context-aware help across briefs and results</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 p-3">
            {loading ? (
              <p className="text-sm text-[#919191]">Loading messages...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-[#919191]">Start a conversation with your assistant.</p>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <ChatInput disabled={sending} onSend={sendMessage} />
      </div>
    </div>
  )
}
