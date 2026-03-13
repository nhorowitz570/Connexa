"use client"

import { useRouter } from "next/navigation"

import { BriefListItem } from "@/components/dashboard/brief-list-item"
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
  attachmentCount: number
}

type HistoryClientProps = {
  briefs: HistoryBriefRow[]
}

export function HistoryClient({ briefs }: HistoryClientProps) {
  const router = useRouter()

  return (
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
          attachmentCount={brief.attachmentCount}
          onSelect={(id) => router.push(`/brief/${id}`)}
        />
      ))}
    </div>
  )
}
