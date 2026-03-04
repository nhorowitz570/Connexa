"use client"

import { MessageSquarePlus } from "lucide-react"

import type { ChatThread } from "@/components/assistant/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ThreadListProps = {
  threads: ChatThread[]
  activeThreadId: string | null
  onSelect: (threadId: string) => void
  onNewThread: () => void
}

export function ThreadList({ threads, activeThreadId, onSelect, onNewThread }: ThreadListProps) {
  return (
    <aside className="flex h-full flex-col border-r border-[#30363D] bg-[#161B22]">
      <div className="border-b border-[#30363D] p-3">
        <Button className="w-full" onClick={onNewThread}>
          <MessageSquarePlus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="space-y-1 overflow-y-auto p-2">
        {threads.length === 0 ? (
          <p className="px-2 py-3 text-sm text-[#919191]">No chats yet.</p>
        ) : (
          threads.map((thread) => {
            const active = thread.id === activeThreadId
            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelect(thread.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-[#1F1F1F] text-white"
                    : "hover:bg-[#1A1A1A] text-[#919191] hover:text-white",
                )}
              >
                <p className="truncate font-medium">{thread.title}</p>
                <p className="truncate text-xs opacity-80">
                  {new Date(thread.updated_at).toLocaleDateString()} {new Date(thread.updated_at).toLocaleTimeString()}
                </p>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
