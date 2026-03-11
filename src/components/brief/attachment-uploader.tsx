"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { FileUp, Loader2, Paperclip, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const MAX_ATTACHMENTS = 10

type BriefAttachment = {
  id: string
  name: string
  type: string
  size: number
  path?: string
  url?: string | null
  created_at?: string
}

type AttachmentUploaderProps = {
  briefId: string | null
  disabled?: boolean
  onEnsureBrief: () => Promise<string>
  onCountChange?: (count: number) => void
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentUploader({ briefId, disabled, onEnsureBrief, onCountChange }: AttachmentUploaderProps) {
  const [attachments, setAttachments] = useState<BriefAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const attachmentCount = attachments.length
  const canAddMore = attachmentCount < MAX_ATTACHMENTS

  const sortedAttachments = useMemo(() => {
    return [...attachments].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0
      return bTime - aTime
    })
  }, [attachments])

  useEffect(() => {
    onCountChange?.(attachmentCount)
  }, [attachmentCount, onCountChange])

  useEffect(() => {
    if (!briefId) {
      setAttachments([])
      return
    }

    let cancelled = false
    setLoading(true)

    void fetch(`/api/brief/${briefId}/attachments`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { data: { attachments: [] } }))
      .then((payload: { data?: { attachments?: BriefAttachment[] } }) => {
        if (cancelled) return
        setAttachments(Array.isArray(payload.data?.attachments) ? payload.data.attachments : [])
      })
      .catch(() => {
        if (!cancelled) {
          setAttachments([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [briefId])

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (disabled) return

    if (!canAddMore) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments reached.`)
      return
    }

    setUploading(true)
    try {
      const targetBriefId = briefId ?? (await onEnsureBrief())

      for (const file of Array.from(files)) {
        if (attachments.length >= MAX_ATTACHMENTS) {
          toast.error(`Maximum ${MAX_ATTACHMENTS} attachments reached.`)
          break
        }

        const formData = new FormData()
        formData.append("file", file)

        const response = await fetch(`/api/brief/${targetBriefId}/attachments`, {
          method: "POST",
          body: formData,
        })

        const payload = (await response.json()) as {
          data?: { attachment?: BriefAttachment }
          error?: string
        }

        if (!response.ok || !payload.data?.attachment) {
          toast.error(payload.error ?? `Failed to upload ${file.name}.`)
          continue
        }

        setAttachments((current) => {
          const next = [payload.data!.attachment!, ...current]
          return next.slice(0, MAX_ATTACHMENTS)
        })
        toast.success(`${file.name} uploaded.`)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload attachments."
      toast.error(message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  const removeAttachment = async (attachmentId: string) => {
    if (!briefId) return

    try {
      const response = await fetch(`/api/brief/${briefId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachment_id: attachmentId }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to remove attachment.")
      }

      setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId))
      toast.success("Attachment removed.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove attachment."
      toast.error(message)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" />
          Attachments
        </CardTitle>
        <CardDescription>
          Add up to {MAX_ATTACHMENTS} files (PDF, DOC, DOCX, TXT, CSV, PNG, JPG, JPEG). Max 10MB each.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.png,.jpg,.jpeg"
          onChange={(event) => {
            void uploadFiles(event.target.files)
          }}
        />

        <button
          type="button"
          disabled={disabled || uploading || !canAddMore}
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            void uploadFiles(event.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`w-full rounded-xl border border-dashed px-4 py-6 text-left transition-colors ${dragging
              ? "border-indigo-500/60 bg-indigo-500/10"
              : "border-border bg-muted/30 hover:bg-muted/50"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-500/15 p-2 text-indigo-400">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {uploading ? "Uploading files..." : "Drop files here or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground">
                {attachmentCount}/{MAX_ATTACHMENTS} attached
              </p>
            </div>
          </div>
        </button>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading attachments...</p>
        ) : sortedAttachments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No attachments yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.type || "Unknown type"} - {formatFileSize(attachment.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => void removeAttachment(attachment.id)}
                  disabled={disabled || uploading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
