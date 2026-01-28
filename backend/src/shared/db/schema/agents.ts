import { pgTable, varchar, text, timestamp, integer, boolean, jsonb, index, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { leads } from './leads.js';

/**
 * Agent configurations per tenant
 * Stores settings for each agent type (discovery, enrichment, etc.)
 */
export const agentConfigs = pgTable('agent_configs', {
  id: varchar('id', { length: 36 }).primaryKey(), // agcfg_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),

  // Agent identification
  agentType: varchar('agent_type', { length: 50 }).notNull(), // 'discovery', 'enrichment'
  name: varchar('name', { length: 100 }),

  // Configuration
  enabled: boolean('enabled').default(true).notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().default({}),

  // Thresholds
  minFitScore: integer('min_fit_score').default(50),
  autoApproveThreshold: integer('auto_approve_threshold'), // null = never auto-approve
  maxCreditsPerRun: integer('max_credits_per_run'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('agent_configs_customer_idx').on(table.customerId),
  unique('agent_configs_customer_agent_unique').on(table.customerId, table.agentType),
]);

/**
 * Agent run history
 * Tracks each execution of an agent
 */
export const agentRuns = pgTable('agent_runs', {
  id: varchar('id', { length: 36 }).primaryKey(), // run_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  userId: varchar('user_id', { length: 36 }).references(() => users.id),
  agentConfigId: varchar('agent_config_id', { length: 36 }).references(() => agentConfigs.id),

  // Run identification
  agentType: varchar('agent_type', { length: 50 }).notNull(), // 'discovery', 'enrichment'
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // Statuses: 'pending', 'running', 'completed', 'failed', 'cancelled'

  // Input
  prompt: text('prompt'), // Original user prompt
  parsedCriteria: jsonb('parsed_criteria').$type<ICPCriteria>(), // LLM-parsed criteria
  inputParams: jsonb('input_params').$type<Record<string, unknown>>().default({}),

  // Results summary
  resultsSummary: jsonb('results_summary').$type<Record<string, unknown>>().default({}),
  leadsDiscovered: integer('leads_discovered').default(0),
  leadsEnriched: integer('leads_enriched').default(0),
  creditsUsed: integer('credits_used').default(0),

  // Timing
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('agent_runs_customer_idx').on(table.customerId),
  index('agent_runs_status_idx').on(table.status),
  index('agent_runs_agent_type_idx').on(table.agentType),
  index('agent_runs_created_at_idx').on(table.createdAt),
]);

/**
 * Approval queue items
 * Items pending user approval (e.g., leads to enrich)
 */
export const approvalQueueItems = pgTable('approval_queue_items', {
  id: varchar('id', { length: 36 }).primaryKey(), // apq_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),

  // Source
  agentRunId: varchar('agent_run_id', { length: 36 }).references(() => agentRuns.id),

  // Item details
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'lead_batch'
  entityId: varchar('entity_id', { length: 36 }).notNull(), // lead_id or batch identifier

  // Display
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

  // Cost estimation
  estimatedCredits: integer('estimated_credits').default(0),
  actualCredits: integer('actual_credits'),

  // Status
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  // Statuses: 'pending', 'approved', 'rejected', 'expired'
  processedAt: timestamp('processed_at', { withTimezone: true }),
  processedBy: varchar('processed_by', { length: 36 }).references(() => users.id),

  // Grouping
  batchId: varchar('batch_id', { length: 36 }), // For grouping related items
  fitScoreBucket: varchar('fit_score_bucket', { length: 20 }), // 'high', 'medium', 'low'

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('approval_queue_customer_status_idx').on(table.customerId, table.status),
  index('approval_queue_batch_idx').on(table.batchId),
  index('approval_queue_entity_idx').on(table.entityType, table.entityId),
  index('approval_queue_created_at_idx').on(table.createdAt),
]);

/**
 * Integration credentials
 * API keys for external services (encrypted)
 */
export const integrationCredentials = pgTable('integration_credentials', {
  id: varchar('id', { length: 36 }).primaryKey(), // icred_xxxxx
  customerId: varchar('customer_id', { length: 36 }).references(() => customers.id), // NULL = platform default

  // Provider identification
  provider: varchar('provider', { length: 50 }).notNull(),
  // Providers: 'apify', 'google_search', 'google_maps', 'github', 'news_api', 'openai'
  name: varchar('name', { length: 100 }),

  // Credentials (encrypted)
  apiKey: text('api_key'), // Encrypted
  apiSecret: text('api_secret'), // Encrypted (if applicable)
  config: jsonb('config').$type<Record<string, unknown>>().default({}), // Provider-specific config

  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(),
  // Statuses: 'active', 'invalid', 'expired'
  lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
  lastError: text('last_error'),

  // Usage tracking
  creditsUsed: integer('credits_used').default(0),
  creditsLimit: integer('credits_limit'), // Monthly/total limit
  creditsResetAt: timestamp('credits_reset_at', { withTimezone: true }),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('integration_creds_customer_provider_idx').on(table.customerId, table.provider),
  index('integration_creds_provider_idx').on(table.provider),
]);

/**
 * Credit usage tracking
 * Detailed log of API credit consumption
 */
export const creditUsage = pgTable('credit_usage', {
  id: varchar('id', { length: 36 }).primaryKey(), // cru_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),

  // Source
  agentRunId: varchar('agent_run_id', { length: 36 }).references(() => agentRuns.id),
  provider: varchar('provider', { length: 50 }).notNull(),

  // Usage details
  operation: varchar('operation', { length: 50 }).notNull(), // 'enrichment', 'search', 'scrape'
  creditsUsed: integer('credits_used').notNull(),
  entityId: varchar('entity_id', { length: 36 }), // lead_id, etc.

  // Result
  success: boolean('success').default(true),
  errorMessage: text('error_message'),
  responseMetadata: jsonb('response_metadata').$type<Record<string, unknown>>().default({}),

  // Timestamp
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('credit_usage_customer_idx').on(table.customerId),
  index('credit_usage_run_idx').on(table.agentRunId),
  index('credit_usage_created_at_idx').on(table.createdAt),
  index('credit_usage_provider_idx').on(table.provider),
]);

/**
 * User settings overrides
 * Per-user customization of agent behavior
 */
export const userSettings = pgTable('user_settings', {
  id: varchar('id', { length: 36 }).primaryKey(), // uset_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),

  // Discovery settings
  discoveryAutoRun: boolean('discovery_auto_run').default(false),
  discoveryMinFitScore: integer('discovery_min_fit_score'),
  discoveryNotifyComplete: boolean('discovery_notify_complete').default(true),

  // Enrichment settings
  enrichmentAutoApproveThreshold: integer('enrichment_auto_approve_threshold'),
  enrichmentNotifyPending: boolean('enrichment_notify_pending').default(true),

  // UI preferences
  briefingShowCommand: boolean('briefing_show_command').default(true),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  unique('user_settings_customer_user_unique').on(table.customerId, table.userId),
]);

// Relations
export const agentConfigsRelations = relations(agentConfigs, ({ one, many }) => ({
  customer: one(customers, {
    fields: [agentConfigs.customerId],
    references: [customers.id],
  }),
  runs: many(agentRuns),
}));

export const agentRunsRelations = relations(agentRuns, ({ one, many }) => ({
  customer: one(customers, {
    fields: [agentRuns.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [agentRuns.userId],
    references: [users.id],
  }),
  config: one(agentConfigs, {
    fields: [agentRuns.agentConfigId],
    references: [agentConfigs.id],
  }),
  approvalItems: many(approvalQueueItems),
  creditUsages: many(creditUsage),
}));

export const approvalQueueItemsRelations = relations(approvalQueueItems, ({ one }) => ({
  customer: one(customers, {
    fields: [approvalQueueItems.customerId],
    references: [customers.id],
  }),
  agentRun: one(agentRuns, {
    fields: [approvalQueueItems.agentRunId],
    references: [agentRuns.id],
  }),
  processedByUser: one(users, {
    fields: [approvalQueueItems.processedBy],
    references: [users.id],
  }),
}));

export const integrationCredentialsRelations = relations(integrationCredentials, ({ one }) => ({
  customer: one(customers, {
    fields: [integrationCredentials.customerId],
    references: [customers.id],
  }),
}));

export const creditUsageRelations = relations(creditUsage, ({ one }) => ({
  customer: one(customers, {
    fields: [creditUsage.customerId],
    references: [customers.id],
  }),
  agentRun: one(agentRuns, {
    fields: [creditUsage.agentRunId],
    references: [agentRuns.id],
  }),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  customer: one(customers, {
    fields: [userSettings.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// Type exports
export type AgentConfig = typeof agentConfigs.$inferSelect;
export type NewAgentConfig = typeof agentConfigs.$inferInsert;

export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;

export type ApprovalQueueItem = typeof approvalQueueItems.$inferSelect;
export type NewApprovalQueueItem = typeof approvalQueueItems.$inferInsert;

export type IntegrationCredential = typeof integrationCredentials.$inferSelect;
export type NewIntegrationCredential = typeof integrationCredentials.$inferInsert;

export type CreditUsage = typeof creditUsage.$inferSelect;
export type NewCreditUsage = typeof creditUsage.$inferInsert;

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

// Enums
export const AGENT_TYPES = ['discovery', 'enrichment'] as const;
export type AgentType = typeof AGENT_TYPES[number];

export const AGENT_RUN_STATUSES = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export type AgentRunStatus = typeof AGENT_RUN_STATUSES[number];

export const APPROVAL_STATUSES = ['pending', 'approved', 'rejected', 'expired'] as const;
export type ApprovalStatus = typeof APPROVAL_STATUSES[number];

export const FIT_SCORE_BUCKETS = ['high', 'medium', 'low'] as const;
export type FitScoreBucket = typeof FIT_SCORE_BUCKETS[number];

export const INTEGRATION_PROVIDERS = ['apify', 'google_search', 'google_maps', 'github', 'news_api', 'openai'] as const;
export type IntegrationProvider = typeof INTEGRATION_PROVIDERS[number];

export const CREDENTIAL_STATUSES = ['active', 'invalid', 'expired'] as const;
export type CredentialStatus = typeof CREDENTIAL_STATUSES[number];

// ICP Criteria type (used in agent runs)
export interface ICPCriteria {
  industries?: string[];
  locations?: Array<{
    city?: string;
    state?: string;
    country?: string;
  }>;
  employeeRange?: {
    min?: number;
    max?: number;
  };
  revenueRange?: {
    min?: number;
    max?: number;
  };
  keywords?: string[];
  technologies?: string[];
  signals?: string[]; // 'hiring', 'funding', 'expanding'
  excludeKeywords?: string[];
  searchQueries?: string[];
}
