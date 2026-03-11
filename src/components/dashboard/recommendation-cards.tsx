"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

type Recommendation = {
  id: string
  prompt: string
  reason: string
  category: string
  confidence: number
}

type RecommendationApiPayload = {
  data?: {
    recommendations?: Recommendation[]
  }
  error?: string
}

export function RecommendationCards() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const response = await fetch("/api/recommendations", { cache: "no-store" })
        if (!response.ok) {
          if (!cancelled) setRecommendations([])
          return
        }

        const payload = (await response.json()) as RecommendationApiPayload
        if (!cancelled) {
          setRecommendations(Array.isArray(payload.data?.recommendations) ? payload.data.recommendations : [])
        }
      } catch {
        if (!cancelled) {
          setRecommendations([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="glass-card rounded-3xl border border-border p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-indigo-500/15 p-1.5 text-indigo-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Suggested Searches</h2>
          <p className="text-xs text-muted-foreground">Generated from your recent brief activity</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building recommendations...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground">
          Submit your first brief to get personalized recommendations.
        </div>
      ) : (
        <div className="grid gap-3">
          {recommendations.map((recommendation) => (
            <button
              key={recommendation.id}
              type="button"
              onClick={() =>
                router.push(`/brief/new?prompt=${encodeURIComponent(recommendation.prompt)}`)
              }
              className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {recommendation.category}
                </span>
                <span className="text-xs text-muted-foreground">
                  {Math.round(recommendation.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">{recommendation.prompt}</p>
              <p className="mt-1 text-xs text-muted-foreground">{recommendation.reason}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
