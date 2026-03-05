import { z } from "zod"

export const NormalizedBriefSchema = z.object({
  service_type: z.string().min(1),
  budget_range: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
    currency: z.string().default("USD"),
  }),
  timeline: z.object({
    type: z.enum(["deadline", "duration"]),
    start_date: z.string().optional(),
    deadline: z.string().optional(),
    duration: z.string().optional(),
  }),
  industry: z.array(z.string()).min(1),
  geography: z.object({
    region: z.string(),
    remote_ok: z.boolean().default(true),
  }),
  constraints: z.array(z.string()).default([]),
  optional: z.record(z.string(), z.unknown()).default({}),
})

export const BriefWeightsSchema = z.object({
  service_match: z.number().min(0).max(1),
  budget_fit: z.number().min(0).max(1),
  industry_fit: z.number().min(0).max(1),
  timeline_fit: z.number().min(0).max(1),
  geo_fit: z.number().min(0).max(1),
  constraint_fit: z.number().min(0).max(1),
})

export const QuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  type: z.enum(["multiple_choice", "text", "select", "number"]).default("multiple_choice"),
  options: z.array(z.string().min(1)).min(2).optional(),
  allowOther: z.boolean().default(false),
  required: z.boolean().default(false),
  helpText: z.string().optional(),
  fieldPath: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      minLength: z.number().int().min(0).optional(),
      maxLength: z.number().int().min(0).optional(),
      pattern: z.string().optional(),
    })
    .optional(),
}).superRefine((question, ctx) => {
  const needsOptions = question.type === "multiple_choice" || question.type === "select"
  if (needsOptions && (!question.options || question.options.length < 2)) {
    ctx.addIssue({
      code: "custom",
      message: "options are required for multiple_choice and select questions",
      path: ["options"],
    })
  }
})

export const QuestionsPayloadSchema = z.object({
  type: z.literal("connexa.clarifications.v1"),
  questions: z.array(QuestionSchema).min(1).max(5),
})

export const ShortlistCandidateSchema = z.object({
  domain: z.string().min(1),
  urls: z.array(z.string().url()).min(1).max(3),
  reason: z.string().min(1),
  expected_signals: z.array(z.string()).default([]),
})

export const ShortlistPayloadSchema = z.object({
  type: z.literal("connexa.shortlist.v1"),
  run_id: z.string().optional(),
  candidates: z.array(ShortlistCandidateSchema).max(100),
})

export const PricingSignalSchema = z.object({
  type: z.string(),
  value: z.string(),
  evidence: z.string(),
})

export const CandidateSchema = z.object({
  company_name: z.string().min(1),
  website_url: z.string().url(),
  services: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  geography: z.string().nullable().optional(),
  pricing_signals: PricingSignalSchema.nullable().optional(),
  portfolio_signals: z.array(z.string()).nullable().optional(),
  team_size: z.string().nullable().optional(),
  contact: z
    .object({
      contact_url: z.string().url().nullable().optional(),
      email: z.string().email().nullable().optional(),
    })
    .optional(),
  evidence_links: z.array(z.string().url()).default([]),
  extraction_confidence: z.number().min(0).max(1).default(0.5),
})

export const ScoreBreakdownSchema = z.object({
  service_match: z.number().min(0).max(100),
  budget_fit: z.number().min(0).max(100),
  industry_fit: z.number().min(0).max(100),
  timeline_fit: z.number().min(0).max(100),
  geo_fit: z.number().min(0).max(100),
  constraint_fit: z.number().min(0).max(100),
})

export const ScoredResultSchema = z.object({
  company_name: z.string().min(1),
  website_url: z.string().url(),
  contact_url: z.string().url().nullable().optional(),
  contact_email: z.string().email().nullable().optional(),
  geography: z.string().nullable().optional(),
  services: z.array(z.string()).default([]),
  industries: z.array(z.string()).default([]),
  pricing_signals: z.unknown().optional(),
  portfolio_signals: z.array(z.string()).nullable().optional(),
  evidence_links: z.array(z.string().url()).default([]),
  score_overall: z.number().int().min(0).max(100),
  score_breakdown: ScoreBreakdownSchema,
  reasoning_summary: z.string().min(1),
  reasoning_detailed: z.record(z.string(), z.string()).nullable().optional(),
  confidence: z.number().min(0).max(1),
})

export const NormalizeResponseSchema = z.object({
  normalized_brief: NormalizedBriefSchema,
  weights: BriefWeightsSchema,
  confidence: z.number().min(0).max(1),
  _meta: z
    .object({
      method: z.enum(["llm", "heuristic"]),
      llm_error: z.string().nullable().optional(),
      fell_back_to_heuristic: z.boolean().optional(),
    })
    .optional(),
})

export const RerunOverridesSchema = z.object({
  force_clarify: z.boolean().optional(),
  constraints: z.array(z.string().min(1)).optional(),
  geography_region: z.string().min(1).optional(),
  search_depth: z.enum(["standard", "deep"]).optional(),
})
