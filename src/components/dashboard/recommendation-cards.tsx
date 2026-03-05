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
    <section className="glass-card rounded-3xl border border-white/10 p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-lg bg-indigo-500/15 p-1.5 text-indigo-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">Suggested Searches</h2>
          <p className="text-xs text-[#95a2bb]">Generated from your recent brief activity</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-[#9ca8bf]">
          <Loader2 className="h-4 w-4 animate-spin" />
          Building recommendations...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/20 bg-black/20 px-4 py-5 text-sm text-[#9ca8bf]">
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
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] uppercase tracking-wide text-[#c8d2e4]">
                  {recommendation.category}
                </span>
                <span className="text-xs text-[#92a0bb]">
                  {Math.round(recommendation.confidence * 100)}% match
                </span>
              </div>
              <p className="text-sm font-medium text-white">{recommendation.prompt}</p>
              <p className="mt-1 text-xs text-[#9aa6bf]">{recommendation.reason}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
