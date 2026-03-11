"use client"

import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { useState } from "react"

import { AnimatedBackground } from "@/components/animated-background"
import { Header } from "@/components/dashboard/header"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Sheet, SheetContent } from "@/components/ui/sheet"

type DashboardShellProps = {
  children: ReactNode
  email: string
  fullName: string | null
}

export function DashboardShell({ children, email, fullName }: DashboardShellProps) {
  const pathname = usePathname()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <div className="relative h-dvh overflow-hidden bg-background text-foreground">
      <AnimatedBackground />

      <Header email={email} fullName={fullName} onOpenMobileNav={() => setMobileNavOpen(true)} />

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[300px] border-r border-border bg-background/95 p-4 backdrop-blur-2xl">
          <Sidebar className="h-full w-full" onNavigate={() => setMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex h-full min-h-0 flex-col pt-24">
        <div className="flex min-h-0 flex-1 gap-4 px-3 pb-4 sm:px-5 lg:gap-6 lg:px-6">
          <div className="hidden shrink-0 md:block">
            <Sidebar className="h-full w-52 lg:w-64" />
          </div>

          <main className="min-w-0 flex-1 overflow-y-auto pr-1 no-scrollbar">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: "easeOut" }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  )
}
