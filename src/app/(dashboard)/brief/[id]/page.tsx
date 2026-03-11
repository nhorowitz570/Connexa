import { notFound } from "next/navigation"

import { AiSummary } from "@/components/brief/ai-summary"
import { AttachmentList } from "@/components/brief/attachment-list"
import { BriefDetailClient } from "@/components/brief/brief-detail-client"
import { BriefNameEditor } from "@/components/brief/brief-name-editor"
import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { BriefSummaryCard } from "@/components/brief/brief-summary-card"
import { ExportDropdown } from "@/components/brief/export-dropdown"
import { LowConfidenceTips } from "@/components/brief/low-confidence-tips"
import { CancelBriefButton } from "@/components/pipeline/cancel-brief-button"
import { RerunButton } from "@/components/pipeline/rerun-button"
import { ResultCard } from "@/components/results/result-card"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CONFIDENCE } from "@/lib/constants"
import { NormalizedBriefSchema, QuestionsPayloadSchema, ScoredResultSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/server"
import { formatDuration, parseDurationFromNotes } from "@/lib/utils"
import type { QuestionsPayload, ScoredResult } from "@/types"

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
      name: string | null
      mode: "simple" | "detailed"
      status: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
      normalized_brief: unknown
      weights: unknown
      updated_at: string
    }
    | null

  if (!brief) notFound()

  let effectiveBriefStatus = brief.status
  let pendingClarificationPayload: QuestionsPayload | null = null
  let isClarificationGenerationPending = false
  let wasClarificationStuck = false

  if (brief.status === "clarifying") {
    const { data: latestQuestionRow } = await supabase
      .from("brief_questions")
      .select("questions, answers")
      .eq("brief_id", brief.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestQuestionRow?.answers === null) {
      const parsedQuestions = QuestionsPayloadSchema.safeParse(latestQuestionRow.questions)
      if (parsedQuestions.success) {
        pendingClarificationPayload = parsedQuestions.data
      }
    }

    if (!pendingClarificationPayload) {
      isClarificationGenerationPending = !latestQuestionRow

      if (!isClarificationGenerationPending) {
        const { error: resetError } = await supabase
          .from("briefs")
          .update({ status: "draft" })
          .eq("id", brief.id)
          .eq("user_id", user.id)

        if (!resetError) {
          effectiveBriefStatus = "draft"
          wasClarificationStuck = true
        }
      }
    }
  }

  const { data: runsData } = await supabase
    .from("runs")
    .select("*")
    .eq("brief_id", brief.id)
    .order("created_at", { ascending: false })
    .limit(1)

  const runs = (runsData as Array<{
    id: string
    status: "running" | "complete" | "error" | "cancelled"
    confidence_overall: number | null
    notes: unknown
    search_queries: unknown
    started_at: string | null
    completed_at: string | null
    created_at: string
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
    brief.status === "error" &&
    latestRun?.confidence_overall !== null &&
    latestRun?.confidence_overall !== undefined &&
    latestRun.confidence_overall < CONFIDENCE.MIN_FOR_SUCCESS

  const normalizedBrief = NormalizedBriefSchema.safeParse(brief.normalized_brief)
  const fallbackBriefName = normalizedBrief.success ? normalizedBrief.data.service_type : "Untitled brief"
  const latestRunNotes = Array.isArray(latestRun?.notes)
    ? latestRun.notes.filter((value): value is string => typeof value === "string")
    : []
  const latestRunDuration = latestRun?.status === "running"
    ? "Running..."
    : formatDuration(latestRun?.started_at ?? null, latestRun?.completed_at ?? null) ??
    parseDurationFromNotes(latestRunNotes)
  const latestRunDurationLabel = latestRunDuration ? `Search took ${latestRunDuration}` : null
  const latestRunForClient = latestRun
    ? {
      id: latestRun.id,
      status: latestRun.status,
      confidence_overall: latestRun.confidence_overall,
      notes: latestRunNotes,
    }
    : null
  const exportRun = latestRun
    ? {
      id: latestRun.id,
      status: latestRun.status,
      confidence_overall: latestRun.confidence_overall,
      notes: latestRunNotes,
      search_queries: Array.isArray(latestRun.search_queries)
        ? latestRun.search_queries.filter((value): value is string => typeof value === "string")
        : [],
      created_at: latestRun.created_at,
    }
    : null

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <BriefNameEditor briefId={brief.id} initialName={brief.name} fallbackName={fallbackBriefName} />
          <p className="text-sm text-muted-foreground">Your brief summary and matched providers.</p>
          {latestRunDurationLabel ? <p className="text-xs text-muted-foreground">{latestRunDurationLabel}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{brief.mode}</Badge>
          <BriefStatusBadge status={effectiveBriefStatus} />
          <ExportDropdown
            briefId={brief.id}
            mode={brief.mode}
            status={effectiveBriefStatus}
            normalizedBrief={normalizedBrief.success ? normalizedBrief.data : brief.normalized_brief}
            weights={brief.weights}
            run={exportRun}
            results={results.map((result) => ({
              company_name: result.company_name,
              website_url: result.website_url,
              contact_url: result.contact_url,
              contact_email: result.contact_email,
              geography: result.geography ?? null,
              services: result.services,
              industries: result.industries,
              score_overall: result.score_overall,
              score_breakdown: result.score_breakdown,
              reasoning_summary: result.reasoning_summary,
              confidence: result.confidence,
            }))}
          />
          <RerunButton
            briefId={brief.id}
            status={effectiveBriefStatus}
            normalizedBrief={normalizedBrief.success ? normalizedBrief.data : brief.normalized_brief}
          />
          {brief.status === "running" ? <CancelBriefButton briefId={brief.id} /> : null}
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

      <AttachmentList briefId={brief.id} />

      <BriefDetailClient
        latestRun={latestRunForClient}
        briefId={brief.id}
        normalizedBrief={normalizedBrief.success ? normalizedBrief.data : brief.normalized_brief}
        clarificationPayload={pendingClarificationPayload}
        clarificationGenerationPending={isClarificationGenerationPending}
        clarificationStuckReset={wasClarificationStuck}
      />

      {isLowConfidenceFailure ? <LowConfidenceTips mode={brief.mode} /> : null}

      <Separator />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Results</h2>
        {results.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No results yet. If your search is still running, results will appear here automatically.
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
                  Fewer than 5 matches found. Try broadening your requirements or location.
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}
