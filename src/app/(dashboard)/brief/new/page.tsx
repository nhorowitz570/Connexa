"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  Zap, Settings2, ArrowRight, Calendar, DollarSign, Tag,
  FileText, Search, Brain, Sparkles, CheckCircle2, Loader2,
  Building2, Globe, MapPin, Briefcase
} from "lucide-react"

import { CONFIDENCE } from "@/lib/constants"
import { NormalizeResponseSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/client"
import { ensureProfileExists } from "@/lib/supabase/ensure-profile"
import type { NormalizedBrief, QuestionsPayload } from "@/types"
import { ClarificationRenderer } from "@/components/brief/clarification-renderer"

type Mode = "simple" | "detailed" | null
type Step = "select" | "form" | "loading" | "complete"

const categories = [
  "Marketing Agency", "Development Partner", "Design Studio",
  "Consulting Firm", "Cloud Provider", "Analytics Provider",
  "DevOps Partner", "Security Vendor",
]

const loadingSteps = [
  { id: "normalize", label: "Normalizing brief", icon: Search, duration: 0 },
  { id: "analyze", label: "Analyzing requirements", icon: Brain, duration: 0 },
  { id: "match", label: "Matching vendors", icon: Sparkles, duration: 0 },
  { id: "score", label: "Calculating scores", icon: CheckCircle2, duration: 0 },
]

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

export default function NewBriefPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(null)
  const [step, setStep] = useState<Step>("select")
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0)

  // Form state
  const [prompt, setPrompt] = useState("")
  const [category, setCategory] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [budget, setBudget] = useState(50000)
  const [deadline, setDeadline] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [region, setRegion] = useState("")
  const [city, setCity] = useState("")
  const [industry, setIndustry] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  // Clarification state
  const [clarificationPayload, setClarificationPayload] = useState<QuestionsPayload | null>(null)
  const [briefId, setBriefId] = useState<string | null>(null)
  const [normalizedBrief, setNormalizedBrief] = useState<NormalizedBrief | null>(null)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)

  const canSubmit = useMemo(() => {
    if (mode === "simple") return prompt.trim().length >= 10
    return description.trim().length >= 10
  }, [mode, prompt, description])

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

  const handleModeSelect = (selectedMode: "simple" | "detailed") => {
    setMode(selectedMode)
    setStep("form")
  }

  const setLoadingStep = (index: number) => {
    setCurrentLoadingStep(index)
  }

  const handleSubmit = async (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault()
    if (!canSubmit) return
    setLoading(true)
    setStep("loading")
    setCurrentLoadingStep(0)

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

      const { data: brief, error: insertError } = await supabase
        .from("briefs")
        .insert({
          user_id: user.id,
          mode: mode ?? "simple",
          raw_prompt: rawPrompt,
          status: "draft",
        })
        .select("id")
        .single()

      if (insertError || !brief) throw new Error(insertError?.message ?? "Failed to create brief.")
      setBriefId(brief.id)

      // Step 1: Normalize
      setLoadingStep(0)
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
      setNormalizedBrief(normalizedPayload.normalized_brief)
      setWeights(normalizedPayload.weights)

      // Step 2: Analyze
      setLoadingStep(1)
      const { error: updateError } = await supabase
        .from("briefs")
        .update({
          normalized_brief: normalizedPayload.normalized_brief,
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
        setStep("form")
        toast.info("Please answer clarification questions.")
        return
      }

      // Step 3: Match
      setLoadingStep(2)
      await startPipeline(brief.id)

      // Step 4: Complete
      setLoadingStep(3)
      await new Promise((r) => setTimeout(r, 600))

      setStep("complete")
      toast.success("Brief submitted and run started.")

      setTimeout(() => {
        router.push(`/brief/${brief.id}`)
        router.refresh()
      }, 800)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit brief."
      toast.error(message)
      setStep("form")
    } finally {
      setLoading(false)
    }
  }

  const handleClarificationSubmit = async (answers: Record<string, unknown>) => {
    if (!briefId || !normalizedBrief || !weights || !clarificationPayload) return
    setLoading(true)
    setStep("loading")
    setCurrentLoadingStep(2)
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

      setLoadingStep(2)
      await startPipeline(briefId)

      setLoadingStep(3)
      await new Promise((r) => setTimeout(r, 600))

      setStep("complete")
      toast.success("Clarifications saved. Run started.")
      setTimeout(() => {
        router.push(`/brief/${briefId}`)
        router.refresh()
      }, 800)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit."
      toast.error(message)
      setStep("form")
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
        <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="text-center mb-12">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6">
              <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Processing Brief</h1>
            <p className="text-[#919191]">Our AI is analyzing your requirements</p>
          </div>

          <div className="bg-[#0D0D0D] rounded-2xl p-6 border border-[#1F1F1F]">
            <div className="space-y-4">
              {loadingSteps.map((loadStep, index) => {
                const isActive = index === currentLoadingStep
                const isComplete = index < currentLoadingStep
                const isPending = index > currentLoadingStep

                return (
                  <div
                    key={loadStep.id}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${isActive ? "bg-indigo-500/10 border border-indigo-500/30" :
                      isComplete ? "bg-emerald-500/5" : "opacity-40"
                      }`}
                  >
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-colors ${isActive ? "bg-indigo-500/20" :
                      isComplete ? "bg-emerald-500/20" : "bg-[#1A1A1A]"
                      }`}>
                      {isComplete ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : isActive ? (
                        <loadStep.icon className="h-5 w-5 text-indigo-400 animate-pulse" />
                      ) : (
                        <loadStep.icon className="h-5 w-5 text-[#666]" />
                      )}
                    </div>
                    <span className={`font-medium transition-colors ${isActive ? "text-white" :
                      isComplete ? "text-emerald-400" : "text-[#666]"
                      }`}>
                      {loadStep.label}
                    </span>
                    {isActive && (
                      <div className="ml-auto">
                        <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Complete Step */}
      {step === "complete" && (
        <div className="w-full max-w-md text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="h-20 w-20 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Brief Complete!</h1>
          <p className="text-[#919191]">Redirecting to results...</p>
        </div>
      )}
    </div>
  )
}
