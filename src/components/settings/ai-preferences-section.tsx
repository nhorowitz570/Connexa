"use client"

import { Bot, SlidersHorizontal } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type Verbosity = "concise" | "balanced" | "detailed"

type AiPreferencesSectionProps = {
  userId: string
  initialAutoClarify: boolean
}

export function AiPreferencesSection({
  userId,
  initialAutoClarify,
}: AiPreferencesSectionProps) {
  const [autoClarify, setAutoClarify] = useState(initialAutoClarify)
  const [verbosity, setVerbosity] = useState<Verbosity>("balanced")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const persisted = window.localStorage.getItem("connexa-ai-verbosity")
    if (persisted === "concise" || persisted === "balanced" || persisted === "detailed") {
      setVerbosity(persisted)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      window.localStorage.setItem("connexa-ai-verbosity", verbosity)

      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({
          ai_auto_clarify: autoClarify,
        })
        .eq("id", userId)

      if (error) throw new Error(error.message)
      toast.success("AI preferences saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save AI preferences")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-card space-y-5 rounded-2xl border border-white/10 p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">AI Preferences</h2>
        <p className="text-sm text-[#9ca3b4]">Set defaults for how Connexa responds and follows up.</p>
      </div>

      <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Bot className="h-4 w-4 text-indigo-300" />
          Assistant Preferences
        </div>
        <div className="flex flex-wrap gap-2">
          {(["concise", "balanced", "detailed"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setVerbosity(item)}
              className={cn(
                "min-h-11 rounded-lg border px-3 py-2 text-xs font-medium capitalize",
                verbosity === item
                  ? "border-indigo-400/40 bg-indigo-500/15 text-white"
                  : "border-white/10 text-[#9ca3b4] hover:text-white",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-start gap-3">
          <Checkbox
            id="ai-auto-clarify"
            checked={autoClarify}
            onCheckedChange={(value) => setAutoClarify(Boolean(value))}
            className="mt-1"
          />
          <div className="space-y-1">
            <Label htmlFor="ai-auto-clarify" className="text-sm font-medium text-white">
              Auto-ask clarification questions
            </Label>
            <p className="text-xs text-[#8290aa]">
              When enabled, Connexa asks follow-up questions when your brief is unclear.
            </p>
          </div>
        </div>
      </div>

      <Button onClick={() => void handleSave()} disabled={saving} className="h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">
        <SlidersHorizontal className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save AI Preferences"}
      </Button>
    </section>
  )
}
