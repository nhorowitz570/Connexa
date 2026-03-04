"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"

import type { ChatMessage, ChatThread } from "@/components/assistant/types"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { serializeThreadAsJson, serializeThreadAsMarkdown } from "@/lib/export/serialize-thread"

type ExportThreadDropdownProps = {
  thread: ChatThread | null
  messages: ChatMessage[]
}

function slugify(value: string): string {
  const trimmed = value.trim().toLowerCase()
  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug || "thread"
}

function downloadTextFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

export function ExportThreadDropdown({ thread, messages }: ExportThreadDropdownProps) {
  if (!thread) {
    return (
      <Button variant="outline" disabled>
        <Download className="mr-2 h-4 w-4" />
        Export Thread
      </Button>
    )
  }

  const dateStamp = new Date().toISOString().slice(0, 10)
  const baseFileName = `connexa-thread-${slugify(thread.title)}-${dateStamp}`
  const exportInput = { thread, messages }

  const handleJsonExport = () => {
    try {
      const content = serializeThreadAsJson(exportInput)
      downloadTextFile(content, `${baseFileName}.json`, "application/json;charset=utf-8")
      toast.success("Thread JSON export started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export JSON."
      toast.error(message)
    }
  }

  const handleMarkdownExport = () => {
    try {
      const content = serializeThreadAsMarkdown(exportInput)
      downloadTextFile(content, `${baseFileName}.md`, "text/markdown;charset=utf-8")
      toast.success("Thread Markdown export started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export Markdown."
      toast.error(message)
    }
  }

  const handlePdfExport = () => {
    window.open(`/export/thread/${thread.id}`, "_blank", "noopener,noreferrer")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Thread
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handlePdfExport}>Export PDF</DropdownMenuItem>
        <DropdownMenuItem onClick={handleMarkdownExport}>Export Markdown</DropdownMenuItem>
        <DropdownMenuItem onClick={handleJsonExport}>Export JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
