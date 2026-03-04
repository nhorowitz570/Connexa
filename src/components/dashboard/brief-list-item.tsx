import Link from "next/link"

import { BriefStatusBadge } from "@/components/brief/brief-status-badge"
import { Badge } from "@/components/ui/badge"

type BriefListItemProps = {
  id: string
  mode: "simple" | "detailed"
  serviceType: string
  status: "draft" | "clarifying" | "running" | "complete" | "failed"
  createdAt: string
  score: number | null
}

export function BriefListItem({
  id,
  mode,
  serviceType,
  status,
  createdAt,
  score,
}: BriefListItemProps) {
  return (
    <Link
      href={`/brief/${id}`}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{mode}</Badge>
          <BriefStatusBadge status={status} />
        </div>
        <p className="font-medium">{serviceType}</p>
        <p className="text-sm text-muted-foreground">
          {new Date(createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="text-right">
        <p className="text-xs uppercase text-muted-foreground">Top Score</p>
        <p className="text-2xl font-semibold">{score ?? "-"}</p>
      </div>
    </Link>
  )
}
