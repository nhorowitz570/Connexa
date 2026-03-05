"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { AlertCircle, Loader2 } from "lucide-react"

import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { PIPELINE_STEP_CONFIG, type PipelineStepKey, PipelineSteps } from "@/components/pipeline/pipeline-steps"
import { RerunButton } from "@/components/pipeline/rerun-button"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

type RunStatusPollerProps = {
  briefId: string
  normalizedBrief: unknown
  runId: string
  initialStatus: "running" | "complete" | "error" | "cancelled"
  initialConfidence: number | null
  initialNotes: string[]
  onRunFinished?: () => void
  variant?: "default" | "immersive"
}

type ApiStatusResponse = {
  status: "running" | "complete" | "error" | "cancelled"
  confidence_overall: number | null
  notes: string[]
  search_queries?: string[]
}

function extractStepKeys(notes: string[]): PipelineStepKey[] {
  const validKeys = new Set(PIPELINE_STEP_CONFIG.map((step) => step.key))
  const keys: PipelineStepKey[] = []

  for (const note of notes) {
    if (!note.startsWith("step:")) continue
    const rawStep = note.slice(5)
    if (rawStep.includes(":")) continue
    const key = rawStep as PipelineStepKey
    if (validKeys.has(key) && !keys.includes(key)) {
      keys.push(key)
    }
  }

  return keys
}

function extractActiveSubstep(notes: string[], stepKey: PipelineStepKey | null): string | null {
  if (!stepKey) return null
  const prefix = `step:${stepKey}:`
  const matching = notes.filter((note) => note.startsWith(prefix))
  const latest = matching[matching.length - 1]
  if (!latest) return null

  const batchMatch = latest.match(/^step:[^:]+:batch:(\d+)\/(\d+)$/)
  if (batchMatch) {
    return `Batch ${batchMatch[1]} of ${batchMatch[2]}`
  }

  const custom = latest.slice(prefix.length).trim()
  return custom.length > 0 ? custom : null
}

function isStepOrTagNote(note: string) {
  return note.startsWith("step:") || note.startsWith("miss:")
}

function getConfidenceTier(confidence: number, variant: "default" | "immersive"): {
  label: "High" | "Medium" | "Low"
  className: string
} {
  if (variant === "immersive") {
    if (confidence >= 0.75) {
      return { label: "High", className: "border border-emerald-400/30 bg-emerald-500/15 text-emerald-200" }
    }
    if (confidence >= 0.5) {
      return { label: "Medium", className: "border border-amber-400/30 bg-amber-500/15 text-amber-200" }
    }
    return { label: "Low", className: "border border-rose-400/30 bg-rose-500/15 text-rose-200" }
  }

  if (confidence >= 0.75) {
    return { label: "High", className: "bg-emerald-100 text-emerald-700" }
  }
  if (confidence >= 0.5) {
    return { label: "Medium", className: "bg-amber-100 text-amber-700" }
  }
  return { label: "Low", className: "bg-rose-100 text-rose-700" }
}

