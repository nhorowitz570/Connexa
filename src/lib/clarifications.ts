import { QuestionSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import type { NormalizedBrief, Question, QuestionsPayload } from "@/types"

function normalizeOptions(options: unknown, fallback: string[] = []): string[] {
  const deduped = Array.isArray(options)
    ? [
        ...new Set(
          options
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean),
        ),
      ]
    : []

  if (deduped.length >= 2) return deduped

  for (const option of fallback) {
    if (!deduped.includes(option)) deduped.push(option)
    if (deduped.length >= 2) break
  }

  return deduped
}

export function normalizeQuestionPayload(payload: QuestionsPayload): QuestionsPayload {
  const normalized: QuestionsPayload = {
    type: payload.type,
    questions: payload.questions.slice(0, 5).map((question) => ({
      ...question,
      priority: question.priority ?? "medium",
      type: question.type ?? "multiple_choice",
      options:
        question.type === "multiple_choice" || question.type === "select"
          ? normalizeOptions(question.options, ["Option A", "Option B"])
          : question.options,
    })),
  }

  return QuestionsPayloadSchema.parse(normalized)
}

function isLikelyDefaultBudget(brief: NormalizedBrief): boolean {
  return brief.budget_range.min === 10_000 && brief.budget_range.max === 100_000
}

function needsServiceTypeQuestion(brief: NormalizedBrief): boolean {
  const value = brief.service_type.trim().toLowerCase()
  return value.length < 5 || value === "b2b service provider" || value === "service provider"
}

export function contextAwareFallback(
  brief: NormalizedBrief,
  confidence: number,
): QuestionsPayload {
  const questions: Question[] = []

  if (needsServiceTypeQuestion(brief)) {
    questions.push({
      id: "service_type",
      prompt: "What specific type of service are you looking for?",
      type: "text",
      required: true,
      allowOther: false,
      fieldPath: "service_type",
      priority: "high",
      validation: { minLength: 3, maxLength: 200 },
    })
  }

  if (isLikelyDefaultBudget(brief)) {
    questions.push({
      id: "budget_range",
      prompt: "What is your approximate budget range?",
      type: "select",
      options: ["Under $10K", "$10K-$50K", "$50K-$100K", "$100K-$500K", "Over $500K"],
      required: true,
      allowOther: false,
      fieldPath: "budget_range",
      priority: "high",
    })
  }

  if (brief.industry.length === 1 && brief.industry[0]?.trim().toLowerCase() === "general b2b") {
    questions.push({
      id: "industry",
      prompt: "What industry or vertical are you in?",
      type: "text",
      required: false,
      allowOther: false,
      fieldPath: "industry",
      priority: "medium",
      validation: { minLength: 2, maxLength: 120 },
    })
  }

  if (brief.geography.region.trim().toLowerCase() === "global") {
    questions.push({
      id: "geography_region",
      prompt: "Do you prefer providers in a specific region?",
      type: "text",
      required: false,
      allowOther: false,
      fieldPath: "geography.region",
      priority: confidence < 0.5 ? "high" : "medium",
      validation: { maxLength: 120 },
    })
  }

  questions.push({
    id: "additional_context",
    prompt: "Any additional requirements or preferences?",
    type: "text",
    required: false,
    allowOther: false,
    fieldPath: "optional.additional_context",
    priority: "low",
    validation: { maxLength: 500 },
  })

  return QuestionsPayloadSchema.parse({
    type: "connexa.clarifications.v1",
    questions: questions.slice(0, 5),
  })
}

export function salvagePartialQuestions(
  raw: unknown,
  brief: NormalizedBrief,
  confidence: number,
): QuestionsPayload | null {
  if (!raw || typeof raw !== "object") return null

  const source = raw as { questions?: unknown }
  const rawQuestions = Array.isArray(source.questions) ? source.questions : []
  if (rawQuestions.length === 0) return null

  const salvaged: Question[] = []

  for (const rawQuestion of rawQuestions) {
    if (!rawQuestion || typeof rawQuestion !== "object") continue
    const question = rawQuestion as Record<string, unknown>

    const candidate = {
      id:
        typeof question.id === "string" && question.id.trim().length > 0
          ? question.id.trim()
          : `q_${salvaged.length + 1}`,
      prompt:
        typeof question.prompt === "string" && question.prompt.trim().length > 0
          ? question.prompt.trim()
          : null,
      type:
        question.type === "multiple_choice" ||
        question.type === "text" ||
        question.type === "select" ||
        question.type === "number"
          ? question.type
          : "text",
      options: question.options,
      allowOther: Boolean(question.allowOther),
      required: Boolean(question.required),
      helpText: typeof question.helpText === "string" ? question.helpText : undefined,
      fieldPath:
        typeof question.fieldPath === "string" && question.fieldPath.trim().length > 0
          ? question.fieldPath.trim()
          : "optional.additional_context",
      priority:
        question.priority === "high" || question.priority === "medium" || question.priority === "low"
          ? question.priority
          : "medium",
      validation:
        question.validation && typeof question.validation === "object" && !Array.isArray(question.validation)
          ? question.validation
          : undefined,
    }

    if (!candidate.prompt) continue

    if (candidate.type === "multiple_choice" || candidate.type === "select") {
      candidate.options = normalizeOptions(candidate.options, ["Option A", "Option B"])
    }

    const parsed = QuestionSchema.safeParse(candidate)
    if (parsed.success) {
      salvaged.push(parsed.data)
    }

    if (salvaged.length >= 5) break
  }

  if (salvaged.length === 0) return null

  const payload = QuestionsPayloadSchema.safeParse({
    type: "connexa.clarifications.v1",
    questions: salvaged,
  })

  if (payload.success) {
    return normalizeQuestionPayload(payload.data)
  }

  const fallback = contextAwareFallback(brief, confidence)
  if (fallback.questions.length > 0) {
    return {
      ...fallback,
      questions: [...salvaged, ...fallback.questions].slice(0, 5),
    }
  }

  return null
}
