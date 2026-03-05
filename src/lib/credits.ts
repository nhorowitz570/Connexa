export const CREDIT_PACKAGES = [
  { credits: 5, price_cents: 4900, label: "5 searches" },
  { credits: 10, price_cents: 8900, label: "10 searches" },
  { credits: 25, price_cents: 19900, label: "25 searches" },
] as const

export function formatCreditsRemaining(credits: number | null | undefined): string {
  if (credits === null || credits === undefined) return "-"
  if (credits < 0) return "Unlimited"
  return `${credits}`
}
