"use client"

import { useEffect, useState } from "react"

import { Skeleton } from "@/components/ui/skeleton"

type AiSummaryProps = {
  briefId: string
  normalizedBrief: unknown
}

const summaryCache = new Map<string, string>()

export function AiSummary({ briefId, normalizedBrief }: AiSummaryProps) {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState("")

  useEffect(() => {
    const cached = summaryCache.get(briefId)
    if (cached) {
      setSummary(cached)
      setLoading(false)
      return
    }

    let active = true
    const loadSummary = async () => {
      try {
        const response = await fetch("/api/brief/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief_id: briefId,
            normalized_brief: normalizedBrief,
          }),
        })
        const payload = (await response.json()) as { summary?: string; error?: string }
        if (!response.ok || !payload.summary) {
          throw new Error(payload.error ?? "Failed to load summary.")
        }
        if (!active) return
        summaryCache.set(briefId, payload.summary)
        setSummary(payload.summary)
      } catch {
        if (!active) return
        setSummary("Summary unavailable right now.")
      } finally {
        if (active) setLoading(false)
      }
    }

    void loadSummary()
    return () => {
      active = false
    }
  }, [briefId, normalizedBrief])

  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">AI Summary</p>
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[85%]" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{summary}</p>
      )}
    </div>
  )
}
