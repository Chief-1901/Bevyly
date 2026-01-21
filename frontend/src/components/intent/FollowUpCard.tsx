'use client';

import { ActionCard, type Priority } from './ActionCard';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

export interface FollowUpCardProps {
  contactId: string;
  contactName: string;
  contactTitle?: string;
  accountName: string;
  meetingTitle: string;
  meetingDate: string;
  daysSinceMeeting: number;
  priority?: Priority;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function FollowUpCard({
  contactId,
  contactName,
  contactTitle,
  accountName,
  meetingTitle,
  meetingDate,
  daysSinceMeeting,
  priority = 'high',
}: FollowUpCardProps) {
  return (
    <ActionCard
      icon={<EnvelopeIcon className="h-5 w-5" />}
      title={`Follow up with ${contactName}`}
      subtitle={`${contactTitle ? `${contactTitle} at ` : ''}${accountName}`}
      priority={priority}
      rationale={`No follow-up has been sent after "${meetingTitle}" on ${formatDate(meetingDate)} (${daysSinceMeeting} days ago).`}
      primaryAction={{
        label: 'Send Follow-up',
        href: `/contacts/${contactId}`,
      }}
      secondaryAction={{
        label: 'View Contact',
        href: `/contacts/${contactId}`,
      }}
    />
  );
}

export default FollowUpCard;
