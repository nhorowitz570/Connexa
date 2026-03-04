"use client"

import Link from 'next/link'
import { ConnexaLogo } from "@/components/connexa-logo"
import { Settings2, LogOut, User, Search, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function Header() {
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
          href="/new-brief"
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Brief</span>
        </Link>
        
        {/* User Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex items-center justify-center">
              <span className="text-white text-sm font-medium">JD</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-[#0D0D0D] border-[#1F1F1F] text-white">
            <DropdownMenuItem className="focus:bg-[#1F1F1F] focus:text-white cursor-pointer text-[#919191]">
              <User className="mr-2 h-4 w-4 text-[#919191]" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#1F1F1F] focus:text-white cursor-pointer text-[#919191]">
              <Settings2 className="mr-2 h-4 w-4 text-[#919191]" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="focus:bg-[#1F1F1F] focus:text-white cursor-pointer text-[#919191]">
              <LogOut className="mr-2 h-4 w-4 text-[#919191]" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
