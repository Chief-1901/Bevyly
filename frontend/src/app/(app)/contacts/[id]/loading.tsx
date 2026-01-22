import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function ContactDetailLoading() {
  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 -ml-2 text-text-muted rounded-md">
              <ArrowLeftIcon className="h-5 w-5 animate-pulse" />
            </div>
            <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-300 animate-pulse"></div>
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="h-10 w-20 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding="md">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-300 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-6 w-12 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} padding="lg">
              <CardHeader>
                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="flex items-start gap-3">
                      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
                        <div className="h-4 w-full bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sidebar Skeleton */}
      <div className="hidden xl:block w-80">
        <Card padding="lg">
          <div className="space-y-4">
            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 dark:bg-gray-300 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
