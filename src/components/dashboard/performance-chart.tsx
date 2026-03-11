"use client"

import { useEffect, useState, useTransition } from "react"
import { motion } from "framer-motion"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

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
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="glass-card rounded-3xl border border-border p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground sm:text-xl">Search Activity</h2>
          <p className="text-sm text-muted-foreground">How many discovery runs finished each day</p>
        </div>

        <div className="flex items-center rounded-xl border border-border bg-muted/40 p-1">
          {RANGE_OPTIONS.map((period) => (
            <motion.button
              key={period}
              onClick={() => setRange(period)}
              whileTap={{ scale: 0.96 }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                period === range
                  ? "bg-indigo-500/80 text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {period}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="mb-4 hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
        <div className="flex items-center gap-2">
          <span className="animate-pulse-glow h-2.5 w-2.5 rounded-full bg-indigo-400" />
          <span>Completed searches</span>
        </div>
        <span>Window: last {rangeToDays(range)} days</span>
      </div>

      <div className={`h-[250px] w-full transition-opacity duration-300 sm:h-[320px] ${isPending ? "opacity-60" : "opacity-100"}`}>
        {data.length === 0 && !isPending ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No search activity in this time range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="performance-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                  <stop offset="90%" stopColor="#6366f1" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#243042" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                tick={{ fill: "currentColor", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={34}
              />
              <Tooltip
                cursor={{ stroke: "#6366f1", strokeOpacity: 0.26 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-xl border border-border bg-popover/95 px-3 py-2 text-sm text-popover-foreground shadow-xl backdrop-blur-xl">
                      <p className="font-semibold text-foreground">{payload[0].value} runs</p>
                      <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                    </div>
                  )
                }}
              />
              <Area
                type="monotone"
                dataKey="runs"
                stroke="#7c82ff"
                strokeWidth={2.3}
                fill="url(#performance-area)"
                animationDuration={850}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  )
}
