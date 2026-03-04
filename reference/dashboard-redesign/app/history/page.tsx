"use client"

import { useState } from 'react'
import Link from 'next/link'
import { PageLayout } from "@/components/page-layout"
import { Search, Filter, Calendar, ChevronDown, Eye, RotateCcw, Trash2 } from 'lucide-react'

type BriefStatus = 'Draft' | 'Clarifying' | 'Running' | 'Complete' | 'Failed'

interface HistoryBrief {
  id: string
  name: string
  mode: 'Simple' | 'Detailed'
  status: BriefStatus
  created: string
  createdDate: Date
  topMatch: string
  matchCount: number
  score: number
}

const historyData: HistoryBrief[] = [
  {
    id: "1",
    name: "Enterprise SEO Agency Search",
    mode: "Detailed",
    status: "Complete",
    created: "Mar 1, 2026",
    createdDate: new Date('2026-03-01'),
    topMatch: "GrowthLab Media",
    matchCount: 5,
    score: 87
  },
  {
    id: "2",
    name: "Cloud Infrastructure Vendor",
    mode: "Simple",
    status: "Running",
    created: "Mar 3, 2026",
    createdDate: new Date('2026-03-03'),
    topMatch: "—",
    matchCount: 0,
    score: 0
  },
  {
    id: "3",
    name: "B2B SaaS Marketing Agency",
    mode: "Detailed",
    status: "Complete",
    created: "Feb 26, 2026",
    createdDate: new Date('2026-02-26'),
    topMatch: "Directive Consulting",
    matchCount: 5,
    score: 92
  },
  {
    id: "4",
    name: "DevOps Consulting Partner",
    mode: "Detailed",
    status: "Clarifying",
    created: "Mar 2, 2026",
    createdDate: new Date('2026-03-02'),
    topMatch: "—",
    matchCount: 0,
    score: 0
  },
  {
    id: "5",
    name: "UI/UX Design Studio",
    mode: "Simple",
    status: "Draft",
    created: "Mar 3, 2026",
    createdDate: new Date('2026-03-03'),
    topMatch: "—",
    matchCount: 0,
    score: 0
  },
  {
    id: "6",
    name: "Data Analytics Provider",
    mode: "Detailed",
    status: "Failed",
    created: "Feb 28, 2026",
    createdDate: new Date('2026-02-28'),
    topMatch: "—",
    matchCount: 0,
    score: 0
  },
  {
    id: "7",
    name: "Mobile App Development Agency",
    mode: "Detailed",
    status: "Complete",
    created: "Feb 20, 2026",
    createdDate: new Date('2026-02-20'),
    topMatch: "Toptal",
    matchCount: 5,
    score: 89
  },
  {
    id: "8",
    name: "Content Writing Service",
    mode: "Simple",
    status: "Complete",
    created: "Feb 15, 2026",
    createdDate: new Date('2026-02-15'),
    topMatch: "Contently",
    matchCount: 4,
    score: 78
  },
]

const statusColors: Record<BriefStatus, string> = {
  Draft: 'bg-[#333] text-[#919191]',
  Clarifying: 'bg-amber-500/20 text-amber-400',
  Running: 'bg-blue-500/20 text-blue-400',
  Complete: 'bg-emerald-500/20 text-emerald-400',
  Failed: 'bg-red-500/20 text-red-400'
}

const statusFilters: BriefStatus[] = ['Complete', 'Running', 'Clarifying', 'Draft', 'Failed']

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<BriefStatus | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)

  const filteredData = historyData.filter(brief => {
    const matchesSearch = brief.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || brief.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: historyData.length,
    complete: historyData.filter(b => b.status === 'Complete').length,
    running: historyData.filter(b => b.status === 'Running').length,
    avgScore: Math.round(
      historyData.filter(b => b.score > 0).reduce((acc, b) => acc + b.score, 0) / 
      historyData.filter(b => b.score > 0).length
    )
  }

  return (
    <PageLayout activePage="history">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Brief History</h1>
          <p className="text-[#919191] mt-1">View and manage all your past briefs</p>
        </div>
        <Link 
          href="/new-brief"
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors w-fit"
        >
          Create New Brief
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#1F1F1F]">
          <p className="text-[#919191] text-sm">Total Briefs</p>
          <p className="text-2xl font-semibold text-white mt-1">{stats.total}</p>
        </div>
        <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#1F1F1F]">
          <p className="text-[#919191] text-sm">Completed</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">{stats.complete}</p>
        </div>
        <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#1F1F1F]">
          <p className="text-[#919191] text-sm">In Progress</p>
          <p className="text-2xl font-semibold text-blue-400 mt-1">{stats.running}</p>
        </div>
        <div className="bg-[#0D0D0D] rounded-xl p-4 border border-[#1F1F1F]">
          <p className="text-[#919191] text-sm">Avg. Score</p>
          <p className="text-2xl font-semibold text-indigo-400 mt-1">{stats.avgScore}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center gap-2 px-4 py-3 bg-[#0D0D0D] rounded-xl border border-[#1F1F1F]">
          <Search className="h-5 w-5 text-[#919191]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search briefs by name..."
            className="flex-1 bg-transparent text-white placeholder-[#666] focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl border transition-colors ${
            showFilters ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-[#0D0D0D] border-[#1F1F1F] text-[#919191] hover:text-white'
          }`}
        >
          <Filter className="h-5 w-5" />
          <span>Filters</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedStatus === 'all' 
                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                : 'bg-[#1A1A1A] text-[#919191] border border-[#333] hover:text-white'
            }`}
          >
            All
          </button>
          {statusFilters.map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' 
                  : 'bg-[#1A1A1A] text-[#919191] border border-[#333] hover:text-white'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      )}

      {/* History List */}
      <div className="bg-[#0D0D0D] rounded-2xl border border-[#1F1F1F] overflow-hidden">
        {filteredData.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-[#919191]">No briefs found matching your criteria</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F1F1F]">
            {filteredData.map((brief) => (
              <div 
                key={brief.id}
                className="p-6 hover:bg-[#1A1A1A]/50 transition-colors group"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-white font-medium truncate">{brief.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusColors[brief.status]}`}>
                        {brief.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                        brief.mode === 'Detailed' 
                          ? 'bg-indigo-500/20 text-indigo-400' 
                          : 'bg-[#333] text-[#919191]'
                      }`}>
                        {brief.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-[#919191]">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {brief.created}
                      </span>
                      {brief.matchCount > 0 && (
                        <span>{brief.matchCount} matches</span>
                      )}
                      {brief.score > 0 && (
                        <span className={`font-medium ${
                          brief.score >= 90 ? 'text-emerald-400' : 
                          brief.score >= 80 ? 'text-indigo-400' : 'text-white'
                        }`}>
                          Score: {brief.score}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {brief.status === 'Complete' && (
                      <Link
                        href={`/results?brief=${brief.id}`}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1A] hover:bg-[#252525] text-white text-sm rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View Results</span>
                      </Link>
                    )}
                    {(brief.status === 'Draft' || brief.status === 'Failed') && (
                      <button className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm rounded-lg transition-colors">
                        <RotateCcw className="h-4 w-4" />
                        <span>Retry</span>
                      </button>
                    )}
                    <button className="p-2 hover:bg-red-500/10 text-[#919191] hover:text-red-400 rounded-lg transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
