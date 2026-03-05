import { BadgeCheck, Crown } from "lucide-react"

import { Button } from "@/components/ui/button"

type PlanSectionProps = {
  planName: string
}

export function PlanSection({ planName }: PlanSectionProps) {
  return (
    <section className="glass-card space-y-5 rounded-2xl border border-white/10 p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Plan & Usage</h2>
        <p className="text-sm text-[#9ca3b4]">Your current plan and included features.</p>
      </div>

      <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-indigo-500/20 p-2 text-indigo-200">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">{planName.toUpperCase()}</p>
              <p className="text-xs text-[#b9c4de]">Unlimited searches, priority pipeline, all features</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-200">
            <BadgeCheck className="h-3.5 w-3.5" />
            Active
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-[#8290aa]">Searches this month</p>
          <p className="mt-1 text-xl font-semibold text-white">Unlimited</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-xs text-[#8290aa]">Priority queue</p>
          <p className="mt-1 text-xl font-semibold text-white">Enabled</p>
        </div>
      </div>

      <Button disabled className="h-11 rounded-xl bg-white/10 text-white hover:bg-white/10">
        Manage Plan (coming soon)
      </Button>
    </section>
  )
}
