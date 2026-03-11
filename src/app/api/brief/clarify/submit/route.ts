import { randomUUID } from "node:crypto"

import { NextResponse, after } from "next/server"

import { runPipeline } from "@/lib/pipeline/orchestrator"
import { NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type ClarificationSubmitInput = {
  brief_id?: string
  answers?: Record<string, unknown>
}

export const maxDuration = 300

function dedupeOptions(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return [...new Set(values.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))]
}

function coerceQuestionsPayload(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null

  const payload = raw as { questions?: unknown }
  if (!Array.isArray(payload.questions)) return null

  const questions = payload.questions
    .flatMap((question) => {
      if (!question || typeof question !== "object" || Array.isArray(question)) return []
      const source = question as Record<string, unknown>
      const id = typeof source.id === "string" ? source.id.trim() : ""
      const prompt = typeof source.prompt === "string" ? source.prompt.trim() : ""
      const fieldPath = typeof source.fieldPath === "string" ? source.fieldPath.trim() : ""
      if (!id || !prompt || !fieldPath) return []

      const type = source.type === "multiple_choice" || source.type === "select" || source.type === "number"
        ? source.type
        : "text"
      const options = dedupeOptions(source.options)
      if ((type === "multiple_choice" || type === "select") && options.length < 2) {
        return []
      }

      return [{
        id,
        prompt,
        fieldPath,
        type,
        options: options.length > 0 ? options : undefined,
        allowOther: Boolean(source.allowOther),
        required: Boolean(source.required),
        priority: source.priority === "high" || source.priority === "low" ? source.priority : "medium",
      }]
    })
    .slice(0, 5)

  if (questions.length === 0) return null

  return {
    type: "connexa.clarifications.v1",
    questions,
  }
}

function applyByPath(base: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split(".")
  let cursor: Record<string, unknown> = base

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i]
    const next = cursor[segment]
    if (typeof next !== "object" || next === null || Array.isArray(next)) {
      cursor[segment] = {}
    }
    cursor = cursor[segment] as Record<string, unknown>
  }

  cursor[segments[segments.length - 1]] = value
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClarificationSubmitInput
    if (!body.brief_id || !body.answers || typeof body.answers !== "object") {
      return NextResponse.json(
        { error: "brief_id and answers are required." },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id, normalized_brief")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()
    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    const normalizedResult = NormalizedBriefSchema.safeParse(brief.normalized_brief)
    if (!normalizedResult.success) {
      return NextResponse.json({ error: "Brief normalized data is invalid." }, { status: 400 })
    }

    const { data: questionRow, error: questionError } = await supabase
      .from("brief_questions")
      .select("id, questions")
      .eq("brief_id", body.brief_id)
      .is("answers", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (questionError || !questionRow) {
      return NextResponse.json({ error: "No clarification questions found." }, { status: 400 })
    }

    let payload = QuestionsPayloadSchema.safeParse(questionRow.questions)
    if (!payload.success) {
      const coerced = coerceQuestionsPayload(questionRow.questions)
      if (coerced) {
        payload = QuestionsPayloadSchema.safeParse(coerced)
      }
    }
    if (!payload.success) {
      return NextResponse.json(
        { error: "Clarification questions are invalid. Please start a rerun without clarification and try again." },
        { status: 400 },
      )
    }

    const merged = structuredClone(normalizedResult.data) as Record<string, unknown>
    for (const question of payload.data.questions) {
      const answer = body.answers[question.id]
      if (answer === undefined) continue
      applyByPath(merged, question.fieldPath, answer)
    }

    const nextNormalized = NormalizedBriefSchema.parse(merged)
    const admin = createAdminClient()

    const { error: saveAnswersError } = await admin
      .from("brief_questions")
      .update({ answers: body.answers })
      .eq("id", questionRow.id)
    if (saveAnswersError) {
      return NextResponse.json({ error: saveAnswersError.message }, { status: 500 })
    }

    const { error: briefUpdateError } = await admin
      .from("briefs")
      .update({
        normalized_brief: nextNormalized,
        status: "draft",
      })
      .eq("id", body.brief_id)
    if (briefUpdateError) {
      return NextResponse.json({ error: briefUpdateError.message }, { status: 500 })
    }

    const runId = randomUUID()
    const { error: runError } = await admin.from("runs").insert({
      id: runId,
      brief_id: body.brief_id,
      status: "running",
      notes: [],
      started_at: new Date().toISOString(),
    })
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

    const { error: statusError } = await admin
      .from("briefs")
      .update({ status: "running" })
      .eq("id", body.brief_id)
    if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

    const briefId = body.brief_id
    after(() => runPipeline(briefId, runId))

    return NextResponse.json({ run_id: runId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit clarifications."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
