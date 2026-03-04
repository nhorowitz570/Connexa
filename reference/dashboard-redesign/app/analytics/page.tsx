"use client"

import { useState } from 'react'
import { PageLayout } from "@/components/page-layout"
import { 
  Eye, Target, FileText, AlertTriangle, TrendingUp, TrendingDown,
  Lightbulb, ChevronRight, ArrowUpRight, BarChart3
} from 'lucide-react'
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const matchScoreTrend = [
  { date: 'Jan', score: 72 },
  { date: 'Feb', score: 75 },
  { date: 'Mar', score: 71 },
  { date: 'Apr', score: 78 },
  { date: 'May', score: 82 },
  { date: 'Jun', score: 79 },
  { date: 'Jul', score: 85 },
  { date: 'Aug', score: 83 },
  { date: 'Sep', score: 88 },
  { date: 'Oct', score: 86 },
  { date: 'Nov', score: 89 },
  { date: 'Dec', score: 91 },
]

const missReasons = [
  { reason: 'Budget too high', count: 34, color: '#EF4444' },
  { reason: 'Industry mismatch', count: 28, color: '#F59E0B' },
  { reason: 'Response time slow', count: 21, color: '#8B5CF6' },
  { reason: 'Incomplete profile', count: 18, color: '#3B82F6' },
  { reason: 'Location constraint', count: 12, color: '#10B981' },
  { reason: 'Capacity limits', count: 8, color: '#EC4899' },
]

const recommendations = [
  {
    priority: 'high',
    title: 'Complete your company profile',
    description: 'Your profile is missing key fields like team size and service capabilities. Complete profiles receive 40% more accurate matches.',
    action: 'Complete Profile',
    actionLink: '/settings#company'
  },
  {
    priority: 'high',
    title: 'Adjust budget ranges',
    description: 'Your minimum budget of $50K is filtering out 34% of potential matches. Consider lowering to $30K to expand your reach.',
    action: 'Review Brief Settings',
    actionLink: '/new-brief'
  },
  {
    priority: 'medium',
    title: 'Add more industry tags',
    description: 'Adding related industries like "Marketing Technology" and "AdTech" could increase your visibility by 25%.',
    action: 'Update Industries',
    actionLink: '/settings#company'
  },
  {
    priority: 'medium',
    title: 'Improve response time',
    description: 'Your average response time is 48 hours. Vendors responding within 24 hours see 60% higher engagement rates.',
    action: 'View Tips',
    actionLink: '#'
  },
  {
    priority: 'low',
    title: 'Consider geographic expansion',
    description: 'Expanding your service area to include remote work could open up 15+ additional high-quality matches.',
    action: 'Expand Regions',
    actionLink: '/settings#company'
  },
]

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('1y')

  const kpis = [
    { 
      label: 'Search Appearance Rate', 
      value: '78%', 
      change: '+12%', 
      trend: 'up',
      icon: Eye,
      description: 'How often you appear in search results'
    },
    { 
      label: 'Avg. AI Match Score', 
      value: '84', 
      change: '+8', 
      trend: 'up',
      icon: Target,
      description: 'Average confidence score across briefs'
    },
    { 
      label: 'Total Briefs Reviewed', 
      value: '156', 
      change: '+23', 
      trend: 'up',
      icon: FileText,
      description: 'Briefs analyzed in selected period'
    },
    { 
      label: 'Missed Opportunities', 
      value: '12', 
      change: '-5', 
      trend: 'down',
      icon: AlertTriangle,
      description: 'High-value briefs you didn\'t match'
    },
  ]

  return (
    <PageLayout activePage="analytics">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Actionable Core Insights</h1>
          <p className="text-[#919191] mt-1">Transparency into AI scoring logic and optimization opportunities</p>
        </div>
        <div className="flex items-center gap-2 bg-[#161B22] rounded-lg p-1 border border-[#30363D]">
          {(['7d', '30d', '90d', '1y'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[#4F6EF7] text-white'
                  : 'text-[#919191] hover:text-white'
              }`}
            >
              {range === '1y' ? '1 Year' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div
            key={i}
            className="bg-[#161B22] rounded-2xl p-5 border border-[#30363D] hover:border-[#4F6EF7]/30 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="h-10 w-10 rounded-xl bg-[#4F6EF7]/10 flex items-center justify-center">
                <kpi.icon className="h-5 w-5 text-[#4F6EF7]" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                kpi.trend === 'up' 
                  ? kpi.label.includes('Missed') ? 'text-emerald-400' : 'text-emerald-400'
                  : kpi.label.includes('Missed') ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {kpi.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {kpi.change}
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{kpi.value}</p>
            <p className="text-sm text-[#919191]">{kpi.label}</p>
            <p className="text-xs text-[#606060] mt-2">{kpi.description}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Match Score Trend */}
        <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Match Score Trend</h3>
              <p className="text-sm text-[#919191]">Average confidence score over time</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-400 text-sm">
              <ArrowUpRight className="h-4 w-4" />
              <span>+19 pts this year</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchScoreTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                <XAxis 
                  dataKey="date" 
                  stroke="#919191" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#919191" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  domain={[60, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#919191' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#4F6EF7" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6, fill: '#4F6EF7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Miss Reasons */}
        <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Miss Reasons</h3>
              <p className="text-sm text-[#919191]">Why you didn&apos;t match certain briefs</p>
            </div>
            <BarChart3 className="h-5 w-5 text-[#919191]" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missReasons} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                <XAxis 
                  type="number" 
                  stroke="#919191" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="reason" 
                  stroke="#919191" 
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={120}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#919191' }}
                  formatter={(value: number) => [`${value} briefs`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {missReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Optimization Recommendations */}
      <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D]">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Optimization Recommendations</h3>
            <p className="text-sm text-[#919191]">AI-generated suggestions to improve your match rate</p>
          </div>
        </div>
        
        <div className="space-y-4">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-4 bg-[#0D1117] rounded-xl border border-[#30363D] hover:border-[#4F6EF7]/30 transition-colors group"
            >
              <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${
                rec.priority === 'high' ? 'bg-red-400' :
                rec.priority === 'medium' ? 'bg-amber-400' :
                'bg-emerald-400'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                    <p className="text-sm text-[#919191] leading-relaxed">{rec.description}</p>
                  </div>
                  <a
                    href={rec.actionLink}
                    className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {rec.action}
                    <ChevronRight className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Explainability Note */}
      <div className="flex items-start gap-3 p-4 bg-[#4F6EF7]/5 rounded-xl border border-[#4F6EF7]/20">
        <div className="h-8 w-8 rounded-lg bg-[#4F6EF7]/10 flex items-center justify-center shrink-0">
          <Target className="h-4 w-4 text-[#4F6EF7]" />
        </div>
        <div>
          <p className="text-sm text-[#C9D1D9]">
            <strong className="text-white">How we calculate scores:</strong> Our AI evaluates vendors across 47 weighted criteria including industry relevance, service alignment, budget fit, geographic match, and historical performance data. Scores above 80 indicate strong alignment with your requirements.
          </p>
        </div>
      </div>
    </PageLayout>
  )
}
