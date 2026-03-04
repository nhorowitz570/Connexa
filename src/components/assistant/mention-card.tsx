"use client"

import Link from "next/link"
import { FileText } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"

type MentionCardProps = {
  briefId: string
}

type BriefMentionData = {
  id: string
  status: string
  serviceType: string
}

export function MentionCard({ briefId }: MentionCardProps) {
  const [brief, setBrief] = useState<BriefMentionData | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadBrief = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("briefs")
        .select("id, status, normalized_brief")
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
    return brief.serviceType
  }, [brief])

  if (!brief) {
    return (
      <span className="my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#8B949E]">
        <FileText className="h-3 w-3" />
        {missing ? "Unknown brief" : label}
      </span>
    )
  }

  return (
    <Link
      href={`/brief/${brief.id}`}
      className="my-1 inline-flex max-w-full items-center gap-1 rounded-full border border-[#30363D] bg-[#161B22] px-2 py-1 text-xs text-[#E6EDF3] hover:border-[#6366F1] hover:text-white"
    >
      <FileText className="h-3 w-3" />
      <span className="truncate">{label}</span>
      <span className="rounded-full bg-[#1F1F1F] px-1.5 py-0.5 text-[10px] uppercase text-[#8B949E]">
        {brief.status}
      </span>
    </Link>
  )
}
