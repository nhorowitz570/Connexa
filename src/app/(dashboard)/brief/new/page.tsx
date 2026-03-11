"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { AnimatePresence, motion } from "framer-motion"
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
import { AttachmentUploader } from "@/components/brief/attachment-uploader"
import { RunStatusPoller } from "@/components/pipeline/run-status-poller"

type Mode = "simple" | "detailed" | null
type Step = "select" | "form" | "searching"
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

const panelTransition = {
  initial: { opacity: 0, y: 12, filter: "blur(10px)", scale: 0.985 },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, y: -8, filter: "blur(10px)", scale: 0.99 },
}

const formContainerVariants = {
  hidden: { opacity: 0, filter: "blur(8px)" },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.08,
    },
  },
}

const formItemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
  },
}

const searchContentVariants = {
  hidden: { opacity: 0, filter: "blur(10px)" },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.06,
    },
  },
} as const

const searchItemVariants = {
  hidden: { opacity: 0, y: 12, filter: "blur(10px)", scale: 0.99 },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    scale: 1,
    transition: { duration: 0.32, ease: "easeOut" as const },
  },
  exit: {
    opacity: 0,
    y: -8,
    filter: "blur(8px)",
    scale: 0.995,
    transition: { duration: 0.2, ease: "easeInOut" as const },
  },
} as const

