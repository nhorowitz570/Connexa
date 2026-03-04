import { NextResponse } from "next/server"

import { MISS_REASONS, MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type ComputeInput = {
  date?: string
  start_date?: string
  end_date?: string
  window_days?: number
  include_today?: boolean
}

type BriefRow = {
  id: string
  user_id: string
  status: "draft" | "clarifying" | "running" | "complete" | "failed"
  normalized_brief: unknown
}

type RunRow = {
  brief_id: string
  confidence_overall: number | null
  notes: unknown
}

type ResultRow = {
  brief_id: string
  score_overall: number
}

function isValidDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parseDateUtc(value: string): Date | null {
  if (!isValidDateString(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function dateToString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDateBounds(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

function defaultTargetDate() {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - 1)
  return now.toISOString().slice(0, 10)
}

function enumerateDateRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = []
  const cursor = new Date(startDate)

  while (cursor <= endDate) {
    dates.push(dateToString(cursor))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return dates
}

function resolveTargetDates(input: ComputeInput): string[] {
  if (input.date && isValidDateString(input.date)) {
    return [input.date]
  }

  if (input.start_date && input.end_date) {
    const start = parseDateUtc(input.start_date)
    const end = parseDateUtc(input.end_date)
    if (start && end && start <= end) {
      return enumerateDateRange(start, end)
    }
  }

  if (typeof input.window_days === "number" && Number.isFinite(input.window_days)) {
    const safeWindowDays = Math.min(90, Math.max(1, Math.floor(input.window_days)))

    const end = new Date()
    end.setUTCHours(0, 0, 0, 0)
    if (input.include_today === false) {
      end.setUTCDate(end.getUTCDate() - 1)
    }

    const start = new Date(end)
    start.setUTCDate(start.getUTCDate() - (safeWindowDays - 1))

    return enumerateDateRange(start, end)
  }

  return [defaultTargetDate()]
}

function parseNotes(notes: unknown): string[] {
  if (!Array.isArray(notes)) return []
  return notes.filter((note): note is string => typeof note === "string")
}

function isVagueScope(serviceType: string) {
  const value = serviceType.trim().toLowerCase()
  if (value.length < 5) return true
  return ["service", "provider", "agency", "consulting", "vendor", "b2b service provider"].includes(
    value,
  )
}

function fallbackRecommendations(missReasons: Record<string, number>) {
  const recommendations = [] as Array<{ title: string; description: string; priority: "low" | "medium" | "high" }>

  if ((missReasons[MISS_REASONS.LOW_CONFIDENCE] ?? 0) > 0) {
    recommendations.push({
      title: "Increase Brief Specificity",
      description: "Add clearer scope, deliverables, and decision criteria to reduce low-confidence runs.",
      priority: "high",
    })
  }

  if ((missReasons[MISS_REASONS.FEW_RESULTS] ?? 0) > 0) {
    recommendations.push({
      title: "Widen Search Constraints",
      description: "Relax geography or add alternate service terms to increase candidate count.",
      priority: "medium",
    })
  }

  if ((missReasons[MISS_REASONS.MISSING_BUDGET] ?? 0) > 0) {
    recommendations.push({
      title: "Set Budget Guardrails",
      description: "Include an explicit budget range so scoring can prioritize suitable providers.",
      priority: "medium",
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      title: "Maintain Quality Inputs",
      description: "Current brief quality is stable; continue using detailed mode for critical projects.",
      priority: "low",
    })
  }

  return recommendations.slice(0, 3)
}

async function generateRecommendations(payload: {
  date: string
  totalBriefs: number
  completedBriefs: number
  failedBriefs: number
  avgScore: number | null
  avgConfidence: number | null
  missReasons: Record<string, number>
}) {
  const fallback = fallbackRecommendations(payload.missReasons)
  if (!process.env.OPENROUTER_API_KEY) return fallback

  try {
    const response = await callOpenRouter(
      [
        {
          role: "system",
          content: `You generate concise sourcing optimization recommendations.
Return JSON:
{
  "recommendations": [
    { "title": "string", "description": "string", "priority": "low" | "medium" | "high" }
  ]
}
Limit to 3 recommendations.`,
        },
        {
          role: "user",
          content: JSON.stringify(payload),
        },
      ],
      {
        model: MODELS.CHEAP,
        response_format: { type: "json_object" },
      },
    )

    const parsed = JSON.parse(response) as {
      recommendations?: Array<{ title?: string; description?: string; priority?: string }>
    }

    if (!Array.isArray(parsed.recommendations)) return fallback

    const normalized = parsed.recommendations
      .map((item) => {
        if (!item || typeof item.title !== "string" || typeof item.description !== "string") return null
        const priority = item.priority
        return {
          title: item.title,
          description: item.description,
          priority:
            priority === "high" || priority === "medium" || priority === "low" ? priority : "medium",
        }
      })
      .filter(
        (
          item,
        ): item is { title: string; description: string; priority: "low" | "medium" | "high" } =>
          item !== null,
      )

    return normalized.length > 0 ? normalized.slice(0, 3) : fallback
  } catch {
    return fallback
  }
}

async function computeForDate(options: {
  admin: ReturnType<typeof createAdminClient>
  targetDate: string
  generateRecommendationsForDate: boolean
  targetUserId?: string | null
}): Promise<Set<string>> {
  const { admin, targetDate, generateRecommendationsForDate, targetUserId } = options
  const { startIso, endIso } = getDateBounds(targetDate)

  let briefsQuery = admin
    .from("briefs")
    .select("id, user_id, status, normalized_brief")
    .gte("created_at", startIso)
    .lt("created_at", endIso)

  if (targetUserId) {
    briefsQuery = briefsQuery.eq("user_id", targetUserId)
  }

  const { data: briefsRaw, error: briefsError } = await briefsQuery

  if (briefsError) {
    throw new Error(briefsError.message)
  }

  const briefs = (briefsRaw ?? []) as BriefRow[]
  if (briefs.length === 0) return new Set<string>()

  const briefIds = briefs.map((brief) => brief.id)

  const [{ data: runsRaw }, { data: resultsRaw }] = await Promise.all([
    admin
      .from("runs")
      .select("brief_id, confidence_overall, notes")
      .in("brief_id", briefIds),
    admin.from("results").select("brief_id, score_overall").in("brief_id", briefIds),
  ])

  const runs = (runsRaw ?? []) as RunRow[]
  const results = (resultsRaw ?? []) as ResultRow[]

  const briefsByUser = new Map<string, BriefRow[]>()
  for (const brief of briefs) {
    const list = briefsByUser.get(brief.user_id) ?? []
    list.push(brief)
    briefsByUser.set(brief.user_id, list)
  }

  for (const [userId, userBriefs] of briefsByUser.entries()) {
    const userBriefIds = userBriefs.map((brief) => brief.id)
    const userBriefIdSet = new Set(userBriefIds)

    const userRuns = runs.filter((run) => userBriefIdSet.has(run.brief_id))
    const userResults = results.filter((result) => userBriefIdSet.has(result.brief_id))

    const totalBriefs = userBriefs.length
    const completedBriefs = userBriefs.filter((brief) => brief.status === "complete").length
    const failedBriefs = userBriefs.filter((brief) => brief.status === "failed").length

    const avgConfidence =
      userRuns.length > 0
        ? userRuns.reduce((sum, run) => sum + (run.confidence_overall ?? 0), 0) / userRuns.length
        : null

    const resultsByBrief = new Map<string, number[]>()
    for (const result of userResults) {
      const list = resultsByBrief.get(result.brief_id) ?? []
      list.push(result.score_overall)
      resultsByBrief.set(result.brief_id, list)
    }

    const topScores: number[] = []
    let missedOpportunities = 0

    for (const briefId of userBriefIds) {
      const scores = (resultsByBrief.get(briefId) ?? []).sort((a, b) => b - a)
      if (scores.length > 0) {
        topScores.push(scores[0])
      }
      if (scores.length < 3) {
        missedOpportunities += 1
      }
    }

    const avgScore =
      topScores.length > 0 ? topScores.reduce((sum, score) => sum + score, 0) / topScores.length : null

    const missReasons: Record<string, number> = {
      [MISS_REASONS.LOW_CONFIDENCE]: 0,
      [MISS_REASONS.FEW_RESULTS]: 0,
      [MISS_REASONS.LOW_SCORES]: 0,
      [MISS_REASONS.MISSING_BUDGET]: 0,
      [MISS_REASONS.VAGUE_SCOPE]: 0,
      [MISS_REASONS.NO_EVIDENCE]: 0,
    }

    for (const brief of userBriefs) {
      const briefRuns = userRuns.filter((run) => run.brief_id === brief.id)
      const briefScores = (resultsByBrief.get(brief.id) ?? []).sort((a, b) => b - a)

      if (briefRuns.some((run) => (run.confidence_overall ?? 0) < 0.5)) {
        missReasons[MISS_REASONS.LOW_CONFIDENCE] += 1
      }

      if (briefScores.length < 3) {
        missReasons[MISS_REASONS.FEW_RESULTS] += 1
      }

      if (briefScores.length > 0) {
        const average = briefScores.reduce((sum, score) => sum + score, 0) / briefScores.length
        if (average < 50) {
          missReasons[MISS_REASONS.LOW_SCORES] += 1
        }
      }

      if (
        brief.normalized_brief &&
        typeof brief.normalized_brief === "object" &&
        "budget_range" in brief.normalized_brief
      ) {
        const normalized = brief.normalized_brief as {
          budget_range?: { max?: number }
          service_type?: string
        }

        if ((normalized.budget_range?.max ?? 0) <= 0) {
          missReasons[MISS_REASONS.MISSING_BUDGET] += 1
        }

        if (typeof normalized.service_type === "string" && isVagueScope(normalized.service_type)) {
          missReasons[MISS_REASONS.VAGUE_SCOPE] += 1
        }
      }

      const hasNoEvidence = briefRuns.some((run) => {
        const notes = parseNotes(run.notes)
        return notes.some(
          (note) =>
            note.includes("No extractable evidence") || note === `miss:${MISS_REASONS.NO_EVIDENCE}`,
        )
      })

      if (hasNoEvidence) {
        missReasons[MISS_REASONS.NO_EVIDENCE] += 1
      }
    }

    await admin.from("analytics_daily").upsert(
      {
        user_id: userId,
        date: targetDate,
        total_briefs: totalBriefs,
        completed_briefs: completedBriefs,
        failed_briefs: failedBriefs,
        avg_score: avgScore,
        avg_confidence: avgConfidence,
        miss_reasons: missReasons,
        missed_opportunities: missedOpportunities,
      },
      { onConflict: "user_id,date" },
    )

    if (generateRecommendationsForDate) {
      const recommendations = await generateRecommendations({
        date: targetDate,
        totalBriefs,
        completedBriefs,
        failedBriefs,
        avgScore,
        avgConfidence,
        missReasons,
      })

      await admin.from("analytics_recommendations").upsert(
        {
          user_id: userId,
          date: targetDate,
          recommendations,
          model_used: MODELS.CHEAP,
        },
        { onConflict: "user_id,date" },
      )
    }
  }

  return new Set(briefsByUser.keys())
}

export async function POST(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET
    const providedSecret = request.headers.get("x-cron-secret")

    let authorizedUserId: string | null = null
    const serverClient = await createClient()

    if (cronSecret && providedSecret === cronSecret) {
      authorizedUserId = null
    } else {
      const {
        data: { user },
      } = await serverClient.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }

      authorizedUserId = user.id
    }

    const body = (await request.json().catch(() => ({}))) as ComputeInput
    const targetDates = resolveTargetDates(body)

    const admin = createAdminClient()
    const uniqueProcessedUsers = new Set<string>()

    for (let index = 0; index < targetDates.length; index += 1) {
      const targetDate = targetDates[index]
      const isLastDate = index === targetDates.length - 1

      const usersForDate = await computeForDate({
        admin,
        targetDate,
        generateRecommendationsForDate: isLastDate,
        targetUserId: authorizedUserId,
      })

      for (const userId of usersForDate) {
        if (authorizedUserId && userId !== authorizedUserId) continue
        uniqueProcessedUsers.add(userId)
      }
    }

    return NextResponse.json({
      data: {
        processed_users: uniqueProcessedUsers.size,
        date_from: targetDates[0],
        date_to: targetDates[targetDates.length - 1],
        dates_processed: targetDates.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to compute analytics"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
