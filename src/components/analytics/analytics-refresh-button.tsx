"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

type AnalyticsRefreshButtonProps = {
  className?: string
}

export function AnalyticsRefreshButton({ className }: AnalyticsRefreshButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          window_days: 30,
          include_today: true,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        data?: {
          date_from?: string
          date_to?: string
          dates_processed?: number
        }
        error?: string
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to refresh analytics.")
      }

      const from = payload.data?.date_from
      const to = payload.data?.date_to
      if (from && to) {
        toast.success(`Analytics refreshed for ${from} to ${to}.`)
      } else {
        toast.success("Analytics refreshed.")
      }
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh analytics."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={loading}
      onClick={() => void handleRefresh()}
    >
      <RefreshCw className={loading ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
      {loading ? "Refreshing..." : "Refresh Analytics"}
    </Button>
  )
}
