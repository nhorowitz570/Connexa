import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_ATTACHMENTS_PER_BRIEF = 10
const BRIEF_ATTACHMENTS_BUCKET = "brief-attachments"

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
])

type DeleteAttachmentInput = {
  attachment_id?: string
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function extensionAllowed(name: string) {
  const lower = name.toLowerCase()
  return [".pdf", ".doc", ".docx", ".txt", ".csv", ".png", ".jpg", ".jpeg"].some((ext) =>
    lower.endsWith(ext),
  )
}

async function assertBriefOwnership(briefId: string, userId: string) {
  const supabase = await createClient()
  const { data: brief, error } = await supabase
    .from("briefs")
    .select("id, mode")
    .eq("id", briefId)
    .eq("user_id", userId)
    .maybeSingle()

  if (error || !brief) {
    throw new Error("Brief not found.")
  }

  return brief
}

export async function GET(
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await assertBriefOwnership(briefId, user.id)

    const { data: attachments, error: attachmentsError } = await supabase
      .from("brief_attachments")
      .select("id, file_name, file_type, file_size, storage_path, created_at")
      .eq("brief_id", briefId)
      .order("created_at", { ascending: false })

    if (attachmentsError) {
      return NextResponse.json({ error: attachmentsError.message }, { status: 500 })
    }

    const admin = createAdminClient()
    const items = await Promise.all(
      (attachments ?? []).map(async (attachment) => {
        const { data: signed } = await admin.storage
          .from(BRIEF_ATTACHMENTS_BUCKET)
          .createSignedUrl(attachment.storage_path, 60 * 60 * 24 * 7)

        return {
          id: attachment.id,
          name: attachment.file_name,
          type: attachment.file_type,
          size: attachment.file_size,
          path: attachment.storage_path,
          url: signed?.signedUrl ?? null,
          created_at: attachment.created_at,
        }
      }),
    )

    return NextResponse.json({ data: { attachments: items } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list brief attachments."
    if (message === "Brief not found.") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
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
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const brief = await assertBriefOwnership(briefId, user.id)
    if (brief.mode !== "detailed") {
      return NextResponse.json({ error: "Attachments are only available for detailed briefs." }, { status: 400 })
    }

    const { count: attachmentCount } = await supabase
      .from("brief_attachments")
      .select("id", { count: "exact", head: true })
      .eq("brief_id", briefId)

    if ((attachmentCount ?? 0) >= MAX_ATTACHMENTS_PER_BRIEF) {
      return NextResponse.json(
        { error: `Maximum ${MAX_ATTACHMENTS_PER_BRIEF} attachments per brief.` },
        { status: 400 },
      )
    }

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit." }, { status: 400 })
    }

    if (!ALLOWED_TYPES.has(file.type) && !extensionAllowed(file.name)) {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 400 })
    }

    const safeName = sanitizeName(file.name)
    const objectPath = `${user.id}/${briefId}/${Date.now()}-${randomUUID()}-${safeName}`
    const bytes = await file.arrayBuffer()
    const admin = createAdminClient()

    const { error: uploadError } = await admin.storage
      .from(BRIEF_ATTACHMENTS_BUCKET)
      .upload(objectPath, bytes, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    let textContent: string | null = null
    const typeLower = file.type.toLowerCase()
    if (
      typeLower === "text/plain" ||
      typeLower === "text/csv" ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.name.toLowerCase().endsWith(".csv")
    ) {
      textContent = (await file.text()).slice(0, 10_000)
    }

    const { data: inserted, error: insertError } = await supabase
      .from("brief_attachments")
      .insert({
        brief_id: briefId,
        user_id: user.id,
        file_name: file.name,
        file_type: file.type || "application/octet-stream",
        file_size: file.size,
        storage_path: objectPath,
        text_content: textContent,
      })
      .select("id, file_name, file_type, file_size, storage_path, created_at")
      .single()

    if (insertError || !inserted) {
      await admin.storage.from(BRIEF_ATTACHMENTS_BUCKET).remove([objectPath])
      return NextResponse.json({ error: insertError?.message ?? "Failed to save attachment." }, { status: 500 })
    }

    const { data: signed } = await admin.storage
      .from(BRIEF_ATTACHMENTS_BUCKET)
      .createSignedUrl(objectPath, 60 * 60 * 24 * 7)

    return NextResponse.json({
      data: {
        attachment: {
          id: inserted.id,
          name: inserted.file_name,
          type: inserted.file_type,
          size: inserted.file_size,
          path: inserted.storage_path,
          url: signed?.signedUrl ?? null,
          created_at: inserted.created_at,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload attachment."
    if (message === "Brief not found.") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ briefId: string }> },
) {
  try {
    const { briefId } = await context.params
    if (!briefId) {
      return NextResponse.json({ error: "briefId is required." }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as DeleteAttachmentInput
    if (!body.attachment_id) {
      return NextResponse.json({ error: "attachment_id is required." }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    await assertBriefOwnership(briefId, user.id)

    const { data: attachment, error: attachmentError } = await supabase
      .from("brief_attachments")
      .select("id, storage_path")
      .eq("id", body.attachment_id)
      .eq("brief_id", briefId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (attachmentError || !attachment) {
      return NextResponse.json({ error: "Attachment not found." }, { status: 404 })
    }

    const admin = createAdminClient()
    await admin.storage.from(BRIEF_ATTACHMENTS_BUCKET).remove([attachment.storage_path])

    const { error: deleteError } = await supabase
      .from("brief_attachments")
      .delete()
      .eq("id", attachment.id)
      .eq("user_id", user.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete attachment."
    if (message === "Brief not found.") {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
