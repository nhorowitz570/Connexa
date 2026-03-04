import { NextResponse } from "next/server"

import { MODELS } from "@/lib/constants"
import { callOpenRouter } from "@/lib/openrouter"
import { NormalizedBriefSchema } from "@/lib/schemas"
import { createClient } from "@/lib/supabase/server"
import type { NormalizedBrief } from "@/types"

type SummarizeInput = {
  brief_id?: string
  normalized_brief?: unknown
}

function fallbackSummary(brief: NormalizedBrief): string {
  const industries = brief.industry.join(", ")
  const budget = `${brief.budget_range.currency} ${brief.budget_range.min.toLocaleString("en-US")} - ${brief.budget_range.max.toLocaleString("en-US")}`
  const constraints =
    brief.constraints.length > 0
      ? `Key constraints include ${brief.constraints.slice(0, 3).join(", ")}.`
      : "No hard constraints were specified."

  return `This brief is looking for ${brief.service_type} support in ${industries}. The preferred geography is ${brief.geography.region} with ${brief.geography.remote_ok ? "remote collaboration allowed" : "on-site preference"}. Budget target is ${budget}. ${constraints}`
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SummarizeInput
    if (!body.brief_id) {
      return NextResponse.json({ error: "brief_id is required." }, { status: 400 })
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

    const parsedFromDb = NormalizedBriefSchema.safeParse(brief.normalized_brief)
    const parsedFromBody = body.normalized_brief
      ? NormalizedBriefSchema.safeParse(body.normalized_brief)
      : null
    const normalizedFromDb = parsedFromDb.success ? parsedFromDb.data : null
    const cachedFromDb =
      normalizedFromDb &&
      typeof normalizedFromDb.optional?.ai_summary === "string" &&
      normalizedFromDb.optional.ai_summary.trim().length > 0
        ? normalizedFromDb.optional.ai_summary.trim()
        : null
    if (cachedFromDb) {
      return NextResponse.json({ summary: cachedFromDb })
    }

    const normalized = parsedFromBody?.success ? parsedFromBody.data : normalizedFromDb

    if (!normalized) {
      return NextResponse.json({ error: "Invalid normalized_brief payload." }, { status: 400 })
    }

    let summary = fallbackSummary(normalized)
    if (process.env.OPENROUTER_API_KEY) {
      try {
        const response = await callOpenRouter(
          [
            {
              role: "system",
              content:
                "Summarize this B2B sourcing brief in 2-5 sentences for a business user. Use plain language and include scope, budget, geography, and constraints when available.",
            },
            {
              role: "user",
              content: JSON.stringify(normalized),
            },
          ],
          {
            model: MODELS.WEAK,
            temperature: 0.2,
            max_tokens: 220,
          },
        )

        if (response.trim().length > 0) {
          summary = response.trim()
        }
      } catch {
        // Keep fallback summary.
      }
    }

    const nextNormalized = {
      ...normalized,
      optional: {
        ...(normalized.optional ?? {}),
        ai_summary: summary,
      },
    }

    const { error: saveError } = await supabase
      .from("briefs")
      .update({ normalized_brief: nextNormalized })
      .eq("id", body.brief_id)
    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 })
    }

    return NextResponse.json({ summary })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to summarize brief."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
