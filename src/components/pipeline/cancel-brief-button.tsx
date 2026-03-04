"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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

type CancelBriefButtonProps = {
  briefId: string
  onCancelled?: () => void
}

export function CancelBriefButton({ briefId, onCancelled }: CancelBriefButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleCancel = async () => {
    setLoading(true)
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

      toast.success("Brief cancelled.")
      setConfirmOpen(false)
      onCancelled?.()
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to cancel brief."
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={confirmOpen} onOpenChange={(open) => {
      if (!loading) setConfirmOpen(open)
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={loading}>
          {loading ? "Cancelling..." : "Cancel"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Brief?</DialogTitle>
          <DialogDescription>
            This will stop the current run at the next safe checkpoint. Any partial results will be saved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={loading}>
            Keep Running
          </Button>
          <Button onClick={handleCancel} disabled={loading}>
            {loading ? "Cancelling..." : "Confirm Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
