import type { ReactNode } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type AvgScoreCardProps = {
  value: number | null
  trendText?: string
  action?: ReactNode
}

export function AvgScoreCard({ value, trendText, action }: AvgScoreCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Average Match Score</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value !== null ? Math.round(value) : "-"}</p>
        {trendText ? <p className="text-xs text-muted-foreground">{trendText}</p> : null}
      </CardContent>
    </Card>
  )
}
