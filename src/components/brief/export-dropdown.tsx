"use client"

import { Download } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { serializeBriefAsJson, serializeBriefAsMarkdown } from "@/lib/export/serialize-brief"
import type { BriefMode, BriefStatus } from "@/types"

type ExportBriefDropdownProps = {
  briefId: string
  mode: BriefMode
  status: BriefStatus
  normalizedBrief: unknown
  weights: unknown
  run: {
    id: string
    status: "running" | "complete" | "failed" | "cancelled"
    confidence_overall: number | null
    notes: string[]
    search_queries?: string[]
    created_at?: string
  } | null
  results: Array<{
    company_name: string
    website_url: string
    contact_url?: string | null
    contact_email?: string | null
    geography?: string | null
    services?: string[]
    industries?: string[]
    score_overall: number
    score_breakdown: Record<string, number>
    reasoning_summary: string
    confidence: number
  }>
}

function slugify(value: string): string {
  const trimmed = value.trim().toLowerCase()
  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug || "brief"
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

export function ExportDropdown({
  briefId,
  mode,
  status,
  normalizedBrief,
  weights,
  run,
  results,
}: ExportBriefDropdownProps) {
  const serviceType =
    normalizedBrief && typeof normalizedBrief === "object" && "service_type" in normalizedBrief
      ? String((normalizedBrief as { service_type?: unknown }).service_type ?? "brief")
      : "brief"
  const dateStamp = new Date().toISOString().slice(0, 10)
  const baseFileName = `connexa-brief-${slugify(serviceType)}-${dateStamp}`

  const exportInput = {
    brief: {
      id: briefId,
      mode,
      status,
      normalized_brief: normalizedBrief,
      weights,
    },
    run,
    results,
  }

  const handleJsonExport = () => {
    try {
      const content = serializeBriefAsJson(exportInput)
      downloadTextFile(content, `${baseFileName}.json`, "application/json;charset=utf-8")
      toast.success("Brief JSON export started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export JSON."
      toast.error(message)
    }
  }

  const handleMarkdownExport = () => {
    try {
      const content = serializeBriefAsMarkdown(exportInput)
      downloadTextFile(content, `${baseFileName}.md`, "text/markdown;charset=utf-8")
      toast.success("Brief Markdown export started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to export Markdown."
      toast.error(message)
    }
  }

  const handlePdfExport = () => {
    window.open(`/export/brief/${briefId}`, "_blank", "noopener,noreferrer")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export
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
