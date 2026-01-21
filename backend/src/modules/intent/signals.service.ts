import { eq, and, isNull, desc, sql, gte, lte, inArray } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { signals, SIGNAL_TYPES, SEVERITIES } from '../../shared/db/schema/signals.js';
import { opportunities } from '../../shared/db/schema/opportunities.js';
import { activities } from '../../shared/db/schema/activities.js';
import { generateSignalId } from '../../shared/utils/id.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { CustomerId, SignalId, PaginatedResponse } from '../../shared/types/index.js';
import type { Signal, NewSignal, SignalType, Severity } from '../../shared/db/schema/signals.js';

// ─────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────

export interface CreateSignalInput {
  entityType: string;
  entityId: string;
  signalType: SignalType;
  severity: Severity;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface ListSignalsOptions {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  signalType?: SignalType | SignalType[];
  severity?: Severity | Severity[];
  status?: string;
  sortBy?: 'createdAt' | 'severity';
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────────────────────
// Signal CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Create a new signal
 */
export async function createSignal(
  customerId: CustomerId,
  input: CreateSignalInput
): Promise<Signal> {
  const db = getDb();
  const id = generateSignalId();

  const [signal] = await db
    .insert(signals)
    .values({
      id,
      customerId,
      entityType: input.entityType,
      entityId: input.entityId,
      signalType: input.signalType,
      severity: input.severity,
      title: input.title,
      description: input.description || null,
      data: input.data || {},
      status: 'active',
      expiresAt: input.expiresAt || null,
    })
    .returning();

  return signal;
}

/**
 * Get a signal by ID
 */
export async function getSignal(
  customerId: CustomerId,
  signalId: SignalId
): Promise<Signal> {
  const db = getDb();

  const [signal] = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.id, signalId),
        eq(signals.customerId, customerId)
      )
    )
    .limit(1);

  if (!signal) {
    throw new NotFoundError('Signal', signalId);
  }

  return signal;
}

/**
 * List signals with filtering
 */
