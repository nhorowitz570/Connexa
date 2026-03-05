"use client"

import { motion } from "framer-motion"
import {
  ArrowUpRight,
  BarChart3,
  ChevronRight,
  Lightbulb,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { AnalyticsRefreshButton } from "@/components/analytics/analytics-refresh-button"

type KPI = {
  label: string
  value: string
  change: string
  trend: "up" | "down"
  description: string
  color: string
}

type MissReason = { reason: string; count: number; color: string }
type ScorePoint = { date: string; score: number }
type Recommendation = { title: string; description: string; priority: "low" | "medium" | "high" }

type AnalyticsClientProps = {
  kpis: KPI[]
  scoreTrendData: ScorePoint[]
  scoreDelta: number
  missReasonData: MissReason[]
  recommendations: Recommendation[]
}

export function AnalyticsClient({
  kpis,
  scoreTrendData,
  scoreDelta,
  missReasonData,
  recommendations,
}: AnalyticsClientProps) {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("90d")

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="flex flex-col gap-6 pb-6"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">AI Actionable Core Insights</h1>
          <p className="mt-1 text-[#919191]">Simple insights to improve your match quality over time.</p>
        </div>
        <div className="flex items-center gap-3">
          <AnalyticsRefreshButton />
          <div className="glass-card flex items-center gap-1 rounded-xl border border-white/10 p-1">
            {(["7d", "30d", "90d"] as const).map((range) => (
              <motion.button
                key={range}
                onClick={() => setTimeRange(range)}
                whileTap={{ scale: 0.96 }}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  timeRange === range ? "bg-indigo-600 text-white" : "text-[#919191] hover:text-white"
                }`}
              >
                {range.toUpperCase()}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, index) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04, ease: "easeOut" }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="glass-card rounded-2xl border border-white/10 p-5 transition-all duration-300 hover:border-indigo-500/30"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${kpi.color}15` }}>
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: kpi.color }} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm font-medium ${
                  kpi.trend === "up" ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {kpi.trend === "up" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                {kpi.change}
              </div>
            </div>

            <p className="mb-1 text-3xl font-bold text-white">{kpi.value}</p>
            <p className="text-sm text-[#919191]">{kpi.label}</p>
            <p className="mt-2 text-xs text-[#606060]">{kpi.description}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.1, ease: "easeOut" }}
          className="glass-card rounded-2xl border border-white/10 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Match Score Trend</h3>
              <p className="text-sm text-[#919191]">How match quality is trending</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
              <span>
                {scoreDelta >= 0 ? "+" : ""}
                {scoreDelta} pts
              </span>
            </div>
          </div>

          <div className="h-64">
            {scoreTrendData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#919191]">No score data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" />
                  <XAxis dataKey="date" stroke="#919191" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#919191"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#161B22",
                      border: "1px solid #30363D",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#919191" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6, fill: "#6366f1" }}
                    animationDuration={1200}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, delay: 0.14, ease: "easeOut" }}
          className="glass-card rounded-2xl border border-white/10 p-6"
        >
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Improvement Areas</h3>
              <p className="text-sm text-[#919191]">Where stronger briefs can improve results</p>
            </div>
            <BarChart3 className="h-5 w-5 text-[#919191]" />
          </div>

          <div className="h-64">
            {missReasonData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#919191]">
                No improvement areas recorded yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missReasonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#30363D" horizontal={false} />
                  <XAxis type="number" stroke="#919191" fontSize={12} tickLine={false} axisLine={false} />
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
                      backgroundColor: "#161B22",
                      border: "1px solid #30363D",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    labelStyle={{ color: "#919191" }}
                    formatter={(value) => [`${value} briefs`, "Count"]}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} animationDuration={1000}>
                    {missReasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.18, ease: "easeOut" }}
        className="glass-card rounded-2xl border border-white/10 p-6"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Lightbulb className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Recommended Next Steps</h3>
            <p className="text-sm text-[#919191]">Practical actions you can take to improve results</p>
          </div>
        </div>

        <div className="space-y-4">
          {recommendations.length === 0 ? (
            <p className="text-sm text-[#919191]">No recommendations available yet.</p>
          ) : (
            recommendations.map((rec, index) => (
              <motion.div
                key={`${rec.title}-${index}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: index * 0.03, ease: "easeOut" }}
                whileHover={{ y: -2 }}
                className="group flex items-start gap-4 rounded-xl border border-[#30363D] bg-[#0D1117] p-4 transition-colors hover:border-indigo-500/30"
              >
                <div
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                    rec.priority === "high"
                      ? "bg-red-400"
                      : rec.priority === "medium"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="mb-1 font-medium text-white">{rec.title}</h4>
                      <p className="text-sm leading-relaxed text-[#919191]">{rec.description}</p>
                    </div>
                    <Link
                      href="/settings"
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2 text-sm font-medium text-white opacity-0 transition-colors hover:bg-[#2A2A2A] group-hover:opacity-100"
                    >
                      Fix
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, delay: 0.2, ease: "easeOut" }}
        className="flex items-start gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
          <Target className="h-4 w-4 text-indigo-400" />
        </div>
        <div>
          <p className="text-sm text-[#C9D1D9]">
            <strong className="text-white">How scores are calculated:</strong> We compare each provider to your
            requirements across service fit, industry fit, budget, location, timeline, and constraints. Scores above
            80 usually mean a strong match.
          </p>
        </div>
      </motion.div>
    </motion.section>
  )
}
