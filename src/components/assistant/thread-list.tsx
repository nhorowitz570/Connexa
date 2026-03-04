"use client"

import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react"
import { useState } from "react"

import type { ChatThread } from "@/components/assistant/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type ThreadListProps = {
  threads: ChatThread[]
  activeThreadId: string | null
  onSelect: (threadId: string) => void
  onNewThread: () => void
  onDelete: (threadId: string) => Promise<void>
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelect,
  onNewThread,
  onDelete,
}: ThreadListProps) {
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pendingDeleteThread =
    threads.find((thread) => thread.id === pendingDeleteThreadId) ?? null

  return (
    <>
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
                <div key={thread.id} className="group flex items-center gap-1 rounded-md">
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    className={cn(
                      "min-w-0 flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[#919191] opacity-100 transition-opacity hover:text-destructive md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => setPendingDeleteThreadId(thread.id)}
                    aria-label={`Delete ${thread.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      <Dialog
        open={Boolean(pendingDeleteThread)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteThreadId(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation?</DialogTitle>
            <DialogDescription>
              This permanently removes this thread and all messages.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDeleteThreadId(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting || !pendingDeleteThread}
              onClick={() => {
                if (!pendingDeleteThread) return
                setDeleting(true)
                void onDelete(pendingDeleteThread.id)
                  .catch(() => undefined)
                  .finally(() => {
                    setDeleting(false)
                    setPendingDeleteThreadId(null)
                  })
              }}
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Thread"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
