"use client"

import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { Activity, AlertTriangle, CheckCircle2, Target, Files } from "lucide-react"
import type { ComponentType } from "react"
import { useEffect } from "react"

type DashboardStatsProps = {
  totalBriefs: number
  failedBriefs: number
  activeBriefs: number
  averageScore: number | null
}

export function DashboardStats({
  totalBriefs,
  failedBriefs,
  activeBriefs,
  averageScore,
}: DashboardStatsProps) {
  const completedBriefs = Math.max(0, totalBriefs - failedBriefs - activeBriefs)

  return (
    <div className="glass-card grid gap-4 rounded-3xl border border-border p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="glass-card-hover rounded-2xl border border-border bg-muted/70 p-5 dark:border-white/10 dark:bg-black/20"
      >
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-700 dark:text-indigo-200">
          <Activity className="h-5 w-5" />
        </div>
        <p className="text-sm text-muted-foreground">Active Briefs</p>
        <p className="mt-2 text-5xl font-semibold text-foreground sm:text-6xl dark:glow-text dark:text-white">
          <AnimatedNumber value={activeBriefs} />
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Searches currently running or waiting on clarifications</p>
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <MetricCard label="Total Briefs" value={totalBriefs} icon={Files} valueClassName="text-foreground dark:text-white" />
        <MetricCard label="Completed" value={completedBriefs} icon={CheckCircle2} valueClassName="text-emerald-700 dark:text-emerald-300" />
        <MetricCard
          label="Avg Match Score"
          value={averageScore !== null ? `${averageScore.toFixed(1)}%` : "-"}
          icon={Target}
          valueClassName="text-indigo-700 dark:text-indigo-300"
        />
        <MetricCard label="Failed" value={failedBriefs} icon={AlertTriangle} valueClassName="text-rose-700 dark:text-rose-300" />
      </div>
    </div>
  )
}

function AnimatedNumber({ value }: { value: number }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest))

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: 0.8,
      ease: "easeOut",
    })

    return () => {
      controls.stop()
    }
  }, [motionValue, value])

  return <motion.span>{rounded}</motion.span>
}

type MetricCardProps = {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
  valueClassName: string
}

function MetricCard({ label, value, icon: Icon, valueClassName }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 340, damping: 26 }}
      className="glass-card-hover rounded-2xl border border-border bg-muted/70 p-4 dark:border-white/10 dark:bg-black/20"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
        <Icon className="h-3.5 w-3.5 text-indigo-700 dark:text-indigo-200" />
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${valueClassName}`}>{value}</p>
    </motion.div>
  )
}
