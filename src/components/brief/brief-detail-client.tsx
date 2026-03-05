"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { RunStatusPoller } from "@/components/pipeline/run-status-poller"

type BriefDetailClientProps = {
  latestRun: {
    id: string
    status: "running" | "complete" | "error" | "cancelled"
    confidence_overall: number | null
    notes: string[]
  } | null
  briefId: string
  normalizedBrief: unknown
}

export function BriefDetailClient({ latestRun, briefId, normalizedBrief }: BriefDetailClientProps) {
  const router = useRouter()
  const handleRunFinished = useCallback(() => {
    router.refresh()
  }, [router])

  if (!latestRun) return null

  return (
    <RunStatusPoller
      briefId={briefId}
      normalizedBrief={normalizedBrief}
      runId={latestRun.id}
      initialStatus={latestRun.status}
      initialConfidence={latestRun.confidence_overall}
      initialNotes={latestRun.notes}
      onRunFinished={handleRunFinished}
    />
  )
}
