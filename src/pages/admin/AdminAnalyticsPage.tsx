import { Suspense } from 'react';
import { AdminLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminStatsCards } from '@/components/admin/analytics/AdminStatsCards';
import { AdminPerformanceMatrix } from '@/components/admin/analytics/AdminPerformanceMatrix';
import { AdminPerformanceBarChart } from '@/components/admin/analytics/AdminPerformanceBarChart';
import { AdminStudentPerformanceTable } from '@/components/admin/analytics/AdminStudentPerformanceTable';

export function AdminAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Detailed insights into student performance.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <Suspense fallback={
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        }>
          <AdminStatsCards />
        </Suspense>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance Matrix Scatter Search */}
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <AdminPerformanceMatrix />
          </Suspense>

          {/* Average Score Bar Chart */}
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <AdminPerformanceBarChart />
          </Suspense>
        </div>

        {/* Detailed Metrics Table */}
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <AdminStudentPerformanceTable />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
