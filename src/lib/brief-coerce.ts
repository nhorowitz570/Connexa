import { NormalizedBriefSchema } from "@/lib/schemas"
import type { NormalizedBrief } from "@/types"

function parseNumberLike(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string") return null
  const cleaned = value.trim().toLowerCase()
  if (!cleaned) return null

  const suffixMatch = cleaned.match(/^([0-9,.]+)\s*([km])$/)
  if (suffixMatch) {
    const base = Number(suffixMatch[1].replaceAll(",", ""))
    if (!Number.isFinite(base)) return null
    const multiplier = suffixMatch[2] === "m" ? 1_000_000 : 1_000
    return base * multiplier
  }

  const numeric = Number(cleaned.replace(/[^0-9.]/g, ""))
  return Number.isFinite(numeric) ? numeric : null
}

function parseStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,;|]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return []
}

function parseBudgetRange(value: unknown): { min: number; max: number; currency: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as { min?: unknown; max?: unknown; currency?: unknown }
    const min = parseNumberLike(maybe.min) ?? 10_000
    const max = parseNumberLike(maybe.max) ?? Math.max(min, 100_000)
    const currency =
      typeof maybe.currency === "string" && maybe.currency.trim().length > 0
        ? maybe.currency.trim().toUpperCase()
        : "USD"
    return { min: Math.max(0, min), max: Math.max(min, max), currency }
  }

  if (typeof value === "string") {
    const matches = value.match(/([0-9][0-9,]*(?:\.[0-9]+)?\s*[km]?)/gi) ?? []
    const parsed = matches
      .map((entry) => parseNumberLike(entry))
      .filter((entry): entry is number => entry !== null)

    if (parsed.length >= 2) {
      const min = Math.min(parsed[0], parsed[1])
      const max = Math.max(parsed[0], parsed[1])
      return { min, max, currency: /eur/i.test(value) ? "EUR" : "USD" }
    }

    if (parsed.length === 1) {
      return {
        min: parsed[0],
        max: parsed[0] * 5,
        currency: /eur/i.test(value) ? "EUR" : "USD",
      }
    }
  }

  return { min: 10_000, max: 100_000, currency: "USD" }
}

function parseTimeline(value: unknown): {
  type: "deadline" | "duration"
  start_date?: string
  deadline?: string
  duration?: string
} {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as {
      type?: unknown
      start_date?: unknown
      deadline?: unknown
      duration?: unknown
    }

    return {
      type: maybe.type === "deadline" ? "deadline" : "duration",
      start_date: typeof maybe.start_date === "string" ? maybe.start_date : undefined,
      deadline: typeof maybe.deadline === "string" ? maybe.deadline : undefined,
      duration: typeof maybe.duration === "string" ? maybe.duration : undefined,
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return { type: "duration", duration: value.trim() }
  }

  return { type: "duration", duration: "3 months" }
}

function parseGeography(value: unknown): { region: string; remote_ok: boolean } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const maybe = value as { region?: unknown; remote_ok?: unknown }
    return {
      region:
        typeof maybe.region === "string" && maybe.region.trim().length > 0
          ? maybe.region.trim()
          : "Global",
      remote_ok: typeof maybe.remote_ok === "boolean" ? maybe.remote_ok : true,
    }
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return { region: value.trim(), remote_ok: true }
  }

  return { region: "Global", remote_ok: true }
}

function parseObjectLike(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }

  return null
}

export function coerceNormalizedBrief(raw: unknown): NormalizedBrief | null {
  const direct = NormalizedBriefSchema.safeParse(raw)
  if (direct.success) return direct.data

  const objectLike = parseObjectLike(raw)
  if (!objectLike) return null

  const fallback = {
    service_type:
      typeof objectLike.service_type === "string" && objectLike.service_type.trim().length > 0
        ? objectLike.service_type.trim()
        : "b2b service provider",
    budget_range: parseBudgetRange(objectLike.budget_range),
    timeline: parseTimeline(objectLike.timeline),
    industry: parseStringList(objectLike.industry).slice(0, 8),
    geography: parseGeography(objectLike.geography),
    constraints: parseStringList(objectLike.constraints).slice(0, 20),
    optional:
      objectLike.optional && typeof objectLike.optional === "object" && !Array.isArray(objectLike.optional)
        ? objectLike.optional
        : {},
  }

  if (fallback.industry.length === 0) {
    fallback.industry = ["general b2b"]
  }

  const parsed = NormalizedBriefSchema.safeParse(fallback)
  return parsed.success ? parsed.data : null
}
