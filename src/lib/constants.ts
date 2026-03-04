import type { BriefWeights } from "@/types"

export type SearchDepth = "standard" | "deep"

export const PIPELINE_LIMITS = {
  MAX_SEARCH_QUERIES: 12,
  EXA_RESULTS_PER_QUERY: 10,
  MAX_TOTAL_RAW_RESULTS: 100,
  MAX_SHORTLIST_CANDIDATES: 20,
  MAX_PAGE_FETCHES: 20,
  MAX_TOKENS_PER_PAGE: 2000,
  TOP_RESULTS: 5,
} as const

export const DEEP_PIPELINE_LIMITS = {
  MAX_SEARCH_QUERIES: 40,
  EXA_RESULTS_PER_QUERY: 10,
  MAX_TOTAL_RAW_RESULTS: 300,
  MAX_SHORTLIST_CANDIDATES: 80,
  MAX_PAGE_FETCHES: 100,
  MAX_TOKENS_PER_PAGE: 2000,
  TOP_RESULTS: 10,
} as const

export type PipelineLimits = {
  readonly MAX_SEARCH_QUERIES: number
  readonly EXA_RESULTS_PER_QUERY: number
  readonly MAX_TOTAL_RAW_RESULTS: number
  readonly MAX_SHORTLIST_CANDIDATES: number
  readonly MAX_PAGE_FETCHES: number
  readonly MAX_TOKENS_PER_PAGE: number
  readonly TOP_RESULTS: number
}

export function parseSearchDepth(value: unknown): SearchDepth {
  return value === "deep" ? "deep" : "standard"
}

export function getPipelineLimits(depth: SearchDepth = "standard"): PipelineLimits {
  return depth === "deep" ? DEEP_PIPELINE_LIMITS : PIPELINE_LIMITS
}

export const BLOCKLIST_DOMAINS = [
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "wikipedia.org",
  "reddit.com",
  "crunchbase.com",
  "yelp.com",
] as const

export const DEFAULT_BRIEF_WEIGHTS: BriefWeights = {
  service_match: 0.3,
  budget_fit: 0.15,
  industry_fit: 0.2,
  timeline_fit: 0.1,
  geo_fit: 0.15,
  constraint_fit: 0.1,
}

export const MODELS = {
  CHEAP: process.env.OPENROUTER_CHEAP_MODEL ?? "openai/gpt-4o-mini",
  WEAK:
    process.env.OPENROUTER_WEAK_MODEL ??
    process.env.OPENROUTER_CHEAP_MODEL ??
    "openai/gpt-4o-mini",
  STRONG: process.env.OPENROUTER_STRONG_MODEL ?? "openai/gpt-4o",
} as const

export const CONFIDENCE = {
  NORMALIZE_MIN_FOR_DIRECT_RUN: 0.85,
  MIN_FOR_SUCCESS: 0.4,
} as const

export const MISS_REASONS = {
  LOW_CONFIDENCE: "low_confidence",
  FEW_RESULTS: "few_results",
  LOW_SCORES: "low_scores",
  MISSING_BUDGET: "missing_budget",
  VAGUE_SCOPE: "vague_scope",
  NO_EVIDENCE: "no_evidence",
} as const
