"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"

type MentionCardProps = {
  briefId: string
  compact?: boolean
}

type BriefMentionData = {
  id: string
  name: string | null
  status: string
  serviceType: string
}

export function MentionCard({ briefId, compact = false }: MentionCardProps) {
  const [brief, setBrief] = useState<BriefMentionData | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBrief = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("briefs")
        .select("id, name, status, normalized_brief")
        .eq("id", briefId)
        .maybeSingle()

      if (cancelled) return
      if (!data) {
        setMissing(true)
        return
      }

      const normalized =
        data.normalized_brief && typeof data.normalized_brief === "object"
          ? (data.normalized_brief as { service_type?: string })
          : null

      setBrief({
        id: data.id,
        name: data.name,
        status: data.status,
        serviceType: normalized?.service_type?.trim() || "Untitled brief",
      })
      setMissing(false)
    }

    void loadBrief()

    return () => {
      cancelled = true
    }
  }, [briefId])

  const label = useMemo(() => {
    if (!brief) return "Loading brief..."
    const byName = brief.name?.trim()
    if (byName && byName.length > 0) return byName
    return brief.serviceType
  }, [brief])

  const wrapperClass = compact
    ? "my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#2a3038] bg-[#111721] px-2 py-0.5 text-[11px] text-[#d0d9e8]"
    : "my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#E6EDF3]"

  const statusClass = compact
    ? "rounded-full bg-[#1F1F1F] px-1.5 py-0.5 text-[9px] uppercase text-[#8B949E]"
    : "rounded-full bg-[#1F1F1F] px-1.5 py-0.5 text-[10px] uppercase text-[#8B949E]"

  const iconClass = compact ? "h-3 w-3" : "h-3 w-3"

  if (!brief) {
    return (
      <span className={compact ? `${wrapperClass} text-[#8B949E]` : "my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#8B949E]"}>
        <FileText className={iconClass} />
        {missing ? "Unknown brief" : label}
      </span>
    )
  }

  return (
    <Link
      href={`/brief/${brief.id}`}
      className={`${wrapperClass} hover:border-[#6366F1] hover:text-white`}
    >
      <FileText className={iconClass} />
      <span className="truncate">{label}</span>
      <span className={statusClass}>
        {brief.status}
      </span>
    </Link>
  )
}
