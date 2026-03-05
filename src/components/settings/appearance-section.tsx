"use client"

import { Monitor, Moon, Palette, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type ThemePreference = "dark" | "light"

type AppearanceSectionProps = {
  userId: string
  initialThemePreference: ThemePreference
}

export function AppearanceSection({ userId, initialThemePreference }: AppearanceSectionProps) {
  const { setTheme } = useTheme()
  const [themePreference, setThemePreference] = useState<ThemePreference>(initialThemePreference)
  const [saving, setSaving] = useState(false)

  const saveThemePreference = async (nextTheme: ThemePreference) => {
    setThemePreference(nextTheme)
    setTheme(nextTheme)

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("profiles")
        .update({ theme_preference: nextTheme })
        .eq("id", userId)

      if (error) throw new Error(error.message)
      toast.success("Theme updated")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save theme")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass-card space-y-5 rounded-2xl border border-white/10 p-5">
      <div>
        <h2 className="text-xl font-semibold text-white">Appearance</h2>
        <p className="text-sm text-[#9ca3b4]">Choose your dashboard theme.</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => void saveThemePreference("dark")}
          disabled={saving}
          className={cn(
            "min-h-11 rounded-xl border px-3 py-2 text-left",
            themePreference === "dark"
              ? "border-indigo-400/40 bg-indigo-500/15 text-white"
              : "border-white/10 bg-black/20 text-[#9ca3b4] hover:text-white",
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Moon className="h-4 w-4" /> Dark
          </div>
          <p className="text-xs">Best for low-light work sessions</p>
        </button>

        <button
          type="button"
          onClick={() => void saveThemePreference("light")}
          disabled={saving}
          className={cn(
            "min-h-11 rounded-xl border px-3 py-2 text-left",
            themePreference === "light"
              ? "border-indigo-400/40 bg-indigo-500/15 text-white"
              : "border-white/10 bg-black/20 text-[#9ca3b4] hover:text-white",
          )}
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-medium">
            <Sun className="h-4 w-4" /> Light
          </div>
          <p className="text-xs">High contrast for daytime work</p>
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
          <Palette className="h-4 w-4 text-indigo-300" /> Accent color
        </div>
        <p className="text-xs text-[#8290aa]">Coming soon. We will add brand color presets in a future update.</p>
      </div>

      <Button variant="outline" disabled className="h-11 rounded-xl border-white/10 text-[#9ca3b4]">
        <Monitor className="mr-2 h-4 w-4" />
        Sync with system (coming soon)
      </Button>
    </section>
  )
}
