import { eq, and, isNull, like, desc, asc, sql, inArray, gte, lte } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { leads, LEAD_STATUSES, LEAD_SOURCES } from '../../shared/db/schema/leads.js';
import { accounts } from '../../shared/db/schema/accounts.js';
import { contacts } from '../../shared/db/schema/contacts.js';
import { generateLeadId, generateAccountId, generateContactId } from '../../shared/utils/id.js';
import { NotFoundError, ConflictError, ValidationFailedError } from '../../shared/errors/index.js';
import { writeToOutbox, createEvent } from '../events/outbox.js';
import type { CustomerId, LeadId, AccountId, ContactId, PaginatedResponse } from '../../shared/types/index.js';
import type { Lead, NewLead, LeadStatus, LeadSource } from '../../shared/db/schema/leads.js';

// ─────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────

export interface CreateLeadInput {
  companyName: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactTitle?: string;
  contactPhone?: string;
  city?: string;
  state?: string;
  country?: string;
  source?: LeadSource;
  campaignId?: string;
  generationJobId?: string;
  sourceUrl?: string;
  fitScore?: number;
  intentScore?: number;
  ownerId?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadInput extends Partial<CreateLeadInput> {
  status?: LeadStatus;
}

export interface ListLeadsOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: LeadStatus | LeadStatus[];
  source?: LeadSource | LeadSource[];
  campaignId?: string;
  ownerId?: string;
  minFitScore?: number;
  maxFitScore?: number;
  sortBy?: 'companyName' | 'createdAt' | 'fitScore' | 'intentScore';
  sortOrder?: 'asc' | 'desc';
}

export interface ConvertLeadInput {
  accountName?: string; // Override company name
  contactEmail?: string; // Override contact email
  ownerId?: string;
}

export interface ConvertLeadResult {
  lead: Lead;
  account: typeof accounts.$inferSelect;
  contact: typeof contacts.$inferSelect;
}

// ─────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────

/**
 * Create a new lead
 */
export async function createLead(
  customerId: CustomerId,
  input: CreateLeadInput
): Promise<Lead> {
  const db = getDb();
  const id = generateLeadId();

  // Check for duplicate by email if provided
  if (input.contactEmail) {
    const existing = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.customerId, customerId),
          eq(leads.contactEmail, input.contactEmail),
          isNull(leads.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictError(`Lead with email '${input.contactEmail}' already exists`);
    }
  }

  const [lead] = await db
    .insert(leads)
    .values({
      id,
      customerId,
      companyName: input.companyName,
      domain: input.domain || null,
      industry: input.industry || null,
      employeeCount: input.employeeCount || null,
      revenue: input.revenue || null,
      contactFirstName: input.contactFirstName || null,
      contactLastName: input.contactLastName || null,
      contactEmail: input.contactEmail || null,
      contactTitle: input.contactTitle || null,
      contactPhone: input.contactPhone || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || null,
      source: input.source || 'manual',
      campaignId: input.campaignId || null,
      generationJobId: input.generationJobId || null,
      sourceUrl: input.sourceUrl || null,
      fitScore: input.fitScore || null,
      intentScore: input.intentScore || null,
      ownerId: input.ownerId || null,
      notes: input.notes || null,
      customFields: input.customFields || {},
      status: 'new',
    })
    .returning();

  // Emit lead.created event for signal detection
  await writeToOutbox(
    createEvent(
      'lead.created',
      'lead',
      lead.id,
      customerId,
      {
        leadId: lead.id,
        companyName: lead.companyName,
        source: lead.source,
        campaignId: lead.campaignId,
        fitScore: lead.fitScore,
        intentScore: lead.intentScore,
        contactEmail: lead.contactEmail,
      }
    )
  );

  return lead;
}

/**
 * Get a lead by ID
 */
export async function getLead(
  customerId: CustomerId,
  leadId: LeadId
): Promise<Lead> {
  const db = getDb();

  const [lead] = await db
    .select()
    .from(leads)
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.customerId, customerId),
        isNull(leads.deletedAt)
      )
    )
    .limit(1);

  if (!lead) {
    throw new NotFoundError('Lead', leadId);
  }

  return lead;
}

