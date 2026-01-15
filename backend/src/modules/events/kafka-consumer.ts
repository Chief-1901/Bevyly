/**
 * Kafka Event Consumer
 * 
 * Consumes events from Kafka topics and routes them to handlers.
 * Implements idempotent processing using the processed_events table.
 */

import type { Consumer, EachMessagePayload } from 'kafkajs';
import { eq } from 'drizzle-orm';
import { createConsumer, disconnectKafka } from '../../shared/kafka/client.js';
import { createLogger } from '../../shared/logger/index.js';
import { config } from '../../shared/config/index.js';
import { getDb } from '../../shared/db/client.js';
import { processedEvents } from '../../shared/db/schema/outbox.js';
import { sleep } from '../../shared/utils/index.js';
import { activityHandler } from './handlers/activity.handler.js';
import { engagementHandler } from './handlers/engagement.handler.js';

const consumerLogger = createLogger({ module: 'kafka-consumer' });

interface EventMessage {
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata: {
    customerId: string;
    userId?: string;
    correlationId?: string;
    publishedAt: string;
  };
  occurredAt: string;
}

// Event handler type
type EventHandler = (event: EventMessage) => Promise<void>;

// Topic to handler mapping
const EVENT_HANDLERS: Record<string, EventHandler[]> = {
  // Account events
  'account.created': [activityHandler.onAccountCreated],
  'account.updated': [activityHandler.onAccountUpdated],
  'account.deleted': [activityHandler.onAccountDeleted],

  // Contact events
  'contact.created': [activityHandler.onContactCreated, engagementHandler.onContactCreated],
  'contact.updated': [activityHandler.onContactUpdated],
  'contact.deleted': [activityHandler.onContactDeleted],

  // Opportunity events
  'opportunity.created': [activityHandler.onOpportunityCreated],
  'opportunity.updated': [activityHandler.onOpportunityUpdated],
  'opportunity.stage_changed': [activityHandler.onOpportunityStageChanged],
  'opportunity.won': [activityHandler.onOpportunityWon],
  'opportunity.lost': [activityHandler.onOpportunityLost],

  // Email events
  'email.sent': [activityHandler.onEmailSent, engagementHandler.onEmailSent],
  'email.opened': [activityHandler.onEmailOpened, engagementHandler.onEmailOpened],
  'email.clicked': [activityHandler.onEmailClicked, engagementHandler.onEmailClicked],
  'email.replied': [activityHandler.onEmailReplied, engagementHandler.onEmailReplied],
  'email.bounced': [activityHandler.onEmailBounced],

  // Meeting events
  'meeting.proposed': [activityHandler.onMeetingProposed],
  'meeting.confirmed': [activityHandler.onMeetingConfirmed, engagementHandler.onMeetingConfirmed],
  'meeting.completed': [activityHandler.onMeetingCompleted, engagementHandler.onMeetingCompleted],
  'meeting.cancelled': [activityHandler.onMeetingCancelled],
  'meeting.no_show': [activityHandler.onMeetingNoShow],

  // Engagement events
  'engagement.score_updated': [engagementHandler.onScoreUpdated],
  'engagement.intent_signal_detected': [engagementHandler.onIntentSignal],
};

// All topics to subscribe to
const ALL_TOPICS = Object.keys(EVENT_HANDLERS);

let consumer: Consumer | null = null;
let isRunning = false;

/**
 * Check if an event has already been processed
 */
async function isAlreadyProcessed(eventId: string): Promise<boolean> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, eventId))
    .limit(1);

  return !!existing;
}

/**
 * Mark an event as processed
 */
async function markAsProcessed(eventId: string, eventType: string): Promise<void> {
  const db = getDb();

  await db.insert(processedEvents).values({
    eventId,
    eventType,
  }).onConflictDoNothing();
}

/**
 * Parse and validate event message
 */
