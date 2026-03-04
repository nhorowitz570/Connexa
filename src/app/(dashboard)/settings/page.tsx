import { AccountSettingsForm } from "@/components/settings/account-settings-form"
import { createClient } from "@/lib/supabase/server"

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage profile details and account lifecycle.</p>
      </div>
      <AccountSettingsForm userId={user.id} initialFullName={profile?.full_name ?? ""} />
    </section>
  )
}
