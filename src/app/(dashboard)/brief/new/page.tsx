"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Zap, Settings2, ArrowRight, Calendar, DollarSign, Tag,
  FileText, Loader2,
  Building2, Globe, MapPin, Briefcase
} from "lucide-react"

import { CONFIDENCE } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { NormalizeResponseSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/client"
import { ensureProfileExists } from "@/lib/supabase/ensure-profile"
import type { NormalizedBrief, QuestionsPayload } from "@/types"
import { ClarificationRenderer } from "@/components/brief/clarification-renderer"
import { RunStatusPoller } from "@/components/pipeline/run-status-poller"

type Mode = "simple" | "detailed" | null
type Step = "select" | "form" | "loading"
type SearchDepth = "standard" | "deep"

const categories = [
  "Marketing Agency", "Development Partner", "Design Studio",
  "Consulting Firm", "Cloud Provider", "Analytics Provider",
  "DevOps Partner", "Security Vendor",
]

const CITY_RELEVANT_CATEGORIES = new Set([
  "Marketing Agency",
  "Design Studio",
  "Consulting Firm",
  "Other",
])

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

const formatBudget = (value: number) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
  return `$${value}`
}

function truncateText(value: string, maxLength: number): string {
  const cleaned = value.replace(/\s+/g, " ").trim()
  if (cleaned.length <= maxLength) return cleaned
  return `${cleaned.slice(0, Math.max(0, maxLength - 1))}…`
}

function buildPreparationSteps(input: {
  mode: Mode
  prompt: string
  category: string
  customCategory: string
  industry: string
  region: string
  city: string
  budget: number
  deadline: string
  searchDepth: SearchDepth
  description: string
}): string[] {
  const steps: string[] = ["Checking your brief inputs"]

  if (input.mode === "simple") {
    if (input.prompt.trim().length > 0) {
      steps.push(`Reviewing your prompt: "${truncateText(input.prompt, 58)}"`)
    }
  } else {
    const categoryValue =
      input.category === "Other" ? input.customCategory.trim() : input.category.trim()
    if (categoryValue.length > 0) {
      steps.push(`Mapping category: ${truncateText(categoryValue, 42)}`)
    }
    if (input.industry.trim().length > 0) {
      steps.push(`Applying industry context: ${truncateText(input.industry, 42)}`)
    }
    if (input.region.trim().length > 0) {
      steps.push(`Setting geography focus: ${truncateText(input.region, 42)}`)
    }
    if (input.city.trim().length > 0) {
      steps.push(`Adding city signal: ${truncateText(input.city, 42)}`)
    }
    steps.push(`Applying budget target: ${formatBudget(input.budget)}`)
    if (input.deadline) {
      steps.push(`Interpreting deadline: ${input.deadline}`)
    }
    if (input.description.trim().length > 0) {
      steps.push("Extracting requirements from your project description")
    }
  }

  steps.push(
    input.searchDepth === "deep"
      ? "Preparing deep-search configuration"
      : "Preparing standard-search configuration",
  )
  steps.push("Normalizing your brief with AI")
  steps.push("Creating pipeline run tracker")

  return [...new Set(steps)].slice(0, 8)
}

type PreparingPipelineCardProps = {
  steps: string[]
}

