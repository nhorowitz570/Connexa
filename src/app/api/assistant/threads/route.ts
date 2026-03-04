import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type CreateThreadInput = {
  title?: string
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const url = new URL(request.url)
    const requestedThreadId = url.searchParams.get("thread_id")

    const { data: threadsRaw, error: threadsError } = await supabase
      .from("chat_threads")
      .select("id, title, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50)

    if (threadsError) {
      return NextResponse.json({ error: threadsError.message }, { status: 500 })
    }

    const threads = threadsRaw ?? []
    const hasRequested = requestedThreadId
      ? threads.some((thread) => thread.id === requestedThreadId)
      : false
    const activeThreadId = hasRequested ? requestedThreadId : threads[0]?.id ?? null

    const { data: messagesRaw, error: messagesError } = activeThreadId
      ? await supabase
          .from("chat_messages")
          .select("id, role, content, attachments, brief_refs, created_at")
          .eq("thread_id", activeThreadId)
          .order("created_at", { ascending: true })
          .limit(200)
      : { data: [], error: null }

    if (messagesError) {
      return NextResponse.json({ error: messagesError.message }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        threads,
        messages: messagesRaw ?? [],
        active_thread_id: activeThreadId,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch assistant threads."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as CreateThreadInput
    const title = body.title?.trim() || "New Chat"

    const { data: thread, error } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.id,
        title,
      })
      .select("id, title, created_at, updated_at")
      .single()

    if (error || !thread) {
      return NextResponse.json({ error: error?.message ?? "Unable to create thread." }, { status: 500 })
    }

    return NextResponse.json({ data: thread })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create thread."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