export default function NewBriefPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefillPrompt = searchParams.get("prompt")
  const [mode, setMode] = useState<Mode>(null)
  const [step, setStep] = useState<Step>("select")
  const [runId, setRunId] = useState<string | null>(null)
  const [runStarted, setRunStarted] = useState(false)
  const [lastAppliedPrefillPrompt, setLastAppliedPrefillPrompt] = useState<string | null>(null)

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
  const [attachmentCount, setAttachmentCount] = useState(0)
  const [normalizedBrief, setNormalizedBrief] = useState<NormalizedBrief | null>(null)
  const [weights, setWeights] = useState<Record<string, number> | null>(null)
  const draftCreationRef = useRef<Promise<string> | null>(null)

  const canSubmit = useMemo(() => {
    if (mode === "simple") return prompt.trim().length >= 10
    return description.trim().length >= 10
  }, [mode, prompt, description])

  useEffect(() => {
    const nextPrompt = prefillPrompt?.trim()
    if (!nextPrompt || nextPrompt.length < 3) return
    if (nextPrompt === lastAppliedPrefillPrompt) return

    setPrompt(nextPrompt)
    setMode("simple")
    setStep("form")
    setLastAppliedPrefillPrompt(nextPrompt)
  }, [lastAppliedPrefillPrompt, prefillPrompt])

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

  const buildRawPrompt = () => {
    if (mode === "simple") {
      return prompt.trim()
    }

    return [
      category && `Category: ${category === "Other" ? customCategory : category}`,
      industry && `Industry/Vertical: ${industry}`,
      `Budget: ${formatBudget(budget)}`,
      deadline && `Deadline: ${deadline}`,
      companyName && `Company Name: ${companyName}`,
      region && `Region: ${region}`,
      city && `City: ${city}`,
      description.trim(),
    ].filter(Boolean).join("\n")
  }

  const ensureDraftBriefId = async () => {
    if (briefId) return briefId
    if (draftCreationRef.current) return draftCreationRef.current

    const createDraft = (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")

      await ensureProfileExists(supabase, user)

      const nextName = briefName.trim()
      const nextCategory = mode === "detailed"
        ? (category === "Other" ? customCategory.trim() : category.trim()) || null
        : null

      const { data: createdBrief, error } = await supabase
        .from("briefs")
        .insert({
          user_id: user.id,
          mode: mode ?? "detailed",
          name: nextName.length > 0 ? nextName : null,
          category: nextCategory,
          raw_prompt: buildRawPrompt(),
          status: "draft",
        })
        .select("id")
        .single()

      if (error || !createdBrief) {
        throw new Error(error?.message ?? "Failed to create draft brief.")
      }

      setBriefId(createdBrief.id)
      return createdBrief.id
    })()

    draftCreationRef.current = createDraft

    try {
      return await createDraft
    } finally {
      draftCreationRef.current = null
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
    setStep("searching")
    setRunId(null)
    setRunStarted(false)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")
      await ensureProfileExists(supabase, user)

      const rawPrompt = buildRawPrompt()
      const nextName = briefName.trim()
      const nextCategory = mode === "detailed"
        ? (category === "Other" ? customCategory.trim() : category.trim()) || null
        : null

      let targetBriefId = briefId

      if (!targetBriefId) {
        const { data: createdBrief, error: insertError } = await supabase
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

        if (insertError || !createdBrief) {
          throw new Error(insertError?.message ?? "Failed to create brief.")
        }

        targetBriefId = createdBrief.id
        setBriefId(createdBrief.id)
      } else {
        const { error: updateDraftError } = await supabase
          .from("briefs")
          .update({
            mode: mode ?? "simple",
            name: nextName.length > 0 ? nextName : null,
            category: nextCategory,
            raw_prompt: rawPrompt,
            status: "draft",
          })
          .eq("id", targetBriefId)
          .eq("user_id", user.id)

        if (updateDraftError) {
          throw new Error(updateDraftError.message)
        }
      }

      if (!targetBriefId) {
        throw new Error("Failed to resolve brief id.")
      }

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
        .eq("id", targetBriefId)
      if (updateError) throw new Error(updateError.message)

      // Check for clarifications needed
      if (normalizedPayload.confidence < CONFIDENCE.NORMALIZE_MIN_FOR_DIRECT_RUN) {
        const clarificationResponse = await fetch("/api/brief/clarify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brief_id: targetBriefId,
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

      const nextRunId = await startPipeline(targetBriefId)
      setRunId(nextRunId)
      setRunStarted(true)
      setStep("searching")
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
    setStep("searching")
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
      setStep("searching")
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
      <AnimatePresence mode="wait" initial={false}>
        {step === "select" ? (
          <motion.div
            key="step-select"
            variants={panelTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.34, ease: "easeOut" }}
            className="w-full max-w-2xl"
          >
            <div className="mb-12 text-center">
              <h1 className="mb-3 text-3xl font-semibold text-foreground">Create New Brief</h1>
              <p className="text-muted-foreground">Choose how you want to describe your sourcing needs</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <motion.button
                type="button"
                onClick={() => handleModeSelect("simple")}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                className="group relative rounded-2xl border border-border bg-card p-8 text-left transition-all duration-300 hover:border-indigo-500/50"
              >
                <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10">
                  <Zap className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="mb-2 text-xl font-medium text-foreground">Simple Mode</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Describe what you need in plain English. We&apos;ll turn it into a structured brief.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                  <span>Quick &amp; Easy</span>
                  <span className="text-muted-foreground">•</span>
                  <span>~5 min</span>
                </div>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => handleModeSelect("detailed")}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.99 }}
                className="group relative rounded-2xl border border-border bg-card p-8 text-left transition-all duration-300 hover:border-indigo-500/50"
              >
                <div className="absolute right-4 top-4 opacity-0 transition-opacity group-hover:opacity-100">
                  <ArrowRight className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10">
                  <Settings2 className="h-7 w-7 text-indigo-400" />
                </div>
                <h3 className="mb-2 text-xl font-medium text-foreground">Detailed Mode</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Add detailed requirements like budget, timeline, and category preferences.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm text-indigo-400">
                  <span>Precise Results</span>
                  <span className="text-muted-foreground">•</span>
                  <span>10 min — 1 hr</span>
                </div>
              </motion.button>
            </div>
          </motion.div>
        ) : null}

        {step === "form" && !clarificationPayload ? (
          <motion.div
            key="step-form"
            variants={panelTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full max-w-2xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.32, delay: 0.06, ease: "easeOut" }}
              className="mb-8"
            >
              <button
                onClick={() => {
                  setStep("select")
                  setMode(null)
                }}
                className="mb-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ← Back to mode selection
              </button>
              <h1 className="mb-2 text-3xl font-semibold text-foreground">
                {mode === "simple" ? "Describe Your Needs" : "Brief Details"}
              </h1>
              <p className="text-muted-foreground">
                {mode === "simple"
                  ? "Tell us what you're looking for in your own words"
                  : "Fill in the details to get precise matches"}
              </p>
            </motion.div>

            <motion.form
              className="rounded-2xl border border-border bg-card p-8"
              onSubmit={handleSubmit}
              variants={formContainerVariants}
              initial="hidden"
              animate="show"
            >
              <motion.div variants={formItemVariants}>
                <label className="mb-2 block text-sm font-medium text-foreground">Brief Name (optional)</label>
                <input
                  type="text"
                  value={briefName}
                  onChange={(e) => setBriefName(e.target.value)}
                  placeholder="e.g. Q2 SEO Agency Search"
                  className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                />
              </motion.div>

              {mode === "detailed" ? (
                <motion.div variants={formItemVariants} className="mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Search Mode</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleSearchDepthChange("standard")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${searchDepth === "standard"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <p className="font-medium">Quick</p>
                      <p className="text-xs opacity-80">Fast search, usually done in ~5 minutes.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSearchDepthChange("deep")}
                      className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${searchDepth === "deep"
                          ? "border-indigo-500/60 bg-indigo-500/10 text-white"
                          : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      <p className="font-medium">Thorough</p>
                      <p className="text-xs opacity-80">Deeper search across more sources. Can take up to an hour.</p>
                    </button>
                  </div>
                </motion.div>
              ) : null}

              {mode === "simple" ? (
                <motion.div variants={formItemVariants} className="mt-6">
                  <label className="mb-2 block text-sm font-medium text-foreground">What are you looking for?</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe your ideal vendor, partner, or service provider. Include any specific requirements, preferences, or constraints..."
                    rows={6}
                    className="w-full resize-none rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                  />
                </motion.div>
              ) : (
                <>
                  <motion.div variants={formItemVariants} className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      <Tag className="mr-2 inline h-4 w-4 text-indigo-400" />
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value)
                        if (e.target.value !== "Other") setCustomCategory("")
                        if (!CITY_RELEVANT_CATEGORIES.has(e.target.value)) setCity("")
                      }}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-input bg-input px-4 py-3 text-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                    >
                      <option value="" className="bg-input">Select a category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-input">{cat}</option>
                      ))}
                      <option value="Other" className="bg-input">Other</option>
                    </select>
                    <AnimatePresence initial={false}>
                      {category === "Other" ? (
                        <motion.div
                          initial={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -6, filter: "blur(5px)" }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                          className="mt-3"
                        >
                          <input
                            type="text"
                            value={customCategory}
                            onChange={(e) => setCustomCategory(e.target.value)}
                            placeholder="Enter custom category"
                            required
                            className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={formItemVariants} className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        <Building2 className="mr-2 inline h-4 w-4 text-indigo-400" />
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        <Briefcase className="mr-2 inline h-4 w-4 text-indigo-400" />
                        Industry / Vertical
                      </label>
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. Healthcare, SaaS"
                        className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-foreground">
                        <Globe className="mr-2 inline h-4 w-4 text-indigo-400" />
                        Region
                      </label>
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. North America, Global"
                        className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                      />
                    </div>
                    <AnimatePresence initial={false}>
                      {CITY_RELEVANT_CATEGORIES.has(category) ? (
                        <motion.div
                          initial={{ opacity: 0, y: -8, filter: "blur(5px)" }}
                          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                          exit={{ opacity: 0, y: -6, filter: "blur(5px)" }}
                          transition={{ duration: 0.24, ease: "easeOut" }}
                        >
                          <label className="mb-2 block text-sm font-medium text-foreground">
                            <MapPin className="mr-2 inline h-4 w-4 text-indigo-400" />
                            City
                          </label>
                          <input
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="e.g. San Francisco"
                            className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                          />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </motion.div>

                  <motion.div variants={formItemVariants} className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      <DollarSign className="mr-2 inline h-4 w-4 text-indigo-400" />
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
                        className="h-3 w-full cursor-pointer appearance-none rounded-lg bg-input accent-indigo-500"
                      />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">$5K</span>
                        <span className="font-medium text-foreground">{formatBudget(budget)}</span>
                        <span className="text-muted-foreground">$500K+</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={formItemVariants} className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      <Calendar className="mr-2 inline h-4 w-4 text-indigo-400" />
                      Target Deadline
                    </label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full rounded-xl border border-input bg-input px-4 py-3 text-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                    />
                  </motion.div>

                  <motion.div variants={formItemVariants} className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      <FileText className="mr-2 inline h-4 w-4 text-indigo-400" />
                      Project Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your project requirements, goals, and any specific criteria..."
                      rows={4}
                      className="w-full resize-none rounded-xl border border-input bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-indigo-500/50 focus:outline-none"
                    />
                  </motion.div>

                  <motion.div variants={formItemVariants} className="mt-6">
                    <AttachmentUploader
                      briefId={briefId}
                      disabled={loading}
                      onEnsureBrief={ensureDraftBriefId}
                      onCountChange={setAttachmentCount}
                    />
                    {attachmentCount > 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {attachmentCount} attachment{attachmentCount === 1 ? "" : "s"} will be included with this brief.
                      </p>
                    ) : null}
                  </motion.div>
                </>
              )}

              <motion.button
                variants={formItemVariants}
                type="submit"
                disabled={!canSubmit || loading}
                whileTap={{ scale: 0.985 }}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-medium text-white transition-all duration-200 hover:bg-indigo-700 disabled:bg-muted disabled:text-muted-foreground"
              >
                <span>Find Matches</span>
                <ArrowRight className="h-5 w-5" />
              </motion.button>
            </motion.form>
          </motion.div>
        ) : null}

        {step === "searching" ? (
          <motion.div
            key="step-searching"
            variants={panelTransition}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.42, ease: "easeOut" }}
            className="w-full max-w-3xl"
          >
            <div className="relative overflow-hidden rounded-2xl border border-[#1F1F1F] bg-[#0A0D14] p-6">
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -left-16 -top-24 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl"
                animate={{ x: [-14, 18, -14], y: [0, 8, 0], opacity: [0.35, 0.6, 0.35] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -bottom-20 right-0 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl"
                animate={{ x: [16, -10, 16], y: [0, -8, 0], opacity: [0.25, 0.45, 0.25] }}
                transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
              />

              <motion.div
                className="relative z-10 space-y-5"
                variants={searchContentVariants}
                initial="hidden"
                animate="show"
              >
                <motion.div className="flex flex-wrap items-start justify-between gap-4" variants={searchItemVariants}>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-300/80">Live Search</p>
                    <h2 className="mt-1 text-2xl font-semibold text-white">Finding your top provider matches</h2>
                    <p className="mt-1 text-sm text-[#A7AFBA]">
                      We&apos;re actively searching, scoring, and ranking candidates. You can close this page at any time.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1 rounded-full border border-[#2B2F3A] bg-[#121722] px-3 py-1.5 text-xs text-[#C8D0DC]">
                    <span
                      className={`h-2 w-2 animate-pulse rounded-full ${runStarted && runId ? "bg-emerald-400" : "bg-amber-300"
                        }`}
                    />
                    {runStarted && runId ? "Running" : "Starting"}
                  </div>
                </motion.div>

                <AnimatePresence mode="wait" initial={false}>
                  {runStarted && runId ? (
                    <motion.div
                      key="search-live-progress"
                      variants={searchItemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                    >
                      <RunStatusPoller
                        briefId={briefId ?? ""}
                        normalizedBrief={normalizedBrief}
                        runId={runId}
                        initialStatus="running"
                        initialConfidence={null}
                        initialNotes={[]}
                        onRunFinished={handleRunFinished}
                        variant="immersive"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="search-starting-progress"
                      variants={searchItemVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      className="rounded-xl border border-[#2A2A2A] bg-[#10131A] p-4 text-left"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-300" />
                        Starting live search...
                      </div>
                      <p className="mt-2 text-xs text-[#8D96A5]">
                        We&apos;re connecting your brief to the search pipeline now. If we need clarification, we&apos;ll ask follow-up questions automatically.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div className="grid gap-3 sm:grid-cols-2" variants={searchItemVariants}>
                  <motion.div className="rounded-xl border border-[#2A2E3A] bg-[#101625] p-4 text-left" variants={searchItemVariants}>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-indigo-300/80">What Happens Next</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-[#BCC6D8]">
                      <li>Understanding your brief requirements</li>
                      <li>Searching and filtering candidate companies</li>
                      <li>Scoring each match and ranking your top picks</li>
                    </ul>
                  </motion.div>
                  <motion.div className="rounded-xl border border-[#2A2E3A] bg-[#101625] p-4 text-left" variants={searchItemVariants}>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-indigo-300/80">Timing</p>
                    <p className="mt-2 text-sm text-[#D6DEEA]">Quick searches usually finish in around 5 minutes.</p>
                    <p className="mt-1 text-sm text-[#B1BDD2]">Thorough searches can take up to an hour.</p>
                    <p className="mt-2 text-xs text-[#95A1B6]">You can leave this page safely while the search runs.</p>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>

            <motion.div
              className="mt-4 flex justify-center"
              initial={{ opacity: 0, y: 8, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.28, delay: 0.12, ease: "easeOut" }}
            >
              <button
                type="button"
                onClick={() => setCancelDialogOpen(true)}
                disabled={canceling || !briefId}
                className="rounded-lg border border-[#333] px-4 py-2 text-sm text-[#919191] transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {canceling ? "Cancelling..." : "Cancel"}
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Dialog open={deepWarningOpen} onOpenChange={setDeepWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Thorough Search?</DialogTitle>
            <DialogDescription>
              Thorough mode searches more broadly and can take 10 minutes to 1 hour. You can close this page and come back later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeepWarningOpen(false)}>
              Keep Quick Mode
            </Button>
            <Button
              onClick={() => {
                setSearchDepth("deep")
                setDeepWarningOpen(false)
              }}
            >
              Enable Thorough Mode
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
