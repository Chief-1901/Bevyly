'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { ArrowRightIcon } from '@heroicons/react/24/outline';
import type { PipelineSummary } from '@/lib/api/server';

interface PipelineSnapshotProps {
  stages: PipelineSummary[];
}

const STAGE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  prospecting: {
    label: 'Prospecting',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  qualification: {
    label: 'Qualification',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  proposal: {
    label: 'Proposal',
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  negotiation: {
    label: 'Negotiation',
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
  closed_won: {
    label: 'Closed Won',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  closed_lost: {
    label: 'Closed Lost',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
  },
};

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

export function PipelineSnapshot({ stages }: PipelineSnapshotProps) {
  const router = useRouter();

  // Calculate totals
  const totalValue = stages.reduce((sum, stage) => sum + stage.totalAmount, 0);
  const totalCount = stages.reduce((sum, stage) => sum + stage.count, 0);

  // Sort stages in pipeline order (non-mutating)
  const stageOrder = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
  const sortedStages = [...stages].sort((a, b) => {
    return stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage);
  });

  // Empty state
  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Pipeline Snapshot</h2>
            <Link
              href="/opportunities"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
            >
              View Pipeline
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">No opportunities in your pipeline yet</p>
            <Link
              href="/opportunities"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 mt-2 inline-block"
            >
              Create your first opportunity →
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleStageClick = (stageName: string) => {
    router.push(`/opportunities?stage=${stageName}`);
  };

  const handleStageKeyDown = (e: React.KeyboardEvent, stageName: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleStageClick(stageName);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">Pipeline Snapshot</h2>
          <Link
            href="/opportunities"
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
          >
            View Pipeline
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stage Columns - Horizontal scroll on mobile */}
        <div className="overflow-x-auto -mx-2 px-2 pb-2">
          <div className="grid grid-cols-6 gap-3 min-w-[600px]">
            {sortedStages.map((stage) => {
              const config = STAGE_CONFIG[stage.stage] || {
                label: stage.stage,
                color: 'text-gray-700 dark:text-gray-400',
                bgColor: 'bg-gray-50 dark:bg-gray-900/20',
              };

              return (
                <div
                  key={stage.stage}
                  role="button"
                  tabIndex={0}
                  className={`${config.bgColor} rounded-lg p-3 text-center transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer`}
                  onClick={() => handleStageClick(stage.stage)}
                  onKeyDown={(e) => handleStageKeyDown(e, stage.stage)}
                  aria-label={`View ${config.label} opportunities: ${formatCurrency(stage.totalAmount)}, ${stage.count} ${stage.count === 1 ? 'deal' : 'deals'}`}
                >
                  <div className="text-xs font-medium text-text-muted mb-2 truncate">
                    {config.label}
                  </div>
                  <div className={`text-xl font-bold ${config.color} mb-1`}>
                    {formatCurrency(stage.totalAmount)}
                  </div>
                  <div className="text-xs text-text-muted">
                    {stage.count} {stage.count === 1 ? 'deal' : 'deals'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Total Summary */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Total Pipeline:</span>
            <span className="font-semibold text-text-primary">
              {formatCurrency(totalValue)} across {totalCount} {totalCount === 1 ? 'opportunity' : 'opportunities'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
