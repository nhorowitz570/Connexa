import type { z } from "zod"

import {
  BriefWeightsSchema,
  CandidateSchema,
  NormalizeResponseSchema,
  NormalizedBriefSchema,
  QuestionsPayloadSchema,
  QuestionSchema,
  RerunOverridesSchema,
  ScoredResultSchema,
  ScoreBreakdownSchema,
  ShortlistPayloadSchema,
} from "@/lib/schemas"

export type NormalizedBrief = z.infer<typeof NormalizedBriefSchema>
export type BriefWeights = z.infer<typeof BriefWeightsSchema>
export type Question = z.infer<typeof QuestionSchema>
export type QuestionsPayload = z.infer<typeof QuestionsPayloadSchema>
export type Candidate = z.infer<typeof CandidateSchema>
export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>
export type ScoredResult = z.infer<typeof ScoredResultSchema>
export type ShortlistPayload = z.infer<typeof ShortlistPayloadSchema>
export type NormalizeResponse = z.infer<typeof NormalizeResponseSchema>
export type RerunOverrides = z.infer<typeof RerunOverridesSchema>

export type ConnectedAccount = {
  connected: boolean
  email?: string | null
  username?: string | null
  connected_at?: string
  scopes?: string[]
  token_encrypted?: string
  available?: boolean
}

export type ConnectedAccounts = {
  google?: ConnectedAccount
  fiverr?: ConnectedAccount
  upwork?: ConnectedAccount
}

export type CreditPackage = {
  credits: number
  price_cents: number
  label: string
}

export type BriefMode = "simple" | "detailed"
export type BriefStatus = "draft" | "clarifying" | "running" | "complete" | "error" | "cancelled"
export type RunStatus = "running" | "complete" | "error" | "cancelled"
