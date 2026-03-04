"use client"

import { FileText } from "lucide-react"

type DashboardStatsProps = {
  totalBriefs: number
  failedBriefs: number
  runningBriefs: number
  averageScore: number | null
}

export function DashboardStats({
  totalBriefs,
  failedBriefs,
  runningBriefs,
  averageScore,
}: DashboardStatsProps) {
  const activeBriefs = runningBriefs
  const completedBriefs = totalBriefs - failedBriefs - runningBriefs

  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:items-center justify-between p-6 bg-[#0D0D0D] rounded-2xl border border-[#1F1F1F] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-[#919191]">
          <FileText className="h-5 w-5" />
          <span className="text-lg">Active Briefs</span>
        </div>
        <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-white">{activeBriefs}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16">
        <div className="flex flex-col gap-1">
          <span className="text-[#919191] text-sm">Total Briefs</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-white">{totalBriefs}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[#919191] text-sm">Completed</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-indigo-400">{completedBriefs > 0 ? completedBriefs : 0}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[#919191] text-sm">Avg. Score</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-indigo-400">
            {averageScore !== null ? averageScore.toFixed(1) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[#919191] text-sm">Failed</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-red-400">{failedBriefs}</span>
        </div>
      </div>
    </div>
  )
}
