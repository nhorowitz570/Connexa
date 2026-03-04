"use client"

import { ChevronsUpDown } from 'lucide-react'

type BriefStatus = 'Draft' | 'Clarifying' | 'Running' | 'Complete' | 'Failed'

interface Brief {
  id: string
  name: string
  mode: 'Simple' | 'Detailed'
  status: BriefStatus
  created: string
  topMatch: string
  score: number
}

const data: Brief[] = [
  {
    id: "1",
    name: "Enterprise SEO Agency Search",
    mode: "Detailed",
    status: "Complete",
    created: "2 days ago",
    topMatch: "GrowthLab Media",
    score: 87
  },
  {
    id: "2",
    name: "Cloud Infrastructure Vendor",
    mode: "Simple",
    status: "Running",
    created: "4 hours ago",
    topMatch: "—",
    score: 0
  },
  {
    id: "3",
    name: "B2B SaaS Marketing Agency",
    mode: "Detailed",
    status: "Complete",
    created: "5 days ago",
    topMatch: "Directive Consulting",
    score: 92
  },
  {
    id: "4",
    name: "DevOps Consulting Partner",
    mode: "Detailed",
    status: "Clarifying",
    created: "1 day ago",
    topMatch: "—",
    score: 0
  },
  {
    id: "5",
    name: "UI/UX Design Studio",
    mode: "Simple",
    status: "Draft",
    created: "Just now",
    topMatch: "—",
    score: 0
  },
  {
    id: "6",
    name: "Data Analytics Provider",
    mode: "Detailed",
    status: "Failed",
    created: "3 days ago",
    topMatch: "—",
    score: 0
  }
]

const statusColors: Record<BriefStatus, string> = {
  Draft: 'bg-[#333] text-[#919191]',
  Clarifying: 'bg-amber-500/20 text-amber-400',
  Running: 'bg-blue-500/20 text-blue-400',
  Complete: 'bg-emerald-500/20 text-emerald-400',
  Failed: 'bg-red-500/20 text-red-400'
}

export function RecentBriefs() {
  return (
    <div className="bg-[#0D0D0D] rounded-2xl p-6">
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
            {data.map((item, index) => (
              <tr 
                key={item.id} 
                className={`group transition-colors border-b border-transparent last:border-0 ${
                  index === 0 ? 'bg-[#1A1A1A]' : 'hover:bg-[#1A1A1A]'
                }`}
              >
                <td className="py-4 pl-2 rounded-l-xl">
                  <span className="font-medium text-white">{item.name}</span>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    item.mode === 'Detailed' 
                      ? 'bg-indigo-500/20 text-indigo-400' 
                      : 'bg-[#333] text-[#919191]'
                  }`}>
                    {item.mode}
                  </span>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[item.status]}`}>
                    {item.status}
                  </span>
                </td>
                <td className="py-4 text-[#919191]">{item.created}</td>
                <td className="py-4 text-white">{item.topMatch}</td>
                <td className="py-4 text-right pr-2 rounded-r-xl">
                  {item.score > 0 ? (
                    <span className={`font-semibold ${
                      item.score >= 90 ? 'text-emerald-400' : 
                      item.score >= 80 ? 'text-indigo-400' : 
                      'text-white'
                    }`}>
                      {item.score}
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
