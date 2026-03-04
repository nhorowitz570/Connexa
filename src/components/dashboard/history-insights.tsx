import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type HistoryInsightsProps = {
  totalBriefs: number
  completedBriefs: number
  inProgressBriefs: number
  averageScore: number | null
}

export function HistoryInsights({
  totalBriefs,
  completedBriefs,
  inProgressBriefs,
  averageScore,
}: HistoryInsightsProps) {
  const cards = [
    { label: "Total Briefs", value: totalBriefs },
    { label: "Completed", value: completedBriefs },
    { label: "In Progress", value: inProgressBriefs },
    { label: "Avg. Score", value: averageScore !== null ? Math.round(averageScore) : "-" },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
