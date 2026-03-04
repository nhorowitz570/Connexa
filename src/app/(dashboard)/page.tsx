import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { EmptyState } from "@/components/dashboard/empty-state"
import { PerformanceChart } from "@/components/dashboard/performance-chart"
import { RecentBriefsTable } from "@/components/dashboard/recent-briefs-table"
import { createClient } from "@/lib/supabase/server"

type BriefRow = {
  id: string
  mode: "simple" | "detailed"
  status: "draft" | "clarifying" | "running" | "complete" | "failed" | "cancelled"
  created_at: string
  normalized_brief: unknown
}

type ResultRow = {
  brief_id: string
  company_name: string
  score_overall: number
}

function topResultByBrief(rows: ResultRow[]) {
  const map = new Map<string, ResultRow>()
  for (const row of rows) {
    if (!map.has(row.brief_id)) {
      map.set(row.brief_id, row)
    }
  }
  return map
}

export default async function DashboardHomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const [
    { count: totalBriefs },
    { count: failedBriefs },
    { count: runningBriefs },
    { data: recentBriefsRaw },
    { data: completedBriefsRaw },
  ] = await Promise.all([
    supabase.from("briefs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "failed"),
    supabase
      .from("briefs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "running"),
    supabase
      .from("briefs")
      .select("id, mode, status, created_at, normalized_brief")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("briefs")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "complete")
      .limit(2000),
  ])

  const recentBriefs = (recentBriefsRaw ?? []) as BriefRow[]

  const recentBriefIds = recentBriefs.map((brief) => brief.id)
  const completedBriefIds = (completedBriefsRaw ?? []).map((brief) => brief.id)

  const [{ data: recentResultsRaw }, { data: completedResultsRaw }] = await Promise.all([
    recentBriefIds.length
      ? supabase
        .from("results")
        .select("brief_id, company_name, score_overall")
        .in("brief_id", recentBriefIds)
        .order("score_overall", { ascending: false })
      : Promise.resolve({ data: [] as ResultRow[] }),
    completedBriefIds.length
      ? supabase
        .from("results")
        .select("brief_id, company_name, score_overall")
        .in("brief_id", completedBriefIds)
        .order("score_overall", { ascending: false })
      : Promise.resolve({ data: [] as ResultRow[] }),
  ])

  const recentTopMap = topResultByBrief((recentResultsRaw ?? []) as ResultRow[])
  const completedTopMap = topResultByBrief((completedResultsRaw ?? []) as ResultRow[])

  const averageScore =
    completedTopMap.size > 0
      ? Array.from(completedTopMap.values()).reduce((sum, row) => sum + row.score_overall, 0) /
      completedTopMap.size
      : null

  const rows = recentBriefs.map((brief) => {
    const normalized =
      typeof brief.normalized_brief === "object" && brief.normalized_brief
        ? (brief.normalized_brief as { service_type?: string })
        : {}

    const topResult = recentTopMap.get(brief.id)

    return {
      id: brief.id,
      mode: brief.mode,
      status: brief.status,
      createdAt: brief.created_at,
      serviceType: normalized.service_type ?? "Untitled brief",
      topMatch: topResult?.company_name ?? null,
      topScore: topResult?.score_overall ?? null,
    }
  })

  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-500">
      <DashboardStats
        totalBriefs={totalBriefs ?? 0}
        failedBriefs={failedBriefs ?? 0}
        runningBriefs={runningBriefs ?? 0}
        averageScore={averageScore}
      />

      <PerformanceChart />

      {rows.length === 0 ? (
        <EmptyState
          title="No briefs yet"
          description="Submit your first brief to find the right provider."
          actionLabel="Create Brief"
          actionHref="/brief/new"
        />
      ) : (
        <RecentBriefsTable rows={rows} />
      )}
    </section>
  )
}
