import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type MissedOpportunitiesCardProps = {
  value: number
}

export function MissedOpportunitiesCard({ value }: MissedOpportunitiesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Missed Opportunities</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">Briefs with fewer than 3 viable results</p>
      </CardContent>
    </Card>
  )
}
