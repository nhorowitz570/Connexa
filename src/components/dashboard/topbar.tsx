"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ConnexaLogo } from "@/components/connexa-logo"
import { LogOut, Search, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type HeaderProps = {
  email: string
  fullName: string | null
}

export function Header({ email, fullName }: HeaderProps) {
  const router = useRouter()

  const initials =
    fullName
      ?.split(" ")
      .map((name) => name[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? email.slice(0, 2).toUpperCase()

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success("Logged out.")
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-6 bg-black/10 backdrop-blur-[120px]">
      <Link href="/">
        <ConnexaLogo className="h-8 w-auto" />
      </Link>

      <div className="flex items-center gap-4">
        {/* Global Search */}
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#1A1A1A] rounded-lg border border-[#333] hover:border-[#444] transition-colors">
          <Search className="h-4 w-4 text-[#919191]" />
          <input
            type="text"
            placeholder="Search briefs..."
            className="bg-transparent text-sm text-white placeholder-[#919191] focus:outline-none w-40 lg:w-56"
          />
        </div>

        {/* New Brief Button */}
        <Link
          href="/brief/new"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Brief</span>
        </Link>

        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center">
          <span className="text-white text-sm font-medium">{initials}</span>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#333] text-[#919191] transition-colors hover:text-white md:hidden"
          aria-label="Log out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  )
}

// Keep backwards-compatible export name for the layout import
export { Header as Topbar }
