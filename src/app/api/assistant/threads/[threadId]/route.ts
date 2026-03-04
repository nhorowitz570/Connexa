import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ threadId: string }> },
) {
  try {
    const { threadId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: thread, error: threadError } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (threadError || !thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 })
    }

    const { error: messageDeleteError } = await supabase
      .from("chat_messages")
      .delete()
      .eq("thread_id", threadId)
    if (messageDeleteError) {
      return NextResponse.json({ error: messageDeleteError.message }, { status: 500 })
    }

    const { error: threadDeleteError } = await supabase
      .from("chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", user.id)
    if (threadDeleteError) {
      return NextResponse.json({ error: threadDeleteError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete thread."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
