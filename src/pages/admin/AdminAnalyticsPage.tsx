import { Suspense, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/layout';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsFilterBar } from '@/components/admin/analytics/AnalyticsFilterBar';
import { AdminStatsCards } from '@/components/admin/analytics/AdminStatsCards';
import { AdminPerformanceMatrix } from '@/components/admin/analytics/AdminPerformanceMatrix';
import { AdminPerformanceBarChart } from '@/components/admin/analytics/AdminPerformanceBarChart';
import { AdminStudentPerformanceTable } from '@/components/admin/analytics/AdminStudentPerformanceTable';
import { AdminScoreOverTimeChart } from '@/components/admin/analytics/AdminScoreOverTimeChart';
import { AdminCompletionChart } from '@/components/admin/analytics/AdminCompletionChart';
import { AdminHintsDistributionChart } from '@/components/admin/analytics/AdminHintsDistributionChart';
import { useAnalyticsFilters } from '@/hooks/useApi';
import type { AnalyticsFilters } from '@/services/api/analytics';

export function AdminAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const { data: filterOptions, isLoading: filtersLoading } = useAnalyticsFilters();
  const filterPayload = useMemo(() => (Object.keys(filters).length > 0 ? filters : undefined), [filters]);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Detailed insights into student performance. Filter by student, test, topic, or concept.</p>
          </div>
          <AnalyticsFilterBar
            options={filterOptions}
            filters={filters}
            onFiltersChange={setFilters}
            isLoading={filtersLoading}
          />
        </div>

        {/* Stats Grid */}
        <Suspense fallback={
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        }>
          <AdminStatsCards filters={filterPayload} />
        </Suspense>

        {/* New charts: Score trend, Completion, Hints */}
        <div className="grid md:grid-cols-3 gap-6">
          <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-xl" />}>
            <AdminScoreOverTimeChart filters={filterPayload} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-xl" />}>
            <AdminCompletionChart filters={filterPayload} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[360px] w-full rounded-xl" />}>
            <AdminHintsDistributionChart filters={filterPayload} />
          </Suspense>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <AdminPerformanceMatrix filters={filterPayload} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <AdminPerformanceBarChart filters={filterPayload} />
          </Suspense>
        </div>

        <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
          <AdminStudentPerformanceTable filters={filterPayload} />
        </Suspense>
      </div>
    </AdminLayout>
  );
}
