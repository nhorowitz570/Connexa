import { Skeleton } from "@/components/ui/skeleton"

export default function AssistantLoading() {
  return (
    <section className="flex h-[calc(100dvh-8rem)] flex-col">
      <div className="mb-4 space-y-2">
        <Skeleton className="h-8 w-36 bg-muted/70 dark:bg-white/10" />
        <Skeleton className="h-4 w-80 bg-muted/70 dark:bg-white/10" />
      </div>

      <div className="glass-card flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-border p-3 dark:border-white/10">
        <div className="hidden w-72 shrink-0 space-y-2 border-r border-border pr-3 md:block dark:border-white/10">
          <Skeleton className="h-11 w-full rounded-xl bg-muted/70 dark:bg-white/10" />
          <Skeleton className="h-12 w-full rounded-lg bg-muted/70 dark:bg-white/10" />
          <Skeleton className="h-12 w-full rounded-lg bg-muted/70 dark:bg-white/10" />
          <Skeleton className="h-12 w-full rounded-lg bg-muted/70 dark:bg-white/10" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3 pl-0 md:pl-3">
          <Skeleton className="h-11 w-full rounded-xl bg-muted/70 dark:bg-white/10" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-20 w-[72%] rounded-xl bg-muted/70 dark:bg-white/10" />
            <Skeleton className="ml-auto h-20 w-[64%] rounded-xl bg-muted/70 dark:bg-white/10" />
            <Skeleton className="h-20 w-[68%] rounded-xl bg-muted/70 dark:bg-white/10" />
          </div>
          <Skeleton className="h-28 w-full rounded-xl bg-muted/70 dark:bg-white/10" />
        </div>
      </div>
    </section>
  )
}
