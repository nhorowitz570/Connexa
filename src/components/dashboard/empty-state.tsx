import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ title, description, actionHref, actionLabel }: EmptyStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {actionHref && actionLabel ? (
        <CardContent>
          <Button asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </CardContent>
      ) : null}
    </Card>
  )
}
