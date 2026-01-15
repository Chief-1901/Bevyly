import { Router } from 'express';
import { z } from 'zod';
import { validate, emailSchema, paginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authenticate, authorize, optionalAuth } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as emailService from './service.js';
import { recordEmailOpen, recordEmailClick, TRACKING_PIXEL } from './tracking.js';
import type { CustomerId, EmailId, ContactId } from '../../shared/types/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const sendEmailSchema = z.object({
  toEmail: emailSchema,
  toName: z.string().max(255).optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().max(100000).optional(),
  bodyText: z.string().max(50000).optional(),
  ccEmails: z.array(z.string().email()).max(10).optional(),
  bccEmails: z.array(z.string().email()).max(10).optional(),
  scheduledAt: z.coerce.date().optional(),
  sequenceId: z.string().optional(),
  sequenceStepNumber: z.number().int().positive().optional(),
  idempotencyKey: z.string().max(64).optional(),
});

const draftEmailSchema = z.object({
  toEmail: emailSchema,
  toName: z.string().max(255).optional(),
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().max(100000).optional(),
  bodyText: z.string().max(50000).optional(),
});

const listEmailsSchema = paginationSchema.extend({
  contactId: z.string().optional(),
  accountId: z.string().optional(),
  status: z.enum(['draft', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed']).optional(),
  sequenceId: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────
// Protected routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /emails
 * List emails
 */
router.get('/', authenticate(), authorize(PERMISSIONS.EMAILS_READ), async (req, res, next) => {
  try {
    const validation = validate(listEmailsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await emailService.listEmails(
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
 * GET /emails/:id
 * Get a specific email
 */
router.get('/:id', authenticate(), authorize(PERMISSIONS.EMAILS_READ), async (req, res, next) => {
  try {
    const email = await emailService.getEmail(
      req.tenantContext!.customerId,
      req.params.id as EmailId
    );

    res.json({
      success: true,
      data: email,
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
 * POST /emails/send
 * Send an email
 */
router.post('/send', authenticate(), authorize(PERMISSIONS.EMAILS_SEND), async (req, res, next) => {
  try {
    const validation = validate(sendEmailSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const email = await emailService.sendEmail(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      req.tenantContext!.userEmail,
      undefined, // sender name could come from user profile
      validation.data
    );

    res.status(201).json({
      success: true,
      data: email,
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
 * POST /emails/draft
 * Create an email draft
 */
router.post('/draft', authenticate(), authorize(PERMISSIONS.EMAILS_SEND), async (req, res, next) => {
  try {
    const validation = validate(draftEmailSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const email = await emailService.createDraft(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      req.tenantContext!.userEmail,
      undefined,
      validation.data
    );

    res.status(201).json({
      success: true,
      data: email,
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
 * GET /emails/stats/contact/:contactId
 * Get email statistics for a contact
 */
router.get('/stats/contact/:contactId', authenticate(), authorize(PERMISSIONS.EMAILS_READ), async (req, res, next) => {
  try {
    const stats = await emailService.getContactEmailStats(
      req.tenantContext!.customerId,
      req.params.contactId as ContactId
    );

    res.json({
      success: true,
      data: stats,
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
// Public tracking endpoints (no auth required)
// ─────────────────────────────────────────────────────────────

/**
 * GET /emails/track/open/:trackingId
 * Track email opens (returns 1x1 transparent pixel)
 */
router.get('/track/open/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    // Record the open asynchronously
    recordEmailOpen(trackingId, userAgent, ipAddress).catch((err) => {
      console.error('Failed to record email open:', err);
    });

    // Return tracking pixel
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.send(TRACKING_PIXEL);
  } catch {
    // Always return the pixel even on error
    res.set('Content-Type', 'image/gif');
    res.send(TRACKING_PIXEL);
  }
});

/**
 * GET /emails/track/click/:trackingId
 * Track email link clicks (redirects to original URL)
 */
router.get('/track/click/:trackingId', async (req, res) => {
  try {
    const { trackingId } = req.params;
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip || req.socket.remoteAddress;

    const result = await recordEmailClick(trackingId, userAgent, ipAddress);

    if (result.originalUrl) {
      res.redirect(302, result.originalUrl);
    } else {
      // Fallback if URL not found
      res.redirect(302, 'https://salesos.dev');
    }
  } catch {
    // Fallback on error
    res.redirect(302, 'https://salesos.dev');
  }
});

export { router as emailRoutes };
