'use client';

import { ActionCard, type Priority } from './ActionCard';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export interface LeadsReadyCardProps {
  count: number;
  source: string;
  campaignId?: string;
  campaignName?: string;
  avgFitScore?: number;
  priority?: Priority;
}

export function LeadsReadyCard({
  count,
  source,
  campaignId,
  campaignName,
  avgFitScore,
  priority = 'medium',
}: LeadsReadyCardProps) {
  const sourceDisplay = campaignName || source;
  const leadsUrl = campaignId 
    ? `/leads?campaignId=${campaignId}&status=new`
    : `/leads?source=${source}&status=new`;

  return (
    <ActionCard
      icon={<UserGroupIcon className="h-5 w-5" />}
      title={`${count} new leads ready for review`}
      subtitle={`Source: ${sourceDisplay}`}
      priority={priority}
      rationale="New leads have been generated and are ready for qualification. Review them to identify high-potential prospects."
      primaryAction={{
        label: 'Review Leads',
        href: leadsUrl,
      }}
      secondaryAction={{
        label: 'Start Campaign',
        href: '/sequences/new',
      }}
    >
      {avgFitScore !== undefined && (
        <div className="mt-3 text-sm">
          <span className="text-text-muted">Avg. fit score: </span>
          <span className="font-medium text-text-primary">{avgFitScore}%</span>
        </div>
      )}
    </ActionCard>
  );
}

export default LeadsReadyCard;