export function RunStatusPoller({
  briefId,
  normalizedBrief,
  runId,
  initialStatus,
  initialConfidence,
  initialNotes,
  onRunFinished,
  variant = "default",
}: RunStatusPollerProps) {
  const [status, setStatus] = useState(initialStatus)
  const [confidence, setConfidence] = useState(initialConfidence)
  const [notes, setNotes] = useState(initialNotes)
  const [queries, setQueries] = useState<string[]>([])
  const [errorPopupOpen, setErrorPopupOpen] = useState(false)
  const [hasSeenError, setHasSeenError] = useState(false)
  const previousStatusRef = useRef(initialStatus)

  useEffect(() => {
    let cancelled = false

    const syncStatus = async () => {
      const response = await fetch(`/api/pipeline/status/${runId}`)
      if (!response.ok) return
      const payload = (await response.json()) as ApiStatusResponse
      if (cancelled) return

      setStatus(payload.status)
      setConfidence(payload.confidence_overall)
      setNotes(Array.isArray(payload.notes) ? payload.notes : [])
      setQueries(Array.isArray(payload.search_queries) ? payload.search_queries : [])
    }

    void syncStatus()

    if (status !== "running") {
      return () => {
        cancelled = true
      }
    }

    const interval = setInterval(() => {
      void syncStatus()
    }, 2500)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [runId, status])

  useEffect(() => {
    if (previousStatusRef.current === "running" && status !== "running") {
      const timeout = window.setTimeout(() => {
        onRunFinished?.()
      }, 500)
      previousStatusRef.current = status
      return () => window.clearTimeout(timeout)
    }

    previousStatusRef.current = status
  }, [onRunFinished, status])

  useEffect(() => {
    if (status === "error" && !hasSeenError) {
      const timeout = window.setTimeout(() => {
        setErrorPopupOpen(true)
        setHasSeenError(true)
      }, 0)

      return () => {
        window.clearTimeout(timeout)
      }
    }
  }, [status, hasSeenError])

  const completedStepKeys = useMemo(() => extractStepKeys(notes), [notes])
  const progress = Math.round((completedStepKeys.length / PIPELINE_STEP_CONFIG.length) * 100)

  const activeStep = useMemo(() => {
    const completedSet = new Set(completedStepKeys)
    const nextStep = PIPELINE_STEP_CONFIG.find((step) => !completedSet.has(step.key))
    const substep = extractActiveSubstep(notes, nextStep?.key ?? null)

    if (!nextStep) {
      if (status === "error") {
        return `Failed after ${completedStepKeys.length} of ${PIPELINE_STEP_CONFIG.length} steps`
      }
      if (status === "cancelled") {
        return `Cancelled after ${completedStepKeys.length} of ${PIPELINE_STEP_CONFIG.length} steps`
      }
      return `Completed ${PIPELINE_STEP_CONFIG.length} of ${PIPELINE_STEP_CONFIG.length} steps`
    }

    const label = nextStep.label
    return substep ? `${label} (${substep})` : label
  }, [completedStepKeys, notes, status])

  const displayNotes = notes.filter((note) => !isStepOrTagNote(note))
  const confidenceTier = confidence !== null ? getConfidenceTier(confidence, variant) : null
  const isDeepSearchRun = notes.some((note) => note.toLowerCase().includes("search depth: deep"))
  const isImmersive = variant === "immersive"

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border bg-card p-4",
        isImmersive && "space-y-4 rounded-2xl border-[#2A2E3A] bg-[#0F131C]/95 p-5 text-white",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {status === "running" ? <Loader2 className={cn("h-4 w-4 animate-spin", isImmersive && "text-indigo-300")} /> : null}
        <BriefStatusBadge
          status={
            status === "running"
              ? "running"
              : status === "error"
                ? "error"
                : status === "cancelled"
                  ? "cancelled"
                  : "complete"
          }
        />
        {confidenceTier ? (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${confidenceTier.className}`}>
            Result quality: {confidenceTier.label}
          </span>
        ) : null}
        {status === "running" && isDeepSearchRun ? (
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-300">
            Thorough searches can take up to an hour. Feel free to close this page — we&apos;ll keep searching.
          </span>
        ) : null}
      </div>

      <p className={cn("text-sm text-muted-foreground", isImmersive && "text-[#C6CEDA]")}>{activeStep}</p>

      <Progress
        value={progress}
        className={cn(
          "h-2 transition-all",
          isImmersive && "bg-[#1A1F2A] [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-cyan-400",
        )}
      />

      <PipelineSteps completedStepKeys={completedStepKeys} status={status} variant={variant} />

      {queries.length > 0 ? (
        <div
          className={cn(
            "space-y-2 rounded-md border border-dashed p-3",
            isImmersive && "border-[#313746] bg-[#111622]",
          )}
        >
          <p className={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", isImmersive && "text-[#9EA8BA]")}>
            Currently searching for
          </p>
          <ul className={cn("max-h-32 space-y-1 overflow-auto text-sm text-muted-foreground", isImmersive && "text-[#C6CEDA]")}>
            {queries.map((query) => (
              <li key={query}>{query}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {displayNotes.length > 0 ? (
        <ul className={cn("list-disc space-y-1 pl-4 text-sm text-muted-foreground", isImmersive && "text-[#AAB4C4]")}>
          {displayNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}

      <Dialog open={errorPopupOpen} onOpenChange={setErrorPopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Search Error
            </DialogTitle>
            <DialogDescription>
              This search encountered an error and could not finish. It can happen when AI requests time out or the network is unstable.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setErrorPopupOpen(false)}>
              Dismiss
            </Button>
            <RerunButton
              briefId={briefId}
              status={status as "error"}
              normalizedBrief={normalizedBrief}
            />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
