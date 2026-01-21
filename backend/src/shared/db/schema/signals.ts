import { pgTable, varchar, text, timestamp, real, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';

/**
 * Signals table - event-derived facts
 * Represents noteworthy conditions detected in the system
 * Examples: deal stalled, reply rate dropped, leads ready
 */
export const signals = pgTable('signals', {
  id: varchar('id', { length: 36 }).primaryKey(), // sig_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // What entity this signal is about
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'opportunity', 'sequence', 'lead', 'contact', 'account'
  entityId: varchar('entity_id', { length: 36 }).notNull(),
  
  // Signal classification
  signalType: varchar('signal_type', { length: 50 }).notNull(), // 'deal_stalled', 'reply_rate_drop', 'leads_ready', 'followup_needed'
  severity: varchar('severity', { length: 20 }).notNull(), // 'high', 'medium', 'low'
  
  // Human-readable title and description
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  // Structured data specific to signal type
  data: jsonb('data').$type<Record<string, unknown>>().default({}),
  
  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'resolved', 'expired', 'dismissed'
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('signals_customer_id_idx').on(table.customerId),
  index('signals_entity_idx').on(table.entityType, table.entityId),
  index('signals_signal_type_idx').on(table.signalType),
  index('signals_severity_idx').on(table.severity),
  index('signals_status_idx').on(table.status),
  index('signals_customer_active_idx').on(table.customerId, table.status),
]);

/**
 * Patterns table - clustered signals revealing trends
 * Examples: stalled pipeline in negotiation stage, sequence underperforming in fintech segment
 */
export const patterns = pgTable('patterns', {
  id: varchar('id', { length: 36 }).primaryKey(), // pat_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Pattern classification
  patternType: varchar('pattern_type', { length: 50 }).notNull(), // 'stalled_pipeline_stage', 'sequence_segment_underperform', 'engagement_decay'
  
  // Component signals
  signalIds: jsonb('signal_ids').$type<string[]>().default([]).notNull(),
  signalCount: real('signal_count').default(0),
  
  // Confidence and scoring
  confidence: real('confidence').notNull(), // 0.0 - 1.0
  
  // Human-readable description
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  
  // Structured data specific to pattern type
  data: jsonb('data').$type<Record<string, unknown>>().default({}),
  
  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'resolved', 'expired'
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('patterns_customer_id_idx').on(table.customerId),
  index('patterns_pattern_type_idx').on(table.patternType),
  index('patterns_status_idx').on(table.status),
  index('patterns_confidence_idx').on(table.confidence),
]);

/**
 * Recommendations table - next best actions with rationale
 * Generated from patterns/signals for user action
 */
export const recommendations = pgTable('recommendations', {
  id: varchar('id', { length: 36 }).primaryKey(), // rec_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Who this recommendation is for (null = any user in customer org)
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  
  // Source pattern (optional - some recommendations come directly from signals)
  patternId: varchar('pattern_id', { length: 36 }).references(() => patterns.id),
  signalId: varchar('signal_id', { length: 36 }).references(() => signals.id),
  
  // Action type
  actionType: varchar('action_type', { length: 50 }).notNull(), // 'view_deal', 'pause_sequence', 'review_leads', 'send_followup', 'log_activity'
  
  // Priority and ordering
  priority: varchar('priority', { length: 20 }).notNull(), // 'high', 'medium', 'low'
  score: real('score').default(0), // For sorting within priority tier
  
  // Human-readable content
  title: varchar('title', { length: 255 }).notNull(),
  rationale: text('rationale'), // "Deal has been inactive for 14 days"
  
  // CTA configuration
  ctaLabel: varchar('cta_label', { length: 100 }),
  ctaRoute: varchar('cta_route', { length: 255 }), // '/opportunities/opp_123'
  ctaParams: jsonb('cta_params').$type<Record<string, string>>().default({}),
  secondaryCtaLabel: varchar('secondary_cta_label', { length: 100 }),
  secondaryCtaRoute: varchar('secondary_cta_route', { length: 255 }),
  
  // Structured data specific to action type
  data: jsonb('data').$type<Record<string, unknown>>().default({}),
  
  // Card type for frontend rendering
  cardType: varchar('card_type', { length: 50 }).notNull(), // 'DealStalledCard', 'SequenceUnderperformingCard', etc.
  cardProps: jsonb('card_props').$type<Record<string, unknown>>().default({}),
  
  // Status lifecycle
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending', 'acted', 'dismissed', 'snoozed', 'expired'
  actedAt: timestamp('acted_at', { withTimezone: true }),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  snoozedUntil: timestamp('snoozed_until', { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('recommendations_customer_id_idx').on(table.customerId),
  index('recommendations_user_id_idx').on(table.userId),
  index('recommendations_pattern_id_idx').on(table.patternId),
  index('recommendations_action_type_idx').on(table.actionType),
  index('recommendations_priority_idx').on(table.priority),
  index('recommendations_status_idx').on(table.status),
  index('recommendations_customer_pending_idx').on(table.customerId, table.status),
]);

/**
 * Recommendation feedback - tracks user responses for learning
 */
export const recommendationFeedback = pgTable('recommendation_feedback', {
  id: varchar('id', { length: 36 }).primaryKey(), // rfb_xxxxx
  recommendationId: varchar('recommendation_id', { length: 36 }).notNull().references(() => recommendations.id),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  
  // User action
  action: varchar('action', { length: 20 }).notNull(), // 'accepted', 'declined', 'snoozed'
  
  // Optional feedback data (e.g., reason for declining)
  feedbackData: jsonb('feedback_data').$type<Record<string, unknown>>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('recommendation_feedback_recommendation_id_idx').on(table.recommendationId),
  index('recommendation_feedback_user_id_idx').on(table.userId),
  index('recommendation_feedback_action_idx').on(table.action),
]);

// Relations
export const signalsRelations = relations(signals, ({ one }) => ({
  customer: one(customers, {
    fields: [signals.customerId],
    references: [customers.id],
  }),
}));

export const patternsRelations = relations(patterns, ({ one }) => ({
  customer: one(customers, {
    fields: [patterns.customerId],
    references: [customers.id],
  }),
}));

export const recommendationsRelations = relations(recommendations, ({ one, many }) => ({
  customer: one(customers, {
    fields: [recommendations.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [recommendations.userId],
    references: [users.id],
  }),
  pattern: one(patterns, {
    fields: [recommendations.patternId],
    references: [patterns.id],
  }),
  signal: one(signals, {
    fields: [recommendations.signalId],
    references: [signals.id],
  }),
  feedback: many(recommendationFeedback),
}));

export const recommendationFeedbackRelations = relations(recommendationFeedback, ({ one }) => ({
  recommendation: one(recommendations, {
    fields: [recommendationFeedback.recommendationId],
    references: [recommendations.id],
  }),
  user: one(users, {
    fields: [recommendationFeedback.userId],
    references: [users.id],
  }),
}));

// Types
export type Signal = typeof signals.$inferSelect;
export type NewSignal = typeof signals.$inferInsert;
export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;
export type Recommendation = typeof recommendations.$inferSelect;
export type NewRecommendation = typeof recommendations.$inferInsert;
export type RecommendationFeedback = typeof recommendationFeedback.$inferSelect;
export type NewRecommendationFeedback = typeof recommendationFeedback.$inferInsert;

// Signal types enum
export const SIGNAL_TYPES = [
  'deal_stalled',
  'reply_rate_drop', 
  'leads_ready',
  'followup_needed',
  'engagement_decay',
  'meeting_no_show',
] as const;
export type SignalType = typeof SIGNAL_TYPES[number];

// Severity enum
export const SEVERITIES = ['high', 'medium', 'low'] as const;
export type Severity = typeof SEVERITIES[number];

// Action types enum
export const ACTION_TYPES = [
  'view_deal',
  'pause_sequence',
  'review_leads',
  'send_followup',
  'log_activity',
  'schedule_call',
] as const;
export type ActionType = typeof ACTION_TYPES[number];

// Card types enum (must match frontend registry)
export const CARD_TYPES = [
  'DealStalledCard',
  'SequenceUnderperformingCard',
  'LeadsReadyCard',
  'FollowUpCard',
] as const;
export type CardType = typeof CARD_TYPES[number];
