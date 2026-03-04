"use client"

import { useState } from "react"
import Link from "next/link"
import {
    TrendingUp, TrendingDown, Lightbulb, ChevronRight,
    ArrowUpRight, BarChart3, Target,
} from "lucide-react"
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
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
        <section className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold text-white">AI Actionable Core Insights</h1>
                    <p className="text-[#919191] mt-1">
                        Transparency into AI scoring logic and optimization opportunities
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <AnalyticsRefreshButton />
                    <div className="flex items-center gap-1 bg-[#161B22] rounded-lg p-1 border border-[#30363D]">
                        {(["7d", "30d", "90d"] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${timeRange === range
                                    ? "bg-indigo-600 text-white"
                                    : "text-[#919191] hover:text-white"
                                    }`}
                            >
                                {range.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((kpi, i) => (
                    <div
                        key={i}
                        className="bg-[#161B22] rounded-2xl p-5 border border-[#30363D] hover:border-indigo-500/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: "backwards" }}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div
                                className="h-10 w-10 rounded-xl flex items-center justify-center"
                                style={{ backgroundColor: `${kpi.color}15` }}
                            >
                                <div
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: kpi.color }}
                                />
                            </div>
                            <div
                                className={`flex items-center gap-1 text-sm font-medium ${kpi.trend === "up" ? "text-emerald-400" : "text-amber-400"
                                    }`}
                            >
                                {kpi.trend === "up" ? (
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
                <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D] animate-in fade-in slide-in-from-left-4 duration-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Match Score Trend</h3>
                            <p className="text-sm text-[#919191]">Average confidence score over time</p>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-400 text-sm">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>{scoreDelta >= 0 ? "+" : ""}{scoreDelta} pts</span>
                        </div>
                    </div>
                    <div className="h-64">
                        {scoreTrendData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-[#919191] text-sm">
                                No score data yet.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={scoreTrendData}>
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
                </div>

                {/* Miss Reasons */}
                <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D] animate-in fade-in slide-in-from-right-4 duration-700">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Miss Reasons</h3>
                            <p className="text-sm text-[#919191]">Why briefs didn&apos;t produce strong matches</p>
                        </div>
                        <BarChart3 className="h-5 w-5 text-[#919191]" />
                    </div>
                    <div className="h-64">
                        {missReasonData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-[#919191] text-sm">
                                No miss reasons recorded yet.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={missReasonData} layout="vertical">
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
                </div>
            </div>

            {/* Optimization Recommendations */}
            <div className="bg-[#161B22] rounded-2xl p-6 border border-[#30363D] animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Lightbulb className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Optimization Recommendations</h3>
                        <p className="text-sm text-[#919191]">
                            AI-generated suggestions to improve your match rate
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {recommendations.length === 0 ? (
                        <p className="text-sm text-[#919191]">No recommendations available yet.</p>
                    ) : (
                        recommendations.map((rec, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-4 p-4 bg-[#0D1117] rounded-xl border border-[#30363D] hover:border-indigo-500/30 transition-colors group"
                            >
                                <div
                                    className={`h-2 w-2 rounded-full mt-2 shrink-0 ${rec.priority === "high"
                                        ? "bg-red-400"
                                        : rec.priority === "medium"
                                            ? "bg-amber-400"
                                            : "bg-emerald-400"
                                        }`}
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h4 className="font-medium text-white mb-1">{rec.title}</h4>
                                            <p className="text-sm text-[#919191] leading-relaxed">{rec.description}</p>
                                        </div>
                                        <Link
                                            href="/settings"
                                            className="shrink-0 flex items-center gap-2 px-4 py-2 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-white text-sm font-medium rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            Fix
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Explainability Note */}
            <div className="flex items-start gap-3 p-4 bg-indigo-500/5 rounded-xl border border-indigo-500/20 animate-in fade-in duration-700">
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                    <p className="text-sm text-[#C9D1D9]">
                        <strong className="text-white">How we calculate scores:</strong> Our AI evaluates
                        vendors across weighted criteria including industry relevance, service alignment,
                        budget fit, geographic match, and historical performance data. Scores above 80
                        indicate strong alignment with your requirements.
                    </p>
                </div>
            </div>
        </section>
    )
}
