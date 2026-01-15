import { eq, and, desc, sql, or, gte, lte } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { activities, notes, calls } from '../../shared/db/schema/activities.js';
import { generateId } from '../../shared/utils/id.js';
import type { CustomerId, UserId, AccountId, ContactId, CursorPaginatedResponse, ActivityType } from '../../shared/types/index.js';
import type { Activity, Note, Call } from '../../shared/db/schema/activities.js';

export interface CreateActivityInput {
  type: string;
  title: string;
  description?: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  userId?: string;
  sourceType?: string;
  sourceId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface ListActivitiesOptions {
  cursor?: string;
  limit?: number;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  userId?: string;
  types?: string[];
  from?: Date;
  to?: Date;
}

export interface CreateNoteInput {
  content: string;
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
}

export interface LogCallInput {
  contactId?: string;
  accountId?: string;
  opportunityId?: string;
  direction: 'inbound' | 'outbound';
  status: 'completed' | 'no_answer' | 'busy' | 'failed';
  phoneNumber?: string;
  durationSeconds?: number;
  outcome?: string;
  notes?: string;
  startedAt: Date;
  endedAt?: Date;
}

/**
 * Create an activity record
 */
export async function createActivity(
  customerId: CustomerId,
  input: CreateActivityInput
): Promise<Activity> {
  const db = getDb();
  const id = generateId();

  const [activity] = await db
    .insert(activities)
    .values({
      id,
      customerId,
      type: input.type,
      title: input.title,
      description: input.description || null,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      opportunityId: input.opportunityId || null,
      userId: input.userId || null,
      sourceType: input.sourceType || null,
      sourceId: input.sourceId || null,
      metadata: input.metadata || {},
      occurredAt: input.occurredAt || new Date(),
    })
    .returning();

  return activity;
}

/**
 * List activities with cursor-based pagination
 */
export async function listActivities(
  customerId: CustomerId,
  options: ListActivitiesOptions = {}
): Promise<CursorPaginatedResponse<Activity>> {
  const db = getDb();
  const { cursor, limit = 20, contactId, accountId, opportunityId, userId, types, from, to } = options;

  // Build where conditions
  const conditions = [eq(activities.customerId, customerId)];

  if (contactId) {
    conditions.push(eq(activities.contactId, contactId));
  }

  if (accountId) {
    conditions.push(eq(activities.accountId, accountId));
  }

  if (opportunityId) {
    conditions.push(eq(activities.opportunityId, opportunityId));
  }

  if (userId) {
    conditions.push(eq(activities.userId, userId));
  }

  if (types && types.length > 0) {
    const typeConditions = types.map((t) => eq(activities.type, t));
    conditions.push(or(...typeConditions)!);
  }

  if (from) {
    conditions.push(gte(activities.occurredAt, from));
  }

  if (to) {
    conditions.push(lte(activities.occurredAt, to));
  }

  // Handle cursor (timestamp-based)
  if (cursor) {
    const cursorDate = new Date(cursor);
    conditions.push(lte(activities.occurredAt, cursorDate));
  }

  const whereClause = and(...conditions);

  // Get activities with +1 to check for more
  const data = await db
    .select()
    .from(activities)
    .where(whereClause)
    .orderBy(desc(activities.occurredAt))
    .limit(limit + 1);

  const hasMore = data.length > limit;
  if (hasMore) {
    data.pop(); // Remove the extra item
  }

  const nextCursor = hasMore && data.length > 0 
    ? data[data.length - 1].occurredAt.toISOString() 
    : undefined;

  return {
    data,
    pagination: {
      nextCursor,
      hasMore,
    },
  };
}

/**
 * Get activity timeline for a contact
 */
export async function getContactTimeline(
  customerId: CustomerId,
  contactId: ContactId,
  options: { cursor?: string; limit?: number } = {}
): Promise<CursorPaginatedResponse<Activity>> {
  return listActivities(customerId, { ...options, contactId });
}

/**
 * Get activity timeline for an account
 */
export async function getAccountTimeline(
  customerId: CustomerId,
  accountId: AccountId,
  options: { cursor?: string; limit?: number } = {}
): Promise<CursorPaginatedResponse<Activity>> {
  return listActivities(customerId, { ...options, accountId });
}

/**
 * Create a note
 */
export async function createNote(
  customerId: CustomerId,
  authorId: UserId,
  input: CreateNoteInput
): Promise<Note> {
  const db = getDb();
  const id = generateId();

  const [note] = await db
    .insert(notes)
    .values({
      id,
      customerId,
      authorId,
      content: input.content,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      opportunityId: input.opportunityId || null,
    })
    .returning();

  // Also create an activity record
  await createActivity(customerId, {
    type: 'note_added',
    title: 'Note added',
    description: input.content.substring(0, 200),
    contactId: input.contactId,
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    userId: authorId,
    sourceType: 'note',
    sourceId: id,
  });

  return note;
}

/**
 * Log a call
 */
export async function logCall(
  customerId: CustomerId,
  userId: UserId,
  input: LogCallInput
): Promise<Call> {
  const db = getDb();
  const id = generateId();

  const [call] = await db
    .insert(calls)
    .values({
      id,
      customerId,
      userId,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      opportunityId: input.opportunityId || null,
      direction: input.direction,
      status: input.status,
      phoneNumber: input.phoneNumber || null,
      durationSeconds: input.durationSeconds || null,
      outcome: input.outcome || null,
      notes: input.notes || null,
      startedAt: input.startedAt,
      endedAt: input.endedAt || null,
    })
    .returning();

  // Also create an activity record
  const durationStr = input.durationSeconds 
    ? `${Math.floor(input.durationSeconds / 60)}m ${input.durationSeconds % 60}s`
    : '';

  await createActivity(customerId, {
    type: input.status === 'completed' ? 'call_logged' : `call_${input.status}`,
    title: `${input.direction === 'outbound' ? 'Outbound' : 'Inbound'} call${durationStr ? ` (${durationStr})` : ''}`,
    description: input.notes,
    contactId: input.contactId,
    accountId: input.accountId,
    opportunityId: input.opportunityId,
    userId,
    sourceType: 'call',
    sourceId: id,
    occurredAt: input.startedAt,
    metadata: {
      direction: input.direction,
      status: input.status,
      outcome: input.outcome,
      duration: input.durationSeconds,
    },
  });

  return call;
}

/**
 * Get activity counts by type for a contact
 */
export async function getContactActivitySummary(
  customerId: CustomerId,
  contactId: ContactId
): Promise<{ type: string; count: number }[]> {
  const db = getDb();

  const result = await db
    .select({
      type: activities.type,
      count: sql<number>`count(*)`,
    })
    .from(activities)
    .where(
      and(
        eq(activities.customerId, customerId),
        eq(activities.contactId, contactId)
      )
    )
    .groupBy(activities.type);

  return result.map((r) => ({
    type: r.type,
    count: Number(r.count),
  }));
}

