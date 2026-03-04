"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ClarificationRenderer } from "@/components/brief/clarification-renderer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CONFIDENCE } from "@/lib/constants"
import { NormalizeResponseSchema, NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/client"
import { ensureProfileExists } from "@/lib/supabase/ensure-profile"
import type { NormalizedBrief, QuestionsPayload } from "@/types"

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

function splitCsv(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const

function isUnitedStatesRegion(region: string): boolean {
  const normalized = region.trim().toLowerCase()
  return (
    normalized.includes("united states") ||
    normalized.includes("united states of america") ||
    /\busa?\b/.test(normalized) ||
    normalized.includes("u.s.")
  )
}

export function DetailedBriefForm() {
  const [loading, setLoading] = useState(false)
  const [serviceType, setServiceType] = useState("")
  const [industry, setIndustry] = useState("")
  const [region, setRegion] = useState("United States")
  const [usState, setUsState] = useState("")
  const [budgetMin, setBudgetMin] = useState("10000")
  const [budgetMax, setBudgetMax] = useState("100000")
  const [timeline, setTimeline] = useState("3 months")
  const [constraints, setConstraints] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [projectDescription, setProjectDescription] = useState("")
  const [remoteOk, setRemoteOk] = useState(true)
  const [currency, setCurrency] = useState("USD")
  const [teamSizePreference, setTeamSizePreference] = useState("any")
  const [portfolioRequirements, setPortfolioRequirements] = useState("")
  const [clarificationPayload, setClarificationPayload] = useState<QuestionsPayload | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const [normalizedBrief, setNormalizedBrief] = useState<NormalizedBrief | null>(null)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)
  const router = useRouter()
  const showStateSelect = useMemo(() => isUnitedStatesRegion(region), [region])

  useEffect(() => {
    if (!showStateSelect && usState) {
      setUsState("")
    }
  }, [showStateSelect, usState])

  const canSubmit = useMemo(
    () =>
      serviceType.trim().length > 1 &&
      industry.trim().length > 1 &&
      timeline.trim().length > 1 &&
      projectDescription.trim().length > 10,
    [industry, projectDescription, serviceType, timeline],
  )

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

  const buildPrompt = () => {
    return [
      `Company: ${companyName || "Not provided"}`,
      `Project description: ${projectDescription}`,
      `Service type: ${serviceType}`,
      `Industry: ${industry}`,
      `Preferred region: ${region}`,
      `US state: ${usState || "Not specified"}`,
      `Remote allowed: ${remoteOk ? "Yes" : "No"}`,
      `Budget range: ${currency} ${budgetMin} - ${budgetMax}`,
      `Timeline: ${timeline}`,
      `Team size preference: ${teamSizePreference}`,
      `Portfolio requirements: ${portfolioRequirements || "None specified"}`,
      `Constraints: ${constraints || "None specified"}`,
    ].join("\n")
  }

  const buildNormalizedFromForm = () => {
    const parsedConstraints = splitCsv(constraints)
    if (portfolioRequirements.trim().length > 0) {
      parsedConstraints.push(`Portfolio requirement: ${portfolioRequirements.trim()}`)
    }

    return NormalizedBriefSchema.parse({
      service_type: serviceType.trim(),
      budget_range: {
        min: Number(budgetMin),
        max: Number(budgetMax),
        currency,
      },
      timeline: {
        type: "duration",
        duration: timeline.trim(),
      },
      industry: splitCsv(industry),
      geography: {
        region: region.trim(),
        remote_ok: remoteOk,
      },
      constraints: parsedConstraints,
      optional: {
        company_name: companyName.trim() || null,
        project_description: projectDescription.trim(),
        us_state: usState || null,
        team_size_preference: teamSizePreference,
        portfolio_requirements: portfolioRequirements.trim() || null,
      },
    })
  }

  const normalizeViaApi = async (prompt: string, fallback: NormalizedBrief) => {
    const response = await fetch("/api/brief/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, structured_input: fallback }),
    })

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string }
      throw new Error(payload.error ?? "Failed to normalize detailed brief.")
    }

    const payload = NormalizeResponseSchema.parse(await response.json())

    const merged = NormalizedBriefSchema.parse({
      ...payload.normalized_brief,
      service_type: fallback.service_type,
      budget_range: fallback.budget_range,
      timeline: fallback.timeline,
      industry: fallback.industry,
      geography: fallback.geography,
      constraints: fallback.constraints,
      optional: {
        ...(payload.normalized_brief.optional ?? {}),
        ...(fallback.optional ?? {}),
      },
    })

    return {
      normalized: merged,
      weights: payload.weights,
      confidence: payload.confidence,
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)

    try {
      const baseNormalized = buildNormalizedFromForm()
      const prompt = buildPrompt()

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
          mode: "detailed",
          raw_prompt: prompt,
          normalized_brief: baseNormalized,
          status: "draft",
        })
        .select("id")
        .single()

      if (insertError || !brief) throw new Error(insertError?.message ?? "Failed to create brief.")

      setBriefId(brief.id)

      const normalizedPayload = await normalizeViaApi(prompt, baseNormalized)
      setNormalizedBrief(normalizedPayload.normalized)
      setWeights(normalizedPayload.weights)

      const { error: updateError } = await supabase
        .from("briefs")
        .update({
          normalized_brief: normalizedPayload.normalized,
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
            normalized_brief: normalizedPayload.normalized,
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
      const message = error instanceof Error ? error.message : "Failed to submit detailed brief."
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
        <CardTitle>Detailed Brief</CardTitle>
        <CardDescription>Provide structured requirements for precise matching.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Example: Acme Health"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="project-description">Project description</Label>
            <Textarea
              id="project-description"
              value={projectDescription}
              onChange={(event) => setProjectDescription(event.target.value)}
              placeholder="Describe your initiative, expected outcomes, and context."
              rows={4}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="service-type">Service type</Label>
            <Input
              id="service-type"
              value={serviceType}
              onChange={(event) => setServiceType(event.target.value)}
              placeholder="Example: SEO agency"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">Industry</Label>
            <Input
              id="industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              placeholder="Healthcare, SaaS"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              required
            />
          </div>

          {showStateSelect ? (
            <div className="space-y-2">
              <Label htmlFor="us-state">State (US)</Label>
              <Select value={usState || "__none__"} onValueChange={(value) => setUsState(value === "__none__" ? "" : value)}>
                <SelectTrigger id="us-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Not specified</SelectItem>
                  {US_STATES.map((stateName) => (
                    <SelectItem key={stateName} value={stateName}>
                      {stateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="budget-min">Budget min</Label>
            <Input
              id="budget-min"
              type="number"
              min={0}
              value={budgetMin}
              onChange={(event) => setBudgetMin(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-max">Budget max</Label>
            <Input
              id="budget-max"
              type="number"
              min={0}
              value={budgetMax}
              onChange={(event) => setBudgetMax(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="currency">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline">Timeline</Label>
            <Input
              id="timeline"
              value={timeline}
              onChange={(event) => setTimeline(event.target.value)}
              placeholder="Example: 3 months"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-size">Team size preference</Label>
            <Select value={teamSizePreference} onValueChange={setTeamSizePreference}>
              <SelectTrigger id="team-size">
                <SelectValue placeholder="Select team size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <Checkbox
              id="remote-ok"
              checked={remoteOk}
              onCheckedChange={(checked) => setRemoteOk(Boolean(checked))}
            />
            <Label htmlFor="remote-ok">Remote collaboration is acceptable</Label>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="portfolio-requirements">Portfolio requirements</Label>
            <Textarea
              id="portfolio-requirements"
              value={portfolioRequirements}
              onChange={(event) => setPortfolioRequirements(event.target.value)}
              placeholder="Example: Prior healthcare clients and enterprise case studies"
              rows={3}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="constraints">Constraints (comma separated)</Label>
            <Textarea
              id="constraints"
              value={constraints}
              onChange={(event) => setConstraints(event.target.value)}
              placeholder="SOC 2, timezone overlap, HIPAA familiarity"
              rows={3}
            />
          </div>

          <div className="md:col-span-2">
            <Button type="submit" disabled={!canSubmit || loading}>
              {loading ? "Submitting..." : "Submit detailed brief"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
