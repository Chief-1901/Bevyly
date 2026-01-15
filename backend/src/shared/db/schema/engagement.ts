import { pgTable, varchar, timestamp, integer, real, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { contacts } from './contacts.js';
import { accounts } from './accounts.js';

/**
 * Engagement scores table - computed engagement metrics for contacts
 */
export const engagementScores = pgTable('engagement_scores', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  contactId: varchar('contact_id', { length: 36 }).notNull().references(() => contacts.id),
  
  // Overall score (0-100)
  score: integer('score').default(0).notNull(),
  
  // Component scores
  emailScore: integer('email_score').default(0), // based on opens, clicks, replies
  meetingScore: integer('meeting_score').default(0), // based on meetings held
  recencyScore: integer('recency_score').default(0), // based on last activity
  frequencyScore: integer('frequency_score').default(0), // based on interaction frequency
  
  // Trend
  trend: varchar('trend', { length: 20 }).default('stable'), // increasing, stable, decreasing
  previousScore: integer('previous_score'),
  
  // Activity counts (for quick reference)
  emailsSent: integer('emails_sent').default(0),
  emailsOpened: integer('emails_opened').default(0),
  emailsClicked: integer('emails_clicked').default(0),
  emailsReplied: integer('emails_replied').default(0),
  meetingsScheduled: integer('meetings_scheduled').default(0),
  meetingsCompleted: integer('meetings_completed').default(0),
  
  // Timestamps
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('engagement_scores_customer_id_idx').on(table.customerId),
  index('engagement_scores_contact_id_idx').on(table.contactId),
  index('engagement_scores_score_idx').on(table.score),
]);

/**
 * Account engagement - aggregated engagement for accounts
 */
export const accountEngagement = pgTable('account_engagement', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  accountId: varchar('account_id', { length: 36 }).notNull().references(() => accounts.id),
  
  // Aggregated scores
  avgContactScore: real('avg_contact_score').default(0),
  maxContactScore: integer('max_contact_score').default(0),
  activeContactCount: integer('active_contact_count').default(0),
  
  // Overall account health
  healthScore: integer('health_score').default(0), // 0-100
  healthStatus: varchar('health_status', { length: 20 }).default('unknown'), // healthy, at_risk, churning
  
  // Activity summary
  totalEmailsSent: integer('total_emails_sent').default(0),
  totalMeetings: integer('total_meetings').default(0),
  
  // Timestamps
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('account_engagement_customer_id_idx').on(table.customerId),
  index('account_engagement_account_id_idx').on(table.accountId),
  index('account_engagement_health_score_idx').on(table.healthScore),
]);

/**
 * Intent signals - detected buying signals (stub for Phase 2)
 */
export const intentSignals = pgTable('intent_signals', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  
  // Signal details
  signalType: varchar('signal_type', { length: 50 }).notNull(), // email_reply, link_click, meeting_request, etc.
  strength: varchar('strength', { length: 20 }).default('medium'), // low, medium, high
  
  // Source
  sourceType: varchar('source_type', { length: 50 }),
  sourceId: varchar('source_id', { length: 36 }),
  
  // Details
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  
  // Timestamps
  detectedAt: timestamp('detected_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }), // signals may decay
  processedAt: timestamp('processed_at', { withTimezone: true }),
}, (table) => [
  index('intent_signals_customer_id_idx').on(table.customerId),
  index('intent_signals_contact_id_idx').on(table.contactId),
  index('intent_signals_account_id_idx').on(table.accountId),
  index('intent_signals_detected_at_idx').on(table.detectedAt),
]);

// Relations
export const engagementScoresRelations = relations(engagementScores, ({ one }) => ({
  customer: one(customers, {
    fields: [engagementScores.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [engagementScores.contactId],
    references: [contacts.id],
  }),
}));

export const accountEngagementRelations = relations(accountEngagement, ({ one }) => ({
  customer: one(customers, {
    fields: [accountEngagement.customerId],
    references: [customers.id],
  }),
  account: one(accounts, {
    fields: [accountEngagement.accountId],
    references: [accounts.id],
  }),
}));

export const intentSignalsRelations = relations(intentSignals, ({ one }) => ({
  customer: one(customers, {
    fields: [intentSignals.customerId],
    references: [customers.id],
  }),
  contact: one(contacts, {
    fields: [intentSignals.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [intentSignals.accountId],
    references: [accounts.id],
  }),
}));

export type EngagementScore = typeof engagementScores.$inferSelect;
export type AccountEngagement = typeof accountEngagement.$inferSelect;
export type IntentSignal = typeof intentSignals.$inferSelect;

