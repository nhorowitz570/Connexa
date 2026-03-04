import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  context: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await context.params
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("runs")
      .select("status, confidence_overall, notes, tavily_queries")
      .eq("id", runId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 })
    }

    return NextResponse.json({
      status: data.status,
      confidence_overall: data.confidence_overall,
      notes: data.notes ?? [],
      tavily_queries: Array.isArray(data.tavily_queries) ? data.tavily_queries : [],
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch run status."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
