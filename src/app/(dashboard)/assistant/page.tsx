"use client"

import { Maximize2, Minimize2, Sparkles } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { ChatView } from "@/components/assistant/chat-view"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function AssistantPage() {
  const chatShellRef = useRef<HTMLDivElement | null>(null)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false)
  const [isFallbackFullscreen, setIsFallbackFullscreen] = useState(false)

  const isExpanded = isBrowserFullscreen || isFallbackFullscreen

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsBrowserFullscreen(document.fullscreenElement === chatShellRef.current)
    }

    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange)
    }
  }, [])

  useEffect(() => {
    if (!isFallbackFullscreen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFallbackFullscreen(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isFallbackFullscreen])

  const toggleFullscreen = async () => {
    if (isBrowserFullscreen) {
      await document.exitFullscreen()
      return
    }

    if (isFallbackFullscreen) {
      setIsFallbackFullscreen(false)
      return
    }

    const element = chatShellRef.current
    if (!element) return

    if (document.fullscreenEnabled && typeof element.requestFullscreen === "function") {
      try {
        await element.requestFullscreen()
        return
      } catch {
        // Fall through to CSS fallback mode.
      }
    }

    setIsFallbackFullscreen(true)
  }

  return (
    <section className="flex h-[calc(100dvh-8rem)] flex-col gap-4">
      <header className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
              <Badge variant="outline" className="text-[11px]">
                Context aware
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Chat with ConnexaAI about briefs, matches, and sourcing strategy with cleaner thread-based workflows.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              void toggleFullscreen()
            }}
            aria-pressed={isExpanded}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isExpanded ? "Exit fullscreen" : "Fullscreen"}
          </Button>
        </div>
      </header>

      <div
        ref={chatShellRef}
        className={cn(
          "relative flex min-h-0 flex-1 flex-col rounded-3xl border border-border/70 bg-background/80 p-2 shadow-sm transition-all duration-200",
          isFallbackFullscreen &&
            "fixed inset-2 z-50 rounded-2xl border-border bg-background p-3 shadow-2xl md:inset-4",
        )}
      >
        {isFallbackFullscreen ? (
          <div className="mb-2 flex items-center justify-between rounded-xl border border-border/70 bg-card/70 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Focus mode enabled</p>
            <p className="text-xs text-muted-foreground">Press Esc to close</p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1">
          <ChatView />
        </div>
      </div>
    </section>
  )
}
