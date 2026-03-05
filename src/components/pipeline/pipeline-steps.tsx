import { CheckCircle2, Circle, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export const PIPELINE_STEP_CONFIG = [
  { key: "normalize", label: "Understanding your needs" },
  { key: "query_plan", label: "Planning the search" },
  { key: "search", label: "Searching for matches" },
  { key: "triage", label: "Filtering results" },
  { key: "evidence", label: "Gathering details" },
  { key: "extract", label: "Reading company pages" },
  { key: "score", label: "Rating each match" },
  { key: "rank", label: "Ranking your top picks" },
] as const

export type PipelineStepKey = (typeof PIPELINE_STEP_CONFIG)[number]["key"]

type PipelineStepsProps = {
  completedStepKeys: PipelineStepKey[]
  status: "running" | "complete" | "error" | "cancelled"
  variant?: "default" | "immersive"
}

export function PipelineSteps({ completedStepKeys, status, variant = "default" }: PipelineStepsProps) {
  const completedSet = new Set(completedStepKeys)
  const firstPendingIndex = PIPELINE_STEP_CONFIG.findIndex((step) => !completedSet.has(step.key))
  const isImmersive = variant === "immersive"

  return (
    <ol className={cn("space-y-2", isImmersive && "space-y-2.5")}>
      {PIPELINE_STEP_CONFIG.map((step, index) => {
        const done = completedSet.has(step.key)
        const active = status === "running" && !done && index === firstPendingIndex

        return (
          <li
            key={step.key}
            className={cn(
              "flex items-center gap-2 text-sm",
              isImmersive && "rounded-lg border border-[#2A3040] bg-[#131927] px-3 py-2",
            )}
          >
            {done ? (
              <CheckCircle2 className={cn("h-4 w-4 text-emerald-400", isImmersive && "text-emerald-300")} />
            ) : active ? (
              <Loader2 className={cn("h-4 w-4 animate-spin text-indigo-400", isImmersive && "text-indigo-300")} />
            ) : (
              <Circle className={cn("h-4 w-4 text-[#919191]", isImmersive && "text-[#667089]")} />
            )}
            <span
              className={cn(
                isImmersive ? "text-[#95A0B6]" : "text-[#919191]",
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
