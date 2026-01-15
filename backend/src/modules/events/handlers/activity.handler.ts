import { logger } from '../../../shared/logger/index.js';
import { registerHandler } from '../dispatcher.js';
import { createActivity } from '../../activities/service.js';
import { 
  EventTypes, 
  type DomainEvent, 
  type EmailSentPayload, 
  type EmailOpenedPayload, 
  type EmailClickedPayload,
  type MeetingScheduledPayload,
} from '../types.js';
import type { CustomerId } from '../../../shared/types/index.js';

const handlerLogger = logger.child({ module: 'activity-handler' });

/**
 * Handle email sent - create activity record
 */
async function handleEmailSent(event: DomainEvent<EmailSentPayload>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'email_sent',
    title: `Email sent: ${event.payload.subject}`,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    userId: event.metadata.userId,
    sourceType: 'email',
    sourceId: event.payload.emailId,
    occurredAt: event.occurredAt,
    metadata: {
      toEmail: event.payload.toEmail,
      subject: event.payload.subject,
      sequenceId: event.payload.sequenceId,
      sequenceStep: event.payload.sequenceStepNumber,
    },
  });

  handlerLogger.debug({ emailId: event.payload.emailId }, 'Created activity for email sent');
}

/**
 * Handle email opened - create activity record
 */
async function handleEmailOpened(event: DomainEvent<EmailOpenedPayload>): Promise<void> {
  // Only create activity for first open
  if (!event.payload.firstOpen) return;

  await createActivity(event.customerId, {
    type: 'email_opened',
    title: 'Email opened',
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'email',
    sourceId: event.payload.emailId,
    occurredAt: event.occurredAt,
    metadata: {
      openCount: event.payload.openCount,
    },
  });

  handlerLogger.debug({ emailId: event.payload.emailId }, 'Created activity for email opened');
}

/**
 * Handle email clicked - create activity record
 */
async function handleEmailClicked(event: DomainEvent<EmailClickedPayload>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'email_clicked',
    title: `Link clicked: ${event.payload.url}`,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'email',
    sourceId: event.payload.emailId,
    occurredAt: event.occurredAt,
    metadata: {
      url: event.payload.url,
      clickCount: event.payload.clickCount,
      firstClick: event.payload.firstClick,
    },
  });

  handlerLogger.debug({ emailId: event.payload.emailId }, 'Created activity for email clicked');
}

/**
 * Handle email replied - create activity record
 */
async function handleEmailReplied(event: DomainEvent<{ emailId: string; contactId?: string; accountId?: string }>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'email_replied',
    title: 'Email replied',
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'email',
    sourceId: event.payload.emailId,
    occurredAt: event.occurredAt,
  });

  handlerLogger.debug({ emailId: event.payload.emailId }, 'Created activity for email replied');
}

/**
 * Handle email bounced - create activity record
 */
async function handleEmailBounced(event: DomainEvent<{ emailId: string; contactId?: string; accountId?: string; bounceType?: string }>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'email_bounced',
    title: `Email bounced (${event.payload.bounceType || 'unknown'})`,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'email',
    sourceId: event.payload.emailId,
    occurredAt: event.occurredAt,
    metadata: {
      bounceType: event.payload.bounceType,
    },
  });

  handlerLogger.debug({ emailId: event.payload.emailId }, 'Created activity for email bounced');
}

/**
 * Handle meeting proposed - create activity record
 */
async function handleMeetingProposed(event: DomainEvent<MeetingScheduledPayload>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'meeting_scheduled',
    title: `Meeting proposed: ${event.payload.type}`,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    userId: event.payload.organizerId,
    sourceType: 'meeting',
    sourceId: event.payload.meetingId,
    occurredAt: event.occurredAt,
    metadata: {
      startTime: event.payload.startTime,
      endTime: event.payload.endTime,
      type: event.payload.type,
    },
  });

  handlerLogger.debug({ meetingId: event.payload.meetingId }, 'Created activity for meeting proposed');
}

/**
 * Handle meeting confirmed - create activity record
 */
