"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Paperclip } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type BriefAttachment = {
  id: string
  name: string
  type: string
  size: number
  url: string | null
  created_at?: string
}

type AttachmentListProps = {
  briefId: string
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentList({ briefId }: AttachmentListProps) {
  const [attachments, setAttachments] = useState<BriefAttachment[]>([])

  useEffect(() => {
    let cancelled = false

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

    return () => {
      cancelled = true
    }
  }, [briefId])

  if (attachments.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Paperclip className="h-4 w-4" />
          Attachments ({attachments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {attachments.map((attachment) => (
          <div key={attachment.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
              <p className="text-xs text-muted-foreground">
                {attachment.type || "Unknown type"} - {formatFileSize(attachment.size)}
              </p>
            </div>
            {attachment.url ? (
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400"
              >
                Open
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Unavailable</span>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
