import { PIPELINE_LIMITS } from "@/lib/constants"
import type { ScoredResult } from "@/types"

export function rankAndSelect(scored: ScoredResult[], topN: number = PIPELINE_LIMITS.TOP_RESULTS): ScoredResult[] {
  const sorted = [...scored].sort((a, b) => {
    if (b.score_overall !== a.score_overall) return b.score_overall - a.score_overall
    return b.confidence - a.confidence
  })

  return sorted.slice(0, topN)
}
