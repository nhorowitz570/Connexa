"use client"

import {
  Coins,
  FileText,
  LayoutGrid,
  Loader2,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"

import { ConnexaLogo } from "@/components/connexa-logo"
import { CreditPurchaseDialog } from "@/components/purchases/credit-purchase-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCreditsRemaining } from "@/lib/credits"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type HeaderProps = {
  email: string
  fullName: string | null
  onOpenMobileNav: () => void
}

type BriefSearchResult = {
  id: string
  name: string | null
  status: "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
  service_type: string
}

type QuickResult = {
  title: string
  description: string
  href: string
  icon: "page" | "settings"
  keywords: string
}

type CreditsPayload = {
  data?: {
    credits_remaining?: number
  }
}

const PAGE_RESULTS: QuickResult[] = [
  {
    title: "Dashboard",
    description: "Overview of active searches and top metrics",
    href: "/",
    icon: "page",
    keywords: "dashboard home overview",
  },
  {
    title: "History",
    description: "Browse all briefs and previous results",
    href: "/history",
    icon: "page",
    keywords: "history briefs previous",
  },
  {
    title: "Analytics",
    description: "Trends, miss reasons, and recommendations",
    href: "/analytics",
    icon: "page",
    keywords: "analytics trends charts",
  },
  {
    title: "Assistant",
    description: "Chat with ConnexaAI about your strategy",
    href: "/assistant",
    icon: "page",
    keywords: "assistant ai chat",
  },
  {
    title: "New Brief",
    description: "Create a new search brief",
    href: "/brief/new",
    icon: "page",
    keywords: "new brief create",
  },
]

const SETTINGS_RESULTS: QuickResult[] = [
  {
    title: "Settings: Profile",
    description: "Name and account details",
    href: "/settings?section=profile",
    icon: "settings",
    keywords: "settings profile",
  },
  {
    title: "Settings: AI Preferences",
    description: "Search mode and assistant defaults",
    href: "/settings?section=ai-preferences",
    icon: "settings",
    keywords: "settings ai preferences search mode",
  },
  {
    title: "Settings: Appearance",
    description: "Theme and visual preferences",
    href: "/settings?section=appearance",
    icon: "settings",
    keywords: "settings appearance theme",
  },
  {
    title: "Settings: Plan & Usage",
    description: "Plan details and usage info",
    href: "/settings?section=plan",
    icon: "settings",
    keywords: "settings plan usage",
  },
  {
    title: "Settings: Connected Accounts",
    description: "Google, Fiverr, and Upwork links",
    href: "/settings?section=connected-accounts",
    icon: "settings",
    keywords: "settings connected accounts",
  },
]

function statusLabel(status: BriefSearchResult["status"]) {
  if (status === "running") return "Searching"
  if (status === "error") return "Error"
  if (status === "complete") return "Complete"
  if (status === "clarifying") return "Clarifying"
  if (status === "cancelled") return "Cancelled"
  return "Draft"
}

function matchesQuery(item: QuickResult, query: string) {
  const haystack = `${item.title} ${item.description} ${item.keywords}`.toLowerCase()
  return haystack.includes(query)
}

