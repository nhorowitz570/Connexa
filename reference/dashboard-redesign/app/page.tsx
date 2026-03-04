import { DashboardMetrics } from "@/components/dashboard-metrics"
import { PerformanceChart } from "@/components/performance-chart"
import { RecentBriefs } from "@/components/recent-briefs"
import { PageLayout } from "@/components/page-layout"

export default function Dashboard() {
  return (
    <PageLayout activePage="dashboard">
      <DashboardMetrics />
      <PerformanceChart />
      <RecentBriefs />
      
      {/* Status Indicator */}
      <div className="flex items-center justify-end gap-2 mt-4">
        <div className="w-[13px] h-[13px] rounded-full bg-indigo-500" />
        <span className="text-sm text-[#919191]">Pipeline Active</span>
      </div>
    </PageLayout>
  )
}
