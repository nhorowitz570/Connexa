import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const days = Math.min(Number(searchParams.get("days") ?? "30"), 365)
    const since = new Date()
    since.setDate(since.getDate() - days + 1)
    const sinceISO = since.toISOString()

    const { data: briefs } = await supabase
        .from("briefs")
        .select("created_at")
        .eq("user_id", user.id)
        .gte("created_at", sinceISO)
        .order("created_at", { ascending: true })

    // Bucket by date
    const buckets = new Map<string, number>()
    for (let d = 0; d < days; d++) {
        const date = new Date(since)
        date.setDate(since.getDate() + d)
        const key = date.toISOString().slice(0, 10)
        buckets.set(key, 0)
    }

    for (const brief of briefs ?? []) {
        const key = brief.created_at.slice(0, 10)
        buckets.set(key, (buckets.get(key) ?? 0) + 1)
    }

    const data = Array.from(buckets.entries()).map(([date, runs]) => {
        const d = new Date(date)
        return {
            date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
            runs,
        }
    })

    return NextResponse.json({ data })
}
