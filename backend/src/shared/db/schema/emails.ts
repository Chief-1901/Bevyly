import { pgTable, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { contacts } from './contacts.js';
import { accounts } from './accounts.js';

/**
 * Emails table - sent/scheduled emails
 */
export const emails = pgTable('emails', {
  id: varchar('id', { length: 36 }).primaryKey(), // eml_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Sender
  senderId: varchar('sender_id', { length: 36 }).notNull().references(() => users.id),
  fromEmail: varchar('from_email', { length: 255 }).notNull(),
  fromName: varchar('from_name', { length: 255 }),
  
  // Recipient
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  toEmail: varchar('to_email', { length: 255 }).notNull(),
  toName: varchar('to_name', { length: 255 }),
  
  // CC/BCC
  ccEmails: jsonb('cc_emails').$type<string[]>().default([]),
  bccEmails: jsonb('bcc_emails').$type<string[]>().default([]),
  
  // Content
  subject: text('subject').notNull(),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  
  // Status
  status: varchar('status', { length: 20 }).default('draft').notNull(),
  // draft, queued, sending, sent, delivered, opened, clicked, replied, bounced, failed
  
  // Scheduling
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  
  // Tracking
  trackingPixelId: varchar('tracking_pixel_id', { length: 36 }),
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),
  firstOpenedAt: timestamp('first_opened_at', { withTimezone: true }),
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
  firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
  repliedAt: timestamp('replied_at', { withTimezone: true }),
  
  // Bounce/error handling
  bouncedAt: timestamp('bounced_at', { withTimezone: true }),
  bounceType: varchar('bounce_type', { length: 50 }), // hard, soft
  errorMessage: text('error_message'),
  
  // Sequence context
  sequenceId: varchar('sequence_id', { length: 36 }),
  sequenceStepNumber: integer('sequence_step_number'),
  
  // Provider info
  provider: varchar('provider', { length: 50 }), // gmail, outlook, ses
  providerMessageId: varchar('provider_message_id', { length: 255 }),
  threadId: varchar('thread_id', { length: 255 }), // for threading
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 64 }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('emails_customer_id_idx').on(table.customerId),
  index('emails_sender_id_idx').on(table.senderId),
  index('emails_contact_id_idx').on(table.contactId),
  index('emails_account_id_idx').on(table.accountId),
  index('emails_status_idx').on(table.status),
  index('emails_tracking_pixel_id_idx').on(table.trackingPixelId),
  index('emails_idempotency_key_idx').on(table.idempotencyKey),
  index('emails_sequence_id_idx').on(table.sequenceId),
]);

/**
 * Email click tracking - tracks individual link clicks
 */
export const emailClicks = pgTable('email_clicks', {
  id: varchar('id', { length: 36 }).primaryKey(),
  emailId: varchar('email_id', { length: 36 }).notNull().references(() => emails.id),
  
  trackingId: varchar('tracking_id', { length: 36 }).notNull(),
  originalUrl: text('original_url').notNull(),
  
  clickedAt: timestamp('clicked_at', { withTimezone: true }).defaultNow().notNull(),
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
}, (table) => [
  index('email_clicks_email_id_idx').on(table.emailId),
  index('email_clicks_tracking_id_idx').on(table.trackingId),
]);

// Relations
export const emailsRelations = relations(emails, ({ one, many }) => ({
  customer: one(customers, {
    fields: [emails.customerId],
    references: [customers.id],
  }),
  sender: one(users, {
    fields: [emails.senderId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [emails.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [emails.accountId],
    references: [accounts.id],
  }),
  clicks: many(emailClicks),
}));

export const emailClicksRelations = relations(emailClicks, ({ one }) => ({
  email: one(emails, {
    fields: [emailClicks.emailId],
    references: [emails.id],
  }),
}));

export type Email = typeof emails.$inferSelect;
export type NewEmail = typeof emails.$inferInsert;
export type EmailClick = typeof emailClicks.$inferSelect;

