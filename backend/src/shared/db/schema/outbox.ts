import { pgTable, varchar, text, timestamp, integer, jsonb, index, serial } from 'drizzle-orm/pg-core';

/**
 * Transactional Outbox table - for reliable event publishing
 * Events are written here in the same transaction as the business operation,
 * then picked up by a dispatcher and published to handlers/Kafka
 */
export const outbox = pgTable('outbox', {
  id: serial('id').primaryKey(),
  
  // Event identification
  eventId: varchar('event_id', { length: 36 }).notNull().unique(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  
  // Aggregate info (for ordering and partitioning)
  aggregateType: varchar('aggregate_type', { length: 50 }).notNull(), // contact, account, email, meeting, etc.
  aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
  
  // Tenant
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  
  // Event payload
  payload: jsonb('payload').notNull(),
  
  // Metadata
  metadata: jsonb('metadata').$type<EventMetadata>().default({}),
  
  // Processing status
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, processing, processed, failed
  retryCount: integer('retry_count').default(0),
  errorMessage: text('error_message'),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  
  // For ordering - ensures FIFO within an aggregate
  sequenceNumber: serial('sequence_number'),
}, (table) => [
  index('outbox_status_idx').on(table.status),
  index('outbox_aggregate_idx').on(table.aggregateType, table.aggregateId),
  index('outbox_customer_id_idx').on(table.customerId),
  index('outbox_created_at_idx').on(table.createdAt),
  index('outbox_pending_idx').on(table.status, table.createdAt),
]);

export interface EventMetadata {
  correlationId?: string;
  causationId?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
  version?: number;
}

/**
 * Processed events log - for idempotency checking
 * Stores event IDs that have been successfully processed
 */
export const processedEvents = pgTable('processed_events', {
  eventId: varchar('event_id', { length: 36 }).primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('processed_events_event_type_idx').on(table.eventType),
]);

export type OutboxEvent = typeof outbox.$inferSelect;
export type NewOutboxEvent = typeof outbox.$inferInsert;
export type ProcessedEvent = typeof processedEvents.$inferSelect;

