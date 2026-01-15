import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { meetings, meetingAttendees, meetingExternalAttendees } from '../../shared/db/schema/meetings.js';
import { generateMeetingId, generateId } from '../../shared/utils/id.js';
import { getCalendarProvider } from './providers/index.js';
import { writeToOutbox, createEvent } from '../events/outbox.js';
import { EventTypes, AggregateTypes } from '../events/types.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';
import type { CustomerId, UserId, MeetingId, ContactId, AccountId, PaginatedResponse, MeetingStatus } from '../../shared/types/index.js';
import type { Meeting, MeetingAttendee, MeetingExternalAttendee } from '../../shared/db/schema/meetings.js';

const calendarLogger = logger.child({ module: 'calendar-service' });

export interface ProposeMeetingInput {
  title: string;
  description?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  type: 'call' | 'video' | 'in_person';
  startTime: Date;
  endTime: Date;
  timezone?: string;
  location?: string;
  attendeeIds?: string[]; // internal user IDs
  externalAttendees?: Array<{ email: string; name?: string }>;
  videoProvider?: 'google_meet' | 'zoom' | 'teams';
  reminderMinutesBefore?: number;
  idempotencyKey?: string;
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  notes?: string;
}

export interface ListMeetingsOptions {
  page?: number;
  limit?: number;
  contactId?: string;
  accountId?: string;
  status?: MeetingStatus;
  from?: Date;
  to?: Date;
}

/**
 * Propose (create) a new meeting
 */
export async function proposeMeeting(
  customerId: CustomerId,
  organizerId: UserId,
  input: ProposeMeetingInput
): Promise<Meeting> {
  const db = getDb();
  const id = generateMeetingId();

  // Calculate duration
  const durationMinutes = Math.round((input.endTime.getTime() - input.startTime.getTime()) / 60000);

  if (durationMinutes <= 0) {
    throw new BadRequestError('End time must be after start time');
  }

  // Create calendar event via provider
  const provider = getCalendarProvider();
  let videoLink: string | undefined;
  let providerEventId: string | undefined;

  try {
    const allAttendees = [
      ...(input.externalAttendees || []),
    ];

    const result = await provider.createEvent({
      title: input.title,
      description: input.description,
      startTime: input.startTime,
      endTime: input.endTime,
      timezone: input.timezone || 'UTC',
      location: input.location,
      attendees: allAttendees,
      conferencing: input.videoProvider ? { provider: input.videoProvider } : undefined,
      reminders: input.reminderMinutesBefore
        ? [{ method: 'email', minutesBefore: input.reminderMinutesBefore }]
        : undefined,
    });

    if (result.success) {
      videoLink = result.meetingLink;
      providerEventId = result.providerEventId;
    }
  } catch (error) {
    calendarLogger.warn({ error }, 'Failed to create calendar event');
    // Continue without provider integration
  }

  // Create meeting record
  const [meeting] = await db
    .insert(meetings)
    .values({
      id,
      customerId,
      organizerId,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      opportunityId: input.opportunityId || null,
      title: input.title,
      description: input.description || null,
      location: input.location || null,
      type: input.type,
      status: 'proposed',
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes,
      timezone: input.timezone || 'UTC',
      videoProvider: input.videoProvider || null,
      videoLink: videoLink || null,
      reminderMinutesBefore: input.reminderMinutesBefore ?? 15,
      provider: provider.name,
      providerEventId: providerEventId || null,
      idempotencyKey: input.idempotencyKey || null,
    })
    .returning();

  // Add internal attendees
  if (input.attendeeIds && input.attendeeIds.length > 0) {
    await db.insert(meetingAttendees).values(
      input.attendeeIds.map((userId) => ({
        id: generateId(),
        meetingId: id,
        userId,
        response: 'pending',
      }))
    );
  }

  // Add external attendees
  if (input.externalAttendees && input.externalAttendees.length > 0) {
    await db.insert(meetingExternalAttendees).values(
      input.externalAttendees.map((attendee) => ({
        id: generateId(),
        meetingId: id,
        contactId: input.contactId || null,
        email: attendee.email,
        name: attendee.name || null,
        response: 'pending',
      }))
    );
  }

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.MEETING_PROPOSED,
      AggregateTypes.MEETING,
      id,
      customerId,
      {
        meetingId: id,
        contactId: input.contactId,
        accountId: input.accountId,
        organizerId,
        startTime: input.startTime.toISOString(),
        endTime: input.endTime.toISOString(),
        type: input.type,
      },
      { userId: organizerId }
    )
  );

  calendarLogger.info({ meetingId: id, title: input.title }, 'Meeting proposed');

  return meeting;
}

/**
 * Confirm a meeting
 */
export async function confirmMeeting(
  customerId: CustomerId,
  meetingId: MeetingId,
  userId: UserId
): Promise<Meeting> {
  const db = getDb();

  const meeting = await getMeeting(customerId, meetingId);

  if (meeting.status !== 'proposed') {
    throw new BadRequestError(`Cannot confirm meeting with status: ${meeting.status}`);
  }

  const [updated] = await db
    .update(meetings)
    .set({
      status: 'confirmed',
      confirmedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.customerId, customerId)
      )
    )
    .returning();

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.MEETING_CONFIRMED,
      AggregateTypes.MEETING,
      meetingId,
      customerId,
      {
        meetingId,
        contactId: meeting.contactId,
        accountId: meeting.accountId,
        organizerId: meeting.organizerId,
        startTime: meeting.startTime.toISOString(),
        endTime: meeting.endTime.toISOString(),
        type: meeting.type,
      },
      { userId }
    )
  );

  calendarLogger.info({ meetingId }, 'Meeting confirmed');

  return updated;
}