/**
 * Update a lead
 */
export async function updateLead(
  customerId: CustomerId,
  leadId: LeadId,
  input: UpdateLeadInput
): Promise<Lead> {
  const db = getDb();

  // Verify lead exists
  const existing = await getLead(customerId, leadId);

  // Validate status transition
  if (input.status && existing.status === 'converted') {
    throw new ValidationFailedError([
      { path: ['status'], message: 'Cannot update status of converted lead' },
    ]);
  }

  // Check for duplicate email if changing
  if (input.contactEmail && input.contactEmail !== existing.contactEmail) {
    const duplicate = await db
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.customerId, customerId),
          eq(leads.contactEmail, input.contactEmail),
          isNull(leads.deletedAt)
        )
      )
      .limit(1);

    if (duplicate.length > 0 && duplicate[0].id !== leadId) {
      throw new ConflictError(`Lead with email '${input.contactEmail}' already exists`);
    }
  }

  const [updated] = await db
    .update(leads)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Delete a lead (soft delete)
 */
export async function deleteLead(
  customerId: CustomerId,
  leadId: LeadId
): Promise<void> {
  const db = getDb();

  // Verify lead exists
  await getLead(customerId, leadId);

  await db
    .update(leads)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.customerId, customerId)
      )
    );
}

/**
 * List leads with pagination and filtering
 */
export async function listLeads(
  customerId: CustomerId,
  options: ListLeadsOptions = {}
): Promise<PaginatedResponse<Lead>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    status,
    source,
    campaignId,
    ownerId,
    minFitScore,
    maxFitScore,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions: ReturnType<typeof eq>[] = [
    eq(leads.customerId, customerId),
    isNull(leads.deletedAt),
  ];

  if (search) {
    conditions.push(like(leads.companyName, `%${search}%`));
  }

  if (status) {
    const statusArray = Array.isArray(status) ? status : [status];
    conditions.push(inArray(leads.status, statusArray));
  }

  if (source) {
    const sourceArray = Array.isArray(source) ? source : [source];
    conditions.push(inArray(leads.source, sourceArray));
  }

  if (campaignId) {
    conditions.push(eq(leads.campaignId, campaignId));
  }

  if (ownerId) {
    conditions.push(eq(leads.ownerId, ownerId));
  }

  if (minFitScore !== undefined) {
    conditions.push(gte(leads.fitScore, minFitScore));
  }

  if (maxFitScore !== undefined) {
    conditions.push(lte(leads.fitScore, maxFitScore));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const sortColumn =
    sortBy === 'companyName' ? leads.companyName :
    sortBy === 'fitScore' ? leads.fitScore :
    sortBy === 'intentScore' ? leads.intentScore :
    leads.createdAt;

  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const data = await db
    .select()
    .from(leads)
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
 * Convert a lead to Account + Contact
 */
export async function convertLead(
  customerId: CustomerId,
  leadId: LeadId,
  input: ConvertLeadInput = {}
): Promise<ConvertLeadResult> {
  const db = getDb();

  // Get the lead
  const lead = await getLead(customerId, leadId);

  // Verify lead can be converted
  if (lead.status === 'converted') {
    throw new ValidationFailedError([
      { path: ['status'], message: 'Lead has already been converted' },
    ]);
  }

  if (lead.status === 'rejected') {
    throw new ValidationFailedError([
      { path: ['status'], message: 'Cannot convert rejected lead' },
    ]);
  }

  // Check for existing account with same domain
  let existingAccount = null;
  if (lead.domain) {
    const [account] = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.customerId, customerId),
          eq(accounts.domain, lead.domain),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);
    existingAccount = account;
  }

  // Create account if not exists
  const accountId = existingAccount?.id || generateAccountId();
  let account = existingAccount;

  if (!existingAccount) {
    const [newAccount] = await db
      .insert(accounts)
      .values({
        id: accountId,
        customerId,
        name: input.accountName || lead.companyName,
        domain: lead.domain || null,
        industry: lead.industry || null,
        employeeCount: lead.employeeCount || null,
        annualRevenue: lead.revenue ? Number(lead.revenue) : null,
        city: lead.city || null,
        state: lead.state || null,
        country: lead.country || null,
        ownerId: input.ownerId || lead.ownerId || null,
        status: 'prospect',
      })
      .returning();
    account = newAccount;
  }

  // Create contact
  const contactId = generateContactId();
  const contactEmail = input.contactEmail || lead.contactEmail;

  if (!contactEmail) {
    throw new ValidationFailedError([
      { path: ['contactEmail'], message: 'Contact email is required for conversion' },
    ]);
  }

  // Check for existing contact with same email
  const [existingContact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.customerId, customerId),
        eq(contacts.email, contactEmail),
        isNull(contacts.deletedAt)
      )
    )
    .limit(1);

  if (existingContact) {
    throw new ConflictError(`Contact with email '${contactEmail}' already exists`);
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      id: contactId,
      customerId,
      accountId: accountId as AccountId,
      email: contactEmail,
      firstName: lead.contactFirstName || null,
      lastName: lead.contactLastName || null,
      title: lead.contactTitle || null,
      phone: lead.contactPhone || null,
      city: lead.city || null,
      state: lead.state || null,
      country: lead.country || null,
      ownerId: input.ownerId || lead.ownerId || null,
      source: lead.source,
      status: 'active',
    })
    .returning();

  // Update lead as converted
  const [updatedLead] = await db
    .update(leads)
    .set({
      status: 'converted',
      convertedAccountId: accountId as AccountId,
      convertedContactId: contactId as ContactId,
      convertedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, leadId))
    .returning();

  // Emit lead.converted event
  await writeToOutbox(
    createEvent(
      'lead.converted',
      'lead',
      leadId,
      customerId,
      {
        leadId,
        source: lead.source,
        campaignId: lead.campaignId,
        accountId: accountId,
        contactId: contactId,
        companyName: lead.companyName,
      }
    )
  );

  return {
    lead: updatedLead,
    account: account!,
    contact,
  };
}

