import type { CustomerId } from '../../shared/types/index.js';

/**
 * Domain event envelope - standardized format for all events
 */
export interface DomainEvent<T = unknown> {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  customerId: CustomerId;
  payload: T;
  metadata: EventMetadata;
  occurredAt: Date;
}

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  requestId?: string;
  version: number;
}

/**
 * Event types - organized by aggregate
 */
export const EventTypes = {
  // Contact events
  CONTACT_CREATED: 'contact.created',
  CONTACT_UPDATED: 'contact.updated',
  CONTACT_DELETED: 'contact.deleted',

  // Account events
  ACCOUNT_CREATED: 'account.created',
  ACCOUNT_UPDATED: 'account.updated',
  ACCOUNT_DELETED: 'account.deleted',

  // Opportunity events
  OPPORTUNITY_CREATED: 'opportunity.created',
  OPPORTUNITY_UPDATED: 'opportunity.updated',
  OPPORTUNITY_STAGE_CHANGED: 'opportunity.stage_changed',
  OPPORTUNITY_WON: 'opportunity.won',
  OPPORTUNITY_LOST: 'opportunity.lost',
  OPPORTUNITY_DELETED: 'opportunity.deleted',

  // Email events
  EMAIL_DRAFTED: 'email.drafted',
  EMAIL_QUEUED: 'email.queued',
  EMAIL_SENT: 'email.sent',
  EMAIL_DELIVERED: 'email.delivered',
  EMAIL_OPENED: 'email.opened',
  EMAIL_CLICKED: 'email.clicked',
  EMAIL_REPLIED: 'email.replied',
  EMAIL_BOUNCED: 'email.bounced',
  EMAIL_FAILED: 'email.failed',

  // Meeting events
  MEETING_PROPOSED: 'meeting.proposed',
  MEETING_CONFIRMED: 'meeting.confirmed',
  MEETING_CANCELLED: 'meeting.cancelled',
  MEETING_COMPLETED: 'meeting.completed',
  MEETING_NO_SHOW: 'meeting.no_show',

  // Sequence events
  SEQUENCE_CREATED: 'sequence.created',
  SEQUENCE_UPDATED: 'sequence.updated',
  SEQUENCE_ACTIVATED: 'sequence.activated',
  SEQUENCE_PAUSED: 'sequence.paused',
  CONTACT_ENROLLED: 'sequence.contact_enrolled',
  CONTACT_COMPLETED: 'sequence.contact_completed',
  CONTACT_EXITED: 'sequence.contact_exited',
  SEQUENCE_STEP_EXECUTED: 'sequence.step_executed',

  // Engagement events
  ENGAGEMENT_SCORE_UPDATED: 'engagement.score_updated',
  INTENT_SIGNAL_DETECTED: 'engagement.intent_signal_detected',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Aggregate types
 */
export const AggregateTypes = {
  CONTACT: 'contact',
  ACCOUNT: 'account',
  OPPORTUNITY: 'opportunity',
  EMAIL: 'email',
  MEETING: 'meeting',
  SEQUENCE: 'sequence',
  ENGAGEMENT: 'engagement',
} as const;

export type AggregateType = (typeof AggregateTypes)[keyof typeof AggregateTypes];

// ─────────────────────────────────────────────────────────────
// Event payload types
// ─────────────────────────────────────────────────────────────

export interface ContactCreatedPayload {
  contactId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  accountId?: string;
}

export interface ContactUpdatedPayload {
  contactId: string;
  changes: Record<string, { old: unknown; new: unknown }>;
}

export interface EmailSentPayload {
  emailId: string;
  contactId?: string;
  accountId?: string;
  toEmail: string;
  subject: string;
  sequenceId?: string;
  sequenceStepNumber?: number;
}

export interface EmailOpenedPayload {
  emailId: string;
  contactId?: string;
  accountId?: string;
  openCount: number;
  firstOpen: boolean;
}

export interface EmailClickedPayload {
  emailId: string;
  contactId?: string;
  accountId?: string;
  url: string;
  clickCount: number;
  firstClick: boolean;
}

export interface MeetingScheduledPayload {
  meetingId: string;
  contactId?: string;
  accountId?: string;
  organizerId: string;
  startTime: string;
  endTime: string;
  type: string;
}

export interface EngagementScoreUpdatedPayload {
  contactId: string;
  previousScore: number;
  newScore: number;
  trigger: string;
}

