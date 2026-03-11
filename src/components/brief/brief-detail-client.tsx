"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { toast } from "sonner"

import { ClarificationRenderer } from "@/components/brief/clarification-renderer"
import { RunStatusPoller } from "@/components/pipeline/run-status-poller"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { QuestionsPayload } from "@/types"

type BriefDetailClientProps = {
  latestRun: {
    id: string
    status: "running" | "complete" | "error" | "cancelled"
    confidence_overall: number | null
    notes: string[]
  } | null
  briefId: string
  normalizedBrief: unknown
  clarificationPayload: QuestionsPayload | null
  clarificationGenerationPending: boolean
  clarificationStuckReset: boolean
}

export function BriefDetailClient({
  latestRun,
  briefId,
  normalizedBrief,
  clarificationPayload,
  clarificationGenerationPending,
  clarificationStuckReset,
}: BriefDetailClientProps) {
  const router = useRouter()
  const [submittingClarifications, setSubmittingClarifications] = useState(false)

  const handleClarificationSubmit = async (answers: Record<string, unknown>) => {
    setSubmittingClarifications(true)
    try {
      const response = await fetch("/api/brief/clarify/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_id: briefId,
          answers,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit clarifications.")
      }

      toast.success("Clarifications saved. Run started.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit clarifications."
      toast.error(message)
    } finally {
      setSubmittingClarifications(false)
    }
  }

  const handleRunFinished = useCallback(() => {
    router.refresh()
  }, [router])

  return (
    <>
      {clarificationPayload ? (
        <div className="space-y-3">
          <Card className="border-amber-500/35 bg-amber-500/10">
            <CardContent className="pt-6 text-sm text-amber-800 dark:text-amber-200">
              This brief has pending questions from a previous session. Please answer them to continue.
            </CardContent>
          </Card>
          <ClarificationRenderer
            payload={clarificationPayload}
            submitting={submittingClarifications}
            onSubmit={handleClarificationSubmit}
          />
        </div>
      ) : null}

      {clarificationGenerationPending ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Clarification questions are still being prepared. Refresh in a few seconds.
          </CardContent>
        </Card>
      ) : null}

      {clarificationStuckReset ? (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              This brief was stuck in clarification without question data. It has been reset to draft.
            </p>
            <Button asChild variant="outline">
              <Link href="/brief/new">Start over</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {latestRun ? (
        <RunStatusPoller
          briefId={briefId}
          normalizedBrief={normalizedBrief}
          runId={latestRun.id}
          initialStatus={latestRun.status}
          initialConfidence={latestRun.confidence_overall}
          initialNotes={latestRun.notes}
          onRunFinished={handleRunFinished}
        />
      ) : null}
    </>
  )
}
