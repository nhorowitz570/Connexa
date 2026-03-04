"use client"

import { useEffect, useMemo, useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

type BriefMentionPickerProps = {
  open: boolean
  query: string
  onOpenChange: (open: boolean) => void
  onSelect: (briefId: string) => void
}

type BriefSuggestion = {
  id: string
  serviceType: string
}

export function BriefMentionPicker({ open, query, onOpenChange, onSelect }: BriefMentionPickerProps) {
  const [loading, setLoading] = useState(false)
  const [briefs, setBriefs] = useState<BriefSuggestion[]>([])

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from("briefs")
          .select("id, normalized_brief")
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) return

        const mapped = (data ?? []).map((brief) => {
          const normalized =
            typeof brief.normalized_brief === "object" && brief.normalized_brief
              ? (brief.normalized_brief as { service_type?: string })
              : null

          return {
            id: brief.id,
            serviceType: normalized?.service_type ?? "Untitled brief",
          }
        })

        setBriefs(mapped)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [open])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase().trim()
    if (!lower) return briefs

    return briefs.filter(
      (brief) =>
        brief.id.toLowerCase().includes(lower) || brief.serviceType.toLowerCase().includes(lower),
    )
  }, [briefs, query])

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverAnchor asChild>
        <div className="h-0 w-full" />
      </PopoverAnchor>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command>
          <CommandInput value={query} readOnly placeholder="Search briefs..." />
          <CommandList>
            <CommandEmpty>{loading ? "Loading..." : "No briefs found"}</CommandEmpty>
            <CommandGroup heading="Recent Briefs">
              {filtered.map((brief) => (
                <CommandItem
                  key={brief.id}
                  value={`${brief.serviceType} ${brief.id}`}
                  onSelect={() => onSelect(brief.id)}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">{brief.serviceType}</p>
                    <p className="truncate text-xs text-muted-foreground">{brief.id}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
