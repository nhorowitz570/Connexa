import { redirect } from "next/navigation"

import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/topbar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <div className="relative h-screen w-full bg-[#0D1117] text-white overflow-hidden">
      <Header email={profile?.email ?? user.email ?? "user"} fullName={profile?.full_name ?? null} />

      {/* Main Scrollable Area */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <main className="flex gap-6 p-6 pt-24 min-h-full">
          <Sidebar />

          {/* Main Content Container */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
