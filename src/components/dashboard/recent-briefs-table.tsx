"use client"

import Link from "next/link"
import { ChevronsUpDown } from "lucide-react"

type BriefStatus = "draft" | "clarifying" | "running" | "complete" | "failed" | "cancelled"

type RecentBriefRow = {
  id: string
  mode: "simple" | "detailed"
  status: BriefStatus
  createdAt: string
  serviceType: string
  topMatch: string | null
  topScore: number | null
}

type RecentBriefsTableProps = {
  rows: RecentBriefRow[]
}

const statusColors: Record<BriefStatus, string> = {
  draft: "bg-[#333] text-[#919191]",
  clarifying: "bg-amber-500/20 text-amber-400",
  running: "bg-blue-500/20 text-blue-400",
  complete: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
  cancelled: "bg-slate-500/20 text-slate-300",
}

const statusLabels: Record<BriefStatus, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  running: "Running",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
}

function scoreColor(score: number | null) {
  if (score === null) return "text-[#919191]"
  if (score >= 90) return "text-emerald-400"
  if (score >= 80) return "text-indigo-400"
  if (score >= 70) return "text-blue-400"
  return "text-amber-400"
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = diffMs / (1000 * 60 * 60 * 24)

  if (diffHours < 1) return "Just now"
  if (diffHours < 24) return `${Math.floor(diffHours)} hours ago`
  if (diffDays < 7) return `${Math.floor(diffDays)} days ago`
  return date.toLocaleDateString()
}

export function RecentBriefsTable({ rows }: RecentBriefsTableProps) {
  return (
    <div className="bg-[#0D0D0D] rounded-2xl p-6 border border-[#1F1F1F] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-lg font-medium text-white mb-4">Recent Briefs</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="text-[#919191] text-sm border-b border-transparent">
              <th className="pb-4 text-left font-medium pl-2">
                <div className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors">
                  Brief Name
                  <ChevronsUpDown className="h-4 w-4" />
                </div>
              </th>
              <th className="pb-4 text-left font-medium">Mode</th>
              <th className="pb-4 text-left font-medium">Status</th>
              <th className="pb-4 text-left font-medium">Created</th>
              <th className="pb-4 text-left font-medium">Top Match</th>
              <th className="pb-4 text-right font-medium pr-2">
                <div className="flex items-center gap-1 justify-end cursor-pointer hover:text-white transition-colors">
                  Score
                  <ChevronsUpDown className="h-4 w-4" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                className={`group transition-colors border-b border-transparent last:border-0 ${index === 0 ? "bg-[#1A1A1A]" : "hover:bg-[#1A1A1A]"
                  }`}
              >
                <td className="py-4 pl-2 rounded-l-xl">
                  <Link
                    href={`/brief/${row.id}`}
                    className="font-medium text-white hover:text-indigo-400 transition-colors"
                  >
                    {row.serviceType}
                  </Link>
                </td>
                <td className="py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${row.mode === "detailed"
                      ? "bg-indigo-500/20 text-indigo-400"
                      : "bg-[#333] text-[#919191]"
                      }`}
                  >
                    {row.mode === "detailed" ? "Detailed" : "Simple"}
                  </span>
                </td>
                <td className="py-4">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${statusColors[row.status]}`}
                  >
                    {statusLabels[row.status]}
                  </span>
                </td>
                <td className="py-4 text-[#919191]">{formatDate(row.createdAt)}</td>
                <td className="py-4 text-white">{row.topMatch ?? "—"}</td>
                <td className="py-4 text-right pr-2 rounded-r-xl">
                  {row.topScore !== null && row.topScore > 0 ? (
                    <span className={`font-semibold ${scoreColor(row.topScore)}`}>
                      {row.topScore}
                    </span>
                  ) : (
                    <span className="text-[#919191]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
