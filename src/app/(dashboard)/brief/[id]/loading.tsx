import { Skeleton } from "@/components/ui/skeleton"

export default function BriefDetailLoading() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-full bg-white/10" />
          <Skeleton className="h-9 w-20 rounded-full bg-white/10" />
          <Skeleton className="h-9 w-24 rounded-lg bg-white/10" />
        </div>
      </div>

      <div className="glass-card rounded-2xl border border-white/10 p-6">
        <Skeleton className="mb-4 h-6 w-40 bg-white/10" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full bg-white/10" />
          <Skeleton className="h-4 w-[88%] bg-white/10" />
          <Skeleton className="h-4 w-[72%] bg-white/10" />
        </div>
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-24 bg-white/10" />
        <Skeleton className="h-44 rounded-2xl bg-white/10" />
        <Skeleton className="h-44 rounded-2xl bg-white/10" />
        <Skeleton className="h-44 rounded-2xl bg-white/10" />
      </div>
    </section>
  )
}
