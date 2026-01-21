'use client';

import { ActionCard, type Priority } from './ActionCard';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface DealStalledCardProps {
  opportunityId: string;
  opportunityName: string;
  accountName: string;
  daysSinceActivity: number;
  amount?: number;
  stage?: string;
  priority?: Priority;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

export function DealStalledCard({
  opportunityId,
  opportunityName,
  accountName,
  daysSinceActivity,
  amount,
  stage,
  priority = 'high',
}: DealStalledCardProps) {
  return (
    <ActionCard
      icon={<ExclamationTriangleIcon className="h-5 w-5" />}
      title={opportunityName}
      subtitle={`${accountName}${stage ? ` • ${stage.replace('_', ' ')}` : ''}`}
      priority={priority}
      rationale={`This deal has been inactive for ${daysSinceActivity} days. Consider reaching out or updating the deal status.`}
      primaryAction={{
        label: 'View Deal',
        href: `/opportunities/${opportunityId}`,
      }}
      secondaryAction={{
        label: 'Log Activity',
        href: `/opportunities/${opportunityId}`,
      }}
    >
      {amount && amount > 0 && (
        <div className="mt-3 text-sm">
          <span className="text-text-muted">Deal value: </span>
          <span className="font-medium text-text-primary">{formatCurrency(amount)}</span>
        </div>
      )}
    </ActionCard>
  );
}

export default DealStalledCard;
