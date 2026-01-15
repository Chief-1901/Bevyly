import { pgTable, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { contacts } from './contacts.js';
import { accounts } from './accounts.js';

/**
 * Activities table - unified activity timeline
 * Aggregates all interactions for a contact/account
 */
export const activities = pgTable('activities', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Related entities
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  opportunityId: varchar('opportunity_id', { length: 36 }),
  
  // Actor
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  
  // Activity type
  type: varchar('type', { length: 50 }).notNull(),
  // email_sent, email_opened, email_clicked, email_replied, email_bounced
  // meeting_scheduled, meeting_completed, meeting_cancelled, meeting_no_show
  // call_logged, note_added, task_created, task_completed
  // sequence_enrolled, sequence_step_sent, sequence_completed
  // contact_created, account_created, opportunity_created, opportunity_stage_changed
  
  // Source entity reference
  sourceType: varchar('source_type', { length: 50 }), // email, meeting, call, note, task, sequence
  sourceId: varchar('source_id', { length: 36 }),
  
  // Activity details
  title: text('title').notNull(),
  description: text('description'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  // Timestamp of the actual activity (may differ from createdAt for imported data)
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('activities_customer_id_idx').on(table.customerId),
  index('activities_contact_id_idx').on(table.contactId),
  index('activities_account_id_idx').on(table.accountId),
  index('activities_user_id_idx').on(table.userId),
  index('activities_type_idx').on(table.type),
  index('activities_occurred_at_idx').on(table.occurredAt),
  index('activities_source_idx').on(table.sourceType, table.sourceId),
]);

/**
 * Notes table - manual notes on contacts/accounts
 */
export const notes = pgTable('notes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Related entities
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  opportunityId: varchar('opportunity_id', { length: 36 }),
  
  // Author
  authorId: varchar('author_id', { length: 36 }).notNull().references(() => users.id),
  
  // Content
  content: text('content').notNull(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('notes_customer_id_idx').on(table.customerId),
  index('notes_contact_id_idx').on(table.contactId),
  index('notes_account_id_idx').on(table.accountId),
  index('notes_author_id_idx').on(table.authorId),
]);

/**
 * Calls table - logged phone calls
 */
export const calls = pgTable('calls', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Related entities
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  opportunityId: varchar('opportunity_id', { length: 36 }),
  
  // Caller
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  
  // Call details
  direction: varchar('direction', { length: 10 }).notNull(), // inbound, outbound
  status: varchar('status', { length: 20 }).notNull(), // completed, no_answer, busy, failed
  
  phoneNumber: varchar('phone_number', { length: 50 }),
  durationSeconds: integer('duration_seconds'),
  
  // Outcome
  outcome: varchar('outcome', { length: 50 }), // interested, not_interested, callback_requested, voicemail
  notes: text('notes'),
  
  // Recording (if available)
  recordingUrl: text('recording_url'),
  
  // Timestamps
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('calls_customer_id_idx').on(table.customerId),
  index('calls_contact_id_idx').on(table.contactId),
  index('calls_account_id_idx').on(table.accountId),
  index('calls_user_id_idx').on(table.userId),
  index('calls_started_at_idx').on(table.startedAt),
]);

// Relations
export const activitiesRelations = relations(activities, ({ one }) => ({
  customer: one(customers, {
    fields: [activities.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [activities.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [activities.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export const notesRelations = relations(notes, ({ one }) => ({
  customer: one(customers, {
    fields: [notes.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [notes.accountId],
    references: [accounts.id],
  }),
  author: one(users, {
    fields: [notes.authorId],
    references: [users.id],
  }),
}));

export const callsRelations = relations(calls, ({ one }) => ({
  customer: one(customers, {
    fields: [calls.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [calls.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [calls.accountId],
    references: [accounts.id],
  }),
  user: one(users, {
    fields: [calls.userId],
    references: [users.id],
  }),
}));

export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type Call = typeof calls.$inferSelect;

