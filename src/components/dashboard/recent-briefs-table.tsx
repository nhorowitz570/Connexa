"use client"

import { ChevronsUpDown, Sparkles } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

import { cn } from "@/lib/utils"

type BriefStatus = "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"

type RecentBriefRow = {
  id: string
  name: string | null
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
  draft: "bg-white/10 text-[#bcc4d6]",
  clarifying: "bg-amber-500/20 text-amber-300",
  running: "bg-blue-500/20 text-blue-300",
  complete: "bg-emerald-500/20 text-emerald-300",
  error: "bg-rose-500/20 text-rose-300",
  cancelled: "bg-slate-500/20 text-slate-200",
}

const statusLabels: Record<BriefStatus, string> = {
  draft: "Draft",
  clarifying: "Clarifying",
  running: "Searching",
  complete: "Complete",
  error: "Error",
  cancelled: "Cancelled",
}

function scoreColor(score: number | null) {
  if (score === null) return "text-[#919191]"
  if (score >= 90) return "text-emerald-300"
  if (score >= 80) return "text-indigo-300"
  if (score >= 70) return "text-blue-300"
  return "text-amber-300"
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
    <div className="glass-card rounded-3xl border border-white/10 p-4 sm:p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">Recent Briefs</h2>

      <div className="overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[#9ba3b6]">
              <th className="sticky left-0 z-20 bg-[#0d0f14] px-3 py-3 text-left font-medium">
                <div className="flex cursor-pointer items-center gap-1 transition-colors hover:text-white">
                  Brief Name
                  <ChevronsUpDown className="h-4 w-4" />
                </div>
              </th>
              <th className="px-3 py-3 text-left font-medium">Mode</th>
              <th className="px-3 py-3 text-left font-medium">Status</th>
              <th className="px-3 py-3 text-left font-medium">Created</th>
              <th className="px-3 py-3 text-left font-medium">Top Match</th>
              <th className="px-3 py-3 text-right font-medium">
                <div className="flex cursor-pointer items-center justify-end gap-1 transition-colors hover:text-white">
                  Score
                  <ChevronsUpDown className="h-4 w-4" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <motion.tr
                key={row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: "easeOut", delay: index * 0.03 }}
                className={cn(
                  "group border-b border-white/5 transition-all duration-200 last:border-0",
                  "hover:bg-white/5",
                )}
              >
                <td className="sticky left-0 z-10 min-w-[250px] bg-inherit px-3 py-3 align-top sm:py-3.5">
                  <Link
                    href={`/brief/${row.id}`}
                    className="font-medium text-white transition-colors hover:text-indigo-300"
                  >
                    {row.name?.trim() || row.serviceType}
                  </Link>
                  {row.name?.trim() ? (
                    <p className="mt-1 line-clamp-1 text-xs text-[#8b95a9]">{row.serviceType}</p>
                  ) : null}
                </td>

                <td className="px-3 py-3 sm:py-3.5">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium",
                      row.mode === "detailed" ? "bg-indigo-500/20 text-indigo-300" : "bg-white/10 text-[#b0b9cc]",
                    )}
                  >
                    {row.mode === "detailed" ? "Detailed" : "Simple"}
                  </span>
                </td>

                <td className="px-3 py-3 sm:py-3.5">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[row.status]}`}>
                    {statusLabels[row.status]}
                  </span>
                </td>

                <td className="px-3 py-3 text-[#96a1b7] sm:py-3.5">{formatDate(row.createdAt)}</td>
                <td className="px-3 py-3 text-white sm:py-3.5">{row.topMatch ?? "-"}</td>

                <td className="px-3 py-3 text-right sm:py-3.5">
                  {row.topScore !== null && row.topScore > 0 ? (
                    <span className={cn("inline-flex items-center gap-1 font-semibold", scoreColor(row.topScore))}>
                      {row.topScore >= 90 ? <Sparkles className="h-3.5 w-3.5" /> : null}
                      {row.topScore}
                    </span>
                  ) : (
                    <span className="text-[#919191]">-</span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
