"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { ClarificationRenderer } from "@/components/brief/clarification-renderer"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import type { BriefMode, QuestionsPayload } from "@/types"

type RerunButtonProps = {
  briefId: string
  mode: BriefMode
  normalizedBrief: unknown
}

function splitConstraints(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

type StartResponse = {
  run_id?: string
  clarify_required?: boolean
  questions?: unknown
  error?: string
}

export function RerunButton({ briefId, mode, normalizedBrief }: RerunButtonProps) {
  const [loading, setLoading] = useState(false)
  const [submittingClarifications, setSubmittingClarifications] = useState(false)
  const [open, setOpen] = useState(false)
  const [clarificationOpen, setClarificationOpen] = useState(false)
  const [clarificationPayload, setClarificationPayload] = useState<QuestionsPayload | null>(null)
  const [modeValue, setModeValue] = useState<BriefMode>(mode)
  const [constraintsText, setConstraintsText] = useState("")
  const [regionValue, setRegionValue] = useState("")
  const [searchDepth, setSearchDepth] = useState<"standard" | "deep">("standard")
  const [forceClarify, setForceClarify] = useState(false)
  const router = useRouter()

  const parsedBrief = useMemo(() => NormalizedBriefSchema.safeParse(normalizedBrief), [normalizedBrief])
  const initialRegion = parsedBrief.success ? parsedBrief.data.geography.region : ""
  const initialConstraints = parsedBrief.success ? parsedBrief.data.constraints.join(", ") : ""
  const initialSearchDepth: "standard" | "deep" = parsedBrief.success
    ? parsedBrief.data.optional?.search_depth === "deep"
      ? "deep"
      : "standard"
    : "standard"

  useEffect(() => {
    if (!open) return
    setModeValue(mode)
    setConstraintsText(initialConstraints)
    setRegionValue(initialRegion)
    setSearchDepth(initialSearchDepth)
    setForceClarify(false)
  }, [initialConstraints, initialRegion, initialSearchDepth, mode, open])

  const handleRerun = async () => {
    setLoading(true)
    try {
      const parsedConstraints = splitConstraints(constraintsText)
      const overrides: Record<string, unknown> = {}
      if (modeValue !== mode) overrides.mode = modeValue
      if (constraintsText.trim() !== initialConstraints.trim()) overrides.constraints = parsedConstraints
      if (regionValue.trim() && regionValue.trim() !== initialRegion.trim()) {
        overrides.geography_region = regionValue.trim()
      }
      if (searchDepth !== initialSearchDepth) {
        overrides.search_depth = searchDepth
      }
      if (forceClarify) overrides.force_clarify = true

      const response = await fetch("/api/pipeline/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_id: briefId,
          ...(Object.keys(overrides).length > 0 ? { overrides } : {}),
        }),
      })
      const payload = (await response.json()) as StartResponse

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start re-run.")
      }

      if (payload.clarify_required) {
        const questions = QuestionsPayloadSchema.safeParse(payload.questions)
        if (!questions.success) {
          toast.error("Clarification questions were invalid.")
          return
        }
        setOpen(false)
        setClarificationPayload(questions.data)
        setClarificationOpen(true)
        toast.info("Answer clarifying questions to start the re-run.")
        return
      }

      setOpen(false)
      toast.success("Re-run started.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start re-run."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleClarificationSubmit = async (answers: Record<string, unknown>) => {
    setSubmittingClarifications(true)
    try {
      const response = await fetch("/api/brief/clarify/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief_id: briefId,
          answers,
        }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to submit clarifications.")
      }

      setClarificationOpen(false)
      setClarificationPayload(null)
      toast.success("Clarifications saved. Re-run started.")
      router.refresh()
    } finally {
      setSubmittingClarifications(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Re-run</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-run Options</DialogTitle>
            <DialogDescription>Adjust settings before starting a new run.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rerun-mode">Mode</Label>
              <Select value={modeValue} onValueChange={(value) => setModeValue(value as BriefMode)}>
                <SelectTrigger id="rerun-mode">
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rerun-region">Geography override</Label>
              <Input
                id="rerun-region"
                value={regionValue}
                onChange={(event) => setRegionValue(event.target.value)}
                placeholder="United States"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rerun-constraints">Constraints (comma separated)</Label>
              <Input
                id="rerun-constraints"
                value={constraintsText}
                onChange={(event) => setConstraintsText(event.target.value)}
                placeholder="SOC2, healthcare case studies, timezone overlap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rerun-depth">Search depth</Label>
              <Select value={searchDepth} onValueChange={(value) => setSearchDepth(value as "standard" | "deep")}>
                <SelectTrigger id="rerun-depth">
                  <SelectValue placeholder="Select search depth" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="deep">Deep (broader, slower)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="force-clarify"
                checked={forceClarify}
                onCheckedChange={(checked) => setForceClarify(Boolean(checked))}
              />
              <Label htmlFor="force-clarify">Ask clarifying questions before this run</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleRerun} disabled={loading}>
              {loading ? "Starting..." : "Start re-run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={clarificationOpen} onOpenChange={setClarificationOpen}>
        <DialogContent className="max-h-[85vh] overflow-auto sm:max-w-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Re-run Clarifications</DialogTitle>
            <DialogDescription>Answer these questions to continue your re-run.</DialogDescription>
          </DialogHeader>
          {clarificationPayload ? (
            <ClarificationRenderer
              payload={clarificationPayload}
              submitting={submittingClarifications}
              onSubmit={handleClarificationSubmit}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
