'use client';

import { ActionCard, type Priority } from './ActionCard';
import { ChartBarIcon } from '@heroicons/react/24/outline';

export interface SequenceUnderperformingCardProps {
  sequenceId: string;
  sequenceName: string;
  replyRate: number;
  replyRateChange?: number;
  activeContacts?: number;
  segment?: string;
  priority?: Priority;
}

export function SequenceUnderperformingCard({
  sequenceId,
  sequenceName,
  replyRate,
  replyRateChange,
  activeContacts,
  segment,
  priority = 'high',
}: SequenceUnderperformingCardProps) {
  const changeText = replyRateChange 
    ? `${replyRateChange > 0 ? '+' : ''}${replyRateChange.toFixed(1)}%`
    : null;

  return (
    <ActionCard
      icon={<ChartBarIcon className="h-5 w-5" />}
      title={sequenceName}
      subtitle={segment ? `Segment: ${segment}` : undefined}
      priority={priority}
      rationale={`Reply rate has dropped to ${replyRate.toFixed(1)}%${changeText ? ` (${changeText})` : ''}. Consider reviewing the messaging or pausing the sequence.`}
      primaryAction={{
        label: 'View Sequence',
        href: `/sequences/${sequenceId}`,
      }}
      secondaryAction={{
        label: 'Pause Sequence',
        href: `/sequences/${sequenceId}`,
      }}
    >
      {activeContacts !== undefined && (
        <div className="mt-3 text-sm">
          <span className="text-text-muted">Active contacts: </span>
          <span className="font-medium text-text-primary">{activeContacts.toLocaleString()}</span>
        </div>
      )}
    </ActionCard>
  );
}

export default SequenceUnderperformingCard;
