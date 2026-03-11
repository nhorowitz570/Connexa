export function getTemporalContext(referenceDate: Date = new Date()): string {
  const now = new Date(referenceDate)
  const iso = now.toISOString()
  const isoDate = iso.slice(0, 10)
  const isoTime = iso.slice(11, 19)
  const readableDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  })

  return `Current UTC date: ${isoDate}. Current UTC time: ${isoTime}. Full timestamp: ${iso}. Human-readable date: ${readableDate}. Current year: ${now.getUTCFullYear()}.`
}

export function getQuarterContext(referenceDate: Date = new Date()): {
  quarter: number
  nextQuarter: number
} {
  const now = new Date(referenceDate)
  const quarter = Math.floor(now.getUTCMonth() / 3) + 1

  return {
    quarter,
    nextQuarter: quarter === 4 ? 1 : quarter + 1,
  }
}
