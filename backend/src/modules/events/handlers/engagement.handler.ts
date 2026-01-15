import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../shared/db/client.js';
import { engagementScores } from '../../../shared/db/schema/engagement.js';
import { contacts } from '../../../shared/db/schema/contacts.js';
import { generateId } from '../../../shared/utils/id.js';
import { logger } from '../../../shared/logger/index.js';
import { registerHandler } from '../dispatcher.js';
import { writeToOutbox, createEvent } from '../outbox.js';
import { EventTypes, AggregateTypes, type DomainEvent, type EmailOpenedPayload, type EmailClickedPayload, type EmailSentPayload } from '../types.js';
import type { CustomerId, ContactId } from '../../../shared/types/index.js';

const handlerLogger = logger.child({ module: 'engagement-handler' });

// Scoring weights
const SCORE_WEIGHTS = {
  emailSent: 1,
  emailOpened: 5,
  emailClicked: 10,
  emailReplied: 25,
  meetingScheduled: 20,
  meetingCompleted: 30,
};

/**
 * Calculate engagement score for a contact
 */
async function calculateEngagementScore(
  customerId: CustomerId,
  contactId: ContactId
): Promise<{ score: number; components: Record<string, number> }> {
  const db = getDb();

  // Get current score record
  const [currentScore] = await db
    .select()
    .from(engagementScores)
    .where(
      and(
        eq(engagementScores.customerId, customerId),
        eq(engagementScores.contactId, contactId)
      )
    )
    .limit(1);

  // Calculate component scores
  const emailScore = Math.min(
    100,
    (currentScore?.emailsOpened || 0) * SCORE_WEIGHTS.emailOpened +
    (currentScore?.emailsClicked || 0) * SCORE_WEIGHTS.emailClicked +
    (currentScore?.emailsReplied || 0) * SCORE_WEIGHTS.emailReplied
  );

  const meetingScore = Math.min(
    100,
    (currentScore?.meetingsCompleted || 0) * SCORE_WEIGHTS.meetingCompleted +
    (currentScore?.meetingsScheduled || 0) * SCORE_WEIGHTS.meetingScheduled
  );

  // Recency score - decay based on last activity
  let recencyScore = 100;
  if (currentScore?.lastActivityAt) {
    const daysSinceActivity = Math.floor(
      (Date.now() - currentScore.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    recencyScore = Math.max(0, 100 - daysSinceActivity * 5);
  }

  // Frequency score - based on total interactions
  const totalInteractions = 
    (currentScore?.emailsSent || 0) +
    (currentScore?.emailsOpened || 0) +
    (currentScore?.meetingsScheduled || 0);
  const frequencyScore = Math.min(100, totalInteractions * 3);

  // Calculate weighted overall score
  const overallScore = Math.round(
    emailScore * 0.3 +
    meetingScore * 0.3 +
    recencyScore * 0.2 +
    frequencyScore * 0.2
  );

  return {
    score: overallScore,
    components: {
      emailScore,
      meetingScore,
      recencyScore,
      frequencyScore,
    },
  };
}

/**
 * Update engagement score for a contact
 */
async function updateEngagementScore(
  customerId: CustomerId,
  contactId: ContactId,
  trigger: string,
  updates: Partial<{
    emailsSent: number;
    emailsOpened: number;
    emailsClicked: number;
    emailsReplied: number;
    meetingsScheduled: number;
    meetingsCompleted: number;
  }>
): Promise<void> {
  const db = getDb();

  // Get or create engagement score record
  let [scoreRecord] = await db
    .select()
    .from(engagementScores)
    .where(
      and(
        eq(engagementScores.customerId, customerId),
        eq(engagementScores.contactId, contactId)
      )
    )
    .limit(1);

  const previousScore = scoreRecord?.score || 0;

  if (!scoreRecord) {
    // Create new record
    const id = generateId();
    [scoreRecord] = await db
      .insert(engagementScores)
      .values({
        id,
        customerId,
        contactId,
        score: 0,
        lastActivityAt: new Date(),
      })
      .returning();
  }

  // Apply incremental updates
  const newValues: Record<string, unknown> = {
    lastActivityAt: new Date(),
    updatedAt: new Date(),
    lastCalculatedAt: new Date(),
  };

  if (updates.emailsSent) {
    newValues.emailsSent = (scoreRecord.emailsSent || 0) + updates.emailsSent;
  }
  if (updates.emailsOpened) {
    newValues.emailsOpened = (scoreRecord.emailsOpened || 0) + updates.emailsOpened;
  }
  if (updates.emailsClicked) {
    newValues.emailsClicked = (scoreRecord.emailsClicked || 0) + updates.emailsClicked;
  }
  if (updates.emailsReplied) {
    newValues.emailsReplied = (scoreRecord.emailsReplied || 0) + updates.emailsReplied;
  }
  if (updates.meetingsScheduled) {
    newValues.meetingsScheduled = (scoreRecord.meetingsScheduled || 0) + updates.meetingsScheduled;
  }
  if (updates.meetingsCompleted) {
    newValues.meetingsCompleted = (scoreRecord.meetingsCompleted || 0) + updates.meetingsCompleted;
  }

  // Update record
  await db
    .update(engagementScores)
    .set(newValues)
    .where(eq(engagementScores.id, scoreRecord.id));

  // Recalculate total score
  const { score: newScore, components } = await calculateEngagementScore(customerId, contactId);

  // Determine trend
  let trend = 'stable';
  if (newScore > previousScore + 5) trend = 'increasing';
  else if (newScore < previousScore - 5) trend = 'decreasing';

  // Update final score and trend
  await db
    .update(engagementScores)
    .set({
      score: newScore,
      previousScore,
      trend,
      emailScore: components.emailScore,
      meetingScore: components.meetingScore,
      recencyScore: components.recencyScore,
      frequencyScore: components.frequencyScore,
    })
    .where(eq(engagementScores.id, scoreRecord.id));

  // Also update last activity on contact
  await db
    .update(contacts)
    .set({ lastActivityAt: new Date() })
    .where(eq(contacts.id, contactId));

  // Emit score updated event if significant change
  if (Math.abs(newScore - previousScore) >= 5) {
    await writeToOutbox(
      createEvent(
        EventTypes.ENGAGEMENT_SCORE_UPDATED,
        AggregateTypes.ENGAGEMENT,
        contactId,
        customerId,
        {
          contactId,
          previousScore,
          newScore,
          trigger,
        }
      )
    );
  }

  handlerLogger.debug(
    { contactId, previousScore, newScore, trigger },
    'Engagement score updated'
  );
}

// ─────────────────────────────────────────────────────────────
// Event handlers
// ─────────────────────────────────────────────────────────────

/**
 * Handle email sent events
 */
async function handleEmailSent(event: DomainEvent<EmailSentPayload>): Promise<void> {
  if (!event.payload.contactId) return;

  await updateEngagementScore(
    event.customerId,
    event.payload.contactId as ContactId,
    'email_sent',
    { emailsSent: 1 }
  );
}

/**
 * Handle email opened events
 */
async function handleEmailOpened(event: DomainEvent<EmailOpenedPayload>): Promise<void> {
  if (!event.payload.contactId) return;
  
  // Only count first open
  if (!event.payload.firstOpen) return;

  await updateEngagementScore(
    event.customerId,
    event.payload.contactId as ContactId,
    'email_opened',
    { emailsOpened: 1 }
  );
}

/**
 * Handle email clicked events
 */
async function handleEmailClicked(event: DomainEvent<EmailClickedPayload>): Promise<void> {
  if (!event.payload.contactId) return;
  
  // Only count first click
  if (!event.payload.firstClick) return;

  await updateEngagementScore(
    event.customerId,
    event.payload.contactId as ContactId,
    'email_clicked',
    { emailsClicked: 1 }
  );
}

/**
 * Handle meeting confirmed events
 */
async function handleMeetingConfirmed(event: DomainEvent<{ contactId?: string }>): Promise<void> {
  if (!event.payload.contactId) return;

  await updateEngagementScore(
    event.customerId,
    event.payload.contactId as ContactId,
    'meeting_scheduled',
    { meetingsScheduled: 1 }
  );
}

/**
 * Handle meeting completed events
 */
async function handleMeetingCompleted(event: DomainEvent<{ contactId?: string }>): Promise<void> {
  if (!event.payload.contactId) return;

  await updateEngagementScore(
    event.customerId,
    event.payload.contactId as ContactId,
    'meeting_completed',
    { meetingsCompleted: 1 }
  );
}

/**
 * Register all engagement handlers (for in-process dispatcher)
 */
export function registerEngagementHandlers(): void {
  registerHandler(EventTypes.EMAIL_SENT, handleEmailSent);
  registerHandler(EventTypes.EMAIL_OPENED, handleEmailOpened);
  registerHandler(EventTypes.EMAIL_CLICKED, handleEmailClicked);
  registerHandler(EventTypes.MEETING_CONFIRMED, handleMeetingConfirmed);
  registerHandler(EventTypes.MEETING_COMPLETED, handleMeetingCompleted);

  handlerLogger.info('Registered engagement event handlers');
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

function toContactId(id: string): ContactId {
  return id as ContactId;
}

export const engagementHandler = {
  async onContactCreated(event: KafkaEventMessage): Promise<void> {
    // Initialize engagement score for new contact
    const db = getDb();
    const id = generateId();
    
    await db.insert(engagementScores).values({
      id,
      customerId: event.metadata.customerId,
      contactId: event.aggregateId,
      score: 0,
      lastActivityAt: new Date(event.occurredAt),
    }).onConflictDoNothing();

    handlerLogger.debug({ contactId: event.aggregateId }, 'Initialized engagement score for new contact');
  },

  async onEmailSent(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'email_sent',
      { emailsSent: 1 }
    );
  },

  async onEmailOpened(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'email_opened',
      { emailsOpened: 1 }
    );
  },

  async onEmailClicked(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'email_clicked',
      { emailsClicked: 1 }
    );
  },

  async onEmailReplied(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'email_replied',
      { emailsReplied: 1 }
    );
  },

  async onMeetingConfirmed(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'meeting_scheduled',
      { meetingsScheduled: 1 }
    );
  },

  async onMeetingCompleted(event: KafkaEventMessage): Promise<void> {
    const contactId = event.payload.contactId as string | undefined;
    if (!contactId) return;

    await updateEngagementScore(
      toCustomerId(event.metadata.customerId),
      toContactId(contactId),
      'meeting_completed',
      { meetingsCompleted: 1 }
    );
  },

  async onScoreUpdated(event: KafkaEventMessage): Promise<void> {
    // This is informational - can be used for notifications, webhooks, etc.
    handlerLogger.debug(
      {
        contactId: event.payload.contactId,
        previousScore: event.payload.previousScore,
        newScore: event.payload.newScore,
      },
      'Engagement score updated event received'
    );
  },

  async onIntentSignal(event: KafkaEventMessage): Promise<void> {
    // Handle intent signal detection
    // Can trigger automations, notifications, etc.
    handlerLogger.debug(
      {
        contactId: event.payload.contactId,
        signalType: event.payload.signalType,
        strength: event.payload.strength,
      },
      'Intent signal detected'
    );
  },
};

