import { eq, and, isNull, like, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { opportunities, opportunityContacts } from '../../shared/db/schema/opportunities.js';
import { generateOpportunityId, generateId } from '../../shared/utils/id.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { CustomerId, UserId, OpportunityId, AccountId, ContactId, PaginatedResponse, OpportunityStage } from '../../shared/types/index.js';
import type { Opportunity, OpportunityContact } from '../../shared/db/schema/opportunities.js';

export interface CreateOpportunityInput {
  name: string;
  accountId: string;
  primaryContactId?: string;
  description?: string;
  stage?: OpportunityStage;
  probability?: number;
  amount?: number;
  currency?: string;
  closeDate?: string;
  ownerId?: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateOpportunityInput extends Partial<CreateOpportunityInput> {
  lostReason?: string;
  lostReasonDetail?: string;
}

export interface ListOpportunitiesOptions {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  ownerId?: string;
  stage?: string;
  minAmount?: number;
  maxAmount?: number;
  closeDateFrom?: string;
  closeDateTo?: string;
  sortBy?: 'name' | 'amount' | 'closeDate' | 'createdAt' | 'probability';
  sortOrder?: 'asc' | 'desc';
}

const STAGE_PROBABILITIES: Record<OpportunityStage, number> = {
  prospecting: 10,
  qualification: 25,
  proposal: 50,
  negotiation: 75,
  closed_won: 100,
  closed_lost: 0,
};

/**
 * Create a new opportunity
 */
export async function createOpportunity(
  customerId: CustomerId,
  input: CreateOpportunityInput
): Promise<Opportunity> {
  const db = getDb();
  const id = generateOpportunityId();

  const stage = (input.stage || 'prospecting') as OpportunityStage;
  const probability = input.probability ?? STAGE_PROBABILITIES[stage];

  const [opportunity] = await db
    .insert(opportunities)
    .values({
      id,
      customerId,
      accountId: input.accountId,
      primaryContactId: input.primaryContactId || null,
      name: input.name,
      description: input.description || null,
      stage,
      probability,
      amount: input.amount || null,
      currency: input.currency || 'USD',
      closeDate: input.closeDate || null,
      ownerId: input.ownerId || null,
      source: input.source || null,
      customFields: input.customFields || {},
    })
    .returning();

  return opportunity;
}

/**
 * Get an opportunity by ID
 */
export async function getOpportunity(
  customerId: CustomerId,
  opportunityId: OpportunityId
): Promise<Opportunity> {
  const db = getDb();

  const [opportunity] = await db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.customerId, customerId),
        isNull(opportunities.deletedAt)
      )
    )
    .limit(1);

  if (!opportunity) {
    throw new NotFoundError('Opportunity', opportunityId);
  }

  return opportunity;
}

/**
 * Update an opportunity
 */
export async function updateOpportunity(
  customerId: CustomerId,
  opportunityId: OpportunityId,
  input: UpdateOpportunityInput
): Promise<Opportunity> {
  const db = getDb();

  // Get current opportunity
  const current = await getOpportunity(customerId, opportunityId);

  const updateData: Partial<Opportunity> = {
    ...input,
    updatedAt: new Date(),
  };

  // Handle stage changes
  if (input.stage && input.stage !== current.stage) {
    const newStage = input.stage as OpportunityStage;
    
    // Update probability if not explicitly provided
    if (input.probability === undefined) {
      updateData.probability = STAGE_PROBABILITIES[newStage];
    }

    // Handle won/lost
    if (newStage === 'closed_won') {
      updateData.wonAt = new Date();
      updateData.lostAt = null;
    } else if (newStage === 'closed_lost') {
      updateData.lostAt = new Date();
      updateData.wonAt = null;
    } else {
      updateData.wonAt = null;
      updateData.lostAt = null;
    }
  }

  const [updated] = await db
    .update(opportunities)
    .set(updateData)
    .where(
      and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Delete an opportunity (soft delete)
 */
export async function deleteOpportunity(
  customerId: CustomerId,
  opportunityId: OpportunityId
): Promise<void> {
  const db = getDb();

  // Verify opportunity exists
  await getOpportunity(customerId, opportunityId);

  await db
    .update(opportunities)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(opportunities.id, opportunityId),
        eq(opportunities.customerId, customerId)
      )
    );
}

