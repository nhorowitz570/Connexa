import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <section className="space-y-6 pb-6">
      <div className="glass-card grid gap-4 rounded-3xl border border-white/10 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Skeleton className="h-44 rounded-2xl bg-white/10" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl bg-white/10" />
          <Skeleton className="h-28 rounded-2xl bg-white/10" />
          <Skeleton className="h-28 rounded-2xl bg-white/10" />
          <Skeleton className="h-28 rounded-2xl bg-white/10" />
        </div>
      </div>

      <div className="glass-card rounded-3xl border border-white/10 p-4 sm:p-6">
        <Skeleton className="mb-4 h-6 w-52 bg-white/10" />
        <Skeleton className="h-[260px] rounded-2xl bg-white/10 sm:h-[320px]" />
      </div>

      <div className="glass-card rounded-3xl border border-white/10 p-4 sm:p-6">
        <Skeleton className="mb-4 h-6 w-44 bg-white/10" />
        <div className="space-y-2 rounded-2xl border border-white/10 p-3">
          <Skeleton className="h-10 rounded-lg bg-white/10" />
          <Skeleton className="h-10 rounded-lg bg-white/10" />
          <Skeleton className="h-10 rounded-lg bg-white/10" />
          <Skeleton className="h-10 rounded-lg bg-white/10" />
          <Skeleton className="h-10 rounded-lg bg-white/10" />
        </div>
      </div>
    </section>
  )
}
