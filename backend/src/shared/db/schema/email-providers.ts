import { pgTable, varchar, text, timestamp, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';

/**
 * Email provider accounts - OAuth credentials for Gmail, Outlook, etc.
 * Each customer can have multiple provider accounts
 */
export const emailProviderAccounts = pgTable('email_provider_accounts', {
  id: varchar('id', { length: 36 }).primaryKey(), // epa_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  userId: varchar('user_id', { length: 36 }).references(() => users.id), // optional: user who connected the account
  
  // Provider identification
  provider: varchar('provider', { length: 50 }).notNull(), // 'gmail', 'outlook', 'smtp', etc.
  email: varchar('email', { length: 255 }).notNull(), // The email address of this account
  name: varchar('name', { length: 255 }), // Display name for this account
  
  // OAuth credentials (encrypted)
  accessToken: text('access_token'), // Encrypted OAuth access token
  refreshToken: text('refresh_token'), // Encrypted OAuth refresh token
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  
  // Provider-specific config (encrypted JSONB)
  config: jsonb('config').$type<{
    clientId?: string;
    clientSecret?: string;
    tenantId?: string; // For Microsoft/Outlook
    scope?: string[];
    // SMTP-specific
    host?: string;
    port?: number;
    secure?: boolean;
  }>(),
  
  // Status
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, disconnected, error
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
  lastError: text('last_error'),
  
  // Default flag
  isDefault: boolean('is_default').notNull().default(false), // Is this the default account for sending?
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
}, (table) => ({
  customerIdIdx: index('email_provider_accounts_customer_id_idx').on(table.customerId),
  emailIdx: index('email_provider_accounts_email_idx').on(table.email),
  // Only one default account per customer per provider
  uniqueDefaultPerProvider: uniqueIndex('email_provider_accounts_default_per_provider_idx')
    .on(table.customerId, table.provider)
    .where(sql`${table.isDefault} = true`),
}));

export const emailProviderAccountsRelations = relations(emailProviderAccounts, ({ one }) => ({
  customer: one(customers, {
    fields: [emailProviderAccounts.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [emailProviderAccounts.userId],
    references: [users.id],
  }),
}));

export type EmailProviderAccount = typeof emailProviderAccounts.$inferSelect;
export type NewEmailProviderAccount = typeof emailProviderAccounts.$inferInsert;

