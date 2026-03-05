import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function sanitizeSearchTerm(input: string) {
  return input.replace(/[%_,]/g, " ").trim().split(/\s+/).join("%")
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const query = (url.searchParams.get("q") ?? "").trim()
    if (query.length === 0) {
      return NextResponse.json({ data: { briefs: [] } })
    }

    let briefsQuery = supabase
      .from("briefs")
      .select("id, name, status, normalized_brief, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(6)

    if (UUID_PATTERN.test(query)) {
      briefsQuery = briefsQuery.eq("id", query)
    } else {
      const safeTerm = sanitizeSearchTerm(query)
      if (safeTerm.length > 0) {
        const pattern = `%${safeTerm}%`
        briefsQuery = briefsQuery.or(
          `name.ilike.${pattern},raw_prompt.ilike.${pattern},normalized_brief->>service_type.ilike.${pattern}`,
        )
      }
    }

    const { data: briefsRaw, error } = await briefsQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const briefs = (briefsRaw ?? []).map((brief) => {
      const serviceType =
        brief.normalized_brief && typeof brief.normalized_brief === "object" && "service_type" in brief.normalized_brief
          ? String((brief.normalized_brief as { service_type?: unknown }).service_type ?? "Untitled brief")
          : "Untitled brief"

      return {
        id: brief.id,
        name: brief.name,
        status: brief.status,
        service_type: serviceType,
      }
    })

    return NextResponse.json({ data: { briefs } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to search"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
