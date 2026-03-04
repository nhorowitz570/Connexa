import { randomUUID } from "node:crypto"

import { NextResponse } from "next/server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const MAX_FILE_SIZE = 10 * 1024 * 1024

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
])

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-")
}

function extensionAllowed(name: string) {
  const lower = name.toLowerCase()
  return [".pdf", ".doc", ".docx", ".txt", ".csv", ".png", ".jpg", ".jpeg"].some((ext) =>
    lower.endsWith(ext),
  )
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
    const objectPath = `${user.id}/${Date.now()}-${randomUUID()}-${safeName}`

    const bytes = await file.arrayBuffer()
    const admin = createAdminClient()

    const { error: uploadError } = await admin.storage
      .from("chat-attachments")
      .upload(objectPath, bytes, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: signed } = await admin.storage
      .from("chat-attachments")
      .createSignedUrl(objectPath, 60 * 60 * 24 * 7)

    let textContent: string | null = null
    const typeLower = file.type.toLowerCase()
    if (typeLower === "text/plain" || typeLower === "text/csv" || file.name.toLowerCase().endsWith(".txt") || file.name.toLowerCase().endsWith(".csv")) {
      textContent = (await file.text()).slice(0, 5000)
    }

    return NextResponse.json({
      data: {
        name: file.name,
        type: file.type,
        size: file.size,
        path: objectPath,
        url: signed?.signedUrl ?? null,
        text_content: textContent,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload file."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
