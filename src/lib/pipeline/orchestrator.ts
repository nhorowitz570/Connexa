import { CONFIDENCE, MISS_REASONS, PIPELINE_LIMITS } from "@/lib/constants"
import { BriefWeightsSchema, NormalizedBriefSchema } from "@/lib/schemas"
import { extractCandidates } from "@/lib/pipeline/extract"
import { generateQueryPlan } from "@/lib/pipeline/query-plan"
import { rankAndSelect } from "@/lib/pipeline/rank"
import { scoreCandidates } from "@/lib/pipeline/score"
import { tavilyExtract, tavilySearch } from "@/lib/pipeline/tavily"
import { triageCandidates } from "@/lib/pipeline/triage"
import { createAdminClient } from "@/lib/supabase/admin"
import type { BriefMode, NormalizedBrief, ShortlistPayload } from "@/types"

type PipelineStep =
  | "normalize"
  | "query_plan"
  | "search"
  | "triage"
  | "evidence"
  | "extract"
  | "score"
  | "rank"

function collectShortlistUrls(shortlist: ShortlistPayload): string[] {
  return shortlist.candidates
    .flatMap((candidate) => candidate.urls)
    .slice(0, PIPELINE_LIMITS.MAX_PAGE_FETCHES)
}

function isLikelyVagueScope(serviceType: string): boolean {
  const lower = serviceType.trim().toLowerCase()
  if (lower.length < 5) return true
  return ["service", "provider", "agency", "consulting", "vendor", "b2b service provider"].includes(
    lower,
  )
}

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) return null

  const suffixMatch = cleaned.match(/^([0-9,.]+)\s*([km])$/)
  if (suffixMatch) {
    const base = Number(suffixMatch[1].replaceAll(",", ""))
    if (!Number.isFinite(base)) return null
    const multiplier = suffixMatch[2] === "m" ? 1_000_000 : 1_000
    return base * multiplier
  }

  const numeric = Number(cleaned.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,;|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }
  return []
}

function coerceNormalizedBrief(raw: unknown): NormalizedBrief {
  const direct = NormalizedBriefSchema.safeParse(raw)
  if (direct.success) return direct.data

  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}
  const objectLike = source as Record<string, unknown>
  const budgetRaw = objectLike.budget_range
  const min =
    budgetRaw && typeof budgetRaw === "object" && !Array.isArray(budgetRaw)
      ? parseNumberLike((budgetRaw as { min?: unknown }).min) ?? 10000
      : parseNumberLike(budgetRaw) ?? 10000
  const max =
    budgetRaw && typeof budgetRaw === "object" && !Array.isArray(budgetRaw)
      ? parseNumberLike((budgetRaw as { max?: unknown }).max) ?? Math.max(min, 100000)
      : Math.max(min, (parseNumberLike(budgetRaw) ?? min) * 5)
  const currency =
    budgetRaw && typeof budgetRaw === "object" && !Array.isArray(budgetRaw)
      ? typeof (budgetRaw as { currency?: unknown }).currency === "string"
        ? ((budgetRaw as { currency?: string }).currency ?? "USD")
        : "USD"
      : "USD"

  const fallback = {
    service_type:
      typeof objectLike.service_type === "string" && objectLike.service_type.trim().length > 0
        ? objectLike.service_type.trim()
        : "b2b service provider",
    budget_range: {
      min: Math.max(0, min),
      max: Math.max(min, max),
      currency,
    },
    timeline:
      objectLike.timeline && typeof objectLike.timeline === "object" && !Array.isArray(objectLike.timeline)
        ? objectLike.timeline
        : { type: "duration", duration: typeof objectLike.timeline === "string" ? objectLike.timeline : "3 months" },
    industry: parseStringList(objectLike.industry),
    geography:
      objectLike.geography && typeof objectLike.geography === "object" && !Array.isArray(objectLike.geography)
        ? objectLike.geography
        : {
            region:
              typeof objectLike.geography === "string" && objectLike.geography.trim().length > 0
                ? objectLike.geography
                : "Global",
            remote_ok: true,
          },
    constraints: parseStringList(objectLike.constraints),
    optional:
      objectLike.optional && typeof objectLike.optional === "object" && !Array.isArray(objectLike.optional)
        ? objectLike.optional
        : {},
  }

  if (fallback.industry.length === 0) {
    fallback.industry = ["general b2b"]
  }

  return NormalizedBriefSchema.parse(fallback)
}

export async function runPipeline(briefId: string, runId: string): Promise<void> {
  const admin = createAdminClient()
  const notes: string[] = []

  const updateRun = async (payload: {
    status?: "running" | "complete" | "failed"
    confidence_overall?: number
    tavily_queries?: string[]
    shortlist?: ShortlistPayload
    notesOnly?: string[]
  }) => {
    const updatePayload: Record<string, unknown> = {
      notes: payload.notesOnly ?? notes,
    }

    if (payload.status) updatePayload.status = payload.status
    if (payload.confidence_overall !== undefined) {
      updatePayload.confidence_overall = payload.confidence_overall
    }
    if (payload.tavily_queries) updatePayload.tavily_queries = payload.tavily_queries
    if (payload.shortlist) updatePayload.shortlist = payload.shortlist

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

  try {
    const { data: brief, error: briefError } = await admin.from("briefs").select("*").eq("id", briefId).single()

    if (briefError || !brief) {
      throw new Error(briefError?.message ?? "Brief not found")
    }

    const normalized = coerceNormalizedBrief(brief.normalized_brief)
    const weights = BriefWeightsSchema.parse(brief.weights)
    const mode = brief.mode as BriefMode

    await markStep("normalize")

    const queries = await generateQueryPlan(normalized)
    await markStep("query_plan")
    await updateRun({ tavily_queries: queries })

    const raw = await tavilySearch(queries.slice(0, PIPELINE_LIMITS.MAX_TAVILY_QUERIES))
    await markStep("search")

    const shortlist = await triageCandidates(raw, normalized)
    await markStep("triage")
    await updateRun({ shortlist })

    const evidence = await tavilyExtract(collectShortlistUrls(shortlist))
    await markStep("evidence")

    const candidates = await extractCandidates(evidence, normalized)
    await markStep("extract")

    const scored = await scoreCandidates(candidates, normalized, weights, mode)
    await markStep("score")

    const topResults = rankAndSelect(scored)
    await markStep("rank")

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

    if (topResults.length < PIPELINE_LIMITS.TOP_RESULTS) {
      appendNote(
        `Found ${topResults.length} viable candidates (target ${PIPELINE_LIMITS.TOP_RESULTS}). Consider relaxing constraints.`,
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
      appendNote("No extractable evidence pages were returned from Tavily.")
      appendNote(`miss:${MISS_REASONS.NO_EVIDENCE}`)
    }

    const finalStatus = confidenceOverall < CONFIDENCE.MIN_FOR_SUCCESS ? "failed" : "complete"

    await updateRun({
      status: finalStatus,
      confidence_overall: confidenceOverall,
      notesOnly: notes,
    })

    await admin.from("briefs").update({ status: finalStatus }).eq("id", briefId)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown pipeline error"
    appendNote(message)

    await updateRun({
      status: "failed",
      notesOnly: notes,
    })
    await admin.from("briefs").update({ status: "failed" }).eq("id", briefId)
  }
}
