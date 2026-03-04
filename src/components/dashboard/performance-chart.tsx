"use client"

import { useEffect, useState, useTransition } from "react"
import { Calendar, Download } from "lucide-react"
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

type ChartRow = { date: string; runs: number }

const RANGE_OPTIONS = ["7D", "30D", "90D"] as const
type Range = (typeof RANGE_OPTIONS)[number]

function rangeToDays(range: Range): number {
    if (range === "7D") return 7
    if (range === "30D") return 30
    return 90
}

export function PerformanceChart() {
    const [range, setRange] = useState<Range>("30D")
    const [data, setData] = useState<ChartRow[]>([])
    const [isPending, startTransition] = useTransition()

    useEffect(() => {
        const days = rangeToDays(range)
        const since = new Date()
        since.setDate(since.getDate() - days + 1)

        startTransition(() => {
            fetch(`/api/analytics/pipeline-activity?days=${days}`)
                .then((r) => (r.ok ? r.json() : { data: [] }))
                .then((payload: { data?: ChartRow[] }) => setData(payload.data ?? []))
                .catch(() => setData([]))
        })
    }, [range])

    const maxRuns = data.length > 0 ? Math.max(...data.map((d) => d.runs), 5) : 5
    const yMax = Math.ceil(maxRuns / 5) * 5 + 5

    return (
        <div className="flex flex-col gap-6 p-6 bg-[#0D0D0D] rounded-2xl border border-[#1F1F1F] animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-2 lg:gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-medium text-white">Discovery Pipeline Activity</h2>
                </div>

                <div className="flex items-center gap-4 md:gap-2 lg:gap-4">
                    <div className="flex items-center bg-[#1A1A1A] rounded-lg p-1">
                        {RANGE_OPTIONS.map((period) => (
                            <button
                                key={period}
                                onClick={() => setRange(period)}
                                className={`px-3 md:px-2 lg:px-3 py-1 text-sm md:text-xs lg:text-sm rounded-md transition-colors ${period === range
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "text-[#919191] hover:text-white"
                                    }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <button className="p-2 text-[#919191] hover:text-white bg-[#1A1A1A] rounded-lg transition-colors">
                            <Calendar className="h-5 w-5" />
                        </button>
                        <button className="p-2 text-[#919191] hover:text-white bg-[#1A1A1A] rounded-lg transition-colors">
                            <Download className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-[#919191]">Active Runs</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[#919191]">
                        Brief Activity (Last {rangeToDays(range)} Days)
                    </span>
                </div>
            </div>

            <div className={`h-[340px] w-full transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
                {data.length === 0 && !isPending ? (
                    <div className="flex items-center justify-center h-full text-[#919191] text-sm">
                        No pipeline activity in this time range.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorRuns" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                            <XAxis dataKey="date" hide />
                            <YAxis
                                domain={[0, yMax]}
                                orientation="left"
                                tick={{ fill: "#666" }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-[#1A1A1A] border border-[#333] p-2 rounded-lg shadow-xl">
                                                <p className="text-white font-medium">
                                                    {payload[0].value} runs{" "}
                                                    <span className="text-[#919191] text-sm ml-2">
                                                        {payload[0].payload.date}
                                                    </span>
                                                </p>
                                            </div>
                                        )
                                    }
                                    return null
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="runs"
                                stroke="#6366f1"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRuns)"
                                animationDuration={800}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    )
}
