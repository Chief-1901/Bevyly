import { pgTable, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { contacts } from './contacts.js';

/**
 * Sequences table - email sequence templates
 */
export const sequences = pgTable('sequences', {
  id: varchar('id', { length: 36 }).primaryKey(), // seq_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Status
  status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, active, paused, archived
  
  // Owner
  ownerId: varchar('owner_id', { length: 36 }).references(() => users.id),
  
  // Settings
  settings: jsonb('settings').$type<SequenceSettings>().default({}),
  
  // Stats (denormalized for quick access)
  totalEnrolled: integer('total_enrolled').default(0),
  activeEnrolled: integer('active_enrolled').default(0),
  completedCount: integer('completed_count').default(0),
  repliedCount: integer('replied_count').default(0),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
}, (table) => [
  index('sequences_customer_id_idx').on(table.customerId),
  index('sequences_owner_id_idx').on(table.ownerId),
  index('sequences_status_idx').on(table.status),
]);

export interface SequenceSettings {
  timezone?: string;
  sendingWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[]; // 0-6, Sunday-Saturday
  };
  stopOnReply?: boolean;
  stopOnBounce?: boolean;
  exitOnMeeting?: boolean;
}

/**
 * Sequence steps - individual steps in a sequence
 */
export const sequenceSteps = pgTable('sequence_steps', {
  id: varchar('id', { length: 36 }).primaryKey(),
  sequenceId: varchar('sequence_id', { length: 36 }).notNull().references(() => sequences.id),
  
  stepNumber: integer('step_number').notNull(),
  type: varchar('type', { length: 20 }).default('email').notNull(), // email, wait, task
  
  // Wait step
  waitDays: integer('wait_days').default(0),
  waitHours: integer('wait_hours').default(0),
  
  // Email step
  subject: text('subject'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  
  // Personalization variables
  variables: jsonb('variables').$type<string[]>().default([]),
  
  // Task step
  taskDescription: text('task_description'),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('sequence_steps_sequence_id_idx').on(table.sequenceId),
  index('sequence_steps_step_number_idx').on(table.sequenceId, table.stepNumber),
]);

/**
 * Contact sequences - enrollment of contacts in sequences
 */
export const contactSequences = pgTable('contact_sequences', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  sequenceId: varchar('sequence_id', { length: 36 }).notNull().references(() => sequences.id),
  contactId: varchar('contact_id', { length: 36 }).notNull().references(() => contacts.id),
  
  // Enrollment info
  enrolledBy: varchar('enrolled_by', { length: 36 }).references(() => users.id),
  
  // Status
  status: varchar('status', { length: 20 }).default('active').notNull(),
  // active, paused, completed, replied, bounced, unsubscribed
  
  // Progress
  currentStepNumber: integer('current_step_number').default(1),
  nextStepAt: timestamp('next_step_at', { withTimezone: true }),
  
  // Completion
  completedAt: timestamp('completed_at', { withTimezone: true }),
  exitReason: varchar('exit_reason', { length: 50 }), // completed, replied, bounced, unsubscribed, manual
  
  // Stats
  emailsSent: integer('emails_sent').default(0),
  emailsOpened: integer('emails_opened').default(0),
  emailsClicked: integer('emails_clicked').default(0),
  
  // Timestamps
  enrolledAt: timestamp('enrolled_at', { withTimezone: true }).defaultNow().notNull(),
  pausedAt: timestamp('paused_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('contact_sequences_customer_id_idx').on(table.customerId),
  index('contact_sequences_sequence_id_idx').on(table.sequenceId),
  index('contact_sequences_contact_id_idx').on(table.contactId),
  index('contact_sequences_status_idx').on(table.status),
  index('contact_sequences_next_step_at_idx').on(table.nextStepAt),
]);

// Relations
export const sequencesRelations = relations(sequences, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sequences.customerId],
    references: [customers.id],
  }),
  owner: one(users, {
    fields: [sequences.ownerId],
    references: [users.id],
  }),
  steps: many(sequenceSteps),
  enrollments: many(contactSequences),
}));

export const sequenceStepsRelations = relations(sequenceSteps, ({ one }) => ({
  sequence: one(sequences, {
    fields: [sequenceSteps.sequenceId],
    references: [sequences.id],
  }),
}));

export const contactSequencesRelations = relations(contactSequences, ({ one }) => ({
  customer: one(customers, {
    fields: [contactSequences.customerId],
    references: [customers.id],
  }),
  sequence: one(sequences, {
    fields: [contactSequences.sequenceId],
    references: [sequences.id],
  }),
  contact: one(contacts, {
    fields: [contactSequences.contactId],
    references: [contacts.id],
  }),
  enrolledByUser: one(users, {
    fields: [contactSequences.enrolledBy],
    references: [users.id],
  }),
}));

export type Sequence = typeof sequences.$inferSelect;
export type NewSequence = typeof sequences.$inferInsert;
export type SequenceStep = typeof sequenceSteps.$inferSelect;
export type ContactSequence = typeof contactSequences.$inferSelect;

