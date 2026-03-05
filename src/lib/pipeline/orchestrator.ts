import {
  CONFIDENCE,
  MISS_REASONS,
  getPipelineLimits,
  getPipelineTimeoutMs,
  parseSearchDepth,
  type PipelineLimits,
  type SearchDepth,
} from "@/lib/constants"
import { coerceNormalizedBrief } from "@/lib/brief-coerce"
import { BriefWeightsSchema } from "@/lib/schemas"
import { exaSearch } from "@/lib/pipeline/exa"
import { extractCandidates } from "@/lib/pipeline/extract"
import { alterlabScrape } from "@/lib/pipeline/alterlab"
import { generateQueryPlan } from "@/lib/pipeline/query-plan"
import { rankAndSelect } from "@/lib/pipeline/rank"
import { scoreCandidates } from "@/lib/pipeline/score"
import { triageCandidates } from "@/lib/pipeline/triage"
import { createAdminClient } from "@/lib/supabase/admin"
import type { BriefMode, ShortlistPayload } from "@/types"

type PipelineStep =
  | "normalize"
  | "query_plan"
  | "search"
  | "triage"
  | "evidence"
  | "extract"
  | "score"
  | "rank"

type RunPipelineOptions = {
  searchDepth?: SearchDepth
}

function collectShortlistUrls(shortlist: ShortlistPayload, limits: PipelineLimits): string[] {
  return shortlist.candidates
    .flatMap((candidate) => candidate.urls)
    .slice(0, limits.MAX_PAGE_FETCHES)
}

function isLikelyVagueScope(serviceType: string): boolean {
  const lower = serviceType.trim().toLowerCase()
  if (lower.length < 5) return true
  return ["service", "provider", "agency", "consulting", "vendor", "b2b service provider"].includes(
    lower,
  )
}

