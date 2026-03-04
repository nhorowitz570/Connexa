"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MissReasonsChartProps = {
  data: Array<{ reason: string; count: number }>
}

export function MissReasonsChart({ data }: MissReasonsChartProps) {
  const chartData = data.length > 0 ? data : [{ reason: "No misses", count: 0 }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Miss Reasons Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ left: 8, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="reason" tick={{ fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={55} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
