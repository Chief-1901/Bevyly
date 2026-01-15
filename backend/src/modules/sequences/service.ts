import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { sequences, sequenceSteps, contactSequences } from '../../shared/db/schema/sequences.js';
import { generateSequenceId, generateId } from '../../shared/utils/id.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';
import type { CustomerId, UserId, SequenceId, ContactId, PaginatedResponse } from '../../shared/types/index.js';
import type { Sequence, SequenceStep, ContactSequence, SequenceSettings } from '../../shared/db/schema/sequences.js';

const sequenceLogger = logger.child({ module: 'sequence-service' });

export interface CreateSequenceInput {
  name: string;
  description?: string;
  ownerId?: string;
  settings?: SequenceSettings;
  steps?: Array<{
    type: 'email' | 'wait' | 'task';
    waitDays?: number;
    waitHours?: number;
    subject?: string;
    bodyHtml?: string;
    bodyText?: string;
    taskDescription?: string;
  }>;
}

export interface UpdateSequenceInput {
  name?: string;
  description?: string;
  settings?: SequenceSettings;
  status?: 'draft' | 'active' | 'paused' | 'archived';
}

export interface EnrollContactInput {
  sequenceId: string;
  contactId: string;
}

/**
 * Create a new sequence
 */
export async function createSequence(
  customerId: CustomerId,
  ownerId: UserId,
  input: CreateSequenceInput
): Promise<Sequence> {
  const db = getDb();
  const id = generateSequenceId();

  const [sequence] = await db
    .insert(sequences)
    .values({
      id,
      customerId,
      name: input.name,
      description: input.description || null,
      ownerId: input.ownerId || ownerId,
      status: 'draft',
      settings: input.settings || {},
    })
    .returning();

  // Create steps if provided
  if (input.steps && input.steps.length > 0) {
    await db.insert(sequenceSteps).values(
      input.steps.map((step, index) => ({
        id: generateId(),
        sequenceId: id,
        stepNumber: index + 1,
        type: step.type,
        waitDays: step.waitDays ?? 0,
        waitHours: step.waitHours ?? 0,
        subject: step.subject || null,
        bodyHtml: step.bodyHtml || null,
        bodyText: step.bodyText || null,
        taskDescription: step.taskDescription || null,
      }))
    );
  }

  sequenceLogger.info({ sequenceId: id, name: input.name }, 'Sequence created');

  return sequence;
}

/**
 * Get a sequence by ID
 */
export async function getSequence(
  customerId: CustomerId,
  sequenceId: SequenceId
): Promise<Sequence> {
  const db = getDb();

  const [sequence] = await db
    .select()
    .from(sequences)
    .where(
      and(
        eq(sequences.id, sequenceId),
        eq(sequences.customerId, customerId),
        isNull(sequences.archivedAt)
      )
    )
    .limit(1);

  if (!sequence) {
    throw new NotFoundError('Sequence', sequenceId);
  }

  return sequence;
}

/**
 * Get sequence with steps
 */
export async function getSequenceWithSteps(
  customerId: CustomerId,
  sequenceId: SequenceId
): Promise<{ sequence: Sequence; steps: SequenceStep[] }> {
  const sequence = await getSequence(customerId, sequenceId);
  const db = getDb();

  const steps = await db
    .select()
    .from(sequenceSteps)
    .where(eq(sequenceSteps.sequenceId, sequenceId))
    .orderBy(sequenceSteps.stepNumber);

  return { sequence, steps };
}

/**
 * Update a sequence
 */
