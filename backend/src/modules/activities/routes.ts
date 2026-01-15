import { Router } from 'express';
import { z } from 'zod';
import { validate, cursorPaginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as activitiesService from './service.js';
import type { CustomerId, AccountId, ContactId } from '../../shared/types/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const listActivitiesSchema = cursorPaginationSchema.extend({
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  opportunityId: z.string().optional(),
  userId: z.string().optional(),
  types: z.string().optional().transform((v) => v?.split(',')),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const createNoteSchema = z.object({
  content: z.string().min(1).max(10000),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  opportunityId: z.string().optional(),
});

const logCallSchema = z.object({
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  opportunityId: z.string().optional(),
  direction: z.enum(['inbound', 'outbound']),
  status: z.enum(['completed', 'no_answer', 'busy', 'failed']),
  phoneNumber: z.string().max(50).optional(),
  durationSeconds: z.number().int().nonnegative().optional(),
  outcome: z.string().max(50).optional(),
  notes: z.string().max(5000).optional(),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date().optional(),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

router.use(authenticate());

/**
 * GET /activities
 * List activities with filtering
 */
router.get('/', authorize(PERMISSIONS.ACTIVITIES_READ), async (req, res, next) => {
  try {
    const validation = validate(listActivitiesSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await activitiesService.listActivities(
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

/**
 * GET /activities/account/:accountId
 * Get activity timeline for an account
 */
router.get('/account/:accountId', authorize(PERMISSIONS.ACTIVITIES_READ), async (req, res, next) => {
  try {
    const validation = validate(cursorPaginationSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await activitiesService.getAccountTimeline(
      req.tenantContext!.customerId,
      req.params.accountId as AccountId,
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

/**
 * GET /activities/contact/:contactId
 * Get activity timeline for a contact
 */
router.get('/contact/:contactId', authorize(PERMISSIONS.ACTIVITIES_READ), async (req, res, next) => {
  try {
    const validation = validate(cursorPaginationSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await activitiesService.getContactTimeline(
      req.tenantContext!.customerId,
      req.params.contactId as ContactId,
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

/**
 * GET /activities/contact/:contactId/summary
 * Get activity summary for a contact
 */
router.get('/contact/:contactId/summary', authorize(PERMISSIONS.ACTIVITIES_READ), async (req, res, next) => {
  try {
    const summary = await activitiesService.getContactActivitySummary(
      req.tenantContext!.customerId,
      req.params.contactId as ContactId
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

/**
 * POST /activities/notes
 * Create a note
 */
router.post('/notes', authorize(PERMISSIONS.ACTIVITIES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createNoteSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const note = await activitiesService.createNote(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: note,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /activities/calls
 * Log a call
 */
router.post('/calls', authorize(PERMISSIONS.ACTIVITIES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(logCallSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const call = await activitiesService.logCall(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: call,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as activityRoutes };