/**
 * Reject a lead
 */
export async function rejectLead(
  customerId: CustomerId,
  leadId: LeadId,
  reason?: string
): Promise<Lead> {
  const db = getDb();

  // Verify lead exists
  const lead = await getLead(customerId, leadId);

  if (lead.status === 'converted') {
    throw new ValidationFailedError([
      { path: ['status'], message: 'Cannot reject converted lead' },
    ]);
  }

  const [updated] = await db
    .update(leads)
    .set({
      status: 'rejected',
      rejectedReason: reason || null,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(leads.id, leadId),
        eq(leads.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Get lead counts by status
 */
export async function getLeadCountsByStatus(
  customerId: CustomerId
): Promise<Record<LeadStatus, number>> {
  const db = getDb();

  const results = await db
    .select({
      status: leads.status,
      count: sql<number>`count(*)`,
    })
    .from(leads)
    .where(
      and(
        eq(leads.customerId, customerId),
        isNull(leads.deletedAt)
      )
    )
    .groupBy(leads.status);

  const counts: Record<string, number> = {};
  for (const status of LEAD_STATUSES) {
    counts[status] = 0;
  }
  for (const row of results) {
    counts[row.status] = Number(row.count);
  }

  return counts as Record<LeadStatus, number>;
}

/**
 * Bulk create leads (for imports)
 */
export async function bulkCreateLeads(
  customerId: CustomerId,
  leadInputs: CreateLeadInput[]
): Promise<{ created: Lead[]; errors: { index: number; error: string }[] }> {
  const db = getDb();
  const created: Lead[] = [];
  const errors: { index: number; error: string }[] = [];

  for (let i = 0; i < leadInputs.length; i++) {
    try {
      const lead = await createLead(customerId, leadInputs[i]);
      created.push(lead);
    } catch (error) {
      errors.push({
        index: i,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { created, errors };
}
