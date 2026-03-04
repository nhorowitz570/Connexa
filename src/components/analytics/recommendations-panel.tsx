import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type RecommendationItem = {
  title: string
  description: string
  priority: "low" | "medium" | "high"
}

type RecommendationsPanelProps = {
  recommendations: RecommendationItem[]
}

function priorityVariant(priority: RecommendationItem["priority"]) {
  if (priority === "high") return "bg-rose-100 text-rose-700"
  if (priority === "medium") return "bg-amber-100 text-amber-700"
  return "bg-emerald-100 text-emerald-700"
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Recommendations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations available yet.</p>
        ) : (
          recommendations.map((recommendation, index) => (
            <div key={`${recommendation.title}-${index}`} className="rounded-md border p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="font-medium">{recommendation.title}</p>
                <Badge className={priorityVariant(recommendation.priority)}>{recommendation.priority}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{recommendation.description}</p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
