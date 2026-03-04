import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { runPipeline } from "@/lib/pipeline/orchestrator"
import { NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type ClarificationSubmitInput = {
  brief_id?: string
  answers?: Record<string, unknown>
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (questionError || !questionRow) {
      return NextResponse.json({ error: "No clarification questions found." }, { status: 400 })
    }

    const payload = QuestionsPayloadSchema.safeParse(questionRow.questions)
    if (!payload.success) {
      return NextResponse.json({ error: "Clarification questions are invalid." }, { status: 400 })
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
    })
    if (runError) return NextResponse.json({ error: runError.message }, { status: 500 })

    const { error: statusError } = await admin
      .from("briefs")
      .update({ status: "running" })
      .eq("id", body.brief_id)
    if (statusError) return NextResponse.json({ error: statusError.message }, { status: 500 })

    void runPipeline(body.brief_id, runId)

    return NextResponse.json({ run_id: runId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit clarifications."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
