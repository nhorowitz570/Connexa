"use client"

import { useEffect } from "react"

type PrintTriggerProps = {
  delayMs?: number
}

export function PrintTrigger({ delayMs = 250 }: PrintTriggerProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.print()
    }, delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  return null
}
