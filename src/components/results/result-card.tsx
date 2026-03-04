import { ContactSuggestion } from "@/components/results/contact-suggestion"
import { ReasoningPanel } from "@/components/results/reasoning-panel"
import { ScoreBreakdown } from "@/components/results/score-breakdown"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
      summary: "Strong evidence found for this match.",
    }
  }
  if (confidence >= 0.5) {
    return {
      label: "Medium",
      className: "bg-amber-500/20 text-amber-400",
      summary: "Partial evidence found; some fields inferred.",
    }
  }
  return {
    label: "Low",
    className: "bg-red-500/20 text-red-400",
    summary: "Limited evidence found; result may be approximate.",
  }
}

function confidenceDrivers(result: ScoredResult): string[] {
  const drivers: string[] = []
  if (result.services.length > 0) drivers.push("Website confirmed services")
  if (result.pricing_signals) drivers.push("Pricing signal identified")
  if ((result.portfolio_signals ?? []).length > 0) drivers.push("Portfolio evidence found")
  if (result.industries.length > 0) drivers.push("Industry match verified")
  if (result.geography) drivers.push("Geography signal matched")
  if (result.contact_email || result.contact_url) drivers.push("Contact signal available")
  if (drivers.length === 0) drivers.push("Limited public evidence extracted")
  return drivers
}

type ResultCardProps = {
  rank: number
  result: ScoredResult
  mode: "simple" | "detailed"
}

export function ResultCard({ rank, result, mode }: ResultCardProps) {
  const tier = confidenceTier(result.confidence)
  const drivers = confidenceDrivers(result)

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">
            #{rank} {result.company_name}
          </CardTitle>
          <Badge className={scoreClass(result.score_overall)}>Score: {result.score_overall}</Badge>
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
          {result.services.map((service) => (
            <Badge key={service} variant="secondary">
              {service}
            </Badge>
          ))}
        </div>

        {result.geography ? <p className="text-sm text-[#919191]">Geography: {result.geography}</p> : null}

        <p className="text-sm">{result.reasoning_summary}</p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={tier.className}>Confidence: {tier.label}</Badge>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs space-y-1">
              <p>{tier.summary}</p>
              <p className="font-medium">Confidence drivers:</p>
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
