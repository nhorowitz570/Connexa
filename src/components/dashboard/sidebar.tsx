"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutGrid, FilePlus, Clock, BarChart3, MessageSquare, HelpCircle, Settings2, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

const navItems = [
  { id: "dashboard", label: "DASHBOARD", icon: LayoutGrid, href: "/" },
  { id: "new-brief", label: "NEW BRIEF", icon: FilePlus, href: "/brief/new" },
  { id: "history", label: "HISTORY", icon: Clock, href: "/history" },
  { id: "analytics", label: "ANALYTICS", icon: BarChart3, href: "/analytics" },
  { id: "assistant", label: "ASSISTANT", icon: MessageSquare, href: "/assistant" },
]

const bottomItems = [
  {
    id: "help",
    label: "HELP",
    icon: HelpCircle,
    href: "mailto:feedback@connexa.com?subject=Connexa%20Dashboard%20Feedback",
  },
  { id: "settings", label: "SETTINGS", icon: Settings2, href: "/settings" },
]

function isActive(pathname: string, href: string, id: string) {
  if (id === "dashboard") return pathname === "/"
  if (id === "new-brief") return pathname.startsWith("/brief")
  return pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    if (!window.confirm("Are you sure you want to log out?")) return

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
    <aside className="sticky top-24 h-[calc(100vh-8rem)] md:w-48 lg:w-64 bg-[#161B22] rounded-2xl hidden md:flex flex-col p-8 overflow-y-auto no-scrollbar border border-[#30363D]">
      <nav className="flex flex-col gap-6">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.id)
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-4 transition-colors cursor-pointer ${active ? "text-white" : "text-[#919191] hover:text-white"
                }`}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-[#4F6EF7]" : ""}`} />
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#30363D] flex flex-col gap-6">
        {bottomItems.map((item) => {
          const active = isActive(pathname, item.href, item.id)
          const classes = `flex items-center gap-4 transition-colors cursor-pointer ${active ? "text-white" : "text-[#919191] hover:text-white"
            }`

          if (item.id === "help") {
            return (
              <a
                key={item.id}
                href={item.href}
                className={classes}
              >
                <item.icon className={`h-5 w-5 ${active ? "text-[#4F6EF7]" : ""}`} />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
              </a>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={classes}
            >
              <item.icon className={`h-5 w-5 ${active ? "text-[#4F6EF7]" : ""}`} />
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-4 transition-colors cursor-pointer text-[#919191] hover:text-white"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm font-medium tracking-wide">LOG OUT</span>
        </button>
      </div>
    </aside>
  )
}
