import { Router } from 'express';
import { z } from 'zod';
import { validate, paginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as sequenceService from './service.js';
import type { CustomerId, SequenceId } from '../../shared/types/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const createSequenceSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  ownerId: z.string().optional(),
  settings: z.object({
    timezone: z.string().optional(),
    sendingWindow: z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.number().min(0).max(6)),
    }).optional(),
    stopOnReply: z.boolean().optional(),
    stopOnBounce: z.boolean().optional(),
    exitOnMeeting: z.boolean().optional(),
  }).optional(),
  steps: z.array(z.object({
    type: z.enum(['email', 'wait', 'task']),
    waitDays: z.number().int().min(0).optional(),
    waitHours: z.number().int().min(0).optional(),
    subject: z.string().max(500).optional(),
    bodyHtml: z.string().max(100000).optional(),
    bodyText: z.string().max(50000).optional(),
    taskDescription: z.string().max(2000).optional(),
  })).max(20).optional(),
});

const updateSequenceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
});

const listSequencesSchema = paginationSchema.extend({
  status: z.string().optional(),
  ownerId: z.string().optional(),
});

const enrollContactSchema = z.object({
  contactId: z.string(),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

router.use(authenticate());

/**
 * GET /sequences
 * List sequences
 */
router.get('/', authorize(PERMISSIONS.SEQUENCES_READ), async (req, res, next) => {
  try {
    const validation = validate(listSequencesSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await sequenceService.listSequences(
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
 * GET /sequences/:id
 * Get a specific sequence with steps
 */
router.get('/:id', authorize(PERMISSIONS.SEQUENCES_READ), async (req, res, next) => {
  try {
    const result = await sequenceService.getSequenceWithSteps(
      req.tenantContext!.customerId,
      req.params.id as SequenceId
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

/**
 * POST /sequences
 * Create a new sequence
 */
router.post('/', authorize(PERMISSIONS.SEQUENCES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(createSequenceSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const sequence = await sequenceService.createSequence(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: sequence,
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
 * PATCH /sequences/:id
 * Update a sequence
 */
router.patch('/:id', authorize(PERMISSIONS.SEQUENCES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateSequenceSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const sequence = await sequenceService.updateSequence(
      req.tenantContext!.customerId,
      req.params.id as SequenceId,
      validation.data
    );

    res.json({
      success: true,
      data: sequence,
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
 * DELETE /sequences/:id
 * Archive a sequence
 */
router.delete('/:id', authorize(PERMISSIONS.SEQUENCES_DELETE), async (req, res, next) => {
  try {
    await sequenceService.deleteSequence(
      req.tenantContext!.customerId,
      req.params.id as SequenceId
    );

    res.json({
      success: true,
      data: { message: 'Sequence archived' },
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
 * POST /sequences/:id/enroll
 * Enroll a contact in a sequence
 */
router.post('/:id/enroll', authorize(PERMISSIONS.SEQUENCES_WRITE), async (req, res, next) => {
  try {
    const validation = validate(enrollContactSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const enrollment = await sequenceService.enrollContact(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      {
        sequenceId: req.params.id,
        contactId: validation.data.contactId,
      }
    );

    res.status(201).json({
      success: true,
      data: enrollment,
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
 * POST /sequences/enrollments/:id/pause
 * Pause an enrollment
 */
router.post('/enrollments/:id/pause', authorize(PERMISSIONS.SEQUENCES_WRITE), async (req, res, next) => {
  try {
    const enrollment = await sequenceService.pauseEnrollment(
      req.tenantContext!.customerId,
      req.params.id
    );

    res.json({
      success: true,
      data: enrollment,
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
 * POST /sequences/enrollments/:id/resume
 * Resume a paused enrollment
 */
router.post('/enrollments/:id/resume', authorize(PERMISSIONS.SEQUENCES_WRITE), async (req, res, next) => {
  try {
    const enrollment = await sequenceService.resumeEnrollment(
      req.tenantContext!.customerId,
      req.params.id
    );

    res.json({
      success: true,
      data: enrollment,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as sequenceRoutes };
