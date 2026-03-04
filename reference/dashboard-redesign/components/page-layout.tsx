"use client"

import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

interface PageLayoutProps {
  children: React.ReactNode
  activePage?: string
}

export function PageLayout({ children, activePage }: PageLayoutProps) {
  return (
    <div className="relative h-screen w-full bg-[#0D1117] text-white overflow-hidden">
      <Header />

      {/* Main Scrollable Area */}
      <div className="h-full overflow-y-auto no-scrollbar">
        <main className="flex gap-6 p-6 pt-24 min-h-full">
          <Sidebar activePage={activePage} />

          {/* Main Content Container */}
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
