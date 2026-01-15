import { Router } from 'express';
import { z } from 'zod';
import { validate, paginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authenticate, authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as calendarService from './service.js';
import type { CustomerId, MeetingId } from '../../shared/types/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const proposeMeetingSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  opportunityId: z.string().optional(),
  type: z.enum(['call', 'video', 'in_person']),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  timezone: z.string().max(50).optional(),
  location: z.string().max(500).optional(),
  attendeeIds: z.array(z.string()).max(20).optional(),
  externalAttendees: z.array(z.object({
    email: z.string().email(),
    name: z.string().max(255).optional(),
  })).max(20).optional(),
  videoProvider: z.enum(['google_meet', 'zoom', 'teams']).optional(),
  reminderMinutesBefore: z.number().int().min(0).max(10080).optional(), // max 1 week
  idempotencyKey: z.string().max(64).optional(),
});

const updateMeetingSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  startTime: z.coerce.date().optional(),
  endTime: z.coerce.date().optional(),
  location: z.string().max(500).optional(),
  notes: z.string().max(10000).optional(),
});

const completeMeetingSchema = z.object({
  outcome: z.string().max(100).optional(),
  notes: z.string().max(10000).optional(),
});

const cancelMeetingSchema = z.object({
  reason: z.string().max(500).optional(),
});

const listMeetingsSchema = paginationSchema.extend({
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(['proposed', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const availabilitySchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  timezone: z.string().max(50).optional(),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

router.use(authenticate());

/**
 * GET /calendar/meetings
 * List meetings
 */
router.get('/meetings', authorize(PERMISSIONS.MEETINGS_READ), async (req, res, next) => {
  try {
    const validation = validate(listMeetingsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await calendarService.listMeetings(
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
 * GET /calendar/meetings/upcoming
 * Get upcoming meetings for current user
 */
router.get('/meetings/upcoming', authorize(PERMISSIONS.MEETINGS_READ), async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    
    const meetings = await calendarService.getUpcomingMeetings(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      Math.min(limit, 20)
    );

    res.json({
      success: true,
      data: meetings,
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
 * GET /calendar/meetings/:id
 * Get a specific meeting
 */
router.get('/meetings/:id', authorize(PERMISSIONS.MEETINGS_READ), async (req, res, next) => {
  try {
    const meeting = await calendarService.getMeeting(
      req.tenantContext!.customerId,
      req.params.id as MeetingId
    );

    res.json({
      success: true,
      data: meeting,
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
 * POST /calendar/meetings/propose
 * Propose a new meeting
 */
router.post('/meetings/propose', authorize(PERMISSIONS.MEETINGS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(proposeMeetingSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const meeting = await calendarService.proposeMeeting(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: meeting,
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
 * POST /calendar/meetings/:id/confirm
 * Confirm a meeting
 */
router.post('/meetings/:id/confirm', authorize(PERMISSIONS.MEETINGS_WRITE), async (req, res, next) => {
  try {
    const meeting = await calendarService.confirmMeeting(
      req.tenantContext!.customerId,
      req.params.id as MeetingId,
      req.tenantContext!.userId
    );

    res.json({
      success: true,
      data: meeting,
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
 * POST /calendar/meetings/:id/cancel
 * Cancel a meeting
 */
router.post('/meetings/:id/cancel', authorize(PERMISSIONS.MEETINGS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(cancelMeetingSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const meeting = await calendarService.cancelMeeting(
      req.tenantContext!.customerId,
      req.params.id as MeetingId,
      req.tenantContext!.userId,
      validation.data.reason
    );

    res.json({
      success: true,
      data: meeting,
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
 * POST /calendar/meetings/:id/complete
 * Mark meeting as completed
 */
router.post('/meetings/:id/complete', authorize(PERMISSIONS.MEETINGS_WRITE), async (req, res, next) => {
  try {
    const validation = validate(completeMeetingSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const meeting = await calendarService.completeMeeting(
      req.tenantContext!.customerId,
      req.params.id as MeetingId,
      req.tenantContext!.userId,
      validation.data.outcome,
      validation.data.notes
    );

    res.json({
      success: true,
      data: meeting,
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
 * POST /calendar/meetings/:id/no-show
 * Mark meeting as no-show
 */
router.post('/meetings/:id/no-show', authorize(PERMISSIONS.MEETINGS_WRITE), async (req, res, next) => {
  try {
    const meeting = await calendarService.markNoShow(
      req.tenantContext!.customerId,
      req.params.id as MeetingId,
      req.tenantContext!.userId
    );

    res.json({
      success: true,
      data: meeting,
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
 * GET /calendar/availability
 * Get available time slots
 */
router.get('/availability', authorize(PERMISSIONS.MEETINGS_READ), async (req, res, next) => {
  try {
    const validation = validate(availabilitySchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const slots = await calendarService.getAvailability(
      validation.data.startDate,
      validation.data.endDate,
      validation.data.durationMinutes,
      validation.data.timezone
    );

    res.json({
      success: true,
      data: slots,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { router as calendarRoutes };
