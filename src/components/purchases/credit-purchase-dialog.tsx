"use client"

import { Loader2, Wallet } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CREDIT_PACKAGES, formatCreditsRemaining } from "@/lib/credits"

type CreditPurchaseDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditsRemaining: number
  onPurchased?: () => void
}

type PurchaseResponse = {
  data?: {
    purchase_id?: string
    deferred?: boolean
    message?: string
    client_secret?: string
  }
  error?: string
}

function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`
}

export function CreditPurchaseDialog({
  open,
  onOpenChange,
  creditsRemaining,
  onPurchased,
}: CreditPurchaseDialogProps) {
  const [submittingCredits, setSubmittingCredits] = useState<number | null>(null)

  const heading = useMemo(() => {
    if (creditsRemaining < 0) return "You currently have unlimited searches."
    return `You have ${formatCreditsRemaining(creditsRemaining)} searches remaining.`
  }, [creditsRemaining])

  const startPurchase = async (credits: number) => {
    setSubmittingCredits(credits)
    try {
      const response = await fetch("/api/purchases/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits }),
      })

      const payload = (await response.json()) as PurchaseResponse
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to start purchase")
      }

      if (payload.data?.deferred) {
        toast.info(payload.data.message ?? "Payment processing is coming soon.")
        onOpenChange(false)
        onPurchased?.()
        return
      }

      if (payload.data?.client_secret) {
        toast.success("Checkout intent created. Stripe Elements integration can now complete payment.")
        onOpenChange(false)
        onPurchased?.()
        return
      }

      toast.success("Purchase request saved.")
      onOpenChange(false)
      onPurchased?.()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start purchase"
      toast.error(message)
    } finally {
      setSubmittingCredits(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-[#101620] text-[#dce4f5]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wallet className="h-4 w-4 text-indigo-300" />
            Buy Additional Searches
          </DialogTitle>
          <DialogDescription className="text-[#9aa6bf]">{heading}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {CREDIT_PACKAGES.map((pkg) => (
            <button
              key={pkg.credits}
              type="button"
              onClick={() => void startPurchase(pkg.credits)}
              disabled={submittingCredits !== null}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                <p className="text-sm font-medium text-white">{pkg.label}</p>
                <p className="text-xs text-[#9aa6bf]">One-time purchase</p>
              </span>
              <span className="text-sm font-semibold text-indigo-200">{formatPrice(pkg.price_cents)}</span>
            </button>
          ))}
        </div>

        <DialogFooter>
          <p className="text-xs text-[#8d99b0]">
            If Stripe is not configured, purchase requests are saved as pending and checkout is marked coming soon.
          </p>
          {submittingCredits !== null ? (
            <div className="flex items-center gap-2 text-xs text-[#9aa6bf]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Preparing purchase...
            </div>
          ) : null}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="border-white/15">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
