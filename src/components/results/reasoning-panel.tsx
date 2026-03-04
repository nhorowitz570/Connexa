import { SCORE_LABELS } from "@/lib/constants"

type ReasoningPanelProps = {
  reasoning: Record<string, string> | null | undefined
}

export function ReasoningPanel({ reasoning }: ReasoningPanelProps) {
  if (!reasoning || Object.keys(reasoning).length === 0) return null

  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer text-sm font-medium">Detailed reasoning</summary>
      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
        {Object.entries(reasoning).map(([criterion, text]) => (
          <div key={criterion}>
            <p className="font-medium text-foreground">{SCORE_LABELS[criterion] ?? criterion.replaceAll("_", " ")}</p>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </details>
  )
}
