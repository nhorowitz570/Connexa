import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

type CancelInput = {
  brief_id?: string
}

const TERMINAL_BRIEF_STATUSES = new Set(["complete", "error", "cancelled"])
const TERMINAL_RUN_STATUSES = new Set(["complete", "error", "cancelled"])

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CancelInput
    if (!body.brief_id) {
      return NextResponse.json({ error: "brief_id is required." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: brief, error: briefError } = await supabase
      .from("briefs")
      .select("id, status")
      .eq("id", body.brief_id)
      .eq("user_id", user.id)
      .single()

    if (briefError || !brief) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    if (TERMINAL_BRIEF_STATUSES.has(brief.status)) {
      return NextResponse.json({ cancelled: false, status: brief.status })
    }

    const admin = createAdminClient()
    const { data: latestRun } = await admin
      .from("runs")
      .select("id, status, notes")
      .eq("brief_id", body.brief_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestRun && !TERMINAL_RUN_STATUSES.has(latestRun.status)) {
      const notes = Array.isArray(latestRun.notes)
        ? latestRun.notes.filter((note): note is string => typeof note === "string")
        : []

      if (!notes.includes("Pipeline cancelled by user.")) {
        notes.push("Pipeline cancelled by user.")
      }

      const { error: runUpdateError } = await admin
        .from("runs")
        .update({
          status: "cancelled",
          notes,
          completed_at: new Date().toISOString(),
        })
        .eq("id", latestRun.id)

      if (runUpdateError) {
        return NextResponse.json({ error: runUpdateError.message }, { status: 500 })
      }
    }

    const { error: briefUpdateError } = await admin
      .from("briefs")
      .update({ status: "cancelled" })
      .eq("id", body.brief_id)

    if (briefUpdateError) {
      return NextResponse.json({ error: briefUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ cancelled: true, status: "cancelled" })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel brief."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
