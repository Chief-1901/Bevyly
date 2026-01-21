/**
 * Intent Signals Event Handler
 * 
 * Generates and manages intent signals in response to Kafka events.
 * Signals are created when certain patterns are detected:
 * - deal_stalled: Opportunity has no activity for 14+ days
 * - leads_ready: New leads are created
 * - followup_needed: Meeting completed without follow-up activity
 * - high_engagement: Contact engagement score crosses threshold
 */

import { eq, and, sql } from 'drizzle-orm';
import { getDb } from '../../../shared/db/client.js';
import { signals } from '../../../shared/db/schema/signals.js';
import { opportunities } from '../../../shared/db/schema/opportunities.js';
import { createLogger } from '../../../shared/logger/index.js';
import { generateSignalId } from '../../../shared/utils/id.js';
import type { CustomerId, OpportunityId, SignalId } from '../../../shared/types/index.js';
import type { SignalType, Severity, Signal } from '../../../shared/db/schema/signals.js';

const handlerLogger = createLogger({ module: 'intent-signals-handler' });

// ─────────────────────────────────────────────────────────────
// Types
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

interface UpsertSignalInput {
  customerId: string;
  entityType: string;
  entityId: string;
  signalType: SignalType;
  severity: Severity;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  expiresInDays?: number;
}

// ─────────────────────────────────────────────────────────────
// Signal Upsert/Resolve Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create or update a signal (idempotent - won't create duplicates)
 */
async function upsertSignal(input: UpsertSignalInput): Promise<Signal | null> {
  const db = getDb();

  // Check for existing active signal of same type for same entity
  const [existing] = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.customerId, input.customerId),
        eq(signals.entityType, input.entityType),
        eq(signals.entityId, input.entityId),
        eq(signals.signalType, input.signalType),
        eq(signals.status, 'active')
      )
    )
    .limit(1);

  if (existing) {
    handlerLogger.debug(
      { signalId: existing.id, signalType: input.signalType },
      'Signal already exists, skipping creation'
    );
    return existing;
  }

  // Create new signal
  const id = generateSignalId();
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const [signal] = await db
    .insert(signals)
    .values({
      id,
      customerId: input.customerId,
      entityType: input.entityType,
      entityId: input.entityId,
      signalType: input.signalType,
      severity: input.severity,
      title: input.title,
      description: input.description || null,
      data: input.data || {},
      status: 'active',
      expiresAt,
    })
    .returning();

  handlerLogger.info(
    { signalId: signal.id, signalType: signal.signalType, entityId: input.entityId },
    'Created new intent signal'
  );

  return signal;
}

/**
 * Resolve a signal (mark it as no longer active)
 */
async function resolveSignalByEntity(
  customerId: string,
  entityType: string,
  entityId: string,
  signalType: SignalType,
  status: 'resolved' | 'dismissed' = 'resolved'
): Promise<Signal | null> {
  const db = getDb();

  const [updated] = await db
    .update(signals)
    .set({
      status,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(signals.customerId, customerId),
        eq(signals.entityType, entityType),
        eq(signals.entityId, entityId),
        eq(signals.signalType, signalType),
        eq(signals.status, 'active')
      )
    )
    .returning();

  if (updated) {
    handlerLogger.info(
      { signalId: updated.id, signalType, entityId },
      'Resolved intent signal'
    );
  }

  return updated || null;
}

// ─────────────────────────────────────────────────────────────
// Opportunity Handlers
// ─────────────────────────────────────────────────────────────

/**
 * When an opportunity is created, check if it needs attention
 */
async function onOpportunityCreated(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { amount, stage, name } = event.payload;

  // Signal for high-value opportunities that need quick action
  if (typeof amount === 'number' && amount >= 100000 * 100) { // $100k+
    await upsertSignal({
      customerId,
      entityType: 'opportunity',
      entityId: event.aggregateId,
      signalType: 'high_intent',
      severity: 'high',
      title: `High-value opportunity created: ${name}`,
      description: 'This high-value opportunity requires immediate attention.',
      data: {
        opportunityId: event.aggregateId,
        opportunityName: name,
        amount,
        stage,
      },
      expiresInDays: 7,
    });
  }
}

/**
 * When an opportunity is updated, check/resolve stalled signals
 */
async function onOpportunityUpdated(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;

  // Any update to an opportunity should resolve its "stalled" signal
  await resolveSignalByEntity(
    customerId,
    'opportunity',
    event.aggregateId,
    'deal_stalled',
    'resolved'
  );
}

