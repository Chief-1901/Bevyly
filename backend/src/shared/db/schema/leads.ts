import { pgTable, varchar, text, timestamp, integer, bigint, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { accounts } from './accounts.js';
import { contacts } from './contacts.js';

/**
 * Leads table - pre-conversion prospects
 * Generated from campaigns, imports, or manual entry
 * Can be converted to Account + Contact
 */
export const leads = pgTable('leads', {
  id: varchar('id', { length: 36 }).primaryKey(), // lead_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Company info
  companyName: varchar('company_name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  employeeCount: integer('employee_count'),
  revenue: bigint('revenue', { mode: 'number' }), // in cents
  
  // Contact info
  contactFirstName: varchar('contact_first_name', { length: 100 }),
  contactLastName: varchar('contact_last_name', { length: 100 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactTitle: varchar('contact_title', { length: 150 }),
  contactPhone: varchar('contact_phone', { length: 50 }),
  
  // Location
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  
  // Source tracking
  source: varchar('source', { length: 100 }).default('manual').notNull(), // 'manual', 'import', 'generation', 'referral', 'website'
  campaignId: varchar('campaign_id', { length: 36 }),
  generationJobId: varchar('generation_job_id', { length: 36 }),
  sourceUrl: text('source_url'), // LinkedIn URL, website, etc.
  
  // Scoring
  fitScore: integer('fit_score'), // 0-100: how well they match ICP
  intentScore: integer('intent_score'), // 0-100: buying signals
  
  // Status workflow
  status: varchar('status', { length: 50 }).default('new').notNull(),
  // Statuses: 'new', 'contacted', 'qualified', 'unqualified', 'converted', 'rejected'
  
  // Assignment
  ownerId: varchar('owner_id', { length: 36 }),
  
  // Conversion tracking
  convertedAccountId: varchar('converted_account_id', { length: 36 }).references(() => accounts.id),
  convertedContactId: varchar('converted_contact_id', { length: 36 }).references(() => contacts.id),
  convertedAt: timestamp('converted_at', { withTimezone: true }),
  
  // Rejection tracking
  rejectedReason: varchar('rejected_reason', { length: 100 }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  
  // Notes
  notes: text('notes'),
  
  // Custom fields
  customFields: jsonb('custom_fields').$type<Record<string, unknown>>().default({}),

  // Discovery & Enrichment fields
  discoveryRunId: varchar('discovery_run_id', { length: 36 }), // References agent_runs.id
  enrichmentStatus: varchar('enrichment_status', { length: 20 }).default('pending'),
  // Statuses: 'pending', 'approved', 'enriching', 'enriched', 'skipped', 'failed'
  enrichedAt: timestamp('enriched_at', { withTimezone: true }),
  enrichmentData: jsonb('enrichment_data').$type<Record<string, unknown>>().default({}),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('leads_customer_id_idx').on(table.customerId),
  index('leads_status_idx').on(table.status),
  index('leads_source_idx').on(table.source),
  index('leads_campaign_id_idx').on(table.campaignId),
  index('leads_owner_id_idx').on(table.ownerId),
  index('leads_fit_score_idx').on(table.fitScore),
  index('leads_customer_status_idx').on(table.customerId, table.status),
  index('leads_domain_idx').on(table.domain),
  index('leads_discovery_run_idx').on(table.discoveryRunId),
  index('leads_enrichment_status_idx').on(table.enrichmentStatus),
]);

// Relations
export const leadsRelations = relations(leads, ({ one }) => ({
  customer: one(customers, {
    fields: [leads.customerId],
    references: [customers.id],
  }),
  convertedAccount: one(accounts, {
    fields: [leads.convertedAccountId],
    references: [accounts.id],
  }),
  convertedContact: one(contacts, {
    fields: [leads.convertedContactId],
    references: [contacts.id],
  }),
}));

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;

// Lead status enum for validation
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted', 'rejected'] as const;
export type LeadStatus = typeof LEAD_STATUSES[number];

// Lead source enum for validation
export const LEAD_SOURCES = ['manual', 'import', 'generation', 'referral', 'website', 'linkedin', 'event', 'discovery'] as const;
export type LeadSource = typeof LEAD_SOURCES[number];

// Lead enrichment status enum
export const LEAD_ENRICHMENT_STATUSES = ['pending', 'approved', 'enriching', 'enriched', 'skipped', 'failed'] as const;
export type LeadEnrichmentStatus = typeof LEAD_ENRICHMENT_STATUSES[number];