async function handleMeetingConfirmed(event: DomainEvent<MeetingScheduledPayload>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'meeting_confirmed',
    title: 'Meeting confirmed',
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    userId: event.payload.organizerId,
    sourceType: 'meeting',
    sourceId: event.payload.meetingId,
    occurredAt: event.occurredAt,
    metadata: {
      startTime: event.payload.startTime,
      endTime: event.payload.endTime,
    },
  });

  handlerLogger.debug({ meetingId: event.payload.meetingId }, 'Created activity for meeting confirmed');
}

/**
 * Handle meeting completed - create activity record
 */
async function handleMeetingCompleted(event: DomainEvent<{ meetingId: string; contactId?: string; accountId?: string; notes?: string }>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'meeting_completed',
    title: 'Meeting completed',
    description: event.payload.notes,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'meeting',
    sourceId: event.payload.meetingId,
    occurredAt: event.occurredAt,
  });

  handlerLogger.debug({ meetingId: event.payload.meetingId }, 'Created activity for meeting completed');
}

/**
 * Handle meeting cancelled - create activity record
 */
async function handleMeetingCancelled(event: DomainEvent<{ meetingId: string; contactId?: string; accountId?: string; reason?: string }>): Promise<void> {
  await createActivity(event.customerId, {
    type: 'meeting_cancelled',
    title: 'Meeting cancelled',
    description: event.payload.reason,
    contactId: event.payload.contactId,
    accountId: event.payload.accountId,
    sourceType: 'meeting',
    sourceId: event.payload.meetingId,
    occurredAt: event.occurredAt,
  });

  handlerLogger.debug({ meetingId: event.payload.meetingId }, 'Created activity for meeting cancelled');
}

/**
 * Register all activity handlers (for in-process dispatcher)
 */
export function registerActivityHandlers(): void {
  registerHandler(EventTypes.EMAIL_SENT, handleEmailSent);
  registerHandler(EventTypes.EMAIL_OPENED, handleEmailOpened);
  registerHandler(EventTypes.EMAIL_CLICKED, handleEmailClicked);
  registerHandler(EventTypes.EMAIL_REPLIED, handleEmailReplied);
  registerHandler(EventTypes.EMAIL_BOUNCED, handleEmailBounced);
  registerHandler(EventTypes.MEETING_PROPOSED, handleMeetingProposed);
  registerHandler(EventTypes.MEETING_CONFIRMED, handleMeetingConfirmed);
  registerHandler(EventTypes.MEETING_COMPLETED, handleMeetingCompleted);
  registerHandler(EventTypes.MEETING_CANCELLED, handleMeetingCancelled);

  handlerLogger.info('Registered activity event handlers');
}

// ─────────────────────────────────────────────────────────────
// Kafka-compatible handlers (for use with kafka-consumer)
// ─────────────────────────────────────────────────────────────

interface KafkaEventMessage {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata: {
    customerId: string;
    userId?: string;
  };
  occurredAt: string;
}

function toCustomerId(id: string): CustomerId {
  return id as CustomerId;
}

