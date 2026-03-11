"use client"

import { CheckCircle2, Link2, Mail, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ConnectedAccountState = {
  connected?: boolean
  email?: string | null
  username?: string | null
  connected_at?: string
  available?: boolean
}

type ConnectedAccountsState = {
  google?: ConnectedAccountState
  fiverr?: ConnectedAccountState
  upwork?: ConnectedAccountState
}

type ConnectedAccountsSectionProps = {
  isGoogleConnected: boolean
  googleEmail: string | null
  initialConnectedAccounts: ConnectedAccountsState
}

type ConnectionApiResponse = {
  data?: {
    accounts?: ConnectedAccountsState
  }
  error?: string
}

type Platform = "fiverr" | "upwork"

export function ConnectedAccountsSection({
  isGoogleConnected,
  googleEmail,
  initialConnectedAccounts,
}: ConnectedAccountsSectionProps) {
  const [loading, setLoading] = useState(true)
  const [savingPlatform, setSavingPlatform] = useState<Platform | null>(null)
  const [accounts, setAccounts] = useState<ConnectedAccountsState>({
    google: {
      connected: isGoogleConnected,
      email: googleEmail ?? initialConnectedAccounts.google?.email ?? null,
      available: true,
    },
    fiverr: {
      connected: initialConnectedAccounts.fiverr?.connected ?? false,
      available: initialConnectedAccounts.fiverr?.available ?? false,
    },
    upwork: {
      connected: initialConnectedAccounts.upwork?.connected ?? false,
      available: initialConnectedAccounts.upwork?.available ?? false,
    },
  })

  const resolvedAccounts = useMemo<ConnectedAccountsState>(() => {
    return {
      google: {
        connected: accounts.google?.connected ?? isGoogleConnected,
        email: accounts.google?.email ?? googleEmail,
        available: true,
      },
      fiverr: {
        connected: accounts.fiverr?.connected ?? false,
        email: accounts.fiverr?.email ?? null,
        username: accounts.fiverr?.username ?? null,
        available: accounts.fiverr?.available ?? false,
      },
      upwork: {
        connected: accounts.upwork?.connected ?? false,
        email: accounts.upwork?.email ?? null,
        username: accounts.upwork?.username ?? null,
        available: accounts.upwork?.available ?? false,
      },
    }
  }, [accounts, googleEmail, isGoogleConnected])

  useEffect(() => {
    let cancelled = false

    const loadAccounts = async () => {
      try {
        const response = await fetch("/api/account/connections", { cache: "no-store" })
        const payload = (await response.json()) as ConnectionApiResponse

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load connected accounts")
        }

        if (!cancelled && payload.data?.accounts) {
          setAccounts(payload.data.accounts)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Failed to load connected accounts")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadAccounts()

    return () => {
      cancelled = true
    }
  }, [])

  const handleConnect = async (platform: Platform) => {
    setSavingPlatform(platform)
    try {
      const response = await fetch("/api/account/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      })
      const payload = (await response.json()) as ConnectionApiResponse
      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to connect ${platform}`)
      }

      if (payload.data?.accounts) {
        setAccounts(payload.data.accounts)
      }
      toast.success(`${platform[0].toUpperCase()}${platform.slice(1)} connected`) 
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to connect ${platform}`)
    } finally {
      setSavingPlatform(null)
    }
  }

  const handleDisconnect = async (platform: Platform) => {
    setSavingPlatform(platform)
    try {
      const response = await fetch(`/api/account/connections?platform=${platform}`, {
        method: "DELETE",
      })
      const payload = (await response.json()) as ConnectionApiResponse
      if (!response.ok) {
        throw new Error(payload.error ?? `Failed to disconnect ${platform}`)
      }

      if (payload.data?.accounts) {
        setAccounts(payload.data.accounts)
      }
      toast.success(`${platform[0].toUpperCase()}${platform.slice(1)} disconnected`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to disconnect ${platform}`)
    } finally {
      setSavingPlatform(null)
    }
  }

  const fiverrAvailable = resolvedAccounts.fiverr?.available ?? false
  const upworkAvailable = resolvedAccounts.upwork?.available ?? false

  return (
    <section className="glass-card space-y-5 rounded-2xl border border-border p-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Connected Accounts</h2>
        <p className="text-sm text-muted-foreground">Connect external platforms to enrich your searches.</p>
      </div>

      <AccountRow
        name="Google"
        description={
          resolvedAccounts.google?.connected
            ? `Connected${resolvedAccounts.google?.email ? ` as ${resolvedAccounts.google.email}` : ""}`
            : "Not connected"
        }
        statusLabel={resolvedAccounts.google?.connected ? "Connected" : "Not connected"}
        icon={<Mail className="h-4 w-4" />}
        actionLabel="Managed by login"
        disabled
      />

      <AccountRow
        name="Fiverr"
        description={
          fiverrAvailable
            ? "Connect Fiverr projects and profiles for better matching"
            : "Fiverr linking is coming soon"
        }
        statusLabel={
          fiverrAvailable
            ? resolvedAccounts.fiverr?.connected
              ? "Connected"
              : "Not connected"
            : "Coming soon"
        }
        icon={<Link2 className="h-4 w-4" />}
        actionLabel={
          !fiverrAvailable
            ? "Coming soon"
            : resolvedAccounts.fiverr?.connected
              ? "Disconnect"
              : "Connect"
        }
        disabled={!fiverrAvailable || loading || savingPlatform !== null}
        loading={savingPlatform === "fiverr"}
        onAction={
          fiverrAvailable
            ? () =>
              resolvedAccounts.fiverr?.connected
                ? void handleDisconnect("fiverr")
                : void handleConnect("fiverr")
            : undefined
        }
      />

      <AccountRow
        name="Upwork"
        description={
          upworkAvailable
            ? "Connect Upwork activity and talent signals"
            : "Upwork linking is coming soon"
        }
        statusLabel={
          upworkAvailable
            ? resolvedAccounts.upwork?.connected
              ? "Connected"
              : "Not connected"
            : "Coming soon"
        }
        icon={<ShieldCheck className="h-4 w-4" />}
        actionLabel={
          !upworkAvailable
            ? "Coming soon"
            : resolvedAccounts.upwork?.connected
              ? "Disconnect"
              : "Connect"
        }
        disabled={!upworkAvailable || loading || savingPlatform !== null}
        loading={savingPlatform === "upwork"}
        onAction={
          upworkAvailable
            ? () =>
              resolvedAccounts.upwork?.connected
                ? void handleDisconnect("upwork")
                : void handleConnect("upwork")
            : undefined
        }
      />
    </section>
  )
}

type AccountRowProps = {
  name: string
  description: string
  statusLabel: string
  actionLabel: string
  icon: ReactNode
  disabled?: boolean
  loading?: boolean
  onAction?: () => void
}

function AccountRow({
  name,
  description,
  statusLabel,
  actionLabel,
  icon,
  disabled,
  loading,
  onAction,
}: AccountRowProps) {
  const isConnected = statusLabel.toLowerCase() === "connected"

  return (
    <div className="rounded-xl border border-border bg-muted/70 p-3 dark:border-white/10 dark:bg-black/20">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="rounded-md bg-muted p-1 text-indigo-700 dark:bg-white/10 dark:text-[#b5c1d7]">{icon}</span>
            {name}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs",
              isConnected
                ? "border-emerald-400/40 bg-emerald-500/12 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                : "border-border bg-background/70 text-muted-foreground dark:border-white/10 dark:bg-white/5",
            )}
          >
            {isConnected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
            {statusLabel}
          </span>

          <Button
            disabled={disabled}
            variant="outline"
            className="h-9 rounded-lg border-border dark:border-white/10"
            onClick={onAction}
          >
            {loading ? "Working..." : actionLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
