import { eq, and, isNull, like, desc, asc, sql } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { accounts } from '../../shared/db/schema/accounts.js';
import { generateAccountId } from '../../shared/utils/id.js';
import { NotFoundError, ConflictError } from '../../shared/errors/index.js';
import type { CustomerId, UserId, AccountId, PaginatedResponse } from '../../shared/types/index.js';
import type { Account, NewAccount } from '../../shared/db/schema/accounts.js';

export interface CreateAccountInput {
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  ownerId?: string;
  status?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateAccountInput extends Partial<CreateAccountInput> {}

export interface ListAccountsOptions {
  page?: number;
  limit?: number;
  search?: string;
  ownerId?: string;
  status?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a new account
 */
export async function createAccount(
  customerId: CustomerId,
  input: CreateAccountInput
): Promise<Account> {
  const db = getDb();
  const id = generateAccountId();

  // Check for duplicate domain if provided
  if (input.domain) {
    const existing = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.customerId, customerId),
          eq(accounts.domain, input.domain),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Account with domain '${input.domain}' already exists`);
    }
  }

  const [account] = await db
    .insert(accounts)
    .values({
      id,
      customerId,
      name: input.name,
      domain: input.domain || null,
      website: input.website || null,
      industry: input.industry || null,
      employeeCount: input.employeeCount || null,
      annualRevenue: input.annualRevenue || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || null,
      postalCode: input.postalCode || null,
      ownerId: input.ownerId || null,
      status: input.status || 'prospect',
      linkedinUrl: input.linkedinUrl || null,
      twitterUrl: input.twitterUrl || null,
      customFields: input.customFields || {},
    })
    .returning();

  return account;
}

/**
 * Get an account by ID
 */
export async function getAccount(
  customerId: CustomerId,
  accountId: AccountId
): Promise<Account> {
  const db = getDb();

  const [account] = await db
    .select()
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.customerId, customerId),
        isNull(accounts.deletedAt)
      )
    )
    .limit(1);

  if (!account) {
    throw new NotFoundError('Account', accountId);
  }

  return account;
}

/**
 * Update an account
 */
export async function updateAccount(
  customerId: CustomerId,
  accountId: AccountId,
  input: UpdateAccountInput
): Promise<Account> {
  const db = getDb();

  // Verify account exists
  await getAccount(customerId, accountId);

  // Check for duplicate domain if changing it
  if (input.domain) {
    const existing = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.customerId, customerId),
          eq(accounts.domain, input.domain),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== accountId) {
      throw new ConflictError(`Account with domain '${input.domain}' already exists`);
    }
  }

  const [updated] = await db
    .update(accounts)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Delete an account (soft delete)
 */
export async function deleteAccount(
  customerId: CustomerId,
  accountId: AccountId
): Promise<void> {
  const db = getDb();

  // Verify account exists
  await getAccount(customerId, accountId);

  await db
    .update(accounts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.customerId, customerId)
      )
    );
}

/**
 * List accounts with pagination and filtering
 */
export async function listAccounts(
  customerId: CustomerId,
  options: ListAccountsOptions = {}
): Promise<PaginatedResponse<Account>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    ownerId,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;
  
  // Debug logging
  console.log('[listAccounts] Fetching accounts:', {
    customerId,
    page,
    limit,
    search,
    ownerId,
    status,
  });

  // Build where conditions
  const conditions = [
    eq(accounts.customerId, customerId),
    isNull(accounts.deletedAt),
  ];

  if (search) {
    conditions.push(like(accounts.name, `%${search}%`));
  }

  if (ownerId) {
    conditions.push(eq(accounts.ownerId, ownerId));
  }

  if (status) {
    conditions.push(eq(accounts.status, status));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(accounts)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const sortColumn = sortBy === 'name' ? accounts.name : 
                     sortBy === 'updatedAt' ? accounts.updatedAt : 
                     accounts.createdAt;
  
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const data = await db
    .select()
    .from(accounts)
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

