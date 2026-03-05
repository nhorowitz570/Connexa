import { Badge } from "@/components/ui/badge"
import type { NormalizedBrief } from "@/types"

type BriefSummaryCardProps = {
  normalizedBrief: NormalizedBrief | null
}

function formatCurrencyAmount(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${currency} ${value.toLocaleString("en-US")}`
  }
}

function formatBudget(brief: NormalizedBrief): string {
  const currency = brief.budget_range.currency || "USD"
  const min = formatCurrencyAmount(brief.budget_range.min, currency)
  const max = formatCurrencyAmount(brief.budget_range.max, currency)
  return `${min} - ${max} ${currency}`
}

function formatTimeline(brief: NormalizedBrief): string {
  if (brief.timeline.type === "duration" && brief.timeline.duration) {
    return `${brief.timeline.duration} (duration)`
  }
  if (brief.timeline.type === "deadline" && brief.timeline.deadline) {
    return `${brief.timeline.deadline} (deadline)`
  }
  return "Not specified"
}

function formatGeography(brief: NormalizedBrief): string {
  const region = brief.geography.region
  const remote = brief.geography.remote_ok ? "remote OK" : "on-site preferred"
  const state =
    typeof brief.optional?.us_state === "string" && brief.optional.us_state.trim().length > 0
      ? `, ${brief.optional.us_state.trim()}`
      : ""
  return `${region}${state}, ${remote}`
}

export function BriefSummaryCard({ normalizedBrief }: BriefSummaryCardProps) {
  if (!normalizedBrief) {
    return <p className="text-sm text-muted-foreground">Brief details are not available yet.</p>
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Service Type</p>
        <p className="font-medium">{normalizedBrief.service_type}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Budget</p>
          <p className="font-medium">{formatBudget(normalizedBrief)}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Timeline</p>
          <p className="font-medium">{formatTimeline(normalizedBrief)}</p>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Industries</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {normalizedBrief.industry.map((entry) => (
            <Badge key={entry} variant="secondary">
              {entry}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Geography</p>
        <p className="font-medium">{formatGeography(normalizedBrief)}</p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Additional Requirements</p>
        {normalizedBrief.constraints.length > 0 ? (
          <ul className="mt-1 list-disc space-y-1 pl-4">
            {normalizedBrief.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">None specified.</p>
        )}
      </div>
    </div>
  )
}
