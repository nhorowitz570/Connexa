"use client"

import { TriangleAlert } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
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

export function DangerZoneSection() {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
      })
      const payload = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete account")
      }

      toast.success("Account deleted")
      router.push("/login")
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete account")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-rose-300/60 bg-rose-50/80 p-5 dark:border-rose-400/35 dark:bg-rose-500/5">
      <div className="flex items-center gap-2">
        <TriangleAlert className="h-4 w-4 text-rose-700 dark:text-rose-300" />
        <h2 className="text-xl font-semibold text-rose-900 dark:text-rose-200">Danger Zone</h2>
      </div>

      <p className="text-sm text-rose-800/85 dark:text-rose-100/80">
        Deleting your account permanently removes briefs, runs, chat history, and all saved settings.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive" className="h-11 rounded-xl">
            Delete Account
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All of your Connexa data will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
