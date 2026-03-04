import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { Badge } from "@/components/ui/badge"

type BriefListItemProps = {
  id: string
  mode: "simple" | "detailed"
  name: string | null
  serviceType: string
  category: string | null
  status: "draft" | "clarifying" | "running" | "complete" | "failed" | "cancelled"
  createdAt: string
  score: number | null
  durationLabel?: string | null
  onSelect: (briefId: string) => void
}

export function BriefListItem({
  id,
  mode,
  name,
  serviceType,
  category,
  status,
  createdAt,
  score,
  durationLabel,
  onSelect,
}: BriefListItemProps) {
  const primaryText = name?.trim() || serviceType || "Untitled brief"
  const showServiceType = Boolean(name?.trim()) && Boolean(serviceType) && serviceType !== primaryText
  const showCategory = Boolean(category) && category !== serviceType

  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className="flex w-full flex-col gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{mode}</Badge>
          <BriefStatusBadge status={status} />
        </div>
        <p className="text-left font-medium">{primaryText}</p>
        {showServiceType ? <p className="text-left text-sm text-muted-foreground">{serviceType}</p> : null}
        {showCategory ? (
          <div className="flex">
            <Badge variant="outline" className="max-w-full truncate text-left">
              {category}
            </Badge>
          </div>
        ) : null}
        <p className="text-left text-sm text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
          {durationLabel ? ` - Duration: ${durationLabel}` : ""}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase text-muted-foreground">Top Score</p>
        <p className="text-2xl font-semibold">{score ?? "-"}</p>
      </div>
    </button>
  )
}
