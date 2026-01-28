'use client';

import { Card } from '@/components/ui/Card';

export function ApprovalSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="h-8 w-48 bg-surface-primary-a12 rounded" />
          <div className="h-4 w-64 bg-surface-primary-a12 rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-32 bg-surface-primary-a12 rounded" />
          <div className="h-10 w-32 bg-surface-primary-a12 rounded" />
        </div>
      </div>

      {/* Stats Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-surface-primary-a12 rounded-lg" />
              <div>
                <div className="h-6 w-16 bg-surface-primary-a12 rounded" />
                <div className="h-4 w-24 bg-surface-primary-a12 rounded mt-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Table Skeleton */}
      <Card>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
              <div className="h-5 w-5 bg-surface-primary-a12 rounded" />
              <div className="flex-1">
                <div className="h-5 w-48 bg-surface-primary-a12 rounded" />
                <div className="h-4 w-32 bg-surface-primary-a12 rounded mt-1" />
              </div>
              <div className="h-6 w-16 bg-surface-primary-a12 rounded-full" />
              <div className="h-6 w-12 bg-surface-primary-a12 rounded" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
