'use client';

import { ActionCard, type Priority } from './ActionCard';
import { CpuChipIcon } from '@heroicons/react/24/outline';

export interface LeadsDiscoveredCardProps {
  runId: string;
  count: number;
  avgFitScore?: number;
  highFitCount: number;
  mediumFitCount: number;
  lowFitCount: number;
  estimatedCredits?: number;
  priority?: Priority;
}

export function LeadsDiscoveredCard({
  runId,
  count,
  avgFitScore,
  highFitCount,
  mediumFitCount,
  lowFitCount,
  estimatedCredits,
  priority = 'medium',
}: LeadsDiscoveredCardProps) {
  return (
    <ActionCard
      icon={<CpuChipIcon className="h-5 w-5" />}
      title={`${count} leads discovered and ready for review`}
      subtitle={`Discovery Run: ${runId.slice(0, 12)}...`}
      priority={priority}
      rationale="The Discovery Agent found potential leads matching your criteria. Review them in the approval queue to select which ones to enrich with verified contact data."
      primaryAction={{
        label: 'Review Queue',
        href: '/leads/approval',
      }}
      secondaryAction={{
        label: 'View All Leads',
        href: '/leads?source=discovery',
      }}
    >
      <div className="mt-3 space-y-2">
        {/* Fit Score Breakdown */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="text-text-muted">High:</span>
            <span className="font-medium text-text-primary">{highFitCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-text-muted">Medium:</span>
            <span className="font-medium text-text-primary">{mediumFitCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-info" />
            <span className="text-text-muted">Low:</span>
            <span className="font-medium text-text-primary">{lowFitCount}</span>
          </div>
        </div>

        {/* Average Fit Score */}
        {avgFitScore !== undefined && (
          <div className="text-sm">
            <span className="text-text-muted">Avg. fit score: </span>
            <span className="font-medium text-text-primary">{avgFitScore}%</span>
          </div>
        )}

        {/* Estimated Credits */}
        {estimatedCredits !== undefined && (
          <div className="text-sm">
            <span className="text-text-muted">Estimated enrichment credits: </span>
            <span className="font-medium text-primary-500">{estimatedCredits}</span>
          </div>
        )}
      </div>
    </ActionCard>
  );
}

export default LeadsDiscoveredCard;
