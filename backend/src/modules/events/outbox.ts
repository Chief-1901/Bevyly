import { eq, and, sql, lt, asc } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { outbox, processedEvents } from '../../shared/db/schema/outbox.js';
import { generateId } from '../../shared/utils/id.js';
import { logger } from '../../shared/logger/index.js';
import type { DomainEvent, EventMetadata } from './types.js';
import type { CustomerId } from '../../shared/types/index.js';

/**
 * Write an event to the outbox table
 * This should be called within the same transaction as the business operation
 */
export async function writeToOutbox<T>(
  event: Omit<DomainEvent<T>, 'eventId' | 'occurredAt'> & { occurredAt?: Date }
): Promise<string> {
  const db = getDb();
  const eventId = generateId('evt');

  await db.insert(outbox).values({
    eventId,
    eventType: event.eventType,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    customerId: event.customerId,
    payload: event.payload as Record<string, unknown>,
    metadata: event.metadata,
    status: 'pending',
    createdAt: event.occurredAt || new Date(),
  });

  return eventId;
}

/**
 * Create an event object with proper structure
 */
export function createEvent<T>(
  eventType: string,
  aggregateType: string,
  aggregateId: string,
  customerId: CustomerId,
  payload: T,
  metadata: Partial<EventMetadata> = {}
): Omit<DomainEvent<T>, 'eventId' | 'occurredAt'> {
  return {
    eventType,
    aggregateType,
    aggregateId,
    customerId,
    payload,
    metadata: {
      version: 1,
      ...metadata,
    },
  };
}

/**
 * Fetch pending events from outbox for processing
 */
export async function fetchPendingEvents(
  batchSize = 100
): Promise<Array<{ id: number; event: DomainEvent }>> {
  const db = getDb();

  // Get pending events, ordered by creation time
  const rows = await db
    .select()
    .from(outbox)
    .where(eq(outbox.status, 'pending'))
    .orderBy(asc(outbox.createdAt))
    .limit(batchSize);

  return rows.map((row) => ({
    id: row.id,
    event: {
      eventId: row.eventId,
      eventType: row.eventType,
      aggregateType: row.aggregateType,
      aggregateId: row.aggregateId,
      customerId: row.customerId as CustomerId,
      payload: row.payload,
      metadata: (row.metadata || { version: 1 }) as EventMetadata,
      occurredAt: row.createdAt,
    },
  }));
}

/**
 * Mark an outbox event as processed
 */
export async function markEventProcessed(outboxId: number, eventId: string, eventType: string): Promise<void> {
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
export async function markEventFailed(outboxId: number, error: string): Promise<void> {
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
 * Check if an event has already been processed (idempotency check)
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(processedEvents)
    .where(eq(processedEvents.eventId, eventId))
    .limit(1);

  return !!existing;
}

/**
 * Cleanup old processed events (older than 7 days)
 */
export async function cleanupOldEvents(): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7);

  // Delete old outbox entries
  const result = await db
    .delete(outbox)
    .where(
      and(
        eq(outbox.status, 'processed'),
        lt(outbox.processedAt, cutoffDate)
      )
    );

  // Delete old processed event records
  await db
    .delete(processedEvents)
    .where(lt(processedEvents.processedAt, cutoffDate));

  logger.info({ cutoffDate }, 'Cleaned up old events');
  return 0; // Drizzle doesn't return affected rows directly
}

