import { Card } from '@/components/ui/Card';

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-300 dark:bg-gray-400 rounded ${className}`}
    />
  );
}

export function AccountsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBox className="h-8 w-32 mb-2" />
          <SkeletonBox className="h-4 w-48" />
        </div>
        <SkeletonBox className="h-10 w-32" />
      </div>
      <SkeletonBox className="h-11 w-64" />
      <Card padding="none">
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <SkeletonBox className="h-4 w-48" />
              <SkeletonBox className="h-4 w-32" />
              <SkeletonBox className="h-4 w-24" />
              <SkeletonBox className="h-6 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

