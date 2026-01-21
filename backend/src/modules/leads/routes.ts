import { Router } from 'express';
import { z } from 'zod';
import { validate, emailSchema, paginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as leadsService from './service.js';
import { LEAD_STATUSES, LEAD_SOURCES } from '../../shared/db/schema/leads.js';
import type { LeadId } from '../../shared/types/index.js';

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const createLeadSchema = z.object({
  companyName: z.string().min(1).max(255),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().positive().optional(),
  revenue: z.number().int().nonnegative().optional(),
  contactFirstName: z.string().max(100).optional(),
  contactLastName: z.string().max(100).optional(),
  contactEmail: emailSchema.optional(),
  contactTitle: z.string().max(150).optional(),
  contactPhone: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  campaignId: z.string().optional(),
  generationJobId: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  fitScore: z.number().int().min(0).max(100).optional(),
  intentScore: z.number().int().min(0).max(100).optional(),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
  customFields: z.record(z.unknown()).optional(),
});

const updateLeadSchema = createLeadSchema.partial().extend({
  status: z.enum(LEAD_STATUSES).optional(),
});

const listLeadsSchema = paginationSchema.extend({
  search: z.string().optional(),
  status: z.union([z.enum(LEAD_STATUSES), z.array(z.enum(LEAD_STATUSES))]).optional(),
  source: z.union([z.enum(LEAD_SOURCES), z.array(z.enum(LEAD_SOURCES))]).optional(),
  campaignId: z.string().optional(),
  ownerId: z.string().optional(),
  minFitScore: z.coerce.number().int().min(0).max(100).optional(),
  maxFitScore: z.coerce.number().int().min(0).max(100).optional(),
  sortBy: z.enum(['companyName', 'createdAt', 'fitScore', 'intentScore']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const convertLeadSchema = z.object({
  accountName: z.string().max(255).optional(),
  contactEmail: emailSchema.optional(),
  ownerId: z.string().optional(),
});

const rejectLeadSchema = z.object({
  reason: z.string().max(255).optional(),
});

const bulkCreateLeadsSchema = z.object({
  leads: z.array(createLeadSchema).min(1).max(1000),
});

// ─────────────────────────────────────────────────────────────
// Leads Router
// ─────────────────────────────────────────────────────────────

const leadsRouter = Router();

// List leads
leadsRouter.get('/', authorize(PERMISSIONS.LEADS_READ), async (req, res, next) => {
  try {
    const validation = validate(listLeadsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await leadsService.listLeads(
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

// Get lead counts by status
leadsRouter.get('/counts', authorize(PERMISSIONS.LEADS_READ), async (req, res, next) => {
  try {
    const counts = await leadsService.getLeadCountsByStatus(
      req.tenantContext!.customerId
    );

    res.json({
      success: true,
      data: counts,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single lead
leadsRouter.get('/:id', authorize(PERMISSIONS.LEADS_READ), async (req, res, next) => {
  try {
    const lead = await leadsService.getLead(
      req.tenantContext!.customerId,
      req.params.id as LeadId
    );

    res.json({
      success: true,
      data: lead,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create lead
leadsRouter.post('/', authorize(PERMISSIONS.LEADS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createLeadSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const lead = await leadsService.createLead(
      req.tenantContext!.customerId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: lead,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Bulk create leads
leadsRouter.post('/bulk', authorize(PERMISSIONS.LEADS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(bulkCreateLeadsSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await leadsService.bulkCreateLeads(
      req.tenantContext!.customerId,
      validation.data.leads
    );

    res.status(201).json({
      success: true,
      data: result,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update lead
leadsRouter.patch('/:id', authorize(PERMISSIONS.LEADS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateLeadSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const lead = await leadsService.updateLead(
      req.tenantContext!.customerId,
      req.params.id as LeadId,
      validation.data
    );

    res.json({
      success: true,
      data: lead,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Convert lead to Account + Contact
leadsRouter.post('/:id/convert', authorize(PERMISSIONS.LEADS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(convertLeadSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await leadsService.convertLead(
      req.tenantContext!.customerId,
      req.params.id as LeadId,
      validation.data
    );

    res.json({
      success: true,
      data: result,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Reject lead
leadsRouter.post('/:id/reject', authorize(PERMISSIONS.LEADS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(rejectLeadSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const lead = await leadsService.rejectLead(
      req.tenantContext!.customerId,
      req.params.id as LeadId,
      validation.data.reason
    );

    res.json({
      success: true,
      data: lead,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete lead
leadsRouter.delete('/:id', authorize(PERMISSIONS.LEADS_DELETE), async (req, res, next) => {
  try {
    await leadsService.deleteLead(
      req.tenantContext!.customerId,
      req.params.id as LeadId
    );

    res.json({
      success: true,
      data: { message: 'Lead deleted' },
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { leadsRouter };
