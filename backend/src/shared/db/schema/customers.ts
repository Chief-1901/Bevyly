import { pgTable, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Customers table - represents a tenant/organization using SalesOS
 * This is the top-level entity for multi-tenancy
 */
export const customers = pgTable('customers', {
  id: varchar('id', { length: 36 }).primaryKey(), // cus_xxxxx
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  domain: varchar('domain', { length: 255 }),
  
  // Subscription/billing
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, suspended, cancelled
  
  // Settings
  settings: jsonb('settings').$type<CustomerSettings>().default({}),
  
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});

export interface CustomerSettings {
  timezone?: string;
  dateFormat?: string;
  defaultCurrency?: string;
  emailDailyLimit?: number;
  features?: string[];
}

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