/**
 * Cancel a meeting
 */
export async function cancelMeeting(
  customerId: CustomerId,
  meetingId: MeetingId,
  userId: UserId,
  reason?: string
): Promise<Meeting> {
  const db = getDb();

  const meeting = await getMeeting(customerId, meetingId);

  if (meeting.status === 'completed' || meeting.status === 'cancelled') {
    throw new BadRequestError(`Cannot cancel meeting with status: ${meeting.status}`);
  }

  // Cancel on provider
  if (meeting.providerEventId) {
    const provider = getCalendarProvider();
    await provider.cancelEvent(meeting.providerEventId).catch((err) => {
      calendarLogger.warn({ error: err, meetingId }, 'Failed to cancel event on provider');
    });
  }

  const [updated] = await db
    .update(meetings)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      notes: reason || meeting.notes,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.customerId, customerId)
      )
    )
    .returning();

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.MEETING_CANCELLED,
      AggregateTypes.MEETING,
      meetingId,
      customerId,
      {
        meetingId,
        contactId: meeting.contactId,
        accountId: meeting.accountId,
        reason,
      },
      { userId }
    )
  );

  calendarLogger.info({ meetingId }, 'Meeting cancelled');

  return updated;
}

/**
 * Complete a meeting
 */
export async function completeMeeting(
  customerId: CustomerId,
  meetingId: MeetingId,
  userId: UserId,
  outcome?: string,
  notes?: string
): Promise<Meeting> {
  const db = getDb();

  const meeting = await getMeeting(customerId, meetingId);

  if (meeting.status !== 'confirmed') {
    throw new BadRequestError(`Cannot complete meeting with status: ${meeting.status}`);
  }

  const [updated] = await db
    .update(meetings)
    .set({
      status: 'completed',
      outcome: outcome || null,
      notes: notes || meeting.notes,
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.customerId, customerId)
      )
    )
    .returning();

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.MEETING_COMPLETED,
      AggregateTypes.MEETING,
      meetingId,
      customerId,
      {
        meetingId,
        contactId: meeting.contactId,
        accountId: meeting.accountId,
        notes,
      },
      { userId }
    )
  );

  calendarLogger.info({ meetingId }, 'Meeting completed');

  return updated;
}

/**
 * Mark meeting as no-show
 */
export async function markNoShow(
  customerId: CustomerId,
  meetingId: MeetingId,
  userId: UserId
): Promise<Meeting> {
  const db = getDb();

  const meeting = await getMeeting(customerId, meetingId);

  const [updated] = await db
    .update(meetings)
    .set({
      status: 'no_show',
      outcome: 'no_show',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.customerId, customerId)
      )
    )
    .returning();

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.MEETING_NO_SHOW,
      AggregateTypes.MEETING,
      meetingId,
      customerId,
      {
        meetingId,
        contactId: meeting.contactId,
        accountId: meeting.accountId,
      },
      { userId }
    )
  );

  calendarLogger.info({ meetingId }, 'Meeting marked as no-show');

  return updated;
}

/**
 * Get a meeting by ID
 */
export async function getMeeting(
  customerId: CustomerId,
  meetingId: MeetingId
): Promise<Meeting> {
  const db = getDb();

  const [meeting] = await db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.id, meetingId),
        eq(meetings.customerId, customerId)
      )
    )
    .limit(1);

  if (!meeting) {
    throw new NotFoundError('Meeting', meetingId);
  }

  return meeting;
}

/**
 * List meetings with pagination
 */
export async function listMeetings(
  customerId: CustomerId,
  options: ListMeetingsOptions = {}
): Promise<PaginatedResponse<Meeting>> {
  const db = getDb();
  const { page = 1, limit = 20, contactId, accountId, status, from, to } = options;
  const offset = (page - 1) * limit;

  const conditions = [eq(meetings.customerId, customerId)];

  if (contactId) {
    conditions.push(eq(meetings.contactId, contactId));
  }
  if (accountId) {
    conditions.push(eq(meetings.accountId, accountId));
  }
  if (status) {
    conditions.push(eq(meetings.status, status));
  }
  if (from) {
    conditions.push(gte(meetings.startTime, from));
  }
  if (to) {
    conditions.push(lte(meetings.startTime, to));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(meetings)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const data = await db
    .select()
    .from(meetings)
    .where(whereClause)
    .orderBy(desc(meetings.startTime))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get availability slots
 */
export async function getAvailability(
  startDate: Date,
  endDate: Date,
  durationMinutes: number,
  timezone = 'UTC'
): Promise<Array<{ start: Date; end: Date; available: boolean }>> {
  const provider = getCalendarProvider();
  
  return provider.getAvailability({
    startDate,
    endDate,
    durationMinutes,
    timezone,
    workingHours: { start: 9, end: 17 },
    excludeWeekends: true,
  });
}

/**
 * Get upcoming meetings for a user
 */
export async function getUpcomingMeetings(
  customerId: CustomerId,
  userId: UserId,
  limit = 5
): Promise<Meeting[]> {
  const db = getDb();
  const now = new Date();

  return db
    .select()
    .from(meetings)
    .where(
      and(
        eq(meetings.customerId, customerId),
        eq(meetings.organizerId, userId),
        gte(meetings.startTime, now),
        eq(meetings.status, 'confirmed')
      )
    )
    .orderBy(meetings.startTime)
    .limit(limit);
}

