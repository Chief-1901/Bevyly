'use client';

import { ActionCard, type Priority } from './ActionCard';
import { SparklesIcon } from '@heroicons/react/24/outline';

export interface EnrichmentPendingCardProps {
  pendingCount: number;
  approvedCount: number;
  estimatedCredits: number;
  priority?: Priority;
}

export function EnrichmentPendingCard({
  pendingCount,
  approvedCount,
  estimatedCredits,
  priority = 'medium',
}: EnrichmentPendingCardProps) {
  const totalReady = pendingCount + approvedCount;

  return (
    <ActionCard
      icon={<SparklesIcon className="h-5 w-5" />}
      title={`${totalReady} leads ready for enrichment`}
      subtitle={`${approvedCount} approved, ${pendingCount} pending review`}
      priority={priority}
      rationale="Enrich these leads with verified contact information, company details, and funding data from Apollo.io to improve your outreach success."
      primaryAction={{
        label: 'Review & Enrich',
        href: '/leads/approval',
      }}
      secondaryAction={
        approvedCount > 0
          ? {
              label: 'Start Enrichment',
              href: '/leads/approval?action=enrich',
            }
          : undefined
      }
    >
      <div className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-text-muted">Estimated credits:</span>
          <span className="font-medium text-primary-500">{estimatedCredits} credits</span>
        </div>
        {approvedCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Ready to enrich:</span>
            <span className="font-medium text-success">{approvedCount} leads</span>
          </div>
        )}
      </div>
    </ActionCard>
  );
}

export default EnrichmentPendingCard;