export function Header({ email, fullName, onOpenMobileNav }: HeaderProps) {
  const router = useRouter()
  const searchWrapperRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [briefResults, setBriefResults] = useState<BriefSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [creditsRemaining, setCreditsRemaining] = useState<number>(-1)
  const [creditsLoading, setCreditsLoading] = useState(true)
  const [purchaseDialogOpen, setPurchaseDialogOpen] = useState(false)
  const initials =
    fullName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? email.slice(0, 2).toUpperCase()

  const trimmedSearchTerm = searchTerm.trim()
  const queryLower = trimmedSearchTerm.toLowerCase()
  const filteredPages = useMemo(() => {
    if (queryLower.length === 0) return PAGE_RESULTS.slice(0, 4)
    return PAGE_RESULTS.filter((item) => matchesQuery(item, queryLower)).slice(0, 5)
  }, [queryLower])

  const filteredSettings = useMemo(() => {
    if (queryLower.length === 0) return SETTINGS_RESULTS.slice(0, 3)
    return SETTINGS_RESULTS.filter((item) => matchesQuery(item, queryLower)).slice(0, 5)
  }, [queryLower])

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success("Signed out")
    router.push("/login")
    router.refresh()
  }

  const goTo = (href: string) => {
    setSearchOpen(false)
    setSearchTerm("")
    router.push(href)
  }

  const handleGlobalSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = searchTerm.trim()
    if (query.length === 0) {
      goTo("/history?page=1")
      return
    }

    const params = new URLSearchParams()
    params.set("q", query)
    params.set("page", "1")
    goTo(`/history?${params.toString()}`)
  }

  useEffect(() => {
    let cancelled = false

    const loadCredits = async () => {
      try {
        const response = await fetch("/api/purchases/credits", { cache: "no-store" })
        if (!response.ok) return

        const payload = (await response.json()) as CreditsPayload
        if (!cancelled && typeof payload.data?.credits_remaining === "number") {
          setCreditsRemaining(payload.data.credits_remaining)
        }
      } catch {
        // Ignore credits fetch issues in header.
      } finally {
        if (!cancelled) {
          setCreditsLoading(false)
        }
      }
    }

    void loadCredits()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return

      const active = document.activeElement
      const isEditable =
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)

      if (isEditable) return

      event.preventDefault()
      setSearchOpen(true)
      searchInputRef.current?.focus()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!searchWrapperRef.current) return
      if (searchWrapperRef.current.contains(event.target as Node)) return
      setSearchOpen(false)
    }

    window.addEventListener("pointerdown", onPointerDown)
    return () => window.removeEventListener("pointerdown", onPointerDown)
  }, [])

  useEffect(() => {
    if (trimmedSearchTerm.length === 0) {
      setBriefResults([])
      setIsSearching(false)
      return
    }

    const controller = new AbortController()
    setIsSearching(true)

    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/global?q=${encodeURIComponent(trimmedSearchTerm)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setBriefResults([])
          return
        }

        const payload = (await response.json()) as {
          data?: {
            briefs?: BriefSearchResult[]
          }
        }

        setBriefResults(Array.isArray(payload.data?.briefs) ? payload.data.briefs : [])
      } catch {
        if (!controller.signal.aborted) {
          setBriefResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false)
        }
      }
    }, 180)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [trimmedSearchTerm])

  return (
    <header className="glass-card fixed inset-x-0 top-0 z-50 border-b border-border px-3 py-3 sm:px-5 lg:px-8">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onOpenMobileNav}
            className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <Link href="/" className="shrink-0">
            <ConnexaLogo className="h-8 w-auto" />
          </Link>
        </div>

        <div className="hidden min-w-0 flex-1 px-2 lg:flex">
          <div ref={searchWrapperRef} className="relative mx-auto w-full max-w-xl">
            <form
              onSubmit={handleGlobalSearch}
              className="glass-card-hover glass-card flex h-11 w-full items-center gap-2 rounded-xl px-3"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={searchTerm}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false)
                  }
                }}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setSearchOpen(true)
                }}
                placeholder="Search briefs, pages, and settings"
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                aria-label="Search briefs, pages, and settings"
              />
              <button
                type="submit"
                className="rounded-md border border-border bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
              >
                Cmd+K
              </button>
            </form>

            {searchOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] rounded-xl border border-border bg-popover/95 p-2 shadow-2xl backdrop-blur-2xl">
                {trimmedSearchTerm.length > 0 ? (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Results for &quot;{trimmedSearchTerm}&quot;</p>
                ) : (
                  <p className="px-2 py-1 text-xs text-muted-foreground">Quick links</p>
                )}

                <div className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
                  <div>
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Pages</p>
                    {filteredPages.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/8"
                      >
                        <LayoutGrid className="mt-0.5 h-4 w-4 text-indigo-300" />
                        <span className="min-w-0">
                          <span className="block text-sm text-foreground">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Settings</p>
                    {filteredSettings.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/8"
                      >
                        <SlidersHorizontal className="mt-0.5 h-4 w-4 text-indigo-300" />
                        <span className="min-w-0">
                          <span className="block text-sm text-foreground">{item.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{item.description}</span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div>
                    <p className="px-2 pb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Briefs</p>
                    {isSearching ? (
                      <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Searching...
                      </div>
                    ) : briefResults.length > 0 ? (
                      briefResults.map((brief) => (
                        <button
                          key={brief.id}
                          type="button"
                          onClick={() => goTo(`/brief/${brief.id}`)}
                          className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/8"
                        >
                          <FileText className="mt-0.5 h-4 w-4 text-indigo-300" />
                          <span className="min-w-0">
                            <span className="block text-sm text-foreground">{brief.name?.trim() || brief.service_type}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {brief.service_type} - {statusLabel(brief.status)}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-2 text-xs text-muted-foreground">
                        {trimmedSearchTerm.length > 0 ? "No matching briefs" : "Type to search your briefs"}
                      </p>
                    )}
                  </div>

                  {trimmedSearchTerm.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams()
                        params.set("q", trimmedSearchTerm)
                        params.set("page", "1")
                        goTo(`/history?${params.toString()}`)
                      }}
                      className={cn(
                        "w-full rounded-lg border border-border px-2 py-2 text-left text-xs text-muted-foreground",
                        "transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white",
                      )}
                    >
                      Press Enter to view all history results for &quot;{trimmedSearchTerm}&quot;
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs text-foreground lg:flex">
            <Coins className="h-3.5 w-3.5 text-indigo-300" />
            {creditsLoading ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Credits
              </span>
            ) : (
              <span>Credits: {formatCreditsRemaining(creditsRemaining)}</span>
            )}
            <button
                type="button"
                onClick={() => setPurchaseDialogOpen(true)}
                className="rounded-md border border-indigo-400/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] text-indigo-200 transition-colors hover:bg-indigo-500/20"
            >
              Buy
            </button>
          </div>

          <Link href="/brief/new" className="hidden sm:block">
            <Button className="h-11 rounded-xl bg-indigo-600 px-4 text-white hover:bg-indigo-500">
              <Plus className="mr-2 h-4 w-4" />
              New Brief
            </Button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="rounded-2xl border border-border bg-muted/50 p-1 transition-colors hover:bg-muted"
                aria-label="Open profile menu"
              >
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-blue-500 text-xs font-semibold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-popover/95 text-popover-foreground backdrop-blur-xl">
              <DropdownMenuLabel className="space-y-0.5">
                <p className="text-sm font-semibold text-foreground">{fullName ?? "Connexa User"}</p>
                <p className="truncate text-xs text-muted-foreground">{email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/brief/new" className="sm:hidden">
                  <Plus className="mr-2 h-4 w-4" />
                  New Brief
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/assistant">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Assistant
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPurchaseDialogOpen(true)}
                className="lg:hidden"
              >
                <Coins className="mr-2 h-4 w-4" />
                Credits: {formatCreditsRemaining(creditsRemaining)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void handleLogout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <CreditPurchaseDialog
        open={purchaseDialogOpen}
        onOpenChange={setPurchaseDialogOpen}
        creditsRemaining={creditsRemaining}
        onPurchased={() => {
          setCreditsLoading(true)
          void fetch("/api/purchases/credits", { cache: "no-store" })
            .then((response) => response.json())
            .then((payload: CreditsPayload) => {
              if (typeof payload.data?.credits_remaining === "number") {
                setCreditsRemaining(payload.data.credits_remaining)
              }
            })
            .finally(() => setCreditsLoading(false))
        }}
      />
    </header>
  )
}
