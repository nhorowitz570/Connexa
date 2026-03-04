"use client"

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ScoreTrendChartProps = {
  data: Array<{ date: string; avg_score: number | null }>
}

export function ScoreTrendChart({ data }: ScoreTrendChartProps) {
  const chartData = data.map((entry) => ({
    date: new Date(entry.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    avg_score: entry.avg_score ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Line type="monotone" dataKey="avg_score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
