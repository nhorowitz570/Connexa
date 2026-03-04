import { notFound } from "next/navigation"

import { AiSummary } from "@/components/brief/ai-summary"
import { BriefDetailClient } from "@/components/brief/brief-detail-client"
import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { BriefSummaryCard } from "@/components/brief/brief-summary-card"
import { LowConfidenceTips } from "@/components/brief/low-confidence-tips"
import { RerunButton } from "@/components/pipeline/rerun-button"
import { ResultCard } from "@/components/results/result-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CONFIDENCE } from "@/lib/constants"
import { NormalizedBriefSchema, ScoredResultSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/server"
import type { ScoredResult } from "@/types"

function parseResultRow(row: {
  company_name: string
  website_url: string
  contact_url: string | null
  contact_email: string | null
  geography: string | null
  services: unknown
  industries: unknown
  pricing_signals: unknown
  portfolio_signals: unknown
  evidence_links: unknown
  score_overall: number
  score_breakdown: unknown
  reasoning_summary: string
  reasoning_detailed: unknown
  confidence: number
}): ScoredResult | null {
  const parsed = ScoredResultSchema.safeParse({
    company_name: row.company_name,
    website_url: row.website_url,
    contact_url: row.contact_url,
    contact_email: row.contact_email,
    geography: row.geography,
    services: Array.isArray(row.services) ? row.services : [],
    industries: Array.isArray(row.industries) ? row.industries : [],
    pricing_signals: row.pricing_signals ?? null,
    portfolio_signals: Array.isArray(row.portfolio_signals) ? row.portfolio_signals : null,
    evidence_links: Array.isArray(row.evidence_links) ? row.evidence_links : [],
    score_overall: row.score_overall,
    score_breakdown:
      row.score_breakdown && typeof row.score_breakdown === "object"
        ? row.score_breakdown
        : {
            service_match: 0,
            budget_fit: 0,
            industry_fit: 0,
            timeline_fit: 0,
            geo_fit: 0,
            constraint_fit: 0,
          },
    reasoning_summary: row.reasoning_summary,
    reasoning_detailed:
      row.reasoning_detailed && typeof row.reasoning_detailed === "object"
        ? row.reasoning_detailed
        : null,
    confidence: row.confidence,
  })

  return parsed.success ? parsed.data : null
}

export default async function BriefDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: briefData } = await supabase
    .from("briefs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single()

  const brief = briefData as
    | {
        id: string
        mode: "simple" | "detailed"
        status: "draft" | "clarifying" | "running" | "complete" | "failed"
        normalized_brief: unknown
      }
    | null

  if (!brief) notFound()

  const { data: runsData } = await supabase
    .from("runs")
      .select("*")
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: false })
      .limit(1)

  const runs = (runsData as Array<{
    id: string
    status: "running" | "complete" | "failed"
    confidence_overall: number | null
    notes: unknown
  }> | null) ?? []

  const latestRun = runs[0] ?? null
  const { data: rawResults } = latestRun
    ? await supabase
        .from("results")
        .select(
          "company_name, website_url, contact_url, contact_email, geography, services, industries, pricing_signals, portfolio_signals, evidence_links, score_overall, score_breakdown, reasoning_summary, reasoning_detailed, confidence",
        )
        .eq("run_id", latestRun.id)
        .order("score_overall", { ascending: false })
    : { data: [] as unknown[] }

  const results = (rawResults ?? [])
    .map((row) =>
      parseResultRow(
        row as {
          company_name: string
          website_url: string
          contact_url: string | null
          contact_email: string | null
          geography: string | null
          services: unknown
          industries: unknown
          pricing_signals: unknown
          portfolio_signals: unknown
          evidence_links: unknown
          score_overall: number
          score_breakdown: unknown
          reasoning_summary: string
          reasoning_detailed: unknown
          confidence: number
        },
      ),
    )
    .filter((row): row is ScoredResult => row !== null)

  const isLowConfidenceFailure =
    brief.status === "failed" &&
    latestRun?.confidence_overall !== null &&
    latestRun?.confidence_overall !== undefined &&
    latestRun.confidence_overall < CONFIDENCE.MIN_FOR_SUCCESS

  const normalizedBrief = NormalizedBriefSchema.safeParse(brief.normalized_brief)
  const latestRunForClient = latestRun
    ? {
        id: latestRun.id,
        status: latestRun.status,
        confidence_overall: latestRun.confidence_overall,
        notes: Array.isArray(latestRun.notes)
          ? latestRun.notes.filter((value): value is string => typeof value === "string")
          : [],
      }
    : null

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Brief Detail</h1>
          <p className="text-sm text-muted-foreground">Review brief context and ranked provider matches.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{brief.mode}</Badge>
          <BriefStatusBadge status={brief.status} />
          <RerunButton
            briefId={brief.id}
            mode={brief.mode}
            normalizedBrief={normalizedBrief.success ? normalizedBrief.data : brief.normalized_brief}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Brief Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BriefSummaryCard normalizedBrief={normalizedBrief.success ? normalizedBrief.data : null} />
          <Separator />
          <AiSummary
            briefId={brief.id}
            normalizedBrief={normalizedBrief.success ? normalizedBrief.data : brief.normalized_brief}
          />
        </CardContent>
      </Card>

      <BriefDetailClient latestRun={latestRunForClient} />

      {isLowConfidenceFailure ? <LowConfidenceTips mode={brief.mode} /> : null}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Results</h2>
        {results.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No results yet. If the run is still active, this page will update as status changes.
            </CardContent>
          </Card>
        ) : (
          <div className={isLowConfidenceFailure ? "space-y-4 opacity-80" : "space-y-4"}>
            {results.map((result, index) => (
              <ResultCard key={`${result.website_url}-${index}`} rank={index + 1} result={result} mode={brief.mode} />
            ))}
            {results.length < 5 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  Fewer than 5 results were found. Consider relaxing constraints or widening geography.
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
