import { Card } from '@/components/ui/Card';

export function BriefingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-40 bg-surface-primary-a06 rounded" />
          <div className="h-4 w-64 bg-surface-primary-a06 rounded mt-2" />
        </div>
        <div className="h-10 w-24 bg-surface-primary-a06 rounded" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-l-4 border-l-surface-primary-a06">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-surface-primary-a06 rounded-lg" />
              <div>
                <div className="h-8 w-8 bg-surface-primary-a06 rounded" />
                <div className="h-4 w-20 bg-surface-primary-a06 rounded mt-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Actions header skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-surface-primary-a06 rounded" />
        <div className="h-5 w-40 bg-surface-primary-a06 rounded" />
      </div>

      {/* Action cards skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border-l-4 border-l-surface-primary-a06 p-4">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-surface-primary-a06 rounded-lg" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-48 bg-surface-primary-a06 rounded" />
                  <div className="h-5 w-12 bg-surface-primary-a06 rounded-full" />
                </div>
                <div className="h-4 w-32 bg-surface-primary-a06 rounded mt-1" />
                <div className="h-4 w-full bg-surface-primary-a06 rounded mt-3" />
                <div className="flex gap-2 mt-4">
                  <div className="h-8 w-24 bg-surface-primary-a06 rounded" />
                  <div className="h-8 w-24 bg-surface-primary-a06 rounded" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default BriefingSkeleton;
