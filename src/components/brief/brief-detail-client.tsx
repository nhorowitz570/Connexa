"use client"

import { useRouter } from "next/navigation"
import { useCallback } from "react"

import { RunStatusPoller } from "@/components/pipeline/run-status-poller"

type BriefDetailClientProps = {
  latestRun: {
    id: string
    status: "running" | "complete" | "failed"
    confidence_overall: number | null
    notes: string[]
  } | null
}

export function BriefDetailClient({ latestRun }: BriefDetailClientProps) {
  const router = useRouter()
  const handleRunFinished = useCallback(() => {
    router.refresh()
  }, [router])

  if (!latestRun) return null

  return (
    <RunStatusPoller
      runId={latestRun.id}
      initialStatus={latestRun.status}
      initialConfidence={latestRun.confidence_overall}
      initialNotes={latestRun.notes}
      onRunFinished={handleRunFinished}
    />
  )
}
