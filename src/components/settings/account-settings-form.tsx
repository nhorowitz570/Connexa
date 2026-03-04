"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

type AccountSettingsFormProps = {
  userId: string
  initialFullName: string
}

export function AccountSettingsForm({ userId, initialFullName }: AccountSettingsFormProps) {
  const [fullName, setFullName] = useState(initialFullName)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

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
      toast.success("Profile updated.")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update profile."
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      })
      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete account.")
      }

      toast.success("Account deleted.")
      router.push("/login")
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete account."
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <form className="space-y-4 rounded-lg border bg-card p-4" onSubmit={handleSave}>
        <h2 className="text-lg font-semibold">Profile</h2>
        <div className="space-y-2">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </Button>
      </form>

      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting your account permanently removes your briefs and results.
        </p>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" className="mt-4">
              Delete account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete account?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. All associated data will be removed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Confirm delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