function PreparingPipelineCard({ steps }: PreparingPipelineCardProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0)

  useEffect(() => {
    if (steps.length <= 1) return
    const interval = window.setInterval(() => {
      setActiveStepIndex((current) => (current + 1) % steps.length)
    }, 1700)

    return () => {
      window.clearInterval(interval)
    }
  }, [steps.length])

  const safeActiveStepIndex = steps.length > 0 ? activeStepIndex % steps.length : 0
  const activeStep = steps[safeActiveStepIndex] ?? "Preparing run setup"

  return (
    <div className="rounded-2xl border border-[#1F1F1F] bg-[#0D0D0D] p-8 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
      <h1 className="mb-2 text-2xl font-semibold text-white">Preparing Pipeline Run</h1>
      <p className="text-[#919191]">Normalizing brief and starting real-time pipeline tracking...</p>

      <div className="mx-auto mt-6 w-full max-w-xl rounded-xl border border-[#2A2A2A] bg-[#121212] p-4 text-left">
        <p className="text-xs uppercase tracking-wide text-[#7f7f7f]">Working through setup</p>
        <div className="relative mt-2 h-6 overflow-hidden">
          <p
            key={`${activeStepIndex}-${activeStep}`}
            className="absolute inset-0 text-sm text-white animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            {activeStep}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 rounded-full transition-all ${
                index === safeActiveStepIndex ? "w-6 bg-indigo-400" : "w-2 bg-[#2d2d2d]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function NewBriefPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [step, setStep] = useState<Step>("select")
  const [runId, setRunId] = useState<string | null>(null)
  const [runStarted, setRunStarted] = useState(false)

  // Form state
  const [prompt, setPrompt] = useState("")
  const [briefName, setBriefName] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [budget, setBudget] = useState(50000)
  const [deadline, setDeadline] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [region, setRegion] = useState("")
  const [city, setCity] = useState("")
  const [industry, setIndustry] = useState("")
  const [searchDepth, setSearchDepth] = useState<SearchDepth>("standard")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [deepWarningOpen, setDeepWarningOpen] = useState(false)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  // Clarification state
  const [clarificationPayload, setClarificationPayload] = useState<QuestionsPayload | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const [normalizedBrief, setNormalizedBrief] = useState<NormalizedBrief | null>(null)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)

  const canSubmit = useMemo(() => {
    if (mode === "simple") return prompt.trim().length >= 10
    return description.trim().length >= 10
  }, [mode, prompt, description])
  const preparationSteps = useMemo(
    () =>
      buildPreparationSteps({
        mode,
        prompt,
        category,
        customCategory,
        industry,
        region,
        city,
        budget,
        deadline,
        searchDepth,
        description,
      }),
    [mode, prompt, category, customCategory, industry, region, city, budget, deadline, searchDepth, description],
  )

  const startPipeline = async (id: string): Promise<string> => {
    const response = await fetch("/api/pipeline/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief_id: id }),
    })
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string }
      throw new Error(payload.error ?? "Failed to start pipeline.")
    }
    const payload = (await response.json()) as { run_id?: string; error?: string }
    if (!payload.run_id) {
      throw new Error(payload.error ?? "Pipeline started without a run id.")
    }
    return payload.run_id
  }

  const handleModeSelect = (selectedMode: "simple" | "detailed") => {
    if (selectedMode === "simple") {
      setSearchDepth("standard")
    }
    setMode(selectedMode)
    setStep("form")
  }

  const handleSearchDepthChange = (nextDepth: SearchDepth) => {
    if (nextDepth === "standard") {
      setSearchDepth("standard")
      return
    }

    if (searchDepth === "deep") return
    setDeepWarningOpen(true)
  }

  const applySearchDepth = (brief: NormalizedBrief): NormalizedBrief => {
    return {
      ...brief,
      optional: {
        ...brief.optional,
        search_depth: searchDepth,
      },
    }
  }

  const handleRunFinished = () => {
    if (!briefId) return
    router.push(`/brief/${briefId}`)
    router.refresh()
  }

  const handleCancelBrief = async () => {
    if (!briefId) return

    setCanceling(true)
    try {
      const response = await fetch("/api/pipeline/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief_id: briefId }),
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to cancel brief.")
      }
      setCancelDialogOpen(false)
      toast.success("Brief cancelled.")
      router.push(`/brief/${briefId}`)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel brief."
      toast.error(message)
    } finally {
      setCanceling(false)
    }
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setStep("loading")
    setRunId(null)
    setRunStarted(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")
      await ensureProfileExists(supabase, user)

      const rawPrompt = mode === "simple"
        ? prompt.trim()
        : [
          category && `Category: ${category === "Other" ? customCategory : category}`,
          industry && `Industry/Vertical: ${industry}`,
          `Budget: ${formatBudget(budget)}`,
          deadline && `Deadline: ${deadline}`,
          companyName && `Company Name: ${companyName}`,
          region && `Region: ${region}`,
          city && `City: ${city}`,
          description.trim(),
        ].filter(Boolean).join("\n")
      const nextName = briefName.trim()
      const nextCategory = mode === "detailed"
        ? (category === "Other" ? customCategory.trim() : category.trim()) || null
        : null

      const { data: brief, error: insertError } = await supabase
        .from("briefs")
        .insert({
          user_id: user.id,
          mode: mode ?? "simple",
          name: nextName.length > 0 ? nextName : null,
          category: nextCategory,
          raw_prompt: rawPrompt,
          status: "draft",
        })
        .select("id")
        .single()

      if (insertError || !brief) throw new Error(insertError?.message ?? "Failed to create brief.")
      setBriefId(brief.id)

      const normalizedResponse = await fetch("/api/brief/normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: rawPrompt }),
      })
      if (!normalizedResponse.ok) {
        const payload = (await normalizedResponse.json()) as { error?: string }
        throw new Error(payload.error ?? "Failed to normalize brief.")
      }

      const normalizedPayload = NormalizeResponseSchema.parse(await normalizedResponse.json())
      const normalizedWithDepth = applySearchDepth(normalizedPayload.normalized_brief)
      setNormalizedBrief(normalizedWithDepth)
      setWeights(normalizedPayload.weights)

      const { error: updateError } = await supabase
        .from("briefs")
        .update({
          normalized_brief: normalizedWithDepth,
          weights: normalizedPayload.weights,
        })
        .eq("id", brief.id)
      if (updateError) throw new Error(updateError.message)

      // Check for clarifications needed
      if (normalizedPayload.confidence < CONFIDENCE.NORMALIZE_MIN_FOR_DIRECT_RUN) {
        const clarificationResponse = await fetch("/api/brief/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief_id: brief.id,
            normalized_brief: normalizedWithDepth,
            confidence: normalizedPayload.confidence,
          }),
        })
        if (!clarificationResponse.ok) {
          const payload = (await clarificationResponse.json()) as { error?: string }
          throw new Error(payload.error ?? "Failed to generate clarifications.")
        }

        const clarification = QuestionsPayloadSchema.parse(await clarificationResponse.json())
        setClarificationPayload(clarification)
        setStep("form")
        setRunStarted(false)
        setRunId(null)
        toast.info("Please answer clarification questions.")
        return
      }

      const nextRunId = await startPipeline(brief.id)
      setRunId(nextRunId)
      setRunStarted(true)
      toast.success("Brief submitted and run started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit brief."
      toast.error(message)
      setStep("form")
      setRunStarted(false)
      setRunId(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClarificationSubmit = async (answers: Record<string, unknown>) => {
    if (!briefId || !normalizedBrief || !weights || !clarificationPayload) return
    setLoading(true)
    setStep("loading")
    setRunStarted(false)
    setRunId(null)
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
        .update({ normalized_brief: merged, weights, status: "draft" })
        .eq("id", briefId)
      if (updateError) throw new Error(updateError.message)

      const nextRunId = await startPipeline(briefId)
      setRunId(nextRunId)
      setRunStarted(true)
      toast.success("Clarifications saved. Run started.")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit."
      toast.error(message)
      setStep("form")
      setRunStarted(false)
      setRunId(null)
    } finally {
      setLoading(false)
    }
  }

  // Clarification view
  if (clarificationPayload && step === "form") {
    return (
      <div className="flex-1 flex items-center justify-center py-8 animate-in fade-in duration-500">
        <div className="w-full max-w-2xl">
          <ClarificationRenderer
            payload={clarificationPayload}
            submitting={loading}
            onSubmit={handleClarificationSubmit}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center py-8">
      {/* Mode Selection */}
      {step === "select" && (
        <div className="w-full max-w-2xl animate-in fade-in duration-500">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-semibold text-white mb-3">Create New Brief</h1>
            <p className="text-[#919191]">Choose how you want to describe your sourcing needs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Simple Mode Card */}
            <button
              onClick={() => handleModeSelect("simple")}
              className="group relative bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F] hover:border-indigo-500/50 transition-all duration-300 text-left hover:scale-[1.02]"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="h-14 w-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Simple Mode</h3>
              <p className="text-[#919191] text-sm leading-relaxed">
                Describe what you&apos;re looking for in plain text. Our AI will extract requirements automatically.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                <span>Quick &amp; Easy</span>
                <span className="text-[#333]">•</span>
                <span>1 min</span>
              </div>
            </button>

            {/* Detailed Mode Card */}
            <button
              onClick={() => handleModeSelect("detailed")}
              className="group relative bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F] hover:border-indigo-500/50 transition-all duration-300 text-left hover:scale-[1.02]"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="h-5 w-5 text-indigo-400" />
              </div>
              <div className="h-14 w-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6">
                <Settings2 className="h-7 w-7 text-indigo-400" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Detailed Mode</h3>
              <p className="text-[#919191] text-sm leading-relaxed">
                Specify exact requirements including budget, timeline, and category preferences.
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                <span>Precise Results</span>
                <span className="text-[#333]">•</span>
                <span>3-5 min</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Form Step */}
      {step === "form" && !clarificationPayload && (
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="mb-8">
            <button
              onClick={() => { setStep("select"); setMode(null) }}
              className="text-[#919191] hover:text-white transition-colors text-sm mb-4"
            >
              ← Back to mode selection
            </button>
            <h1 className="text-3xl font-semibold text-white mb-2">
              {mode === "simple" ? "Describe Your Needs" : "Brief Details"}
            </h1>
            <p className="text-[#919191]">
              {mode === "simple"
                ? "Tell us what you're looking for in your own words"
                : "Fill in the details to get precise matches"}
            </p>
          </div>

          <form
            className="bg-[#0D0D0D] rounded-2xl p-8 border border-[#1F1F1F]"
            onSubmit={handleSubmit}
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Brief Name (optional)</label>
                <input
                  type="text"
                  value={briefName}
                  onChange={(e) => setBriefName(e.target.value)}
                  placeholder="e.g. Q2 SEO Agency Search"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>

              {mode === "detailed" && (
                <div className="space-y-3 rounded-xl border border-[#333] bg-[#111] p-4">
                  <p className="text-sm font-medium text-white">Search Depth</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSearchDepthChange("standard")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        searchDepth === "standard"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-[#333] text-[#919191] hover:text-white"
                      }`}
                    >
                      <p className="font-medium">Standard</p>
                      <p className="text-xs opacity-80">Faster run with focused coverage.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSearchDepthChange("deep")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        searchDepth === "deep"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-[#333] text-[#919191] hover:text-white"
                      }`}
                    >
                      <p className="font-medium">Deep</p>
                      <p className="text-xs opacity-80">Broader crawl, more candidates, slower run.</p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {mode === "simple" ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    What are you looking for?
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your ideal vendor, partner, or service provider. Include any specific requirements, preferences, or constraints..."
                    rows={6}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Tag className="h-4 w-4 inline mr-2 text-indigo-400" />
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value)
                      if (e.target.value !== "Other") setCustomCategory("")
                      if (!CITY_RELEVANT_CATEGORIES.has(e.target.value)) setCity("")
                    }}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-[#1A1A1A]">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1A1A1A]">{cat}</option>
                    ))}
                    <option value="Other" className="bg-[#1A1A1A]">Other</option>
                  </select>
                  {category === "Other" && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-3">
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="Enter custom category"
                        required
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Building2 className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Company Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Briefcase className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Industry / Vertical
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Healthcare, SaaS"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      <Globe className="h-4 w-4 inline mr-2 text-indigo-400" />
                      Region
                    </label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. North America, Global"
                      className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                    />
                  </div>
                  {CITY_RELEVANT_CATEGORIES.has(category) && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <MapPin className="h-4 w-4 inline mr-2 text-indigo-400" />
                        City
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. San Francisco"
                        className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <DollarSign className="h-4 w-4 inline mr-2 text-indigo-400" />
                    Budget Range
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min={5000}
                      max={500000}
                      step={5000}
                      value={budget}
                      onChange={(e) => setBudget(Number(e.target.value))}
                      className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <div className="flex justify-between text-sm">
                      <span className="text-[#919191]">$5K</span>
                      <span className="text-white font-medium">{formatBudget(budget)}</span>
                      <span className="text-[#919191]">$500K+</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <Calendar className="h-4 w-4 inline mr-2 text-indigo-400" />
                    Target Deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    <FileText className="h-4 w-4 inline mr-2 text-indigo-400" />
                    Project Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your project requirements, goals, and any specific criteria..."
                    rows={4}
                    className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#333] rounded-xl text-white placeholder-[#666] focus:outline-none focus:border-indigo-500/50 transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full mt-8 flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-[#333] disabled:text-[#666] text-white font-medium rounded-xl transition-all duration-200"
            >
              <span>Run Brief</span>
              <ArrowRight className="h-5 w-5" />
            </button>
          </form>
        </div>
      )}

      {/* Loading Step */}
      {step === "loading" && (
        <div className="w-full max-w-2xl animate-in fade-in zoom-in-95 duration-500">
          {!runStarted || !runId ? (
            <div>
              <PreparingPipelineCard steps={preparationSteps} />
              <button
                type="button"
                onClick={() => setCancelDialogOpen(true)}
                disabled={canceling || !briefId}
                className="mt-6 rounded-lg border border-[#333] px-4 py-2 text-sm text-[#919191] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canceling ? "Cancelling..." : "Cancel"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <RunStatusPoller
                runId={runId}
                initialStatus="running"
                initialConfidence={null}
                initialNotes={[]}
                onRunFinished={handleRunFinished}
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setCancelDialogOpen(true)}
                  disabled={canceling || !briefId}
                  className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#919191] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {canceling ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={deepWarningOpen} onOpenChange={setDeepWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Deep Search?</DialogTitle>
            <DialogDescription>
              Deep mode can take a very long time and uses significantly more credits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeepWarningOpen(false)}>
              Stay with Standard
            </Button>
            <Button
              onClick={() => {
                setSearchDepth("deep")
                setDeepWarningOpen(false)
              }}
            >
              Enable Deep Search
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={(open) => {
        if (!canceling) setCancelDialogOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Brief?</DialogTitle>
            <DialogDescription>
              This will stop the current run at the next safe checkpoint. Any partial results will be saved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={canceling}>
              Keep Running
            </Button>
            <Button onClick={handleCancelBrief} disabled={canceling || !briefId}>
              {canceling ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
