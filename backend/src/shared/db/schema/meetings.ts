import { pgTable, varchar, text, timestamp, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customers } from './customers.js';
import { users } from './users.js';
import { contacts } from './contacts.js';
import { accounts } from './accounts.js';

/**
 * Meetings table - scheduled meetings/calls
 */
export const meetings = pgTable('meetings', {
  id: varchar('id', { length: 36 }).primaryKey(), // mtg_xxxxx
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  
  // Organizer
  organizerId: varchar('organizer_id', { length: 36 }).notNull().references(() => users.id),
  
  // Related entities
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  accountId: varchar('account_id', { length: 36 }).references(() => accounts.id),
  opportunityId: varchar('opportunity_id', { length: 36 }),
  
  // Meeting details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  location: text('location'),
  
  // Type
  type: varchar('type', { length: 50 }).default('call').notNull(), // call, video, in_person
  
  // Status
  status: varchar('status', { length: 20 }).default('proposed').notNull(),
  // proposed, confirmed, cancelled, completed, no_show
  
  // Timing
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: integer('duration_minutes').notNull(),
  timezone: varchar('timezone', { length: 50 }),
  
  // Video conferencing
  videoProvider: varchar('video_provider', { length: 50 }), // zoom, meet, teams
  videoLink: text('video_link'),
  
  // Reminder
  reminderMinutesBefore: integer('reminder_minutes_before').default(15),
  reminderSentAt: timestamp('reminder_sent_at', { withTimezone: true }),
  
  // Outcome
  outcome: varchar('outcome', { length: 50 }), // completed, rescheduled, cancelled, no_show
  notes: text('notes'),
  
  // Provider sync
  provider: varchar('provider', { length: 50 }), // google, outlook
  providerEventId: varchar('provider_event_id', { length: 255 }),
  
  // Idempotency
  idempotencyKey: varchar('idempotency_key', { length: 64 }),
  
  // Timestamps
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('meetings_customer_id_idx').on(table.customerId),
  index('meetings_organizer_id_idx').on(table.organizerId),
  index('meetings_contact_id_idx').on(table.contactId),
  index('meetings_account_id_idx').on(table.accountId),
  index('meetings_status_idx').on(table.status),
  index('meetings_start_time_idx').on(table.startTime),
  index('meetings_idempotency_key_idx').on(table.idempotencyKey),
]);

/**
 * Meeting attendees - internal team members
 */
export const meetingAttendees = pgTable('meeting_attendees', {
  id: varchar('id', { length: 36 }).primaryKey(),
  meetingId: varchar('meeting_id', { length: 36 }).notNull().references(() => meetings.id),
  userId: varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  
  response: varchar('response', { length: 20 }).default('pending'), // pending, accepted, declined, tentative
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('meeting_attendees_meeting_id_idx').on(table.meetingId),
  index('meeting_attendees_user_id_idx').on(table.userId),
]);

/**
 * Meeting external attendees - contacts/external participants
 */
export const meetingExternalAttendees = pgTable('meeting_external_attendees', {
  id: varchar('id', { length: 36 }).primaryKey(),
  meetingId: varchar('meeting_id', { length: 36 }).notNull().references(() => meetings.id),
  
  contactId: varchar('contact_id', { length: 36 }).references(() => contacts.id),
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  
  response: varchar('response', { length: 20 }).default('pending'),
  respondedAt: timestamp('responded_at', { withTimezone: true }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('meeting_external_attendees_meeting_id_idx').on(table.meetingId),
  index('meeting_external_attendees_contact_id_idx').on(table.contactId),
]);

// Relations
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  customer: one(customers, {
    fields: [meetings.customerId],
    references: [customers.id],
  }),
  organizer: one(users, {
    fields: [meetings.organizerId],
    references: [users.id],
  }),
  contact: one(contacts, {
    fields: [meetings.contactId],
    references: [contacts.id],
  }),
  account: one(accounts, {
    fields: [meetings.accountId],
    references: [accounts.id],
  }),
  attendees: many(meetingAttendees),
  externalAttendees: many(meetingExternalAttendees),
}));

export const meetingAttendeesRelations = relations(meetingAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingAttendees.meetingId],
    references: [meetings.id],
  }),
  user: one(users, {
    fields: [meetingAttendees.userId],
    references: [users.id],
  }),
}));

export const meetingExternalAttendeesRelations = relations(meetingExternalAttendees, ({ one }) => ({
  meeting: one(meetings, {
    fields: [meetingExternalAttendees.meetingId],
    references: [meetings.id],
  }),
  contact: one(contacts, {
    fields: [meetingExternalAttendees.contactId],
    references: [contacts.id],
  }),
}));

export type Meeting = typeof meetings.$inferSelect;
export type NewMeeting = typeof meetings.$inferInsert;
export type MeetingAttendee = typeof meetingAttendees.$inferSelect;
export type MeetingExternalAttendee = typeof meetingExternalAttendees.$inferSelect;

