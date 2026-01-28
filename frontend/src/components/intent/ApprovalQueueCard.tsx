'use client';

import { ActionCard, type Priority } from './ActionCard';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export interface ApprovalQueueCardProps {
  totalPending: number;
  highFitPending: number;
  mediumFitPending: number;
  lowFitPending: number;
  estimatedTotalCredits: number;
  priority?: Priority;
}

export function ApprovalQueueCard({
  totalPending,
  highFitPending,
  mediumFitPending,
  lowFitPending,
  estimatedTotalCredits,
  priority = 'medium',
}: ApprovalQueueCardProps) {
  return (
    <ActionCard
      icon={<ClipboardDocumentCheckIcon className="h-5 w-5" />}
      title={`${totalPending} leads awaiting approval`}
      subtitle="Review and approve for enrichment"
      priority={priority}
      rationale="Discovered leads need your approval before enrichment. High-fit leads are most likely to convert - consider prioritizing those for enrichment."
      primaryAction={{
        label: 'Review Queue',
        href: '/leads/approval',
      }}
      secondaryAction={{
        label: 'Approve High-Fit',
        href: '/leads/approval?filter=high',
      }}
    >
      <div className="mt-3 space-y-3">
        {/* Bucket Breakdown */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span className="font-medium text-text-primary">{highFitPending}</span>
            <span className="text-text-muted">high fit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-warning" />
            <span className="font-medium text-text-primary">{mediumFitPending}</span>
            <span className="text-text-muted">medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-info" />
            <span className="font-medium text-text-primary">{lowFitPending}</span>
            <span className="text-text-muted">low</span>
          </div>
        </div>

        {/* Credits Estimate */}
        <div className="text-sm">
          <span className="text-text-muted">Total estimated credits: </span>
          <span className="font-medium text-primary-500">{estimatedTotalCredits}</span>
        </div>
      </div>
    </ActionCard>
  );
}

export default ApprovalQueueCard;
