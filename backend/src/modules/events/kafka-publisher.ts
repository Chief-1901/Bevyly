/**
 * Outbox to Kafka Publisher
 * 
 * This worker reads events from the transactional outbox table
 * and publishes them to Kafka topics.
 * 
 * Flow:
 * 1. Business operations write events to outbox in same transaction
 * 2. This worker polls outbox for pending events
 * 3. Events are published to Kafka
 * 4. Outbox entries are marked as processed
 */

import { eq, and, asc, sql, lt } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { outbox, processedEvents } from '../../shared/db/schema/outbox.js';
import { createLogger } from '../../shared/logger/index.js';
import { config } from '../../shared/config/index.js';
import { sleep } from '../../shared/utils/index.js';
import { 
  getProducer, 
  disconnectKafka, 
  isKafkaHealthy 
} from '../../shared/kafka/client.js';
import type { Producer } from 'kafkajs';

const publisherLogger = createLogger({ module: 'kafka-publisher' });

interface OutboxEvent {
  id: number;
  eventId: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  customerId: string;
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

let isRunning = false;
let producer: Producer | null = null;

/**
 * Fetch pending events from the outbox
 */
async function fetchPendingEvents(batchSize = 100): Promise<OutboxEvent[]> {
  const db = getDb();

  const rows = await db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.createdAt))
    .limit(batchSize);

  return rows.map((row) => ({
    id: row.id,
    eventId: row.eventId,
    eventType: row.eventType,
    aggregateType: row.aggregateType,
    aggregateId: row.aggregateId,
    customerId: row.customerId,
    payload: row.payload as Record<string, unknown>,
    metadata: (row.metadata || {}) as Record<string, unknown>,
    createdAt: row.createdAt,
  }));
}

/**
 * Publish a single event to Kafka
 */
async function publishToKafka(event: OutboxEvent): Promise<void> {
  if (!producer) {
    throw new Error('Kafka producer not initialized');
  }

  const topic = event.eventType; // e.g., 'account.created'
  
  const message = {
    key: event.aggregateId,
    value: JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payload: event.payload,
      metadata: {
        ...event.metadata,
        customerId: event.customerId,
        publishedAt: new Date().toISOString(),
      },
      occurredAt: event.createdAt.toISOString(),
    }),
    headers: {
      'event-id': event.eventId,
      'event-type': event.eventType,
      'customer-id': event.customerId,
      'aggregate-type': event.aggregateType,
      'aggregate-id': event.aggregateId,
    },
  };

  await producer.send({
    topic,
    messages: [message],
  });

  publisherLogger.debug(
    { 
      eventId: event.eventId, 
      eventType: event.eventType,
      topic,
    }, 
    'Event published to Kafka'
  );
}

/**
 * Mark an outbox event as processed
 */
async function markAsProcessed(outboxId: number, eventId: string, eventType: string): Promise<void> {
  const db = getDb();

  await db.transaction(async (tx) => {
    // Update outbox status
    await tx
      .update(outbox)
      .set({
        status: 'processed',
        processedAt: new Date(),
      })
      .where(eq(outbox.id, outboxId));

    // Record in processed events for idempotency
    await tx.insert(processedEvents).values({
      eventId,
      eventType,
    }).onConflictDoNothing();
  });
}

/**
 * Mark an outbox event as failed
 */
async function markAsFailed(outboxId: number, error: string): Promise<void> {
  const db = getDb();

  await db
    .update(outbox)
    .set({
      status: 'failed',
      retryCount: sql`${outbox.retryCount} + 1`,
      errorMessage: error,
    })
    .where(eq(outbox.id, outboxId));
}

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
 * Process a batch of pending events
 */
async function processBatch(): Promise<number> {
  const events = await fetchPendingEvents(50);
  
  if (events.length === 0) {
    return 0;
  }

  publisherLogger.debug({ count: events.length }, 'Processing event batch');

  let processed = 0;

  for (const event of events) {
    try {
      // Idempotency check
      if (await isAlreadyProcessed(event.eventId)) {
        publisherLogger.debug({ eventId: event.eventId }, 'Event already processed, skipping');
        await markAsProcessed(event.id, event.eventId, event.eventType);
        continue;
      }

      // Publish to Kafka
      await publishToKafka(event);

      // Mark as processed
      await markAsProcessed(event.id, event.eventId, event.eventType);
      processed++;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      publisherLogger.error(
        { 
          eventId: event.eventId, 
          eventType: event.eventType,
          error: errorMessage,
        },
        'Failed to publish event to Kafka'
      );
      
      await markAsFailed(event.id, errorMessage);
    }
  }

  return processed;
}

/**
 * Retry failed events (after some time has passed)
 */
async function retryFailedEvents(): Promise<void> {
  const db = getDb();
  const retryAfter = new Date(Date.now() - 60000); // Retry events failed > 1 min ago

  // Reset failed events with retryCount < 5 back to pending
  await db
    .update(outbox)
    .set({
      status: 'pending',
      errorMessage: null,
    })
    .where(
      and(
        eq(outbox.status, 'failed'),
        lt(outbox.retryCount, 5),
        lt(outbox.createdAt, retryAfter)
      )
    );
}

/**
 * Start the Kafka publisher worker
 */
export async function startKafkaPublisher(options: { 
  pollInterval?: number;
  retryInterval?: number;
} = {}): Promise<void> {
  if (isRunning) {
    publisherLogger.warn('Kafka publisher already running');
    return;
  }

  // Check if Kafka is enabled
  if (!config.kafkaEnabled) {
    publisherLogger.info('Kafka publishing disabled, using in-process event handling');
    return;
  }

  const pollInterval = options.pollInterval || 1000;
  const retryInterval = options.retryInterval || 60000;
  
  isRunning = true;

  // Wait for Kafka to be available
  let retries = 0;
  while (retries < 30) {
    const healthy = await isKafkaHealthy();
    if (healthy) {
      break;
    }
    publisherLogger.warn({ retries }, 'Waiting for Kafka to be available...');
    await sleep(2000);
    retries++;
  }

  // Get producer
  try {
    producer = await getProducer();
  } catch (error) {
    publisherLogger.error({ error }, 'Failed to connect to Kafka, falling back to local dispatch');
    isRunning = false;
    return;
  }

  publisherLogger.info({ pollInterval }, 'Starting Kafka publisher');

  let lastRetryCheck = Date.now();

  while (isRunning) {
    try {
      const processed = await processBatch();
      
      // If we processed events, immediately check for more
      if (processed === 0) {
        await sleep(pollInterval);
      }

      // Periodically retry failed events
      if (Date.now() - lastRetryCheck > retryInterval) {
        await retryFailedEvents();
        lastRetryCheck = Date.now();
      }

    } catch (error) {
      publisherLogger.error({ 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Error in Kafka publisher loop');
      await sleep(pollInterval * 2);
    }
  }

  publisherLogger.info('Kafka publisher stopped');
}

/**
 * Stop the Kafka publisher
 */
export async function stopKafkaPublisher(): Promise<void> {
  publisherLogger.info('Stopping Kafka publisher');
  isRunning = false;
  await disconnectKafka();
}

/**
 * Publish events once (for testing or manual triggers)
 */
export async function publishEventsOnce(): Promise<number> {
  if (!config.kafkaEnabled) {
    return 0;
  }

  if (!producer) {
    producer = await getProducer();
  }

  return processBatch();
}

