"use client"

import { motion } from "framer-motion"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import { LayoutGrid, FilePlus, Clock, BarChart3, MessageSquare, HelpCircle, Settings2, LogOut } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type SidebarProps = {
  className?: string
  onNavigate?: () => void
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/" },
  { id: "new-brief", label: "New Brief", icon: FilePlus, href: "/brief/new" },
  { id: "history", label: "History", icon: Clock, href: "/history" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/analytics" },
  { id: "assistant", label: "Assistant", icon: MessageSquare, href: "/assistant" },
]

const bottomItems = [
  {
    id: "help",
    label: "Help",
    icon: HelpCircle,
    href: "mailto:feedback@connexa.com?subject=Connexa%20Dashboard%20Feedback",
  },
  { id: "settings", label: "Settings", icon: Settings2, href: "/settings" },
]

function isActive(pathname: string, href: string, id: string) {
  if (id === "dashboard") return pathname === "/"
  if (id === "new-brief") return pathname.startsWith("/brief")
  return pathname.startsWith(href)
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
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
    onNavigate?.()
  }

  return (
    <aside
      className={cn(
        "glass-card flex flex-col overflow-y-auto rounded-2xl border border-border p-4 no-scrollbar",
        className,
      )}
    >
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.id)
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-11 items-center gap-3 overflow-hidden rounded-xl px-3 text-sm transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {active ? (
                <motion.span
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-y-1 left-0 w-1 rounded-full bg-indigo-400"
                  transition={{ type: "spring", stiffness: 420, damping: 36 }}
                />
              ) : null}
              <span className={cn("absolute inset-0 -z-10 rounded-xl", active && "bg-indigo-500/16 shadow-[0_0_0_1px_rgba(99,102,241,0.45)]")} />
              <item.icon className={cn("h-4 w-4", active ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-4">
        {bottomItems.map((item) => {
          const active = isActive(pathname, item.href, item.id)
          const classes = cn(
            "group relative flex h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors",
            active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )

          if (item.id === "help") {
            return (
              <a
                key={item.id}
                href={item.href}
                className={classes}
                onClick={onNavigate}
              >
                <item.icon className={cn("h-4 w-4", active ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="font-medium">{item.label}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </a>
            )
          }

          return (
            <Link
              key={item.id}
              href={item.href}
              className={classes}
              onClick={onNavigate}
            >
              <item.icon className={cn("h-4 w-4", active ? "text-indigo-400" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="font-medium">{item.label}</span>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          )
        })}

        <button
          type="button"
          onClick={handleLogout}
          className="group flex h-11 items-center gap-3 rounded-xl px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Log out</span>
          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
        </button>
      </div>
    </aside>
  )
}
