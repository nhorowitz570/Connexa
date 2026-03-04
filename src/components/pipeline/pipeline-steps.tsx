import { CheckCircle2, Circle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export const PIPELINE_STEP_CONFIG = [
  { key: "normalize", label: "Normalizing brief" },
  { key: "query_plan", label: "Planning search queries" },
  { key: "search", label: "Searching the web" },
  { key: "triage", label: "Triaging candidates" },
  { key: "evidence", label: "Fetching evidence" },
  { key: "extract", label: "Extracting company data" },
  { key: "score", label: "Scoring matches" },
  { key: "rank", label: "Ranking results" },
] as const

export type PipelineStepKey = (typeof PIPELINE_STEP_CONFIG)[number]["key"]

type PipelineStepsProps = {
  completedStepKeys: PipelineStepKey[]
  status: "running" | "complete" | "failed" | "cancelled"
}

export function PipelineSteps({ completedStepKeys, status }: PipelineStepsProps) {
  const completedSet = new Set(completedStepKeys)
  const firstPendingIndex = PIPELINE_STEP_CONFIG.findIndex((step) => !completedSet.has(step.key))

  return (
    <ol className="space-y-2">
      {PIPELINE_STEP_CONFIG.map((step, index) => {
        const done = completedSet.has(step.key)
        const active = status === "running" && !done && index === firstPendingIndex

        return (
          <li key={step.key} className="flex items-center gap-2 text-sm">
            {done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : active ? (
              <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            ) : (
              <Circle className="h-4 w-4 text-[#919191]" />
            )}
            <span
              className={cn(
                "text-[#919191]",
                done && "text-white",
                active && "font-medium text-white",
              )}
            >
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
