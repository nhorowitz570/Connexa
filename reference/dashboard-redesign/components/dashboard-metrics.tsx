"use client"

import { FileText } from 'lucide-react'

export function DashboardMetrics() {
  return (
    <div className="flex flex-col xl:flex-row gap-8 xl:items-center justify-between p-6 bg-[#0D0D0D] rounded-2xl">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-gray-400">
          <FileText className="h-5 w-5" />
          <span className="text-lg">Active Briefs</span>
        </div>
        <div className="text-5xl md:text-4xl lg:text-5xl font-bold text-white">24</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 xl:gap-16">
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Total Briefs</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-white">156</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Completed</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-indigo-400">127</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Avg. Score</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-indigo-400">84.2</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-gray-400 text-sm">Running</span>
          <span className="text-2xl md:text-xl lg:text-2xl font-semibold text-blue-400">5</span>
        </div>
      </div>
    </div>
  )
}
