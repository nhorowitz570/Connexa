"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type HistoryFiltersProps = {
  mode: "all" | "simple" | "detailed"
  status: "all" | "draft" | "clarifying" | "running" | "complete" | "failed" | "cancelled"
  query: string
}

export function HistoryFilters({ mode, status, query }: HistoryFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(query)

  const pushParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString())
    updater(params)
    params.delete("brief")
    params.set("page", "1")
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleModeChange = (nextMode: string) => {
    pushParams((params) => {
      if (nextMode === "all") params.delete("mode")
      else params.set("mode", nextMode)
    })
  }

  const handleStatusChange = (nextStatus: string) => {
    pushParams((params) => {
      if (nextStatus === "all") params.delete("status")
      else params.set("status", nextStatus)
    })
  }

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    pushParams((params) => {
      const trimmed = search.trim()
      if (trimmed.length === 0) params.delete("q")
      else params.set("q", trimmed)
    })
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, service type, prompt, or brief ID"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <Select value={mode} onValueChange={handleModeChange}>
        <SelectTrigger className="w-full lg:w-[180px]">
          <SelectValue placeholder="All Modes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Modes</SelectItem>
          <SelectItem value="simple">Simple</SelectItem>
          <SelectItem value="detailed">Detailed</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-full lg:w-[200px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="complete">Complete</SelectItem>
          <SelectItem value="running">Running</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
          <SelectItem value="cancelled">Cancelled</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="clarifying">Clarifying</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
