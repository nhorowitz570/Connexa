"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { BriefListItem } from "@/components/dashboard/brief-list-item"
import { BriefSlideOver } from "@/components/dashboard/brief-slide-over"
import type { BriefMode, BriefStatus } from "@/types"

type HistoryBriefRow = {
  id: string
  mode: BriefMode
  name: string | null
  category: string | null
  serviceType: string
  status: BriefStatus
  createdAt: string
  score: number | null
  durationLabel: string | null
}

type HistoryClientProps = {
  briefs: HistoryBriefRow[]
}

export function HistoryClient({ briefs }: HistoryClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const selectedBriefId = searchParams.get("brief")

  const setSelectedBrief = (briefId: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (briefId) {
      params.set("brief", briefId)
    } else {
      params.delete("brief")
    }

    const query = params.toString()
    router.push(query.length > 0 ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <>
      <div className="space-y-3">
        {briefs.map((brief) => (
          <BriefListItem
            key={brief.id}
            id={brief.id}
            mode={brief.mode}
            name={brief.name}
            serviceType={brief.serviceType}
            category={brief.category}
            status={brief.status}
            createdAt={brief.createdAt}
            score={brief.score}
            durationLabel={brief.durationLabel}
            onSelect={(id) => setSelectedBrief(id)}
          />
        ))}
      </div>

      <BriefSlideOver
        briefId={selectedBriefId}
        open={Boolean(selectedBriefId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setSelectedBrief(null)
          }
        }}
      />
    </>
  )
}
