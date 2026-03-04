"use client"

import Link from 'next/link'
import { LayoutGrid, FilePlus, Clock, ListOrdered, Settings2, HelpCircle, LogOut, BarChart3, MessageSquare } from 'lucide-react'

interface SidebarProps {
  activePage?: string
}

export function Sidebar({ activePage = 'dashboard' }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutGrid, href: '/' },
    { id: 'new-brief', label: 'NEW BRIEF', icon: FilePlus, href: '/new-brief' },
    { id: 'history', label: 'HISTORY', icon: Clock, href: '/history' },
    { id: 'results', label: 'RESULTS', icon: ListOrdered, href: '/results' },
    { id: 'analytics', label: 'ANALYTICS', icon: BarChart3, href: '/analytics' },
    { id: 'assistant', label: 'ASSISTANT', icon: MessageSquare, href: '/assistant' },
  ]

  const bottomItems = [
    { id: 'help', label: 'HELP', icon: HelpCircle, href: '#' },
    { id: 'settings', label: 'SETTINGS', icon: Settings2, href: '/settings' },
    { id: 'logout', label: 'LOGOUT', icon: LogOut, href: '#' },
  ]

  return (
    <aside className="sticky top-24 h-[calc(100vh-8rem)] md:w-48 lg:w-64 bg-[#161B22] rounded-2xl hidden md:flex flex-col p-8 overflow-y-auto border border-[#30363D]">
      <nav className="flex flex-col gap-6">
        {navItems.map((item) => (
          <Link 
            key={item.id}
            href={item.href}
            className={`flex items-center gap-4 transition-colors cursor-pointer ${
              activePage === item.id ? 'text-white' : 'text-[#919191] hover:text-white'
            }`}
          >
            <item.icon className={`h-5 w-5 ${activePage === item.id ? 'text-[#4F6EF7]' : ''}`} />
            <span className="text-sm font-medium tracking-wide">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-[#30363D] flex flex-col gap-6">
        {bottomItems.map((item) => (
          <Link 
            key={item.id}
            href={item.href}
            className={`flex items-center gap-4 transition-colors cursor-pointer ${
              activePage === item.id ? 'text-white' : 'text-[#919191] hover:text-white'
            }`}
          >
            <item.icon className={`h-5 w-5 ${activePage === item.id ? 'text-[#4F6EF7]' : ''}`} />
            <span className="text-sm font-medium tracking-wide">{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  )
}
