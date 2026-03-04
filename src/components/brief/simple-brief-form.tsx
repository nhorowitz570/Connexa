"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"

import { CONFIDENCE } from "@/lib/constants"
import { NormalizeResponseSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/client"
import { ensureProfileExists } from "@/lib/supabase/ensure-profile"
import type { NormalizedBrief, QuestionsPayload } from "@/types"
import { ClarificationRenderer } from "@/components/brief/clarification-renderer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

function applyByPath(base: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".")
  let cursor: Record<string, unknown> = base

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const next = cursor[segment]
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }

  cursor[segments[segments.length - 1]] = value
}

export function SimpleBriefForm() {
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [clarificationPayload, setClarificationPayload] = useState<QuestionsPayload | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const [normalizedBrief, setNormalizedBrief] = useState<NormalizedBrief | null>(null)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)
  const router = useRouter()

  const canSubmit = useMemo(() => prompt.trim().length >= 10, [prompt])

  const startPipeline = async (id: string) => {
    const response = await fetch("/api/pipeline/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief_id: id }),
    })

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string }
      throw new Error(payload.error ?? "Failed to start pipeline.")
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")
      await ensureProfileExists(supabase, user)

      const { data: brief, error: insertError } = await supabase
        .from("briefs")
        .insert({
          user_id: user.id,
          mode: "simple",
          raw_prompt: prompt.trim(),
          status: "draft",
        })
        .select("id")
        .single()

      if (insertError || !brief) throw new Error(insertError?.message ?? "Failed to create brief.")

      setBriefId(brief.id)

      const normalizedResponse = await fetch("/api/brief/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      })
      if (!normalizedResponse.ok) {
        const payload = (await normalizedResponse.json()) as { error?: string }
        throw new Error(payload.error ?? "Failed to normalize brief.")
      }

      const normalizedPayload = NormalizeResponseSchema.parse(await normalizedResponse.json())
      setNormalizedBrief(normalizedPayload.normalized_brief)
      setWeights(normalizedPayload.weights)

      const { error: updateError } = await supabase
        .from("briefs")
        .update({
          normalized_brief: normalizedPayload.normalized_brief,
          weights: normalizedPayload.weights,
        })
        .eq("id", brief.id)
      if (updateError) throw new Error(updateError.message)

      if (normalizedPayload.confidence < CONFIDENCE.NORMALIZE_MIN_FOR_DIRECT_RUN) {
        const clarificationResponse = await fetch("/api/brief/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief_id: brief.id,
            normalized_brief: normalizedPayload.normalized_brief,
            confidence: normalizedPayload.confidence,
          }),
        })

        if (!clarificationResponse.ok) {
          const payload = (await clarificationResponse.json()) as { error?: string }
          throw new Error(payload.error ?? "Failed to generate clarifications.")
        }

        const clarification = QuestionsPayloadSchema.parse(await clarificationResponse.json())
        setClarificationPayload(clarification)
        toast.info("Please answer clarification questions.")
        return
      }

      await startPipeline(brief.id)
      toast.success("Brief submitted and run started.")
      router.push(`/brief/${brief.id}`)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit simple brief."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClarificationSubmit = async (answers: Record<string, unknown>) => {
    if (!briefId || !normalizedBrief || !weights || !clarificationPayload) return

    setLoading(true)
    try {
      const merged = structuredClone(normalizedBrief) as Record<string, unknown>
      for (const question of clarificationPayload.questions) {
        const answer = answers[question.id]
        if (answer === undefined) continue
        applyByPath(merged, question.fieldPath, answer)
      }

      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("briefs")
        .update({
          normalized_brief: merged,
          weights,
          status: "draft",
        })
        .eq("id", briefId)
      if (updateError) throw new Error(updateError.message)

      await startPipeline(briefId)
      toast.success("Clarifications saved. Run started.")
      router.push(`/brief/${briefId}`)
      router.refresh()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to submit clarification responses."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  if (clarificationPayload) {
    return (
      <ClarificationRenderer
        payload={clarificationPayload}
        submitting={loading}
        onSubmit={handleClarificationSubmit}
      />
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Simple Brief</CardTitle>
        <CardDescription>Describe what you need in plain language.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="prompt">What are you looking for?</Label>
            <Textarea
              id="prompt"
              rows={6}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Example: We need a healthcare SEO agency in North America with a 6-month runway and monthly budget around $25k."
            />
          </div>
          <Button type="submit" disabled={!canSubmit || loading}>
            {loading ? "Submitting..." : "Submit simple brief"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
