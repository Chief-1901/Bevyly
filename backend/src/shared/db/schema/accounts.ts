import { pgTable, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';

/**
 * Accounts table - represents companies/organizations being sold to
 * Core CRM entity
 */
export const accounts = pgTable('accounts', {
  id: varchar('id', { length: 36 }).primaryKey(), // acc_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Basic info
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  website: text('website'),
  
  // Industry & classification
  industry: varchar('industry', { length: 100 }),
  employeeCount: integer('employee_count'),
  annualRevenue: integer('annual_revenue'), // in cents
  
  // Location
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  postalCode: varchar('postal_code', { length: 20 }),
  
  // Sales info
  ownerId: varchar('owner_id', { length: 36 }).references(() => users.id),
  status: varchar('status', { length: 50 }).default('prospect').notNull(), // prospect, active, churned, etc.
  
  // Social
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  
  // Custom fields
  customFields: jsonb('custom_fields').$type<Record<string, unknown>>().default({}),
  
  // External IDs for future integrations
  externalIds: jsonb('external_ids').$type<Record<string, string>>().default({}),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('accounts_customer_id_idx').on(table.customerId),
  index('accounts_owner_id_idx').on(table.ownerId),
  index('accounts_domain_idx').on(table.domain),
  index('accounts_customer_name_idx').on(table.customerId, table.name),
]);

// Relations
export const accountsRelations = relations(accounts, ({ one }) => ({
  customer: one(customers, {
    fields: [accounts.customerId],
    references: [customers.id],
  }),
  owner: one(users, {
    fields: [accounts.ownerId],
    references: [users.id],
  }),
}));

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