/**
 * When opportunity stage changes, update signals accordingly
 */
async function onOpportunityStageChanged(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { newStage, previousStage, name, amount } = event.payload;

  // Resolve any stalled signals since stage changed
  await resolveSignalByEntity(
    customerId,
    'opportunity',
    event.aggregateId,
    'deal_stalled',
    'resolved'
  );

  // If moved to negotiation stage, create high priority signal
  if (newStage === 'negotiation' && previousStage !== 'negotiation') {
    await upsertSignal({
      customerId,
      entityType: 'opportunity',
      entityId: event.aggregateId,
      signalType: 'high_intent',
      severity: 'high',
      title: `"${name}" is now in negotiation`,
      description: 'This deal has moved to negotiation stage and may need contract preparation.',
      data: {
        opportunityId: event.aggregateId,
        opportunityName: name,
        amount,
        previousStage,
        newStage,
      },
      expiresInDays: 14,
    });
  }
}

/**
 * When opportunity is won, create celebration/follow-up signal
 */
async function onOpportunityWon(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { name, amount } = event.payload;

  // Resolve any existing signals for this opportunity
  await resolveSignalByEntity(customerId, 'opportunity', event.aggregateId, 'deal_stalled', 'resolved');
  await resolveSignalByEntity(customerId, 'opportunity', event.aggregateId, 'high_intent', 'resolved');

  // Create follow-up signal for onboarding
  await upsertSignal({
    customerId,
    entityType: 'opportunity',
    entityId: event.aggregateId,
    signalType: 'followup_needed',
    severity: 'medium',
    title: `Start onboarding for closed deal: ${name}`,
    description: 'This deal has been won. Time to start the customer onboarding process.',
    data: {
      opportunityId: event.aggregateId,
      opportunityName: name,
      amount,
      action: 'onboarding',
    },
    expiresInDays: 7,
  });
}

/**
 * When opportunity is lost, resolve all signals
 */
async function onOpportunityLost(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;

  // Resolve all signals for this opportunity
  await resolveSignalByEntity(customerId, 'opportunity', event.aggregateId, 'deal_stalled', 'dismissed');
  await resolveSignalByEntity(customerId, 'opportunity', event.aggregateId, 'high_intent', 'dismissed');
}

// ─────────────────────────────────────────────────────────────
// Activity Handlers (for resolving stalled signals)
// ─────────────────────────────────────────────────────────────

/**
 * When activity is logged on an opportunity, resolve stalled signal
 */