export async function updateSequence(
  customerId: CustomerId,
  sequenceId: SequenceId,
  input: UpdateSequenceInput
): Promise<Sequence> {
  const db = getDb();
  await getSequence(customerId, sequenceId);

  const [updated] = await db
    .update(sequences)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sequences.id, sequenceId),
        eq(sequences.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Delete a sequence (archive)
 */
export async function deleteSequence(
  customerId: CustomerId,
  sequenceId: SequenceId
): Promise<void> {
  const db = getDb();
  await getSequence(customerId, sequenceId);

  await db
    .update(sequences)
    .set({
      status: 'archived',
      archivedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(sequences.id, sequenceId),
        eq(sequences.customerId, customerId)
      )
    );
}

/**
 * List sequences
 */
export async function listSequences(
  customerId: CustomerId,
  options: { page?: number; limit?: number; status?: string; ownerId?: string } = {}
): Promise<PaginatedResponse<Sequence>> {
  const db = getDb();
  const { page = 1, limit = 20, status, ownerId } = options;
  const offset = (page - 1) * limit;

  const conditions = [
    eq(sequences.customerId, customerId),
    isNull(sequences.archivedAt),
  ];

  if (status) {
    conditions.push(eq(sequences.status, status));
  }
  if (ownerId) {
    conditions.push(eq(sequences.ownerId, ownerId));
  }

  const whereClause = and(...conditions);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sequences)
    .where(whereClause);

  const total = Number(countResult.count);

  const data = await db
    .select()
    .from(sequences)
    .where(whereClause)
    .orderBy(desc(sequences.createdAt))
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
 * Enroll a contact in a sequence
 */
export async function enrollContact(
  customerId: CustomerId,
  userId: UserId,
  input: EnrollContactInput
): Promise<ContactSequence> {
  const db = getDb();
  
  // Verify sequence exists and is active
  const sequence = await getSequence(customerId, input.sequenceId as SequenceId);
  if (sequence.status !== 'active') {
    throw new BadRequestError('Can only enroll contacts in active sequences');
  }

  // Check if already enrolled
  const [existing] = await db
    .select()
    .from(contactSequences)
    .where(
      and(
        eq(contactSequences.sequenceId, input.sequenceId),
        eq(contactSequences.contactId, input.contactId),
        eq(contactSequences.status, 'active')
      )
    )
    .limit(1);

  if (existing) {
    throw new BadRequestError('Contact is already enrolled in this sequence');
  }

  const id = generateId();
  
  // Get first step to calculate next step time
  const [firstStep] = await db
    .select()
    .from(sequenceSteps)
    .where(eq(sequenceSteps.sequenceId, input.sequenceId))
    .orderBy(sequenceSteps.stepNumber)
    .limit(1);

  const nextStepAt = new Date();
  if (firstStep) {
    nextStepAt.setDate(nextStepAt.getDate() + (firstStep.waitDays || 0));
    nextStepAt.setHours(nextStepAt.getHours() + (firstStep.waitHours || 0));
  }

  const [enrollment] = await db
    .insert(contactSequences)
    .values({
      id,
      customerId,
      sequenceId: input.sequenceId,
      contactId: input.contactId,
      enrolledBy: userId,
      status: 'active',
      currentStepNumber: 1,
      nextStepAt,
    })
    .returning();

  // Update sequence stats
  await db
    .update(sequences)
    .set({
      totalEnrolled: sql`${sequences.totalEnrolled} + 1`,
      activeEnrolled: sql`${sequences.activeEnrolled} + 1`,
    })
    .where(eq(sequences.id, input.sequenceId));

  sequenceLogger.info(
    { sequenceId: input.sequenceId, contactId: input.contactId },
    'Contact enrolled in sequence'
  );

  return enrollment;
}

/**
 * Pause a contact's sequence enrollment
 */
export async function pauseEnrollment(
  customerId: CustomerId,
  enrollmentId: string
): Promise<ContactSequence> {
  const db = getDb();

  const [updated] = await db
    .update(contactSequences)
    .set({
      status: 'paused',
      pausedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactSequences.id, enrollmentId),
        eq(contactSequences.customerId, customerId),
        eq(contactSequences.status, 'active')
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Enrollment', enrollmentId);
  }

  // Update sequence active count
  await db
    .update(sequences)
    .set({
      activeEnrolled: sql`${sequences.activeEnrolled} - 1`,
    })
    .where(eq(sequences.id, updated.sequenceId));

  return updated;
}

/**
 * Resume a paused enrollment
 */
export async function resumeEnrollment(
  customerId: CustomerId,
  enrollmentId: string
): Promise<ContactSequence> {
  const db = getDb();

  const [updated] = await db
    .update(contactSequences)
    .set({
      status: 'active',
      pausedAt: null,
      nextStepAt: new Date(), // Resume immediately
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactSequences.id, enrollmentId),
        eq(contactSequences.customerId, customerId),
        eq(contactSequences.status, 'paused')
      )
    )
    .returning();

  if (!updated) {
    throw new NotFoundError('Enrollment', enrollmentId);
  }

  // Update sequence active count
  await db
    .update(sequences)
    .set({
      activeEnrolled: sql`${sequences.activeEnrolled} + 1`,
    })
    .where(eq(sequences.id, updated.sequenceId));

  return updated;
}

