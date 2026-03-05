export const FEATURES = {
  FIVERR_LINKING: process.env.NEXT_PUBLIC_FEATURE_FIVERR === "true",
  UPWORK_LINKING: process.env.NEXT_PUBLIC_FEATURE_UPWORK === "true",
  STRIPE_PAYMENTS:
    !!process.env.STRIPE_SECRET_KEY &&
    !!process.env.NEXT_PUBLIC_STRIPE_KEY,
  SEARCH_CREDITS: process.env.NEXT_PUBLIC_FEATURE_CREDITS === "true",
} as const
