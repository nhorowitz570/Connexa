import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ briefId: string }> },
) {
  try {
    const { briefId } = await context.params
    if (!briefId) {
      return NextResponse.json({ error: "briefId is required." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("briefs")
      .delete()
      .eq("id", briefId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: "Brief not found." }, { status: 404 })
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete brief."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
