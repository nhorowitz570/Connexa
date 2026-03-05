"use client"

import { cn } from "@/lib/utils"

export type SettingsSectionId =
  | "profile"
  | "ai-preferences"
  | "appearance"
  | "plan"
  | "connected-accounts"
  | "danger-zone"

export type SettingsNavItem = {
  id: SettingsSectionId
  label: string
  description: string
}

type SettingsNavProps = {
  items: SettingsNavItem[]
  activeSection: SettingsSectionId
  onSelect: (section: SettingsSectionId) => void
}

export function SettingsNav({ items, activeSection, onSelect }: SettingsNavProps) {
  return (
    <nav className="glass-card rounded-2xl border border-white/10 p-2 md:p-3">
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
        {items.map((item) => {
          const active = item.id === activeSection
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "min-h-11 min-w-max rounded-xl border px-3 py-2 text-left transition-colors md:min-w-0",
                active
                  ? "border-indigo-400/45 bg-indigo-500/15 text-white"
                  : "border-transparent text-[#9ca3b4] hover:border-white/10 hover:bg-white/5 hover:text-white",
              )}
            >
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-xs text-[#7f8aa3] md:block">{item.description}</p>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
