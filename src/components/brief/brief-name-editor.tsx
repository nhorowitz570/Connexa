"use client"

import { type KeyboardEvent, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"

type BriefNameEditorProps = {
  briefId: string
  initialName: string | null
  fallbackName: string
}

export function BriefNameEditor({ briefId, initialName, fallbackName }: BriefNameEditorProps) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState(initialName ?? "")

  const displayName = useMemo(() => {
    const trimmed = value.trim()
    if (editing) return trimmed
    return trimmed || fallbackName
  }, [editing, fallbackName, value])

  const persistName = async () => {
    if (saving) return

    const nextName = value.trim()
    const previous = (initialName ?? "").trim()
    if (nextName === previous) {
      setEditing(false)
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("briefs")
        .update({ name: nextName.length > 0 ? nextName : null })
        .eq("id", briefId)

      if (error) {
        throw new Error(error.message)
      }

      toast.success("Brief name updated.")
      setEditing(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update brief name."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      void persistName()
    }
    if (event.key === "Escape") {
      event.preventDefault()
      setValue(initialName ?? "")
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          void persistName()
        }}
        onKeyDown={handleKeyDown}
        disabled={saving}
        placeholder={fallbackName}
        className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-2xl font-semibold outline-none focus:border-indigo-500/50"
      />
    )
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="text-2xl font-semibold">{displayName || fallbackName}</h1>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Rename brief"
      >
        <Pencil className="h-4 w-4" />
      </button>
    </div>
  )
}
