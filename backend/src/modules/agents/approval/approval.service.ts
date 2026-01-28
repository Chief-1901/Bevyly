/**
 * Approval Queue Service
 *
 * Manages items pending user approval (e.g., leads to enrich).
 * Provides CRUD operations and bulk actions.
 */

import { eq, and, inArray, desc, sql, isNull } from 'drizzle-orm';
import { getDb } from '../../../shared/db/client.js';
import { approvalQueueItems, leads } from '../../../shared/db/schema/index.js';
import {
  generateApprovalItemId,
  type CustomerId,
  type UserId,
  type ApprovalQueueItemId,
  type LeadId,
  type AgentRunId,
} from '../../../shared/types/index.js';
import { logger } from '../../../shared/logger/index.js';
import { writeToOutbox, createEvent } from '../../events/outbox.js';
import type {
  CreateApprovalItemInput,
  FitScoreBucket,
  ApprovalStatus,
} from '../types.js';

const log = logger.child({ module: 'approval-service' });

/**
 * Approval queue summary statistics
 */
export interface ApprovalQueueSummary {
  total: number;
  pending: number;
  byBucket: {
    high: number;
    medium: number;
    low: number;
  };
  estimatedCredits: number;
}

/**
 * Create a new approval queue item
 */
export async function createApprovalItem(
  input: CreateApprovalItemInput
): Promise<ApprovalQueueItemId> {
  const db = getDb();
  const id = generateApprovalItemId();

  await db.insert(approvalQueueItems).values({
    id,
    customerId: input.customerId,
    agentRunId: input.agentRunId,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    description: input.description,
    metadata: input.metadata || {},
    estimatedCredits: input.estimatedCredits || 0,
    batchId: input.batchId,
    fitScoreBucket: input.fitScoreBucket,
    status: 'pending',
    expiresAt: input.expiresAt,
    createdAt: new Date(),
  });

  log.info({ id, entityType: input.entityType, entityId: input.entityId }, 'Approval item created');
  return id;
}

/**
 * Get approval queue summary for a tenant
 */
export async function getApprovalQueueSummary(
  customerId: CustomerId
): Promise<ApprovalQueueSummary> {
  const db = getDb();

  const results = await db
    .select({
      bucket: approvalQueueItems.fitScoreBucket,
      count: sql<number>`count(*)`,
      credits: sql<number>`sum(${approvalQueueItems.estimatedCredits})`,
    })
    .from(approvalQueueItems)
    .where(
      and(
        eq(approvalQueueItems.customerId, customerId),
        eq(approvalQueueItems.status, 'pending')
      )
    )
    .groupBy(approvalQueueItems.fitScoreBucket);

  const summary: ApprovalQueueSummary = {
    total: 0,
    pending: 0,
    byBucket: { high: 0, medium: 0, low: 0 },
    estimatedCredits: 0,
  };

  for (const row of results) {
    const count = Number(row.count);
    const credits = Number(row.credits) || 0;
    summary.total += count;
    summary.pending += count;
    summary.estimatedCredits += credits;

    if (row.bucket && row.bucket in summary.byBucket) {
      summary.byBucket[row.bucket as FitScoreBucket] = count;
    }
  }

  return summary;
}

/**
 * List approval queue items
 */
