import { notFound } from "next/navigation"

import { PrintTrigger } from "@/components/export/print-trigger"
import { createClient } from "@/lib/supabase/server"

export default async function ExportThreadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: thread } = await supabase
    .from("chat_threads")
    .select("id, title, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!thread) notFound()

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("id, role, content, attachments, brief_refs, created_at")
    .eq("thread_id", thread.id)
    .order("created_at", { ascending: true })
    .limit(500)

  return (
    <div className="export-print-root mx-auto max-w-4xl space-y-6 bg-white p-8 text-black">
      <PrintTrigger />
      <div className="no-print rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Print dialog should open automatically. If it does not, use your browser&apos;s Print command.
      </div>

      <header className="space-y-2 border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold">Connexa Conversation Export</h1>
        <p className="text-sm text-slate-600">{thread.title}</p>
        <p className="text-xs text-slate-500">Thread ID: {thread.id}</p>
      </header>

      <section className="space-y-2 text-sm">
        <p>Created: {new Date(thread.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(thread.updated_at).toLocaleString()}</p>
        <p>Messages: {messages?.length ?? 0}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Messages</h2>
        {messages && messages.length > 0 ? (
          messages.map((message) => {
            const briefRefs = Array.isArray(message.brief_refs)
              ? message.brief_refs.filter((item): item is string => typeof item === "string")
              : []
            const attachments = Array.isArray(message.attachments)
              ? message.attachments.filter(
                  (item): item is { name?: unknown; url?: unknown } =>
                    item !== null && typeof item === "object",
                )
              : []

            return (
              <article key={message.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span className="font-medium uppercase">{message.role}</span>
                  <span>{new Date(message.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">{message.content}</p>

                {briefRefs.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-600">Brief refs: {briefRefs.join(", ")}</p>
                ) : null}

                {attachments.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-700">
                    {attachments.map((attachment, index) => {
                      const name = typeof attachment.name === "string" ? attachment.name : "attachment"
                      const url = typeof attachment.url === "string" ? attachment.url : null
                      return (
                        <li key={`${name}-${index}`}>
                          {name}
                          {url ? ` (${url})` : ""}
                        </li>
                      )
                    })}
                  </ul>
                ) : null}
              </article>
            )
          })
        ) : (
          <p className="text-sm text-slate-600">No messages found.</p>
        )}
      </section>
    </div>
  )
}
