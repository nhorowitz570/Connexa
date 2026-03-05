"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { BriefSummaryCard } from "@/components/brief/brief-summary-card"
import { ExportDropdown } from "@/components/brief/export-dropdown"
import { CancelBriefButton } from "@/components/pipeline/cancel-brief-button"
import { RerunButton } from "@/components/pipeline/rerun-button"
import { RunStatusPoller } from "@/components/pipeline/run-status-poller"
import { ResultCard } from "@/components/results/result-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { NormalizedBriefSchema, ScoredResultSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/client"
import { formatDuration, parseDurationFromNotes } from "@/lib/utils"
import type { BriefMode, BriefStatus, RunStatus, ScoredResult } from "@/types"

type BriefSlideOverProps = {
  briefId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onBriefDeleted?: (briefId: string) => void
}

type BriefRow = {
  id: string
  name: string | null
  mode: BriefMode
  status: BriefStatus
  normalized_brief: unknown
  weights: unknown
}

type RunRow = {
  id: string
  status: RunStatus
  confidence_overall: number | null
  notes: string[]
  search_queries: string[]
  started_at: string | null
  completed_at: string | null
  created_at: string
}

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

export function BriefSlideOver({ briefId, open, onOpenChange, onBriefDeleted }: BriefSlideOverProps) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [brief, setBrief] = useState<BriefRow | null>(null)
  const [latestRun, setLatestRun] = useState<RunRow | null>(null)
  const [results, setResults] = useState<ScoredResult[]>([])

  const handleDeleteBrief = async () => {
    if (!brief || deleting) return

    setDeleting(true)
    try {
      const response = await fetch(`/api/brief/${brief.id}`, {
        method: "DELETE",
      })
      const payload = (await response.json().catch(() => ({}))) as {
        data?: { deleted: boolean }
        error?: string
      }

      if (!response.ok || !payload.data?.deleted) {
        throw new Error(payload.error ?? "Failed to delete brief.")
      }

      toast.success("Brief deleted.")
      setConfirmDeleteOpen(false)
      onBriefDeleted?.(brief.id)
      onOpenChange(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete brief."
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  const loadBriefData = useCallback(async () => {
    if (!briefId) return

    setLoading(true)
    try {
      const supabase = createClient()

      const { data: briefData, error: briefError } = await supabase
        .from("briefs")
        .select("id, name, mode, status, normalized_brief, weights")
        .eq("id", briefId)
        .maybeSingle()

      if (briefError) {
        throw new Error(briefError.message)
      }

      if (!briefData) {
        toast.error("Brief not found.")
        onOpenChange(false)
        return
      }

      const nextBrief = {
        id: briefData.id,
        name: briefData.name,
        mode: briefData.mode,
        status: briefData.status,
        normalized_brief: briefData.normalized_brief,
        weights: briefData.weights,
      } as BriefRow
      setBrief(nextBrief)

      const { data: runData, error: runError } = await supabase
        .from("runs")
        .select("id, status, confidence_overall, notes, search_queries, started_at, completed_at, created_at")
        .eq("brief_id", briefId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (runError) {
        throw new Error(runError.message)
      }

      const nextRun = runData
        ? {
          id: runData.id,
          status: runData.status,
          confidence_overall: runData.confidence_overall,
          notes: Array.isArray(runData.notes)
            ? runData.notes.filter((value): value is string => typeof value === "string")
            : [],
          search_queries: Array.isArray(runData.search_queries)
            ? runData.search_queries.filter((value): value is string => typeof value === "string")
            : [],
          started_at: runData.started_at,
          completed_at: runData.completed_at,
          created_at: runData.created_at,
        }
        : null
      setLatestRun(nextRun)

      if (!nextRun) {
        setResults([])
        return
      }

      const { data: rawResults, error: resultsError } = await supabase
        .from("results")
        .select(
          "company_name, website_url, contact_url, contact_email, geography, services, industries, pricing_signals, portfolio_signals, evidence_links, score_overall, score_breakdown, reasoning_summary, reasoning_detailed, confidence",
        )
        .eq("run_id", nextRun.id)
        .order("score_overall", { ascending: false })

      if (resultsError) {
        throw new Error(resultsError.message)
      }

      const nextResults = (rawResults ?? [])
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

      setResults(nextResults)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load brief details."
      toast.error(message)
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }, [briefId, onOpenChange])

  useEffect(() => {
    if (!open || !briefId) return
    void loadBriefData()
  }, [briefId, loadBriefData, open])

  const normalizedBrief = useMemo(() => {
    return brief ? NormalizedBriefSchema.safeParse(brief.normalized_brief) : null
  }, [brief])

  const fallbackName = normalizedBrief?.success ? normalizedBrief.data.service_type : "Untitled brief"
  const displayName = brief?.name?.trim() || fallbackName
  const durationLabel = latestRun
    ? latestRun.status === "running"
      ? "Running..."
      : formatDuration(latestRun.started_at, latestRun.completed_at) ?? parseDurationFromNotes(latestRun.notes)
    : null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto border-[#1F1F1F] bg-[#0D0D0D] p-0 text-white sm:max-w-3xl">
        <div className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-[#1F1F1F] bg-[#111]">
            <SheetTitle className="text-left text-white">{displayName}</SheetTitle>
            <SheetDescription className="text-left text-[#919191]">
              In-context brief preview from History.
            </SheetDescription>
            {brief ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{brief.mode}</Badge>
                <BriefStatusBadge status={brief.status} />
                {durationLabel ? <span className="text-xs text-[#919191]">AI duration: {durationLabel}</span> : null}
              </div>
            ) : null}
          </SheetHeader>

          <div className="flex-1 space-y-4 p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#919191]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading brief details...
              </div>
            ) : null}

            {!loading && brief ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/brief/${brief.id}`}>Open full page</Link>
                  </Button>
                  <ExportDropdown
                    briefId={brief.id}
                    mode={brief.mode}
                    status={brief.status}
                    normalizedBrief={normalizedBrief?.success ? normalizedBrief.data : brief.normalized_brief}
                    weights={brief.weights}
                    run={
                      latestRun
                        ? {
                          id: latestRun.id,
                          status: latestRun.status,
                          confidence_overall: latestRun.confidence_overall,
                          notes: latestRun.notes,
                          search_queries: latestRun.search_queries,
                          created_at: latestRun.created_at,
                        }
                        : null
                    }
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
                    status={brief.status}
                    normalizedBrief={normalizedBrief?.success ? normalizedBrief.data : brief.normalized_brief}
                  />
                  {brief.status === "running" ? (
                    <CancelBriefButton briefId={brief.id} onCancelled={() => void loadBriefData()} />
                  ) : null}
                  <Dialog open={confirmDeleteOpen} onOpenChange={(nextOpen) => {
                    if (!deleting) {
                      setConfirmDeleteOpen(nextOpen)
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        <Trash2 className="h-4 w-4" />
                        Delete Brief
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Delete brief?</DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. The brief, run history, and results will be permanently removed.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} disabled={deleting}>
                          Cancel
                        </Button>
                        <Button variant="destructive" onClick={() => void handleDeleteBrief()} disabled={deleting}>
                          {deleting ? "Deleting..." : "Confirm Delete"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <Card className="border-[#1F1F1F] bg-[#111]">
                  <CardHeader>
                    <CardTitle className="text-white">Brief Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BriefSummaryCard normalizedBrief={normalizedBrief?.success ? normalizedBrief.data : null} />
                  </CardContent>
                </Card>

                {latestRun ? (
                  <RunStatusPoller
                    briefId={brief.id}
                    normalizedBrief={normalizedBrief?.success ? normalizedBrief.data : brief.normalized_brief}
                    runId={latestRun.id}
                    initialStatus={latestRun.status}
                    initialConfidence={latestRun.confidence_overall}
                    initialNotes={latestRun.notes}
                    onRunFinished={() => void loadBriefData()}
                  />
                ) : null}

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold">Results</h3>
                  {results.length === 0 ? (
                    <Card className="border-[#1F1F1F] bg-[#111]">
                      <CardContent className="pt-6 text-sm text-[#919191]">
                        No results yet for this brief.
                      </CardContent>
                    </Card>
                  ) : (
                    results.map((result, index) => (
                      <ResultCard key={`${result.website_url}-${index}`} rank={index + 1} result={result} mode={brief.mode} />
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