export const activityHandler = {
  // Account events
  async onAccountCreated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'account_created',
      title: `Account created: ${event.payload.name || 'Unknown'}`,
      accountId: event.aggregateId,
      userId: event.metadata.userId,
      sourceType: 'account',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: event.payload,
    });
  },

  async onAccountUpdated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'account_updated',
      title: `Account updated`,
      accountId: event.aggregateId,
      userId: event.metadata.userId,
      sourceType: 'account',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: event.payload,
    });
  },

  async onAccountDeleted(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'account_deleted',
      title: `Account deleted`,
      accountId: event.aggregateId,
      userId: event.metadata.userId,
      sourceType: 'account',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  // Contact events
  async onContactCreated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'contact_created',
      title: `Contact created: ${event.payload.firstName || ''} ${event.payload.lastName || ''}`.trim() || 'Unknown',
      contactId: event.aggregateId,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'contact',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: event.payload,
    });
  },

  async onContactUpdated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'contact_updated',
      title: `Contact updated`,
      contactId: event.aggregateId,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'contact',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: event.payload,
    });
  },

  async onContactDeleted(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'contact_deleted',
      title: `Contact deleted`,
      contactId: event.aggregateId,
      userId: event.metadata.userId,
      sourceType: 'contact',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  // Opportunity events
  async onOpportunityCreated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'opportunity_created',
      title: `Opportunity created: ${event.payload.name || 'Unknown'}`,
      contactId: event.payload.primaryContactId as string | undefined,
      accountId: event.payload.accountId as string,
      userId: event.metadata.userId,
      sourceType: 'opportunity',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        stage: event.payload.stage,
        amount: event.payload.amount,
      },
    });
  },

  async onOpportunityUpdated(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'opportunity_updated',
      title: `Opportunity updated`,
      accountId: event.payload.accountId as string,
      userId: event.metadata.userId,
      sourceType: 'opportunity',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: event.payload,
    });
  },

  async onOpportunityStageChanged(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'opportunity_stage_changed',
      title: `Stage changed: ${event.payload.previousStage} → ${event.payload.newStage}`,
      accountId: event.payload.accountId as string,
      userId: event.metadata.userId,
      sourceType: 'opportunity',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        previousStage: event.payload.previousStage,
        newStage: event.payload.newStage,
      },
    });
  },

  async onOpportunityWon(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'opportunity_won',
      title: `🎉 Opportunity won!`,
      accountId: event.payload.accountId as string,
      userId: event.metadata.userId,
      sourceType: 'opportunity',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        amount: event.payload.amount,
      },
    });
  },

  async onOpportunityLost(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'opportunity_lost',
      title: `Opportunity lost`,
      description: event.payload.lostReason as string | undefined,
      accountId: event.payload.accountId as string,
      userId: event.metadata.userId,
      sourceType: 'opportunity',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        lostReason: event.payload.lostReason,
      },
    });
  },

  // Email events (Kafka-compatible versions)
  async onEmailSent(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'email_sent',
      title: `Email sent: ${event.payload.subject || 'No subject'}`,
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'email',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        toEmail: event.payload.toEmail,
        subject: event.payload.subject,
      },
    });
  },

  async onEmailOpened(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'email_opened',
      title: 'Email opened',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      sourceType: 'email',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        openCount: event.payload.openCount,
      },
    });
  },

  async onEmailClicked(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'email_clicked',
      title: `Link clicked`,
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      sourceType: 'email',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        url: event.payload.url,
      },
    });
  },

  async onEmailReplied(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'email_replied',
      title: 'Email replied',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      sourceType: 'email',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  async onEmailBounced(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'email_bounced',
      title: `Email bounced (${event.payload.bounceType || 'unknown'})`,
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      sourceType: 'email',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        bounceType: event.payload.bounceType,
      },
    });
  },

  // Meeting events (Kafka-compatible versions)
  async onMeetingProposed(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'meeting_proposed',
      title: `Meeting proposed: ${event.payload.title || 'Untitled'}`,
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'meeting',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
      metadata: {
        startTime: event.payload.startTime,
        endTime: event.payload.endTime,
      },
    });
  },

  async onMeetingConfirmed(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'meeting_confirmed',
      title: 'Meeting confirmed',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'meeting',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  async onMeetingCompleted(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'meeting_completed',
      title: 'Meeting completed',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'meeting',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  async onMeetingCancelled(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'meeting_cancelled',
      title: 'Meeting cancelled',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'meeting',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },

  async onMeetingNoShow(event: KafkaEventMessage): Promise<void> {
    await createActivity(toCustomerId(event.metadata.customerId), {
      type: 'meeting_no_show',
      title: 'Meeting no-show',
      contactId: event.payload.contactId as string | undefined,
      accountId: event.payload.accountId as string | undefined,
      userId: event.metadata.userId,
      sourceType: 'meeting',
      sourceId: event.aggregateId,
      occurredAt: new Date(event.occurredAt),
    });
  },
};

