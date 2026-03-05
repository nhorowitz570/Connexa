"use client"

import { useState } from "react"

import { ContactSuggestion } from "@/components/results/contact-suggestion"
import { ReasoningPanel } from "@/components/results/reasoning-panel"
import { ScoreBreakdown } from "@/components/results/score-breakdown"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MapPin } from "lucide-react"
import type { ScoredResult } from "@/types"

function scoreClass(score: number): string {
  if (score >= 90) return "bg-emerald-500/20 text-emerald-400"
  if (score >= 80) return "bg-indigo-500/20 text-indigo-400"
  if (score >= 70) return "bg-blue-500/20 text-blue-400"
  return "bg-amber-500/20 text-amber-400"
}

function confidenceTier(confidence: number): {
  label: "High" | "Medium" | "Low"
  className: string
  summary: string
} {
  if (confidence >= 0.75) {
    return {
      label: "High",
      className: "bg-emerald-500/20 text-emerald-400",
      summary: "We found strong supporting info for this match.",
    }
  }
  if (confidence >= 0.5) {
    return {
      label: "Medium",
      className: "bg-amber-500/20 text-amber-400",
      summary: "Some info was estimated — review details before reaching out.",
    }
  }
  return {
    label: "Low",
    className: "bg-red-500/20 text-red-400",
    summary: "Limited public info — this match may be less accurate.",
  }
}

function confidenceDrivers(result: ScoredResult): string[] {
  const drivers: string[] = []
  if (result.services.length > 0) drivers.push("Services verified on their website")
  if (result.pricing_signals) drivers.push("Pricing info found")
  if ((result.portfolio_signals ?? []).length > 0) drivers.push("Past work samples found")
  if (result.industries.length > 0) drivers.push("Industry experience confirmed")
  if (result.geography) drivers.push("Location checks out")
  if (result.contact_email || result.contact_url) drivers.push("Contact info available")
  if (drivers.length === 0) drivers.push("Limited public info found")
  return drivers
}

function scoreTextClass(score: number): string {
  if (score >= 90) return "text-emerald-400"
  if (score >= 80) return "text-indigo-400"
  if (score >= 70) return "text-blue-400"
  return "text-amber-400"
}

function parsePricingSignal(value: unknown): { type: string; value: string; evidence: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const pricing = value as { type?: unknown; value?: unknown; evidence?: unknown }
  if (typeof pricing.type !== "string" || typeof pricing.value !== "string" || typeof pricing.evidence !== "string") {
    return null
  }
  return {
    type: pricing.type,
    value: pricing.value,
    evidence: pricing.evidence,
  }
}

type ResultCardProps = {
  rank: number
  result: ScoredResult
  mode: "simple" | "detailed"
}

export function ResultCard({ rank, result, mode }: ResultCardProps) {
  const tier = confidenceTier(result.confidence)
  const drivers = confidenceDrivers(result)
  const pricingSignal = parsePricingSignal(result.pricing_signals)
  const [portfolioExpanded, setPortfolioExpanded] = useState(false)
  const portfolioSignals = result.portfolio_signals ?? []
  const visiblePortfolioSignals = portfolioExpanded ? portfolioSignals : portfolioSignals.slice(0, 3)
  const hiddenPortfolioCount = Math.max(0, portfolioSignals.length - 3)

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">
            <span className={scoreTextClass(result.score_overall)}>#{rank}</span> {result.company_name}
          </CardTitle>
          <Badge className={scoreClass(result.score_overall)}>{result.score_overall}% Match</Badge>
        </div>
        <a
          href={result.website_url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-indigo-400 underline underline-offset-4 hover:text-indigo-300"
        >
          {result.website_url}
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {result.services.map((service, index) => (
            <Badge key={`${service}-${index}`} variant="secondary">
              {service}
            </Badge>
          ))}
        </div>

        {result.industries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {result.industries.map((industry, index) => (
              <Badge
                key={`${industry}-${index}`}
                variant="outline"
                className="border-indigo-500/30 text-indigo-300"
              >
                {industry}
              </Badge>
            ))}
          </div>
        ) : null}

        {result.geography ? (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#919191]">
            <MapPin className="h-4 w-4 text-indigo-400" />
            <span>{result.geography}</span>
          </div>
        ) : null}

        {pricingSignal ? (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
            <p className="mb-1 text-xs font-medium text-emerald-400">Pricing Info</p>
            <p className="text-sm text-white">
              {pricingSignal.type}: {pricingSignal.value}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-[#919191]">{pricingSignal.evidence}</p>
          </div>
        ) : null}

        {portfolioSignals.length > 0 ? (
          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
            <p className="mb-1 text-xs font-medium text-indigo-400">Past Work</p>
            <ul className="space-y-1 text-sm text-[#c0c0c0]">
              {visiblePortfolioSignals.map((signal, index) => (
                <li key={`${signal}-${index}`}>- {signal}</li>
              ))}
            </ul>
            {hiddenPortfolioCount > 0 ? (
              <button
                type="button"
                onClick={() => setPortfolioExpanded((current) => !current)}
                className="mt-2 text-xs text-indigo-300 underline underline-offset-4 transition-colors hover:text-indigo-200"
              >
                {portfolioExpanded ? "Show less" : `View ${hiddenPortfolioCount} more`}
              </button>
            ) : null}
          </div>
        ) : null}

        <p className="text-sm">{result.reasoning_summary}</p>
        {result.evidence_links.length > 0 ? (
          <p className="text-xs text-[#919191]">
            Based on {result.evidence_links.length} source{result.evidence_links.length > 1 ? "s" : ""}
          </p>
        ) : null}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={tier.className}>Evidence Strength: {tier.label}</Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1">
              <p>{tier.summary}</p>
              <p className="font-medium">What we found:</p>
              <ul className="list-disc pl-4">
                {drivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {mode === "detailed" ? (
          <>
            <ScoreBreakdown breakdown={result.score_breakdown} />
            <ReasoningPanel reasoning={result.reasoning_detailed ?? undefined} />
          </>
        ) : null}

        <ContactSuggestion
          email={result.contact_email}
          contactUrl={result.contact_url}
          websiteUrl={result.website_url}
        />
      </CardContent>
    </Card>
  )
}
