import { Badge } from "@/components/ui/badge"
import type { BriefStatus } from "@/types"

const labelMap: Record<BriefStatus, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
}

const classMap: Record<BriefStatus, string> = {
  draft: "bg-[#333] text-[#919191]",
  clarifying: "bg-amber-500/20 text-amber-400",
  running: "bg-blue-500/20 text-blue-400",
  complete: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
}

export function BriefStatusBadge({ status }: { status: BriefStatus }) {
  return <Badge className={classMap[status]}>{labelMap[status]}</Badge>
}