export async function listSignals(
  customerId: CustomerId,
  options: ListSignalsOptions = {}
): Promise<PaginatedResponse<Signal>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    entityType,
    entityId,
    signalType,
    severity,
    status = 'active',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions: ReturnType<typeof eq>[] = [
    eq(signals.customerId, customerId),
  ];

  if (status) {
    conditions.push(eq(signals.status, status));
  }

  if (entityType) {
    conditions.push(eq(signals.entityType, entityType));
  }

  if (entityId) {
    conditions.push(eq(signals.entityId, entityId));
  }

  if (signalType) {
    const signalTypeArray = Array.isArray(signalType) ? signalType : [signalType];
    conditions.push(inArray(signals.signalType, signalTypeArray));
  }

  if (severity) {
    const severityArray = Array.isArray(severity) ? severity : [severity];
    conditions.push(inArray(signals.severity, severityArray));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(signals)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const orderBy = sortOrder === 'asc' 
    ? sql`${sortBy === 'severity' ? signals.severity : signals.createdAt} asc`
    : desc(sortBy === 'severity' ? signals.severity : signals.createdAt);

  const data = await db
    .select()
    .from(signals)
    .where(whereClause)
    .orderBy(orderBy)
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
 * Resolve/dismiss a signal
 */
export async function resolveSignal(
  customerId: CustomerId,
  signalId: SignalId,
  status: 'resolved' | 'dismissed' = 'resolved'
): Promise<Signal> {
  const db = getDb();

  await getSignal(customerId, signalId);

  const [updated] = await db
    .update(signals)
    .set({
      status,
      resolvedAt: new Date(),
    })
    .where(
      and(
        eq(signals.id, signalId),
        eq(signals.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

// ─────────────────────────────────────────────────────────────
// Signal Detection (Heuristics)
// ─────────────────────────────────────────────────────────────

/**
 * Detect stalled deals (no activity for 14+ days)
 */
export async function detectStalledDeals(customerId: CustomerId): Promise<Signal[]> {
  const db = getDb();
  const stalledThresholdDays = 14;
  const stalledThreshold = new Date();
  stalledThreshold.setDate(stalledThreshold.getDate() - stalledThresholdDays);

  // Find opportunities with no recent activity
  const stalledOpportunities = await db
    .select({
      id: opportunities.id,
      name: opportunities.name,
      stage: opportunities.stage,
      amount: opportunities.amount,
      accountId: opportunities.accountId,
    })
    .from(opportunities)
    .where(
      and(
        eq(opportunities.customerId, customerId),
        isNull(opportunities.deletedAt),
        // Not closed
        sql`${opportunities.stage} NOT IN ('closed_won', 'closed_lost')`,
        // Updated more than threshold days ago
        lte(opportunities.updatedAt, stalledThreshold)
      )
    );

  const createdSignals: Signal[] = [];

  for (const opp of stalledOpportunities) {
    // Check if we already have an active signal for this opportunity
    const [existingSignal] = await db
      .select()
      .from(signals)
      .where(
        and(
          eq(signals.customerId, customerId),
          eq(signals.entityType, 'opportunity'),
          eq(signals.entityId, opp.id),
          eq(signals.signalType, 'deal_stalled'),
          eq(signals.status, 'active')
        )
      )
      .limit(1);

    if (!existingSignal) {
      const signal = await createSignal(customerId, {
        entityType: 'opportunity',
        entityId: opp.id,
        signalType: 'deal_stalled',
        severity: 'high',
        title: `Deal "${opp.name}" has been inactive for ${stalledThresholdDays}+ days`,
        description: `This opportunity in ${opp.stage} stage has had no activity recently. Consider reaching out or updating the status.`,
        data: {
          opportunityId: opp.id,
          opportunityName: opp.name,
          stage: opp.stage,
          amount: opp.amount,
          accountId: opp.accountId,
          daysSinceActivity: stalledThresholdDays,
        },
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expire in 7 days
      });
      createdSignals.push(signal);
    }
  }

  return createdSignals;
}

/**
 * Detect leads ready for review (new leads from recent generation)
 */
export async function detectLeadsReady(customerId: CustomerId): Promise<Signal[]> {
  const db = getDb();
  
  // Import leads table - check if we have new leads
  const { leads } = await import('../../shared/db/schema/leads.js');
  
  const recentThreshold = new Date();
  recentThreshold.setHours(recentThreshold.getHours() - 24); // Last 24 hours

  // Count new leads by source/campaign
  const leadCounts = await db
    .select({
      source: leads.source,
      campaignId: leads.campaignId,
      count: sql<number>`count(*)`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.customerId, customerId),
        eq(leads.status, 'new'),
        isNull(leads.deletedAt),
        gte(leads.createdAt, recentThreshold)
      )
    )
    .groupBy(leads.source, leads.campaignId);

  const createdSignals: Signal[] = [];

  for (const group of leadCounts) {
    if (Number(group.count) > 0) {
      // Check if we already have a recent signal for this source/campaign
      const [existingSignal] = await db
        .select()
        .from(signals)
        .where(
          and(
            eq(signals.customerId, customerId),
            eq(signals.signalType, 'leads_ready'),
            eq(signals.status, 'active'),
            gte(signals.createdAt, recentThreshold)
          )
        )
        .limit(1);

      if (!existingSignal) {
        const signal = await createSignal(customerId, {
          entityType: 'leads',
          entityId: group.campaignId || group.source,
          signalType: 'leads_ready',
          severity: 'medium',
          title: `${group.count} new leads ready for review`,
          description: `New leads from ${group.source}${group.campaignId ? ' campaign' : ''} are ready for review and qualification.`,
          data: {
            count: Number(group.count),
            source: group.source,
            campaignId: group.campaignId,
          },
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // Expire in 3 days
        });
        createdSignals.push(signal);
      }
    }
  }

  return createdSignals;
}

/**
 * Run all signal detection heuristics
 */
export async function detectAllSignals(customerId: CustomerId): Promise<{
  stalledDeals: Signal[];
  leadsReady: Signal[];
}> {
  const [stalledDeals, leadsReady] = await Promise.all([
    detectStalledDeals(customerId),
    detectLeadsReady(customerId),
  ]);

  return {
    stalledDeals,
    leadsReady,
  };
}

/**
 * Get active signals count by type
 */
export async function getSignalCounts(
  customerId: CustomerId
): Promise<Record<SignalType, number>> {
  const db = getDb();

  const results = await db
    .select({
      signalType: signals.signalType,
      count: sql<number>`count(*)`,
    })
    .from(signals)
    .where(
      and(
        eq(signals.customerId, customerId),
        eq(signals.status, 'active')
      )
    )
    .groupBy(signals.signalType);

  const counts: Record<string, number> = {};
  for (const type of SIGNAL_TYPES) {
    counts[type] = 0;
  }
  for (const row of results) {
    counts[row.signalType] = Number(row.count);
  }

  return counts as Record<SignalType, number>;
}
