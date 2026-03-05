import { NextResponse } from "next/server"

import { FEATURES } from "@/lib/feature-flags"
import { createClient } from "@/lib/supabase/server"
import type { ConnectedAccounts } from "@/types"

type ConnectionPlatform = "google" | "fiverr" | "upwork"

type ConnectionInput = {
  platform?: ConnectionPlatform
  email?: string
  username?: string
  scopes?: string[]
}

function normalizeConnectedAccounts(raw: unknown): ConnectedAccounts {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const source = raw as Record<string, unknown>

  const normalizeAccount = (value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
    const account = value as Record<string, unknown>
    return {
      connected: Boolean(account.connected),
      email: typeof account.email === "string" ? account.email : null,
      username: typeof account.username === "string" ? account.username : null,
      connected_at: typeof account.connected_at === "string" ? account.connected_at : undefined,
      scopes: Array.isArray(account.scopes)
        ? account.scopes.filter((scope): scope is string => typeof scope === "string")
        : undefined,
      token_encrypted: typeof account.token_encrypted === "string" ? account.token_encrypted : undefined,
    }
  }

  return {
    google: normalizeAccount(source.google),
    fiverr: normalizeAccount(source.fiverr),
    upwork: normalizeAccount(source.upwork),
  }
}

function isPlatformEnabled(platform: Exclude<ConnectionPlatform, "google">): boolean {
  if (platform === "fiverr") return FEATURES.FIVERR_LINKING
  return FEATURES.UPWORK_LINKING
}

function resolveGoogleConnection(user: { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }> }) {
  const identities = Array.isArray(user.identities) ? user.identities : []
  const googleIdentity = identities.find((identity) => identity.provider === "google")
  return {
    connected: Boolean(googleIdentity),
    email:
      googleIdentity && typeof googleIdentity.identity_data?.email === "string"
        ? googleIdentity.identity_data.email
        : null,
  }
}

function buildAccounts(user: { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }> }, stored: ConnectedAccounts) {
  const google = resolveGoogleConnection(user)

  return {
    google: {
      connected: google.connected,
      email: google.email,
      available: true,
    },
    fiverr: {
      connected: stored.fiverr?.connected ?? false,
      username: stored.fiverr?.username ?? null,
      email: stored.fiverr?.email ?? null,
      connected_at: stored.fiverr?.connected_at,
      available: FEATURES.FIVERR_LINKING,
    },
    upwork: {
      connected: stored.upwork?.connected ?? false,
      username: stored.upwork?.username ?? null,
      email: stored.upwork?.email ?? null,
      connected_at: stored.upwork?.connected_at,
      available: FEATURES.UPWORK_LINKING,
    },
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("connected_accounts")
      .eq("id", user.id)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const stored = normalizeConnectedAccounts(profile?.connected_accounts)
    const accounts = buildAccounts(user, stored)
    return NextResponse.json({ data: { accounts } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load account connections"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as ConnectionInput
    if (!body.platform) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 })
    }

    if (body.platform === "google") {
      return NextResponse.json(
        { error: "Google connection is managed by your login provider." },
        { status: 400 },
      )
    }

    if (!isPlatformEnabled(body.platform)) {
      return NextResponse.json({ error: `${body.platform} connection is not enabled yet.` }, { status: 403 })
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("connected_accounts")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const stored = normalizeConnectedAccounts(profile?.connected_accounts)
    const next: ConnectedAccounts = {
      ...stored,
      [body.platform]: {
        ...(stored[body.platform] ?? { connected: false }),
        connected: true,
        email: typeof body.email === "string" ? body.email.trim() : stored[body.platform]?.email ?? null,
        username:
          typeof body.username === "string"
            ? body.username.trim()
            : stored[body.platform]?.username ?? null,
        scopes: Array.isArray(body.scopes)
          ? body.scopes.filter((scope): scope is string => typeof scope === "string")
          : stored[body.platform]?.scopes,
        connected_at: new Date().toISOString(),
      },
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ connected_accounts: next })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const accounts = buildAccounts(user, next)
    return NextResponse.json({ data: { accounts } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to connect account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const url = new URL(request.url)
    const platform = url.searchParams.get("platform") as ConnectionPlatform | null
    if (!platform) {
      return NextResponse.json({ error: "platform is required" }, { status: 400 })
    }

    if (platform === "google") {
      return NextResponse.json(
        { error: "Google is managed by your authentication provider." },
        { status: 400 },
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("connected_accounts")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const stored = normalizeConnectedAccounts(profile?.connected_accounts)
    const next: ConnectedAccounts = {
      ...stored,
      [platform]: {
        ...(stored[platform] ?? { connected: false }),
        connected: false,
        token_encrypted: undefined,
      },
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ connected_accounts: next })
      .eq("id", user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    const accounts = buildAccounts(user, next)
    return NextResponse.json({ data: { accounts } })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to disconnect account"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
