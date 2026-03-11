"use client"

import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useState } from "react"

import { AiPreferencesSection } from "@/components/settings/ai-preferences-section"
import { AppearanceSection } from "@/components/settings/appearance-section"
import { ConnectedAccountsSection } from "@/components/settings/connected-accounts-section"
import { DangerZoneSection } from "@/components/settings/danger-zone-section"
import { PlanSection } from "@/components/settings/plan-section"
import { ProfileSection } from "@/components/settings/profile-section"
import {
  type SettingsNavItem,
  type SettingsSectionId,
  SettingsNav,
} from "@/components/settings/settings-nav"

type ConnectedAccountsState = {
  google?: { connected?: boolean; email?: string | null; available?: boolean }
  fiverr?: { connected?: boolean; email?: string | null; username?: string | null; available?: boolean }
  upwork?: { connected?: boolean; email?: string | null; username?: string | null; available?: boolean }
}

type SettingsShellProps = {
  userId: string
  email: string
  fullName: string
  themePreference: "dark" | "light"
  aiAutoClarify: boolean
  connectedAccounts: ConnectedAccountsState
  plan: string
  isGoogleConnected: boolean
  googleEmail: string | null
  initialSection: SettingsSectionId
}

const SETTINGS_ITEMS: SettingsNavItem[] = [
  { id: "profile", label: "Profile", description: "Name and account details" },
  { id: "ai-preferences", label: "AI Preferences", description: "Search mode and defaults" },
  { id: "appearance", label: "Appearance", description: "Theme and look" },
  { id: "plan", label: "Plan & Usage", description: "Current plan details" },
  { id: "connected-accounts", label: "Connected Accounts", description: "Google, Fiverr, Upwork" },
  { id: "danger-zone", label: "Danger Zone", description: "Delete account permanently" },
]

export function SettingsShell({
  userId,
  email,
  fullName,
  themePreference,
  aiAutoClarify,
  connectedAccounts,
  plan,
  isGoogleConnected,
  googleEmail,
  initialSection,
}: SettingsShellProps) {
  const [activeSection, setActiveSection] = useState<SettingsSectionId>(initialSection)

  useEffect(() => {
    setActiveSection(initialSection)
  }, [initialSection])

  return (
    <section className="space-y-5 pb-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage profile, AI defaults, appearance, and account options.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)] md:gap-6">
        <div className="md:sticky md:top-24 md:self-start">
          <SettingsNav items={SETTINGS_ITEMS} activeSection={activeSection} onSelect={setActiveSection} />
        </div>

        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(3px)" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {activeSection === "profile" ? (
                <ProfileSection userId={userId} email={email} initialFullName={fullName} />
              ) : null}

              {activeSection === "ai-preferences" ? (
                <AiPreferencesSection userId={userId} initialAutoClarify={aiAutoClarify} />
              ) : null}

              {activeSection === "appearance" ? (
                <AppearanceSection userId={userId} initialThemePreference={themePreference} />
              ) : null}

              {activeSection === "plan" ? <PlanSection planName={plan} /> : null}

              {activeSection === "connected-accounts" ? (
                <ConnectedAccountsSection
                  isGoogleConnected={isGoogleConnected}
                  googleEmail={googleEmail}
                  initialConnectedAccounts={connectedAccounts}
                />
              ) : null}

              {activeSection === "danger-zone" ? <DangerZoneSection /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