export async function listApprovalQueue(
  customerId: CustomerId,
  options?: {
    status?: ApprovalStatus;
    bucket?: FitScoreBucket;
    batchId?: string;
    page?: number;
    limit?: number;
  }
): Promise<{
  items: Array<typeof approvalQueueItems.$inferSelect & { lead?: typeof leads.$inferSelect }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}> {
  const db = getDb();
  const { status = 'pending', bucket, batchId, page = 1, limit = 20 } = options || {};

  const conditions = [
    eq(approvalQueueItems.customerId, customerId),
    eq(approvalQueueItems.status, status),
  ];

  if (bucket) {
    conditions.push(eq(approvalQueueItems.fitScoreBucket, bucket));
  }

  if (batchId) {
    conditions.push(eq(approvalQueueItems.batchId, batchId));
  }

  // Get items with joined lead data
  const items = await db
    .select({
      item: approvalQueueItems,
      lead: leads,
    })
    .from(approvalQueueItems)
    .leftJoin(
      leads,
      and(
        eq(approvalQueueItems.entityType, 'lead'),
        eq(approvalQueueItems.entityId, leads.id)
      )
    )
    .where(and(...conditions))
    .orderBy(
      // Priority: high > medium > low
      sql`CASE ${approvalQueueItems.fitScoreBucket}
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END`,
      desc(approvalQueueItems.createdAt)
    )
    .limit(limit)
    .offset((page - 1) * limit);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(approvalQueueItems)
    .where(and(...conditions));

  const total = Number(countResult?.count || 0);

  return {
    items: items.map(({ item, lead }) => ({
      ...item,
      lead: lead || undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get a single approval item
 */
export async function getApprovalItem(
  customerId: CustomerId,
  itemId: ApprovalQueueItemId
): Promise<typeof approvalQueueItems.$inferSelect | null> {
  const db = getDb();

  const [item] = await db
    .select()
    .from(approvalQueueItems)
    .where(
      and(
        eq(approvalQueueItems.id, itemId),
        eq(approvalQueueItems.customerId, customerId)
      )
    )
    .limit(1);

  return item || null;
}

/**
 * Approve items and trigger enrichment
 */
export async function approveItems(
  customerId: CustomerId,
  userId: UserId,
  itemIds: ApprovalQueueItemId[]
): Promise<{ approved: number; leadIds: LeadId[] }> {
  const db = getDb();

  // Update status to approved
  const updated = await db
    .update(approvalQueueItems)
    .set({
      status: 'approved',
      processedAt: new Date(),
      processedBy: userId,
    })
    .where(
      and(
        eq(approvalQueueItems.customerId, customerId),
        inArray(approvalQueueItems.id, itemIds),
        eq(approvalQueueItems.status, 'pending')
      )
    )
    .returning();

  const leadIds = updated
    .filter((item) => item.entityType === 'lead')
    .map((item) => item.entityId as LeadId);

  // Update lead enrichment status
  if (leadIds.length > 0) {
    await db
      .update(leads)
      .set({ enrichmentStatus: 'approved' })
      .where(inArray(leads.id, leadIds));
  }

  log.info(
    { customerId, approved: updated.length, leadIds: leadIds.length },
    'Approval items approved'
  );

  // Publish event for enrichment trigger
  if (leadIds.length > 0) {
    await writeToOutbox(
      createEvent('approval.leads.approved', 'approval', itemIds[0], customerId, {
        leadIds,
        userId,
        approvedCount: leadIds.length,
      })
    );
  }

  return { approved: updated.length, leadIds };
}

/**
 * Reject items
 */
export async function rejectItems(
  customerId: CustomerId,
  userId: UserId,
  itemIds: ApprovalQueueItemId[],
  reason?: string
): Promise<{ rejected: number }> {
  const db = getDb();

  const updated = await db
    .update(approvalQueueItems)
    .set({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: userId,
      metadata: sql`${approvalQueueItems.metadata} || ${JSON.stringify({ rejectionReason: reason })}::jsonb`,
    })
    .where(
      and(
        eq(approvalQueueItems.customerId, customerId),
        inArray(approvalQueueItems.id, itemIds),
        eq(approvalQueueItems.status, 'pending')
      )
    )
    .returning();

  // Update lead enrichment status to skipped
  const leadIds = updated
    .filter((item) => item.entityType === 'lead')
    .map((item) => item.entityId);

  if (leadIds.length > 0) {
    await db
      .update(leads)
      .set({ enrichmentStatus: 'skipped' })
      .where(inArray(leads.id, leadIds));
  }

  log.info({ customerId, rejected: updated.length }, 'Approval items rejected');

  return { rejected: updated.length };
}

/**
 * Approve all items in a bucket
 */
export async function approveAllInBucket(
  customerId: CustomerId,
  userId: UserId,
  options?: {
    bucket?: FitScoreBucket;
    maxCredits?: number;
  }
): Promise<{ approved: number; leadIds: LeadId[] }> {
  const db = getDb();
  const { bucket, maxCredits } = options || {};

  // Get pending items
  const conditions = [
    eq(approvalQueueItems.customerId, customerId),
    eq(approvalQueueItems.status, 'pending'),
  ];

  if (bucket) {
    conditions.push(eq(approvalQueueItems.fitScoreBucket, bucket));
  }

  let items = await db
    .select()
    .from(approvalQueueItems)
    .where(and(...conditions))
    .orderBy(
      sql`CASE ${approvalQueueItems.fitScoreBucket}
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        ELSE 3
      END`
    );

  // Limit by credits if specified
  if (maxCredits) {
    let totalCredits = 0;
    items = items.filter((item) => {
      if (totalCredits + (item.estimatedCredits || 0) <= maxCredits) {
        totalCredits += item.estimatedCredits || 0;
        return true;
      }
      return false;
    });
  }

  if (items.length === 0) {
    return { approved: 0, leadIds: [] };
  }

  const itemIds = items.map((i) => i.id as ApprovalQueueItemId);
  return approveItems(customerId, userId, itemIds);
}

/**
 * Expire old pending items
 */
export async function expireOldItems(): Promise<number> {
  const db = getDb();

  const updated = await db
    .update(approvalQueueItems)
    .set({ status: 'expired' })
    .where(
      and(
        eq(approvalQueueItems.status, 'pending'),
        sql`${approvalQueueItems.expiresAt} < NOW()`
      )
    )
    .returning();

  if (updated.length > 0) {
    log.info({ expired: updated.length }, 'Expired old approval items');
  }

  return updated.length;
}

/**
 * Get statistics by agent type
 */
export async function getApprovalStatsByAgent(
  customerId: CustomerId
): Promise<
  Array<{
    agentType: string;
    pending: number;
    approved: number;
    rejected: number;
  }>
> {
  const db = getDb();

  // Get agent run IDs and their types
  const { agentRuns } = await import('../../../shared/db/schema/index.js');

  const stats = await db
    .select({
      agentType: agentRuns.agentType,
      pending: sql<number>`count(*) filter (where ${approvalQueueItems.status} = 'pending')`,
      approved: sql<number>`count(*) filter (where ${approvalQueueItems.status} = 'approved')`,
      rejected: sql<number>`count(*) filter (where ${approvalQueueItems.status} = 'rejected')`,
    })
    .from(approvalQueueItems)
    .leftJoin(agentRuns, eq(approvalQueueItems.agentRunId, agentRuns.id))
    .where(eq(approvalQueueItems.customerId, customerId))
    .groupBy(agentRuns.agentType);

  return stats.map((s) => ({
    agentType: s.agentType || 'unknown',
    pending: Number(s.pending),
    approved: Number(s.approved),
    rejected: Number(s.rejected),
  }));
}