async function withStepTimeout<T>(
  step: PipelineStep,
  timeoutMs: number,
  execute: () => Promise<T>,
): Promise<T> {
  let timer: NodeJS.Timeout | null = null

  try {
    return await Promise.race([
      execute(),
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Step '${step}' timed out after ${timeoutMs}ms`))
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function runPipeline(
  briefId: string,
  runId: string,
  options: RunPipelineOptions = {},
): Promise<void> {
  const admin = createAdminClient()
  const notes: string[] = []
  const startedAtMs = Date.now()

  const updateRun = async (payload: {
    status?: "running" | "complete" | "error" | "cancelled"
    confidence_overall?: number
    search_queries?: string[]
    shortlist?: ShortlistPayload
    notesOnly?: string[]
    started_at?: string
    completed_at?: string
  }) => {
    const updatePayload: Record<string, unknown> = {
      notes: payload.notesOnly ?? notes,
    }

    if (payload.status) updatePayload.status = payload.status
    if (payload.confidence_overall !== undefined) {
      updatePayload.confidence_overall = payload.confidence_overall
    }
    if (payload.search_queries !== undefined) updatePayload.search_queries = payload.search_queries
    if (payload.shortlist) updatePayload.shortlist = payload.shortlist
    if (payload.started_at !== undefined) updatePayload.started_at = payload.started_at
    if (payload.completed_at !== undefined) updatePayload.completed_at = payload.completed_at

    await admin.from("runs").update(updatePayload).eq("id", runId)
  }

  const appendNote = (note: string) => {
    if (note.trim().length === 0 || notes.includes(note)) return
    notes.push(note)
  }

  const markStep = async (step: PipelineStep) => {
    appendNote(`step:${step}`)
    await updateRun({ notesOnly: notes })
  }

  const markBatchStep = async (
    step: "search" | "evidence" | "extract",
    batchNumber: number,
    totalBatches: number,
  ) => {
    appendNote(`step:${step}:batch:${batchNumber}/${totalBatches}`)
    await updateRun({ notesOnly: notes })
  }

  const isCancelled = async () => {
    const { data } = await admin.from("runs").select("status").eq("id", runId).maybeSingle()
    return data?.status === "cancelled"
  }

  const markCancelled = async () => {
    appendNote("Pipeline cancelled by user.")
    const completedAt = new Date().toISOString()
    await updateRun({
      status: "cancelled",
      notesOnly: notes,
      completed_at: completedAt,
    })
    await admin.from("briefs").update({ status: "cancelled" }).eq("id", briefId)
  }

  const stopIfCancelled = async () => {
    if (!(await isCancelled())) return false
    await markCancelled()
    return true
  }

  try {
    await updateRun({ started_at: new Date(startedAtMs).toISOString(), notesOnly: notes })

    const { data: brief, error: briefError } = await admin.from("briefs").select("*").eq("id", briefId).single()

    if (briefError || !brief) {
      throw new Error(briefError?.message ?? "Brief not found")
    }

    const normalized = coerceNormalizedBrief(brief.normalized_brief)
    if (!normalized) {
      throw new Error("Normalized brief is missing or invalid")
    }
    const optional = normalized.optional as Record<string, unknown>
    const searchDepth = options.searchDepth ?? parseSearchDepth(optional.search_depth)
    const limits = getPipelineLimits(searchDepth)
    const weights = BriefWeightsSchema.parse(brief.weights)
    const mode = brief.mode as BriefMode
    const timeoutMs = getPipelineTimeoutMs(searchDepth)
    const longStepTimeoutCap = searchDepth === "deep" ? 1_800_000 : 600_000
    const stepTimeouts = {
      query_plan: Math.min(90_000, Math.max(12_000, Math.floor(timeoutMs * 0.25))),
      search: Math.min(300_000, Math.max(25_000, Math.floor(timeoutMs * 0.45))),
      triage: Math.min(60_000, Math.max(8_000, Math.floor(timeoutMs * 0.15))),
      evidence: Math.min(longStepTimeoutCap, Math.max(35_000, Math.floor(timeoutMs * 0.5))),
      extract: Math.min(longStepTimeoutCap, Math.max(20_000, Math.floor(timeoutMs * 0.45))),
      score: Math.min(300_000, Math.max(20_000, Math.floor(timeoutMs * 0.35))),
      rank: Math.min(40_000, Math.max(5_000, Math.floor(timeoutMs * 0.1))),
    } as const

    const hasTimedOut = () => Date.now() - startedAtMs > timeoutMs

    await markStep("normalize")
    appendNote(`Search depth: ${searchDepth}`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const queries = await withStepTimeout("query_plan", stepTimeouts.query_plan, () =>
      generateQueryPlan(normalized, {
        maxQueries: limits.MAX_SEARCH_QUERIES,
        searchDepth,
      }),
    )
    await markStep("query_plan")
    await updateRun({ search_queries: queries })
    appendNote(`Planned ${queries.length} queries.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const raw = await withStepTimeout("search", stepTimeouts.search, () =>
      exaSearch(queries, {
        limits,
        searchDepth,
        onBatchProgress: (batchNumber, totalBatches) =>
          markBatchStep("search", batchNumber, totalBatches),
      }),
    )
    await markStep("search")
    appendNote(`Collected ${raw.length} raw search results.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const shortlist = await withStepTimeout("triage", stepTimeouts.triage, () =>
      triageCandidates(raw, normalized, {
        maxCandidates: limits.MAX_SHORTLIST_CANDIDATES,
      }),
    )
    await markStep("triage")
    await updateRun({ shortlist })
    appendNote(`Shortlisted ${shortlist.candidates.length} candidate domains.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const evidenceUrls = collectShortlistUrls(shortlist, limits)
    const evidence = await withStepTimeout("evidence", stepTimeouts.evidence, () =>
      alterlabScrape(evidenceUrls, {
        limits,
        searchDepth,
        onBatchProgress: (batchNumber, totalBatches) =>
          markBatchStep("evidence", batchNumber, totalBatches),
      }),
    )
    await markStep("evidence")
    appendNote(`Fetched evidence from ${evidence.length} pages.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    if (hasTimedOut()) {
      appendNote("Execution limit reached; finalizing with partial evidence.")
      await updateRun({ notesOnly: notes })
    }

    const candidates = await withStepTimeout("extract", stepTimeouts.extract, () =>
      extractCandidates(evidence, normalized, {
        mode,
        onBatchProgress: (batchNumber, totalBatches) =>
          markBatchStep("extract", batchNumber, totalBatches),
      }),
    )
    await markStep("extract")
    appendNote(`Extracted ${candidates.length} candidate profiles.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const scored = await withStepTimeout("score", stepTimeouts.score, () =>
      scoreCandidates(candidates, normalized, weights, mode),
    )
    await markStep("score")
    appendNote(`Scored ${scored.length} candidates.`)
    await updateRun({ notesOnly: notes })
    if (await stopIfCancelled()) return

    const topResults = await withStepTimeout("rank", stepTimeouts.rank, async () =>
      rankAndSelect(scored, limits.TOP_RESULTS),
    )
    await markStep("rank")
    if (await stopIfCancelled()) return

    const confidenceOverall =
      topResults.length > 0
        ? topResults.reduce((sum, row) => sum + row.confidence, 0) / topResults.length
        : 0

    if (topResults.length > 0) {
      const rows = topResults.map((row) => ({
        run_id: runId,
        brief_id: briefId,
        origin: "external",
        ...row,
      }))
      const { error: insertError } = await admin.from("results").insert(rows)
      if (insertError) throw new Error(insertError.message)
    }

    if (topResults.length < limits.TOP_RESULTS) {
      appendNote(
        `Found ${topResults.length} viable candidates (target ${limits.TOP_RESULTS}). Consider relaxing constraints.`,
      )
    }

    const averageScore =
      topResults.length > 0
        ? topResults.reduce((sum, result) => sum + result.score_overall, 0) / topResults.length
        : 0

    if (confidenceOverall < CONFIDENCE.MIN_FOR_SUCCESS) {
      appendNote("Confidence below 40%. Search marked as failed.")
      appendNote(`miss:${MISS_REASONS.LOW_CONFIDENCE}`)
    }
    if (topResults.length < 3) {
      appendNote(`miss:${MISS_REASONS.FEW_RESULTS}`)
    }
    if (averageScore > 0 && averageScore < 50) {
      appendNote(`miss:${MISS_REASONS.LOW_SCORES}`)
    }
    if (normalized.budget_range.max <= 0) {
      appendNote(`miss:${MISS_REASONS.MISSING_BUDGET}`)
    }
    if (isLikelyVagueScope(normalized.service_type)) {
      appendNote(`miss:${MISS_REASONS.VAGUE_SCOPE}`)
    }
    if (evidence.length === 0) {
      appendNote("No extractable evidence pages were returned from AlterLab.")
      appendNote(`miss:${MISS_REASONS.NO_EVIDENCE}`)
    }

    const finalStatus = confidenceOverall < CONFIDENCE.MIN_FOR_SUCCESS ? "error" : "complete"
    const durationSeconds = Math.round((Date.now() - startedAtMs) / 1000)
    appendNote(`Pipeline duration: ${durationSeconds}s`)
    const completedAt = new Date().toISOString()

    await updateRun({
      status: finalStatus,
      confidence_overall: confidenceOverall,
      notesOnly: notes,
      completed_at: completedAt,
    })

    await admin.from("briefs").update({ status: finalStatus }).eq("id", briefId)
  } catch (error) {
    if (await isCancelled()) {
      await markCancelled()
      return
    }

    const message = error instanceof Error ? error.message : "Unknown pipeline error"
    appendNote(message)
    const completedAt = new Date().toISOString()

    await updateRun({
      status: "error",
      notesOnly: notes,
      completed_at: completedAt,
    })
    await admin.from("briefs").update({ status: "error" }).eq("id", briefId)
  }
}
