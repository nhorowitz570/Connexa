import { Badge } from "@/components/ui/badge"
import type { BriefStatus } from "@/types"

const labelMap: Record<BriefStatus, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  running: "Searching",
  complete: "Complete",
  error: "Error",
  cancelled: "Cancelled",
}

const classMap: Record<BriefStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  clarifying: "border border-amber-500/35 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  running: "border border-blue-500/35 bg-blue-500/15 text-blue-700 dark:text-blue-300",
  complete: "border border-emerald-500/35 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  error: "border border-red-500/35 bg-red-500/15 text-red-700 dark:text-red-300",
  cancelled: "border border-slate-500/35 bg-slate-500/15 text-slate-700 dark:text-slate-300",
}

export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  return <Badge className={classMap[status]}>{labelMap[status]}</Badge>
}
