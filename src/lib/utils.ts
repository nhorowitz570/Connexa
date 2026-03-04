import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null
  const start = new Date(startedAt).getTime()
  const end = new Date(completedAt).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null

  const totalSeconds = Math.round((end - start) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

export function parseDurationFromNotes(notes: string[]): string | null {
  const marker = notes.find((note) => note.startsWith("Pipeline duration: "))
  if (!marker) return null

  const seconds = Number.parseInt(marker.replace("Pipeline duration: ", "").replace("s", ""), 10)
  if (!Number.isFinite(seconds) || seconds < 0) return null

  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60

  if (minutes === 0) return `${remainder}s`
  return `${minutes}m ${remainder}s`
}
