import { Card } from '@/components/ui/Card';

export function LeadsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-24 bg-surface-primary-a06 rounded" />
          <div className="h-4 w-48 bg-surface-primary-a06 rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-surface-primary-a06 rounded" />
      </div>

      {/* Filter skeleton */}
      <div className="h-10 w-96 bg-surface-primary-a06 rounded" />

      {/* Table skeleton */}
      <Card padding="none">
        <div className="p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-32 bg-surface-primary-a06 rounded" />
              <div className="h-4 w-24 bg-surface-primary-a06 rounded hidden sm:block" />
              <div className="h-6 w-16 bg-surface-primary-a06 rounded" />
              <div className="h-4 w-20 bg-surface-primary-a06 rounded hidden md:block" />
              <div className="h-4 w-12 bg-surface-primary-a06 rounded hidden lg:block" />
              <div className="h-4 w-24 bg-surface-primary-a06 rounded hidden lg:block" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default LeadsSkeleton;
