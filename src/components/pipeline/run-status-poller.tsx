"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Loader2 } from "lucide-react"

import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { PIPELINE_STEP_CONFIG, type PipelineStepKey, PipelineSteps } from "@/components/pipeline/pipeline-steps"
import { Progress } from "@/components/ui/progress"

type RunStatusPollerProps = {
  runId: string
  initialStatus: "running" | "complete" | "failed"
  initialConfidence: number | null
  initialNotes: string[]
  onRunFinished?: () => void
}

type ApiStatusResponse = {
  status: "running" | "complete" | "failed"
  confidence_overall: number | null
  notes: string[]
  tavily_queries?: string[]
}

function extractStepKeys(notes: string[]): PipelineStepKey[] {
  const validKeys = new Set(PIPELINE_STEP_CONFIG.map((step) => step.key))
  const keys: PipelineStepKey[] = []

  for (const note of notes) {
    if (!note.startsWith("step:")) continue
    const key = note.slice(5) as PipelineStepKey
    if (validKeys.has(key) && !keys.includes(key)) {
      keys.push(key)
    }
  }

  return keys
}

function isStepOrTagNote(note: string) {
  return note.startsWith("step:") || note.startsWith("miss:")
}

function getConfidenceTier(confidence: number): {
  label: "High" | "Medium" | "Low"
  className: string
} {
  if (confidence >= 0.75) {
    return { label: "High", className: "bg-emerald-100 text-emerald-700" }
  }
  if (confidence >= 0.5) {
    return { label: "Medium", className: "bg-amber-100 text-amber-700" }
  }
  return { label: "Low", className: "bg-rose-100 text-rose-700" }
}

export function RunStatusPoller({
  runId,
  initialStatus,
  initialConfidence,
  initialNotes,
  onRunFinished,
}: RunStatusPollerProps) {
  const [status, setStatus] = useState(initialStatus)
  const [confidence, setConfidence] = useState(initialConfidence)
  const [notes, setNotes] = useState(initialNotes)
  const [queries, setQueries] = useState<string[]>([])
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
      setQueries(Array.isArray(payload.tavily_queries) ? payload.tavily_queries : [])
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

  const completedStepKeys = useMemo(() => extractStepKeys(notes), [notes])
  const progress = Math.round((completedStepKeys.length / PIPELINE_STEP_CONFIG.length) * 100)

  const activeStep = useMemo(() => {
    const completedSet = new Set(completedStepKeys)
    const nextStep = PIPELINE_STEP_CONFIG.find((step) => !completedSet.has(step.key))

    if (!nextStep) {
      if (status === "failed") {
        return `Failed after ${completedStepKeys.length} of ${PIPELINE_STEP_CONFIG.length} steps`
      }
      return `Completed ${PIPELINE_STEP_CONFIG.length} of ${PIPELINE_STEP_CONFIG.length} steps`
    }

    const index = PIPELINE_STEP_CONFIG.findIndex((step) => step.key === nextStep.key)
    return `Step ${index + 1} of ${PIPELINE_STEP_CONFIG.length}: ${nextStep.label}`
  }, [completedStepKeys, status])

  const displayNotes = notes.filter((note) => !isStepOrTagNote(note))
  const confidenceTier = confidence !== null ? getConfidenceTier(confidence) : null

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "running" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        <BriefStatusBadge
          status={status === "running" ? "running" : status === "failed" ? "failed" : "complete"}
        />
        {confidenceTier ? (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${confidenceTier.className}`}>
            Confidence: {confidenceTier.label}
          </span>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">{activeStep}</p>

      <Progress value={progress} className="h-2 transition-all" />

      <PipelineSteps completedStepKeys={completedStepKeys} status={status} />

      {queries.length > 0 ? (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            What the AI is searching
          </p>
          <ul className="max-h-32 space-y-1 overflow-auto text-sm text-muted-foreground">
            {queries.map((query) => (
              <li key={query}>Searching: {query}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {displayNotes.length > 0 ? (
        <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
          {displayNotes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
