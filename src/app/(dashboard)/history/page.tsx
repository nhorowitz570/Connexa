import Link from "next/link"

import { BriefListItem } from "@/components/dashboard/brief-list-item"
import { EmptyState } from "@/components/dashboard/empty-state"
import { HistoryFilters } from "@/components/dashboard/history-filters"
import { HistoryInsights } from "@/components/dashboard/history-insights"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

const PAGE_SIZE = 10
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type HistorySearchParams = {
  page?: string
  mode?: "all" | "simple" | "detailed"
  status?: "all" | "draft" | "clarifying" | "running" | "complete" | "failed"
  q?: string
}

type ResultRow = {
  brief_id: string
  score_overall: number
}

function topScoreByBrief(rows: ResultRow[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    if (!map.has(row.brief_id)) {
      map.set(row.brief_id, row.score_overall)
    }
  }
  return map
}

function sanitizeSearchTerm(input: string) {
  return input.replace(/[%_,]/g, " ").trim().split(/\s+/).join("%")
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<HistorySearchParams>
}) {
  const params = await searchParams
  const page = Number(params.page ?? "1")
  const modeFilter = params.mode ?? "all"
  const statusFilter = params.status ?? "all"
  const queryFilter = (params.q ?? "").trim()
  const offset = (Math.max(page, 1) - 1) * PAGE_SIZE

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ count: totalBriefs }, { count: completedBriefs }, { count: inProgressBriefs }, { data: completedIds }] =
    await Promise.all([
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
        .in("status", ["running", "clarifying", "draft"]),
      supabase
        .from("briefs")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "complete")
        .limit(2000),
    ])

  const completedBriefIds = (completedIds ?? []).map((row) => row.id)
  const { data: completedResultsRaw } = completedBriefIds.length
    ? await supabase
      .from("results")
      .select("brief_id, score_overall")
      .in("brief_id", completedBriefIds)
      .order("score_overall", { ascending: false })
    : { data: [] as ResultRow[] }

  const completedTopScores = topScoreByBrief((completedResultsRaw ?? []) as ResultRow[])
  const averageScore =
    completedTopScores.size > 0
      ? Array.from(completedTopScores.values()).reduce((sum, score) => sum + score, 0) /
      completedTopScores.size
      : null

  let query = supabase
    .from("briefs")
    .select("id, mode, status, created_at, normalized_brief", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (modeFilter !== "all") query = query.eq("mode", modeFilter)
  if (statusFilter !== "all") query = query.eq("status", statusFilter)

  if (queryFilter.length > 0) {
    if (UUID_PATTERN.test(queryFilter)) {
      query = query.eq("id", queryFilter)
    } else {
      const safeTerm = sanitizeSearchTerm(queryFilter)
      if (safeTerm.length > 0) {
        const pattern = `%${safeTerm}%`
        query = query.or(
          `raw_prompt.ilike.${pattern},normalized_brief->>service_type.ilike.${pattern}`,
        )
      }
    }
  }

  const { data: briefs, count } = await query.range(offset, offset + PAGE_SIZE - 1)
  const briefIds = (briefs ?? []).map((brief) => brief.id)

  const { data: results } = briefIds.length
    ? await supabase
      .from("results")
      .select("brief_id, score_overall")
      .in("brief_id", briefIds)
      .order("score_overall", { ascending: false })
    : { data: [] as ResultRow[] }

  const scoreByBrief = topScoreByBrief((results ?? []) as ResultRow[])

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE))

  const makePageHref = (targetPage: number) => {
    const search = new URLSearchParams()
    search.set("page", String(targetPage))
    if (modeFilter !== "all") search.set("mode", modeFilter)
    if (statusFilter !== "all") search.set("status", statusFilter)
    if (queryFilter.length > 0) search.set("q", queryFilter)
    return `/history?${search.toString()}`
  }

  return (
    <section className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold">Brief History</h1>
        <p className="text-sm text-[#919191]">Browse all previous sourcing briefs.</p>
      </div>

      <HistoryInsights
        totalBriefs={totalBriefs ?? 0}
        completedBriefs={completedBriefs ?? 0}
        inProgressBriefs={inProgressBriefs ?? 0}
        averageScore={averageScore}
      />

      <HistoryFilters mode={modeFilter} status={statusFilter} query={queryFilter} />

      {(briefs ?? []).length === 0 ? (
        <EmptyState
          title="No briefs found"
          description="Adjust filters or create a new brief."
          actionLabel="New Brief"
          actionHref="/brief/new"
        />
      ) : (
        <div className="space-y-3">
          {(briefs ?? []).map((brief) => {
            const normalized =
              typeof brief.normalized_brief === "object" && brief.normalized_brief
                ? (brief.normalized_brief as { service_type?: string })
                : {}
            return (
              <BriefListItem
                key={brief.id}
                id={brief.id}
                mode={brief.mode}
                serviceType={normalized.service_type ?? "Untitled brief"}
                status={brief.status}
                createdAt={brief.created_at}
                score={scoreByBrief.get(brief.id) ?? null}
              />
            )
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button asChild variant="outline" disabled={page <= 1}>
          <Link href={makePageHref(Math.max(1, page - 1))}>Previous</Link>
        </Button>
        <p className="text-sm text-[#919191]">
          Page {Math.min(Math.max(page, 1), totalPages)} of {totalPages}
        </p>
        <Button asChild variant="outline" disabled={page >= totalPages}>
          <Link href={makePageHref(Math.min(totalPages, page + 1))}>Next</Link>
        </Button>
      </div>
    </section>
  )
}
