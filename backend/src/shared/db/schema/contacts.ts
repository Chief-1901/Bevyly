import { pgTable, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { accounts } from './accounts.js';

/**
 * Contacts table - individuals at accounts
 * Core CRM entity
 */
export const contacts = pgTable('contacts', {
  id: varchar('id', { length: 36 }).primaryKey(), // con_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  
  // Basic info
  email: varchar('email', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  
  // Professional info
  title: varchar('title', { length: 150 }),
  department: varchar('department', { length: 100 }),
  
  // Contact info
  phone: varchar('phone', { length: 50 }),
  mobilePhone: varchar('mobile_phone', { length: 50 }),
  
  // Location
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }),
  country: varchar('country', { length: 100 }),
  timezone: varchar('timezone', { length: 50 }),
  
  // Social
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  
  // Sales info
  ownerId: varchar('owner_id', { length: 36 }).references(() => users.id),
  status: varchar('status', { length: 50 }).default('active').notNull(), // active, unsubscribed, bounced
  source: varchar('source', { length: 100 }), // where contact came from
  
  // Email preferences
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true }),
  bouncedAt: timestamp('bounced_at', { withTimezone: true }),
  
  // Custom fields
  customFields: jsonb('custom_fields').$type<Record<string, unknown>>().default({}),
  
  // External IDs
  externalIds: jsonb('external_ids').$type<Record<string, string>>().default({}),
  
  // Timestamps
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  index('contacts_customer_id_idx').on(table.customerId),
  index('contacts_account_id_idx').on(table.accountId),
  index('contacts_owner_id_idx').on(table.ownerId),
  index('contacts_email_idx').on(table.email),
  index('contacts_customer_email_idx').on(table.customerId, table.email),
]);

// Relations
export const contactsRelations = relations(contacts, ({ one }) => ({
  customer: one(customers, {
    fields: [contacts.customerId],
    references: [customers.id],
  }),
  account: one(accounts, {
    fields: [contacts.accountId],
    references: [accounts.id],
  }),
  owner: one(users, {
    fields: [contacts.ownerId],
    references: [users.id],
  }),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

