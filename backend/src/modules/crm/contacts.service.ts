import { eq, and, isNull, like, desc, asc, sql, or } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { contacts } from '../../shared/db/schema/contacts.js';
import { generateContactId } from '../../shared/utils/id.js';
import { NotFoundError, ConflictError } from '../../shared/errors/index.js';
import type { CustomerId, UserId, ContactId, AccountId, PaginatedResponse } from '../../shared/types/index.js';
import type { Contact, NewContact } from '../../shared/db/schema/contacts.js';

export interface CreateContactInput {
  email: string;
  firstName?: string;
  lastName?: string;
  accountId?: string;
  title?: string;
  department?: string;
  phone?: string;
  mobilePhone?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  ownerId?: string;
  status?: string;
  source?: string;
  customFields?: Record<string, unknown>;
}

export interface UpdateContactInput extends Partial<CreateContactInput> {}

export interface ListContactsOptions {
  page?: number;
  limit?: number;
  search?: string;
  accountId?: string;
  ownerId?: string;
  status?: string;
  sortBy?: 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastActivityAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a new contact
 */
export async function createContact(
  customerId: CustomerId,
  input: CreateContactInput
): Promise<Contact> {
  const db = getDb();
  const id = generateContactId();

  // Check for duplicate email within customer
  const existing = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.customerId, customerId),
        eq(contacts.email, input.email.toLowerCase()),
        isNull(contacts.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    throw new ConflictError(`Contact with email '${input.email}' already exists`);
  }

  const [contact] = await db
    .insert(contacts)
    .values({
      id,
      customerId,
      email: input.email.toLowerCase(),
      firstName: input.firstName || null,
      lastName: input.lastName || null,
      accountId: input.accountId || null,
      title: input.title || null,
      department: input.department || null,
      phone: input.phone || null,
      mobilePhone: input.mobilePhone || null,
      city: input.city || null,
      state: input.state || null,
      country: input.country || null,
      timezone: input.timezone || null,
      linkedinUrl: input.linkedinUrl || null,
      twitterUrl: input.twitterUrl || null,
      ownerId: input.ownerId || null,
      status: input.status || 'active',
      source: input.source || null,
      customFields: input.customFields || {},
    })
    .returning();

  return contact;
}

/**
 * Get a contact by ID
 */
export async function getContact(
  customerId: CustomerId,
  contactId: ContactId
): Promise<Contact> {
  const db = getDb();

  const [contact] = await db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.customerId, customerId),
        isNull(contacts.deletedAt)
      )
    )
    .limit(1);

  if (!contact) {
    throw new NotFoundError('Contact', contactId);
  }

  return contact;
}

/**
 * Update a contact
 */
export async function updateContact(
  customerId: CustomerId,
  contactId: ContactId,
  input: UpdateContactInput
): Promise<Contact> {
  const db = getDb();

  // Verify contact exists
  await getContact(customerId, contactId);

  // Check for duplicate email if changing it
  if (input.email) {
    const existing = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.customerId, customerId),
          eq(contacts.email, input.email.toLowerCase()),
          isNull(contacts.deletedAt)
        )
      )
      .limit(1);

    if (existing.length > 0 && existing[0].id !== contactId) {
      throw new ConflictError(`Contact with email '${input.email}' already exists`);
    }
  }

  const updateData: Partial<Contact> = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.email) {
    updateData.email = input.email.toLowerCase();
  }

  const [updated] = await db
    .update(contacts)
    .set(updateData)
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Delete a contact (soft delete)
 */
export async function deleteContact(
  customerId: CustomerId,
  contactId: ContactId
): Promise<void> {
  const db = getDb();

  // Verify contact exists
  await getContact(customerId, contactId);

  await db
    .update(contacts)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contacts.id, contactId),
        eq(contacts.customerId, customerId)
      )
    );
}

/**
 * List contacts with pagination and filtering
 */
export async function listContacts(
  customerId: CustomerId,
  options: ListContactsOptions = {}
): Promise<PaginatedResponse<Contact>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    search,
    accountId,
    ownerId,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [
    eq(contacts.customerId, customerId),
    isNull(contacts.deletedAt),
  ];

  if (search) {
    conditions.push(
      or(
        like(contacts.email, `%${search}%`),
        like(contacts.firstName, `%${search}%`),
        like(contacts.lastName, `%${search}%`)
      )!
    );
  }

  if (accountId) {
    conditions.push(eq(contacts.accountId, accountId));
  }

  if (ownerId) {
    conditions.push(eq(contacts.ownerId, ownerId));
  }

  if (status) {
    conditions.push(eq(contacts.status, status));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(contacts)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const sortColumnMap = {
    email: contacts.email,
    firstName: contacts.firstName,
    lastName: contacts.lastName,
    createdAt: contacts.createdAt,
    lastActivityAt: contacts.lastActivityAt,
  };
  
  const sortColumn = sortColumnMap[sortBy] || contacts.createdAt;
  const orderBy = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const data = await db
    .select()
    .from(contacts)
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
 * Get contacts by account ID
 */
export async function getContactsByAccount(
  customerId: CustomerId,
  accountId: AccountId
): Promise<Contact[]> {
  const db = getDb();

  return db
    .select()
    .from(contacts)
    .where(
      and(
        eq(contacts.customerId, customerId),
        eq(contacts.accountId, accountId),
        isNull(contacts.deletedAt)
      )
    )
    .orderBy(desc(contacts.createdAt));
}

