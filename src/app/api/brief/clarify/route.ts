import { NextResponse } from "next/server"

import { MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { NormalizedBriefSchema, QuestionsPayloadSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/server"
import type { NormalizedBrief, QuestionsPayload } from "@/types"

type ClarifyInput = {
  normalized_brief?: unknown
  confidence?: number
  brief_id?: string
}

function normalizeOptions(options: unknown, fallback: string[] = []): string[] {
  const deduped = Array.isArray(options)
    ? [...new Set(options.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))]
    : []

  if (deduped.length >= 2) return deduped

  for (const option of fallback) {
    if (!deduped.includes(option)) deduped.push(option)
    if (deduped.length >= 2) break
  }
  return deduped
}

function fallbackClarifications(): QuestionsPayload {
  return {
    type: "connexa.clarifications.v1",
    questions: [
      {
        id: "priority_focus",
        prompt: "What is the most important selection criteria?",
        type: "multiple_choice",
        options: normalizeOptions(
          ["Specialized expertise", "Lower cost", "Faster timeline", "Industry experience"],
          ["Specialized expertise", "Lower cost"],
        ),
        allowOther: false,
        required: true,
        helpText: "We will bias rankings toward this priority.",
        fieldPath: "optional.priority_focus",
        priority: "high",
      },
      {
        id: "additional_context",
        prompt: "Any additional context we should factor in?",
        type: "text",
        allowOther: false,
        required: false,
        helpText: "Optional details like preferred tools, team size, or compliance constraints.",
        fieldPath: "optional.additional_context",
        priority: "medium",
        validation: {
          maxLength: 500,
        },
      },
    ],
  }
}

function normalizeQuestionPayload(payload: QuestionsPayload): QuestionsPayload {
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

async function generateClarificationsWithModel(
  normalized: NormalizedBrief,
  confidence: number,
): Promise<QuestionsPayload> {
  if (!process.env.OPENROUTER_API_KEY) {
    return fallbackClarifications()
  }

  try {
    const response = await callOpenRouter(
      [
        {
          role: "system",
          content: `You generate dynamic clarification questions for B2B sourcing briefs.
Return ONLY valid JSON matching:
{
  "type": "connexa.clarifications.v1",
  "questions": [
    {
      "id": "string",
      "prompt": "string",
      "type": "multiple_choice" | "text" | "select" | "number",
      "options": ["string"], 
      "allowOther": boolean,
      "required": boolean,
      "helpText": "optional string",
      "fieldPath": "dot.path",
      "priority": "high" | "medium" | "low",
      "validation": {
        "min": "optional number",
        "max": "optional number",
        "minLength": "optional number",
        "maxLength": "optional number",
        "pattern": "optional regex string"
      }
    }
  ]
}
Rules:
- Generate 1-5 questions only.
- Only ask questions that materially change provider search/ranking outcomes.
- Do not ask for data already clearly specified in the brief.
- Use "high" priority for blockers, "medium" for meaningful refinements, "low" for nice-to-have.
- For "multiple_choice" and "select", include at least 2 options.
- Use fieldPath values that map into normalized brief structure (timeline.*, geography.*, constraints, optional.*).`,
        },
        {
          role: "user",
          content: `Confidence score: ${confidence}\nNormalized brief:\n${JSON.stringify(normalized)}`,
        },
      ],
      {
        model: MODELS.CHEAP,
        response_format: { type: "json_object" },
      },
    )

    const parsed = QuestionsPayloadSchema.parse(JSON.parse(response))
    return normalizeQuestionPayload(parsed)
  } catch {
    return fallbackClarifications()
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClarifyInput
    if (!body.brief_id || !body.normalized_brief || typeof body.confidence !== "number") {
      return NextResponse.json(
        { error: "brief_id, normalized_brief and confidence are required." },
        { status: 400 },
      )
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const normalized = NormalizedBriefSchema.parse(body.normalized_brief)

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id, updated_at")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    const { data: cachedRow } = await supabase
      .from("brief_questions")
      .select("questions, created_at")
      .eq("brief_id", body.brief_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const briefUpdatedAt = new Date(brief.updated_at).getTime()
    const cachedCreatedAt =
      cachedRow?.created_at && typeof cachedRow.created_at === "string"
        ? new Date(cachedRow.created_at).getTime()
        : 0

    if (cachedRow && cachedCreatedAt >= briefUpdatedAt) {
      const cachedPayload = QuestionsPayloadSchema.safeParse(cachedRow.questions)
      if (cachedPayload.success) {
        await supabase.from("briefs").update({ status: "clarifying" }).eq("id", body.brief_id)
        return NextResponse.json(normalizeQuestionPayload(cachedPayload.data))
      }
    }

    const payload = await generateClarificationsWithModel(normalized, body.confidence)

    const { error: insertError } = await supabase.from("brief_questions").insert({
      brief_id: body.brief_id,
      questions: payload,
      confidence_before: body.confidence,
    })
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    const { error: updateError } = await supabase
      .from("briefs")
      .update({ status: "clarifying" })
      .eq("id", body.brief_id)
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(payload)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create clarifications."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
