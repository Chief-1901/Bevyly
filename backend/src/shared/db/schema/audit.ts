import { pgTable, varchar, text, timestamp, integer, jsonb, index, inet } from 'drizzle-orm/pg-core';
import { customers } from './customers.js';
import { users } from './users.js';

/**
 * Audit log table - tracks all significant actions for compliance
 */
export const auditLog = pgTable('audit_log', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Actor
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }),
  apiKeyId: varchar('api_key_id', { length: 36 }),
  
  // Action
  action: varchar('action', { length: 100 }).notNull(),
  // Examples: user.login, user.logout, contact.create, contact.update, contact.delete,
  // email.send, meeting.schedule, api_key.create, settings.update
  
  // Resource
  resourceType: varchar('resource_type', { length: 50 }),
  resourceId: varchar('resource_id', { length: 36 }),
  
  // Details
  description: text('description'),
  
  // Before/after for updates
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  
  // Request context
  requestId: varchar('request_id', { length: 36 }),
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  
  // Result
  status: varchar('status', { length: 20 }).default('success').notNull(), // success, failure
  errorMessage: text('error_message'),
  
  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('audit_log_customer_id_idx').on(table.customerId),
  index('audit_log_user_id_idx').on(table.userId),
  index('audit_log_action_idx').on(table.action),
  index('audit_log_resource_idx').on(table.resourceType, table.resourceId),
  index('audit_log_created_at_idx').on(table.createdAt),
]);

/**
 * Idempotency keys table - for request deduplication
 */
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: varchar('key', { length: 64 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Request info
  requestPath: varchar('request_path', { length: 255 }).notNull(),
  requestMethod: varchar('request_method', { length: 10 }).notNull(),
  
  // Response (cached)
  responseStatus: integer('response_status'),
  responseBody: jsonb('response_body'),
  
  // Processing state
  status: varchar('status', { length: 20 }).default('processing').notNull(), // processing, completed, failed
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
}, (table) => [
  index('idempotency_keys_customer_id_idx').on(table.customerId),
  index('idempotency_keys_expires_at_idx').on(table.expiresAt),
]);

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;

