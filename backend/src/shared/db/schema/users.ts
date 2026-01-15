import { pgTable, varchar, text, timestamp, boolean, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';

/**
 * Users table - individual users within a customer organization
 */
export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(), // usr_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: text('password_hash'),
  
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  avatarUrl: text('avatar_url'),
  
  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(), // active, invited, suspended
  emailVerified: boolean('email_verified').default(false).notNull(),
  
  // Preferences
  preferences: jsonb('preferences').$type<UserPreferences>().default({}),
  
  // Timestamps
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('users_customer_email_idx').on(table.customerId, table.email),
  index('users_customer_id_idx').on(table.customerId),
]);

export interface UserPreferences {
  timezone?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
  };
}

/**
 * User roles table - RBAC role assignments
 */
export const userRoles = pgTable('user_roles', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  role: varchar('role', { length: 50 }).notNull(), // admin, manager, sales_rep, viewer
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('user_roles_user_role_idx').on(table.userId, table.role),
  index('user_roles_user_id_idx').on(table.userId),
]);

/**
 * API Keys table - for programmatic access
 */
export const apiKeys = pgTable('api_keys', {
  id: varchar('id', { length: 36 }).primaryKey(), // key_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  userId: varchar('user_id', { length: 36 }).references(() => users.id), // optional, can be customer-level
  
  name: varchar('name', { length: 100 }).notNull(),
  keyHash: text('key_hash').notNull(), // hashed API key
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(), // first 8 chars for identification
  
  scopes: jsonb('scopes').$type<string[]>().default([]),
  
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('api_keys_customer_id_idx').on(table.customerId),
  index('api_keys_key_prefix_idx').on(table.keyPrefix),
]);

/**
 * Refresh tokens table
 */
export const refreshTokens = pgTable('refresh_tokens', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  
  userAgent: text('user_agent'),
  ipAddress: varchar('ip_address', { length: 45 }),
  
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('refresh_tokens_user_id_idx').on(table.userId),
  index('refresh_tokens_token_hash_idx').on(table.tokenHash),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  customer: one(customers, {
    fields: [users.customerId],
    references: [customers.id],
  }),
  roles: many(userRoles),
  apiKeys: many(apiKeys),
  refreshTokens: many(refreshTokens),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  customer: one(customers, {
    fields: [apiKeys.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [apiKeys.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserRole = typeof userRoles.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type RefreshToken = typeof refreshTokens.$inferSelect;