async function onActivityLogged(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { opportunityId } = event.payload;

  if (opportunityId && typeof opportunityId === 'string') {
    await resolveSignalByEntity(
      customerId,
      'opportunity',
      opportunityId,
      'deal_stalled',
      'resolved'
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Lead Handlers
// ─────────────────────────────────────────────────────────────

/**
 * When a lead is created, potentially create a leads_ready signal
 */
async function onLeadCreated(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { source, companyName, campaignId, fitScore } = event.payload;

  const entityId = campaignId ? String(campaignId) : String(source || 'manual');

  // Create signal for new leads (batched by source/campaign)
  await upsertSignal({
    customerId,
    entityType: 'leads',
    entityId,
    signalType: 'leads_ready',
    severity: fitScore && Number(fitScore) >= 70 ? 'high' : 'medium',
    title: `New lead ready for review: ${companyName}`,
    description: `A new lead from ${source || 'manual entry'} needs qualification.`,
    data: {
      source,
      campaignId,
      latestLeadId: event.aggregateId,
      latestCompany: companyName,
      fitScore,
    },
    expiresInDays: 3,
  });
}

/**
 * When a lead is converted, resolve the leads_ready signal
 */
async function onLeadConverted(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { source, campaignId } = event.payload;

  const entityId = campaignId ? String(campaignId) : String(source || 'manual');

  // Resolve the signal - lead has been processed
  await resolveSignalByEntity(
    customerId,
    'leads',
    entityId,
    'leads_ready',
    'resolved'
  );
}

// ─────────────────────────────────────────────────────────────
// Meeting Handlers
// ─────────────────────────────────────────────────────────────

/**
 * When a meeting is completed, create follow-up signal if needed
 */
async function onMeetingCompleted(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { title, contactId, accountId } = event.payload;

  // Create follow-up signal
  await upsertSignal({
    customerId,
    entityType: 'meeting',
    entityId: event.aggregateId,
    signalType: 'followup_needed',
    severity: 'medium',
    title: `Follow up after meeting: ${title}`,
    description: 'This meeting has been completed. Consider sending a follow-up summary or scheduling next steps.',
    data: {
      meetingId: event.aggregateId,
      meetingTitle: title,
      contactId,
      accountId,
    },
    expiresInDays: 3,
  });
}

/**
 * When a meeting is marked as no-show, create high priority signal
 */
async function onMeetingNoShow(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { title, contactId, accountId } = event.payload;

  await upsertSignal({
    customerId,
    entityType: 'meeting',
    entityId: event.aggregateId,
    signalType: 'followup_needed',
    severity: 'high',
    title: `No-show: ${title}`,
    description: 'The contact did not attend this meeting. Consider reaching out to reschedule.',
    data: {
      meetingId: event.aggregateId,
      meetingTitle: title,
      contactId,
      accountId,
      action: 'reschedule',
    },
    expiresInDays: 7,
  });
}

// ─────────────────────────────────────────────────────────────
// Email Handlers
// ─────────────────────────────────────────────────────────────

/**
 * When an email is replied to, it's a strong engagement signal
 */
async function onEmailReplied(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { contactId, subject } = event.payload;

  if (!contactId) return;

  await upsertSignal({
    customerId,
    entityType: 'contact',
    entityId: String(contactId),
    signalType: 'high_engagement',
    severity: 'high',
    title: 'Contact replied to email',
    description: `The contact responded to "${subject}". This is a strong buying signal.`,
    data: {
      emailId: event.aggregateId,
      contactId,
      subject,
      engagementType: 'email_reply',
    },
    expiresInDays: 7,
  });
}

/**
 * When email bounces, it's a data quality signal
 */
async function onEmailBounced(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { contactId, toEmail, bounceType } = event.payload;

  if (!contactId) return;

  await upsertSignal({
    customerId,
    entityType: 'contact',
    entityId: String(contactId),
    signalType: 'sequence_underperforming',
    severity: 'high',
    title: `Email bounced for ${toEmail}`,
    description: 'The email address may be invalid. Consider verifying or removing this contact.',
    data: {
      emailId: event.aggregateId,
      contactId,
      toEmail,
      bounceType,
    },
    expiresInDays: 30,
  });
}

// ─────────────────────────────────────────────────────────────
// Engagement Handlers
// ─────────────────────────────────────────────────────────────

/**
 * When engagement score is updated significantly
 */
async function onEngagementScoreUpdated(event: KafkaEventMessage): Promise<void> {
  const { customerId } = event.metadata;
  const { contactId, previousScore, newScore } = event.payload;

  if (!contactId || typeof newScore !== 'number' || typeof previousScore !== 'number') return;

  // If score jumped significantly (20+ points), it's a high engagement signal
  if (newScore - previousScore >= 20) {
    await upsertSignal({
      customerId,
      entityType: 'contact',
      entityId: String(contactId),
      signalType: 'high_engagement',
      severity: 'high',
      title: 'Contact engagement spiking',
      description: `This contact's engagement score increased from ${previousScore} to ${newScore}. They may be ready for outreach.`,
      data: {
        contactId,
        previousScore,
        newScore,
        increase: newScore - previousScore,
      },
      expiresInDays: 7,
    });
  }
  
  // If score crossed 80 threshold, they're highly engaged
  if (newScore >= 80 && previousScore < 80) {
    await upsertSignal({
      customerId,
      entityType: 'contact',
      entityId: String(contactId),
      signalType: 'high_intent',
      severity: 'high',
      title: 'Contact reached high engagement',
      description: `This contact's engagement score is now ${newScore}. Consider prioritizing direct outreach.`,
      data: {
        contactId,
        score: newScore,
      },
      expiresInDays: 14,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Export handler object for Kafka consumer
// ─────────────────────────────────────────────────────────────

export const intentSignalsHandler = {
  // Opportunity events
  onOpportunityCreated,
  onOpportunityUpdated,
  onOpportunityStageChanged,
  onOpportunityWon,
  onOpportunityLost,

  // Activity events
  onActivityLogged,

  // Lead events
  onLeadCreated,
  onLeadConverted,

  // Meeting events
  onMeetingCompleted,
  onMeetingNoShow,

  // Email events
  onEmailReplied,
  onEmailBounced,

  // Engagement events
  onEngagementScoreUpdated,
};
