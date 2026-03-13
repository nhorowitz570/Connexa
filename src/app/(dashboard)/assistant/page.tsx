"use client"

import { useEffect, useRef, useState } from "react"

import { ChatView } from "@/components/assistant/chat-view"
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
    <section className="flex h-[calc(100dvh-8rem)] flex-col">
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
          <ChatView
            isExpanded={isExpanded}
            onToggleFullscreen={() => {
              void toggleFullscreen()
            }}
          />
        </div>
      </div>
    </section>
  )
}
