import { SCORE_LABELS } from "@/lib/constants"
import type { ScoreBreakdown } from "@/types"

type ScoreBreakdownProps = {
  breakdown: ScoreBreakdown
}

function barColor(score: number): string {
  if (score >= 90) return "bg-emerald-500"
  if (score >= 80) return "bg-indigo-500"
  if (score >= 70) return "bg-blue-500"
  return "bg-amber-500"
}

export function ScoreBreakdown({ breakdown }: ScoreBreakdownProps) {
  return (
    <div className="space-y-2">
      {Object.entries(breakdown).map(([key, score]) => (
        <div key={key} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{SCORE_LABELS[key] ?? key.replaceAll("_", " ")}</span>
            <span>{score}</span>
          </div>
          <div className="h-2 rounded bg-[#30363D]">
            <div className={`h-2 rounded ${barColor(score)}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
