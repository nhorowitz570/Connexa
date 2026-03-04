import { AlertTriangle } from "lucide-react"

import type { BriefMode } from "@/types"

type LowConfidenceTipsProps = {
  mode: BriefMode
}

export function LowConfidenceTips({ mode }: LowConfidenceTipsProps) {
  const tips =
    mode === "simple"
      ? ["If you used Simple mode, try Detailed mode for more control."]
      : [
          "Add more specific constraints so candidate filtering is tighter.",
          "Narrow geography to a specific state or metro when possible.",
          "Add portfolio requirements to improve evidence-based matching.",
        ]

  return (
    <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
        <AlertTriangle className="h-3.5 w-3.5" />
        Improve this brief
      </p>
      <ul className="list-disc space-y-1 pl-4">
        {tips.map((tip) => (
          <li key={tip}>{tip}</li>
        ))}
      </ul>
    </div>
  )
}
