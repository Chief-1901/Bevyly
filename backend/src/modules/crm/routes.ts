import { Router } from 'express';
import { z } from 'zod';
import { validate, emailSchema, paginationSchema, uuidSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as accountsService from './accounts.service.js';
import * as contactsService from './contacts.service.js';
import * as opportunitiesService from './opportunities.service.js';
import type { CustomerId, AccountId, ContactId, OpportunityId } from '../../shared/types/index.js';

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const createAccountSchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().max(255).optional(),
  website: z.string().url().optional(),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  annualRevenue: z.number().int().nonnegative().optional(),
  address: z.string().optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  ownerId: z.string().optional(),
  status: z.string().max(50).optional(),
  linkedinUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateAccountSchema = createAccountSchema.partial();

const listAccountsSchema = paginationSchema.extend({
  search: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createContactSchema = z.object({
  email: emailSchema,
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  accountId: z.string().optional(),
  title: z.string().max(150).optional(),
  department: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  mobilePhone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  timezone: z.string().max(50).optional(),
  linkedinUrl: z.string().url().optional(),
  twitterUrl: z.string().url().optional(),
  ownerId: z.string().optional(),
  status: z.string().max(50).optional(),
  source: z.string().max(100).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateContactSchema = createContactSchema.partial();

const listContactsSchema = paginationSchema.extend({
  search: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.string().optional(),
  sortBy: z.enum(['email', 'firstName', 'lastName', 'createdAt', 'lastActivityAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createOpportunitySchema = z.object({
  name: z.string().min(1).max(255),
  accountId: z.string(),
  primaryContactId: z.string().optional(),
  description: z.string().optional(),
  stage: z.enum(['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost']).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  amount: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  closeDate: z.string().optional(),
  ownerId: z.string().optional(),
  source: z.string().max(100).optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateOpportunitySchema = createOpportunitySchema.partial().extend({
  lostReason: z.string().max(100).optional(),
  lostReasonDetail: z.string().optional(),
});

const listOpportunitiesSchema = paginationSchema.extend({
  search: z.string().optional(),
  accountId: z.string().optional(),
  ownerId: z.string().optional(),
  stage: z.string().optional(),
  minAmount: z.coerce.number().int().optional(),
  maxAmount: z.coerce.number().int().optional(),
  closeDateFrom: z.string().optional(),
  closeDateTo: z.string().optional(),
  sortBy: z.enum(['name', 'amount', 'closeDate', 'createdAt', 'probability']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ─────────────────────────────────────────────────────────────
// Accounts Router
// ─────────────────────────────────────────────────────────────

const accountsRouter = Router();

// Note: Authentication is handled at the service level by tenantGuardMiddleware
// which extracts tenant context from gateway headers. authorize() uses req.tenantContext.roles

accountsRouter.get('/', authorize(PERMISSIONS.ACCOUNTS_READ), async (req, res, next) => {
  try {
    const validation = validate(listAccountsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    console.log('[CRM Routes] List accounts request:', {
      customerId: req.tenantContext?.customerId,
      userId: req.tenantContext?.userId,
      email: req.tenantContext?.userEmail,
      roles: req.tenantContext?.roles,
      query: validation.data,
    });

    const result = await accountsService.listAccounts(
      req.tenantContext!.customerId,
      validation.data
    );
    
    console.log('[CRM Routes] List accounts result:', {
      dataLength: result.data.length,
      total: result.pagination.total,
    });

    res.json({
      success: true,
      ...result,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

accountsRouter.get('/:id', authorize(PERMISSIONS.ACCOUNTS_READ), async (req, res, next) => {
  try {
    const account = await accountsService.getAccount(
      req.tenantContext!.customerId,
      req.params.id as AccountId
    );

    res.json({
      success: true,
      data: account,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

accountsRouter.post('/', authorize(PERMISSIONS.ACCOUNTS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createAccountSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const account = await accountsService.createAccount(
      req.tenantContext!.customerId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: account,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

accountsRouter.patch('/:id', authorize(PERMISSIONS.ACCOUNTS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateAccountSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const account = await accountsService.updateAccount(
      req.tenantContext!.customerId,
      req.params.id as AccountId,
      validation.data
    );

    res.json({
      success: true,
      data: account,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

accountsRouter.delete('/:id', authorize(PERMISSIONS.ACCOUNTS_DELETE), async (req, res, next) => {
  try {
    await accountsService.deleteAccount(
      req.tenantContext!.customerId,
      req.params.id as AccountId
    );

    res.json({
      success: true,
      data: { message: 'Account deleted' },
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get contacts for an account
accountsRouter.get('/:id/contacts', authorize(PERMISSIONS.CONTACTS_READ), async (req, res, next) => {
  try {
    const contacts = await contactsService.getContactsByAccount(
      req.tenantContext!.customerId,
      req.params.id as AccountId
    );

    res.json({
      success: true,
      data: contacts,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get opportunities for an account
accountsRouter.get('/:id/opportunities', authorize(PERMISSIONS.OPPORTUNITIES_READ), async (req, res, next) => {
  try {
    const opportunities = await opportunitiesService.getOpportunitiesByAccount(
      req.tenantContext!.customerId,
      req.params.id as AccountId
    );

    res.json({
      success: true,
      data: opportunities,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// Contacts Router
// ─────────────────────────────────────────────────────────────

const contactsRouter = Router();

// Note: Authentication is handled at the service level by tenantGuardMiddleware

contactsRouter.get('/', authorize(PERMISSIONS.CONTACTS_READ), async (req, res, next) => {
  try {
    const validation = validate(listContactsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await contactsService.listContacts(
      req.tenantContext!.customerId,
      validation.data
    );

    res.json({
      success: true,
      ...result,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

contactsRouter.get('/:id', authorize(PERMISSIONS.CONTACTS_READ), async (req, res, next) => {
  try {
    const contact = await contactsService.getContact(
      req.tenantContext!.customerId,
      req.params.id as ContactId
    );

    res.json({
      success: true,
      data: contact,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

contactsRouter.post('/', authorize(PERMISSIONS.CONTACTS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createContactSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const contact = await contactsService.createContact(
      req.tenantContext!.customerId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: contact,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

contactsRouter.patch('/:id', authorize(PERMISSIONS.CONTACTS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateContactSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const contact = await contactsService.updateContact(
      req.tenantContext!.customerId,
      req.params.id as ContactId,
      validation.data
    );

    res.json({
      success: true,
      data: contact,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

contactsRouter.delete('/:id', authorize(PERMISSIONS.CONTACTS_DELETE), async (req, res, next) => {
  try {
    await contactsService.deleteContact(
      req.tenantContext!.customerId,
      req.params.id as ContactId
    );

    res.json({
      success: true,
      data: { message: 'Contact deleted' },
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// Opportunities Router
// ─────────────────────────────────────────────────────────────

const opportunitiesRouter = Router();

// Note: Authentication is handled at the service level by tenantGuardMiddleware

opportunitiesRouter.get('/', authorize(PERMISSIONS.OPPORTUNITIES_READ), async (req, res, next) => {
  try {
    const validation = validate(listOpportunitiesSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await opportunitiesService.listOpportunities(
      req.tenantContext!.customerId,
      validation.data
    );

    res.json({
      success: true,
      ...result,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.get('/pipeline', authorize(PERMISSIONS.OPPORTUNITIES_READ), async (req, res, next) => {
  try {
    const ownerId = req.query.ownerId as string | undefined;
    const summary = await opportunitiesService.getPipelineSummary(
      req.tenantContext!.customerId,
      ownerId
    );

    res.json({
      success: true,
      data: summary,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.get('/:id', authorize(PERMISSIONS.OPPORTUNITIES_READ), async (req, res, next) => {
  try {
    const opportunity = await opportunitiesService.getOpportunity(
      req.tenantContext!.customerId,
      req.params.id as OpportunityId
    );

    res.json({
      success: true,
      data: opportunity,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.post('/', authorize(PERMISSIONS.OPPORTUNITIES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createOpportunitySchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const opportunity = await opportunitiesService.createOpportunity(
      req.tenantContext!.customerId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: opportunity,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.patch('/:id', authorize(PERMISSIONS.OPPORTUNITIES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateOpportunitySchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const opportunity = await opportunitiesService.updateOpportunity(
      req.tenantContext!.customerId,
      req.params.id as OpportunityId,
      validation.data
    );

    res.json({
      success: true,
      data: opportunity,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

opportunitiesRouter.delete('/:id', authorize(PERMISSIONS.OPPORTUNITIES_DELETE), async (req, res, next) => {
  try {
    await opportunitiesService.deleteOpportunity(
      req.tenantContext!.customerId,
      req.params.id as OpportunityId
    );

    res.json({
      success: true,
      data: { message: 'Opportunity deleted' },
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Add contact to opportunity
opportunitiesRouter.post('/:id/contacts', authorize(PERMISSIONS.OPPORTUNITIES_WRITE), async (req, res, next) => {
  try {
    const { contactId, role } = req.body;

    const record = await opportunitiesService.addContactToOpportunity(
      req.tenantContext!.customerId,
      req.params.id as OpportunityId,
      contactId as ContactId,
      role
    );

    res.status(201).json({
      success: true,
      data: record,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export const crmRoutes = {
  accounts: accountsRouter,
  contacts: contactsRouter,
  opportunities: opportunitiesRouter,
};
