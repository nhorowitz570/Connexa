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
  newThreadDisabled?: boolean
}

export function ThreadList({
  threads,
  activeThreadId,
  onSelect,
  onNewThread,
  onDelete,
  newThreadDisabled = false,
}: ThreadListProps) {
  const [pendingDeleteThreadId, setPendingDeleteThreadId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pendingDeleteThread =
    threads.find((thread) => thread.id === pendingDeleteThreadId) ?? null

  return (
    <>
      <aside className="glass-card flex h-full flex-col rounded-none border border-border bg-card/75 dark:border-white/10 dark:bg-[#111928]/70">
        <div className="border-b border-border p-3 dark:border-white/10">
          <Button
            className="h-11 w-full rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground dark:disabled:bg-[#3b3f46] dark:disabled:text-[#a3a3a3]"
            onClick={onNewThread}
            disabled={newThreadDisabled}
          >
            <MessageSquarePlus className="mr-2 h-4 w-4" />
            New Chat
          </Button>
        </div>

        <div className="space-y-1 overflow-y-auto p-2">
          {threads.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No chats yet.</p>
          ) : (
            threads.map((thread) => {
              const active = thread.id === activeThreadId
              return (
                <div key={thread.id} className="group flex items-center gap-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => onSelect(thread.id)}
                    className={cn(
                      "min-h-11 min-w-0 flex-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      active
                        ? "border-indigo-400/50 bg-indigo-500/12 text-indigo-900 dark:bg-indigo-500/15 dark:text-white"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white",
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
                    className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
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
