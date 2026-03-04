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

function fallbackClarifications(brief: NormalizedBrief): QuestionsPayload {
  const questions: QuestionsPayload["questions"] = []

  questions.push({
    id: "budget_preference",
    prompt: "Which budget range best matches this project?",
    type: "multiple_choice",
    options: ["$5k-$15k", "$15k-$50k", "$50k-$100k", "$100k+"],
    allowOther: false,
    required: true,
    helpText: "Choose your ideal monthly or project budget band.",
    fieldPath: "optional.budget_preference",
  })

  questions.push({
    id: "timeline",
    prompt: "What implementation timeline should we optimize for?",
    type: "multiple_choice",
    options: ["2-4 weeks", "1-3 months", "3-6 months", "6+ months"],
    allowOther: true,
    required: true,
    fieldPath: "timeline.duration",
  })

  questions.push({
    id: "geo_scope",
    prompt: "What provider location preference should we apply?",
    type: "multiple_choice",
    options: [brief.geography.region, "United States", "North America", "Europe", "Global"],
    allowOther: true,
    required: false,
    fieldPath: "geography.region",
  })

  questions.push({
    id: "priority_focus",
    prompt: "Which selection priority matters most right now?",
    type: "multiple_choice",
    options: ["Specialized expertise", "Lower cost", "Faster timeline", "Industry experience"],
    allowOther: true,
    required: false,
    fieldPath: "optional.priority_focus",
  })

  const dedupedQuestions = questions.map((question) => ({
    ...question,
    options: Array.from(new Set(question.options.filter(Boolean))),
  }))

  return {
    type: "connexa.clarifications.v1",
    questions: dedupedQuestions.slice(0, 3),
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
      .select("id")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    let payload = fallbackClarifications(normalized)
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await callOpenRouter(
          [
            {
              role: "system",
              content: `Generate 1-3 targeted clarification questions for a B2B sourcing brief.
Return ONLY JSON with this exact schema:
{
  "type": "connexa.clarifications.v1",
  "questions": [
    {
      "id": "string",
      "prompt": "string",
      "type": "multiple_choice",
      "options": ["option A", "option B"],
      "allowOther": boolean,
      "required": boolean,
      "helpText": "optional string",
      "fieldPath": "dot.path.into.normalized_brief"
    }
  ]
}
Rules:
- Every question type MUST be "multiple_choice".
- Each options array MUST include at least 2 distinct options.
- Prefer fieldPath values that write to timeline.duration, geography.region, optional.*, or similar scalar paths.
- Keep questions concise and action-oriented.
- Ask questions when confidence < 0.85 or when constraints are empty, budget is very wide, or geography is global.`,
            },
            {
              role: "user",
              content: `Confidence: ${body.confidence}\nBrief: ${JSON.stringify(normalized)}`,
            },
          ],
          {
            model: MODELS.CHEAP,
            response_format: { type: "json_object" },
          },
        )

        payload = QuestionsPayloadSchema.parse(JSON.parse(response))
      } catch {
        // Keep fallback payload.
      }
    }

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
