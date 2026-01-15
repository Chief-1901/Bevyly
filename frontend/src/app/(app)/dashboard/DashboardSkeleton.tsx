import { Card } from '@/components/ui/Card';

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-300 dark:bg-gray-400 rounded ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <SkeletonBox className="h-8 w-32 mb-2" />
          <SkeletonBox className="h-4 w-48" />
        </div>
        <SkeletonBox className="h-9 w-48" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} padding="md">
            <SkeletonBox className="h-4 w-24 mb-3" />
            <SkeletonBox className="h-8 w-32 mb-2" />
            <SkeletonBox className="h-4 w-20" />
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card padding="lg">
          <SkeletonBox className="h-6 w-32 mb-4" />
          <SkeletonBox className="h-48 w-full" />
        </Card>
        <Card padding="lg">
          <SkeletonBox className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i}>
                <SkeletonBox className="h-4 w-full mb-2" />
                <SkeletonBox className="h-2 w-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Table */}
      <Card padding="none">
        <div className="p-4 border-b border-border">
          <SkeletonBox className="h-6 w-40" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <SkeletonBox className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <SkeletonBox className="h-4 w-32 mb-2" />
                <SkeletonBox className="h-3 w-24" />
              </div>
              <SkeletonBox className="h-6 w-16" />
              <SkeletonBox className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