/**
 * List opportunities with pagination and filtering
 */
export async function listOpportunities(
  customerId: CustomerId,
  options: ListOpportunitiesOptions = {}
): Promise<PaginatedResponse<Opportunity>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    accountId,
    ownerId,
    stage,
    minAmount,
    maxAmount,
    closeDateFrom,
    closeDateTo,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [
    eq(opportunities.customerId, customerId),
    isNull(opportunities.deletedAt),
  ];

  if (search) {
    conditions.push(like(opportunities.name, `%${search}%`));
  }

  if (accountId) {
    conditions.push(eq(opportunities.accountId, accountId));
  }

  if (ownerId) {
    conditions.push(eq(opportunities.ownerId, ownerId));
  }

  if (stage) {
    conditions.push(eq(opportunities.stage, stage));
  }

  if (minAmount !== undefined) {
    conditions.push(gte(opportunities.amount, minAmount));
  }

  if (maxAmount !== undefined) {
    conditions.push(lte(opportunities.amount, maxAmount));
  }

  if (closeDateFrom) {
    conditions.push(gte(opportunities.closeDate, closeDateFrom));
  }

  if (closeDateTo) {
    conditions.push(lte(opportunities.closeDate, closeDateTo));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(opportunities)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const sortColumnMap = {
    name: opportunities.name,
    amount: opportunities.amount,
    closeDate: opportunities.closeDate,
    createdAt: opportunities.createdAt,
    probability: opportunities.probability,
  };
  
  const sortColumn = sortColumnMap[sortBy] || opportunities.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const data = await db
    .select()
    .from(opportunities)
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
 * Add a contact to an opportunity
 */
export async function addContactToOpportunity(
  customerId: CustomerId,
  opportunityId: OpportunityId,
  contactId: ContactId,
  role?: string
): Promise<OpportunityContact> {
  const db = getDb();

  // Verify opportunity exists
  await getOpportunity(customerId, opportunityId);

  const [record] = await db
    .insert(opportunityContacts)
    .values({
      id: generateId(),
      opportunityId,
      contactId,
      role: role || null,
    })
    .returning();

  return record;
}

/**
 * Get opportunities by account
 */
export async function getOpportunitiesByAccount(
  customerId: CustomerId,
  accountId: AccountId
): Promise<Opportunity[]> {
  const db = getDb();

  return db
    .select()
    .from(opportunities)
    .where(
      and(
        eq(opportunities.customerId, customerId),
        eq(opportunities.accountId, accountId),
        isNull(opportunities.deletedAt)
      )
    )
    .orderBy(desc(opportunities.createdAt));
}

/**
 * Get pipeline summary (opportunities grouped by stage)
 */
export async function getPipelineSummary(
  customerId: CustomerId,
  ownerId?: string
): Promise<{ stage: string; count: number; totalAmount: number }[]> {
  const db = getDb();

  const conditions = [
    eq(opportunities.customerId, customerId),
    isNull(opportunities.deletedAt),
  ];

  if (ownerId) {
    conditions.push(eq(opportunities.ownerId, ownerId));
  }

  const result = await db
    .select({
      stage: opportunities.stage,
      count: sql<number>`count(*)`,
      totalAmount: sql<number>`coalesce(sum(${opportunities.amount}), 0)`,
    })
    .from(opportunities)
    .where(and(...conditions))
    .groupBy(opportunities.stage);

  return result.map((r) => ({
    stage: r.stage,
    count: Number(r.count),
    totalAmount: Number(r.totalAmount),
  }));
}

