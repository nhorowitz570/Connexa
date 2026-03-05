"use client"

import { UserRound } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type ProfileSectionProps = {
  userId: string
  email: string
  initialFullName: string
}

export function ProfileSection({ userId, email, initialFullName }: ProfileSectionProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [saving, setSaving] = useState(false)

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", userId)

      if (error) throw new Error(error.message)
      toast.success("Profile saved")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-card space-y-5 rounded-2xl border border-white/10 p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Profile</h2>
        <p className="text-sm text-[#9ca3b4]">Update your basic account information.</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-200">
          <UserRound className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Profile avatar</p>
          <p className="text-xs text-[#8290aa]">Avatar upload is coming soon.</p>
        </div>
      </div>

      <form className="space-y-4" onSubmit={(event) => void handleSave(event)}>
        <div className="space-y-2">
          <Label htmlFor="settings-full-name">Full name</Label>
          <Input
            id="settings-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="h-11 border-white/10 bg-[#0f1624]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" value={email} disabled className="h-11 border-white/10 bg-[#0f1624] opacity-80" />
        </div>

        <Button type="submit" disabled={saving} className="h-11 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500">
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </section>
  )
}