function parseEventMessage(message: EachMessagePayload['message']): EventMessage | null {
  if (!message.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(message.value.toString());

    if (!parsed.eventId || !parsed.eventType) {
      consumerLogger.warn({ parsed }, 'Invalid event message format');
      return null;
    }

    return parsed as EventMessage;
  } catch (error) {
    consumerLogger.error({ error }, 'Failed to parse event message');
    return null;
  }
}

/**
 * Process a single message
 */
async function processMessage(payload: EachMessagePayload): Promise<void> {
  const { topic, partition, message } = payload;

  const event = parseEventMessage(message);
  if (!event) {
    consumerLogger.warn({ topic, partition }, 'Skipping invalid message');
    return;
  }

  const logContext = {
    eventId: event.eventId,
    eventType: event.eventType,
    topic,
    partition,
    offset: message.offset,
  };

  // Idempotency check
  if (await isAlreadyProcessed(event.eventId)) {
    consumerLogger.debug(logContext, 'Event already processed, skipping');
    return;
  }

  consumerLogger.debug(logContext, 'Processing event');

  // Get handlers for this event type
  const handlers = EVENT_HANDLERS[topic] || [];

  if (handlers.length === 0) {
    consumerLogger.warn(logContext, 'No handlers registered for topic');
    await markAsProcessed(event.eventId, event.eventType);
    return;
  }

  // Run all handlers
  const results = await Promise.allSettled(
    handlers.map(handler => handler(event))
  );

  // Check for failures
  const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
  
  if (failures.length > 0) {
    consumerLogger.error(
      { 
        ...logContext, 
        errors: failures.map(f => f.reason?.message || 'Unknown error'),
      },
      'Some event handlers failed'
    );
    // Don't mark as processed if any handler failed
    // The consumer will receive this message again (depending on commit strategy)
    throw new Error(`${failures.length} handler(s) failed`);
  }

  // All handlers succeeded, mark as processed
  await markAsProcessed(event.eventId, event.eventType);
  
  consumerLogger.debug(logContext, 'Event processed successfully');
}

/**
 * Start the Kafka consumer
 */
export async function startKafkaConsumer(options: {
  groupId?: string;
  topics?: string[];
} = {}): Promise<void> {
  if (isRunning) {
    consumerLogger.warn('Kafka consumer already running');
    return;
  }

  if (!config.kafkaEnabled) {
    consumerLogger.info('Kafka consumer disabled, events will be handled in-process');
    return;
  }

  const groupId = options.groupId || 'salesos-event-handlers';
  const topics = options.topics || ALL_TOPICS;

  consumerLogger.info({ groupId, topics: topics.length }, 'Starting Kafka consumer');

  // Create consumer
  consumer = createConsumer(groupId);

  // Connect and subscribe
  let retries = 0;
  while (retries < 30) {
    try {
      await consumer.connect();
      break;
    } catch (error) {
      consumerLogger.warn({ retries, error }, 'Waiting to connect to Kafka...');
      await sleep(2000);
      retries++;
    }
  }

  await consumer.subscribe({ 
    topics,
    fromBeginning: false, // Only process new messages
  });

  isRunning = true;

  // Start consuming
  await consumer.run({
    autoCommit: true,
    autoCommitInterval: 5000,
    eachMessage: async (payload) => {
      try {
        await processMessage(payload);
      } catch (error) {
        consumerLogger.error(
          { 
            topic: payload.topic,
            partition: payload.partition,
            offset: payload.message.offset,
            error,
          },
          'Error processing message'
        );
        // Depending on your error handling strategy:
        // - You could pause the partition and retry
        // - Send to dead letter queue
        // - Skip and continue
      }
    },
  });

  consumerLogger.info({ groupId }, 'Kafka consumer started');
}

/**
 * Stop the Kafka consumer
 */
export async function stopKafkaConsumer(): Promise<void> {
  consumerLogger.info('Stopping Kafka consumer');
  isRunning = false;
  
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }

  consumerLogger.info('Kafka consumer stopped');
}

/**
 * Check if consumer is running
 */
export function isConsumerRunning(): boolean {
  return isRunning;
}

