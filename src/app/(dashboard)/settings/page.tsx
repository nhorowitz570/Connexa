import { SettingsShell } from "@/components/settings/settings-shell"
import type { SettingsSectionId } from "@/components/settings/settings-nav"
import { createClient } from "@/lib/supabase/server"

const SETTINGS_SECTIONS = new Set<SettingsSectionId>([
  "profile",
  "ai-preferences",
  "appearance",
  "plan",
  "connected-accounts",
  "danger-zone",
])

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const params = await searchParams
  const sectionParam = params.section
  const initialSection: SettingsSectionId =
    sectionParam && SETTINGS_SECTIONS.has(sectionParam as SettingsSectionId)
      ? (sectionParam as SettingsSectionId)
      : "profile"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, theme_preference, ai_search_depth, ai_auto_clarify, connected_accounts, plan")
    .eq("id", user.id)
    .maybeSingle()

  const providers = Array.isArray(user.app_metadata?.providers)
    ? user.app_metadata.providers.filter((provider): provider is string => typeof provider === "string")
    : []
  const isGoogleConnected = providers.includes("google")

  const connectedAccounts =
    profile?.connected_accounts && typeof profile.connected_accounts === "object" && !Array.isArray(profile.connected_accounts)
      ? (profile.connected_accounts as {
          google?: { connected?: boolean; email?: string | null; available?: boolean }
          fiverr?: { connected?: boolean; email?: string | null; username?: string | null; available?: boolean }
          upwork?: { connected?: boolean; email?: string | null; username?: string | null; available?: boolean }
        })
      : {}

  return (
    <SettingsShell
      userId={user.id}
      email={profile?.email ?? user.email ?? ""}
      fullName={profile?.full_name ?? ""}
      themePreference={profile?.theme_preference === "light" ? "light" : "dark"}
      aiAutoClarify={profile?.ai_auto_clarify ?? true}
      connectedAccounts={connectedAccounts}
      plan={profile?.plan ?? "MAX"}
      isGoogleConnected={isGoogleConnected}
      googleEmail={isGoogleConnected ? user.email ?? null : null}
      initialSection={initialSection}
    />
  )
}
