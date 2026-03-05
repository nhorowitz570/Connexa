import { AnalyticsRefreshButton } from "@/components/analytics/analytics-refresh-button"
import { AnalyticsClient } from "@/components/analytics/analytics-client"
import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/server"

type DailyRow = {
  date: string
  avg_score: number | null
  missed_opportunities: number | null
  miss_reasons: Record<string, number> | null
}

type Recommendation = {
  title: string
  description: string
  priority: "low" | "medium" | "high"
}

const FRIENDLY_MISS_REASON_LABELS: Record<string, string> = {
  low_confidence: "Brief needs more detail",
  few_results: "Limited provider coverage",
  low_scores: "Low match quality",
  missing_budget: "Budget unclear",
  vague_scope: "Scope too broad",
  no_evidence: "Insufficient data found",
}

function normalizeRecommendations(value: unknown): Recommendation[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const priority = row.priority
      const normalizedPriority =
        priority === "high" || priority === "medium" || priority === "low" ? priority : "medium"
      if (typeof row.title !== "string" || typeof row.description !== "string") return null
      return { title: row.title, description: row.description, priority: normalizedPriority }
    })
    .filter((item): item is Recommendation => item !== null)
}

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const since = new Date()
  since.setDate(since.getDate() - 89)
  const sinceDate = since.toISOString().slice(0, 10)

  const [
    { data: dailyRowsRaw },
    { data: recommendationRow },
    { count: totalBriefs },
    { count: completedBriefs },
    { count: failedBriefs },
    { count: runningBriefs },
  ] = await Promise.all([
    supabase
      .from("analytics_daily")
      .select("date, avg_score, missed_opportunities, miss_reasons")
      .eq("user_id", user.id)
      .gte("date", sinceDate)
      .order("date", { ascending: true }),
    supabase
      .from("analytics_recommendations")
      .select("recommendations")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("briefs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "complete"),
    supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "error"),
    supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["running", "clarifying"]),
  ])

  const dailyRows = (dailyRowsRaw ?? []) as DailyRow[]

  if (dailyRows.length === 0) {
    return (
      <section className="flex flex-col gap-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Actionable Core Insights</h1>
          <p className="mt-1 text-sm text-[#919191]">Run a few searches to unlock this dashboard.</p>
        </div>
        <Card>
          <CardContent className="space-y-3 pt-6 text-sm text-[#919191]">
             <p>No analytics data yet. Start a search, then refresh analytics.</p>
            <AnalyticsRefreshButton />
          </CardContent>
        </Card>
      </section>
    )
  }

  // Compute derived data
  const latest = dailyRows[dailyRows.length - 1]
  const missedOpportunities = dailyRows.reduce((sum, r) => sum + (r.missed_opportunities ?? 0), 0)

  // Score trend data
  const scoreTrendData = dailyRows
    .filter((r) => r.avg_score !== null)
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      score: r.avg_score ?? 0,
    }))

  // Miss reasons
  const missReasonTotals = new Map<string, number>()
  for (const row of dailyRows) {
    const reasons = row.miss_reasons ?? {}
    for (const [reason, value] of Object.entries(reasons)) {
      if (typeof value !== "number") continue
      missReasonTotals.set(reason, (missReasonTotals.get(reason) ?? 0) + value)
    }
  }

  const BAR_COLORS = ["#EF4444", "#F59E0B", "#8B5CF6", "#3B82F6", "#10B981", "#EC4899", "#6366f1", "#14B8A6"]
  const missReasonData = Array.from(missReasonTotals.entries())
    .sort((a, b) => b[1] - a[1])
      .map(([reason, count], i) => ({
      reason: FRIENDLY_MISS_REASON_LABELS[reason] ?? reason.replaceAll("_", " "),
      count,
      color: BAR_COLORS[i % BAR_COLORS.length],
    }))

  const recommendations = normalizeRecommendations(recommendationRow?.recommendations)

  // Compute first and last avg_score for delta
  const firstScore = scoreTrendData.length > 0 ? scoreTrendData[0].score : 0
  const lastScore = scoreTrendData.length > 0 ? scoreTrendData[scoreTrendData.length - 1].score : 0
  const scoreDelta = Math.round(lastScore - firstScore)

  // Compute success rate
  const total = totalBriefs ?? 0
  const completed = completedBriefs ?? 0
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const kpis = [
    {
      label: "Success Rate",
      value: `${successRate}%`,
      change: `${completed}/${total}`,
      trend: "up" as const,
      description: "Completed briefs vs total submitted",
      color: "#10B981",
    },
    {
      label: "Avg. AI Match Score",
      value: latest.avg_score !== null ? String(Math.round(latest.avg_score)) : "—",
      change: scoreDelta >= 0 ? `+${scoreDelta}` : String(scoreDelta),
      trend: scoreDelta >= 0 ? ("up" as const) : ("down" as const),
      description: "Average confidence score across briefs",
      color: "#6366f1",
    },
    {
      label: "Total Briefs",
      value: String(total),
      change: `${runningBriefs ?? 0} active`,
      trend: "up" as const,
      description: "All briefs submitted to date",
      color: "#3B82F6",
    },
    {
      label: "Improvement Areas",
      value: String(missedOpportunities),
      change: `${failedBriefs ?? 0} failed`,
      trend: "down" as const,
      description: "Searches that likely need a stronger brief",
      color: "#F59E0B",
    },
  ]

  return (
    <AnalyticsClient
      kpis={kpis}
      scoreTrendData={scoreTrendData}
      scoreDelta={scoreDelta}
      missReasonData={missReasonData}
      recommendations={recommendations}
    />
  )
}
