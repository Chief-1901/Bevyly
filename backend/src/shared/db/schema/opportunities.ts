import { pgTable, varchar, text, timestamp, integer, real, date, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { accounts } from './accounts.js';
import { contacts } from './contacts.js';

/**
 * Opportunities table - deals/sales opportunities
 * Core CRM entity
 */
export const opportunities = pgTable('opportunities', {
  id: varchar('id', { length: 36 }).primaryKey(), // opp_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  accountId: varchar('account_id', { length: 36 }).notNull().references(() => accounts.id),
  primaryContactId: varchar('primary_contact_id', { length: 36 }).references(() => contacts.id),
  
  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Pipeline
  stage: varchar('stage', { length: 50 }).default('prospecting').notNull(),
  // Stages: prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  
  probability: integer('probability').default(0), // 0-100
  
  // Value
  amount: integer('amount'), // in cents
  currency: varchar('currency', { length: 3 }).default('USD'),
  
  // Dates
  closeDate: date('close_date'),
  wonAt: timestamp('won_at', { withTimezone: true }),
  lostAt: timestamp('lost_at', { withTimezone: true }),
  
  // Reason codes
  lostReason: varchar('lost_reason', { length: 100 }),
  lostReasonDetail: text('lost_reason_detail'),
  
  // Ownership
  ownerId: varchar('owner_id', { length: 36 }).references(() => users.id),
  
  // Source
  source: varchar('source', { length: 100 }),
  campaignId: varchar('campaign_id', { length: 36 }), // future: link to campaigns
  
  // Custom fields
  customFields: jsonb('custom_fields').$type<Record<string, unknown>>().default({}),
  
  // External IDs
  externalIds: jsonb('external_ids').$type<Record<string, string>>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('opportunities_customer_id_idx').on(table.customerId),
  index('opportunities_account_id_idx').on(table.accountId),
  index('opportunities_owner_id_idx').on(table.ownerId),
  index('opportunities_stage_idx').on(table.stage),
  index('opportunities_close_date_idx').on(table.closeDate),
]);

/**
 * Opportunity contacts - many-to-many relationship
 */
export const opportunityContacts = pgTable('opportunity_contacts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  opportunityId: varchar('opportunity_id', { length: 36 }).notNull().references(() => opportunities.id),
  contactId: varchar('contact_id', { length: 36 }).notNull().references(() => contacts.id),
  role: varchar('role', { length: 50 }), // decision_maker, influencer, champion, etc.
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('opportunity_contacts_opportunity_id_idx').on(table.opportunityId),
  index('opportunity_contacts_contact_id_idx').on(table.contactId),
]);

// Relations
export const opportunitiesRelations = relations(opportunities, ({ one, many }) => ({
  customer: one(customers, {
    fields: [opportunities.customerId],
    references: [customers.id],
  }),
  account: one(accounts, {
    fields: [opportunities.accountId],
    references: [accounts.id],
  }),
  primaryContact: one(contacts, {
    fields: [opportunities.primaryContactId],
    references: [contacts.id],
  }),
  owner: one(users, {
    fields: [opportunities.ownerId],
    references: [users.id],
  }),
  contacts: many(opportunityContacts),
}));

export const opportunityContactsRelations = relations(opportunityContacts, ({ one }) => ({
  opportunity: one(opportunities, {
    fields: [opportunityContacts.opportunityId],
    references: [opportunities.id],
  }),
  contact: one(contacts, {
    fields: [opportunityContacts.contactId],
    references: [contacts.id],
  }),
}));

export type Opportunity = typeof opportunities.$inferSelect;
export type NewOpportunity = typeof opportunities.$inferInsert;
export type OpportunityContact = typeof opportunityContacts.$inferSelect;

