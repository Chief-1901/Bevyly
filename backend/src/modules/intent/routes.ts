import { Router } from 'express';
import { z } from 'zod';
import { validate, paginationSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import * as signalsService from './signals.service.js';
import * as recommendationsService from './recommendations.service.js';
import { SIGNAL_TYPES, SEVERITIES, CARD_TYPES, ACTION_TYPES } from '../../shared/db/schema/signals.js';
import type { SignalId, RecommendationId, UserId } from '../../shared/types/index.js';

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const listSignalsSchema = paginationSchema.extend({
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  signalType: z.union([z.enum(SIGNAL_TYPES), z.array(z.enum(SIGNAL_TYPES))]).optional(),
  severity: z.union([z.enum(SEVERITIES), z.array(z.enum(SEVERITIES))]).optional(),
  status: z.string().optional(),
  sortBy: z.enum(['createdAt', 'severity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const listRecommendationsSchema = paginationSchema.extend({
  userId: z.string().optional(),
  actionType: z.union([z.enum(ACTION_TYPES), z.array(z.enum(ACTION_TYPES))]).optional(),
  priority: z.union([z.enum(SEVERITIES), z.array(z.enum(SEVERITIES))]).optional(),
  status: z.string().optional(),
  cardType: z.union([z.enum(CARD_TYPES), z.array(z.enum(CARD_TYPES))]).optional(),
  sortBy: z.enum(['createdAt', 'priority', 'score']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const feedbackSchema = z.object({
  action: z.enum(['accepted', 'declined', 'snoozed']),
  feedbackData: z.record(z.unknown()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['acted', 'dismissed', 'snoozed']),
  snoozedUntil: z.string().datetime().optional(),
});

const briefingOptionsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

const contextualOptionsSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  limit: z.coerce.number().int().min(1).max(20).optional(),
});

// ─────────────────────────────────────────────────────────────
// Intent Router
// ─────────────────────────────────────────────────────────────

const intentRouter = Router();

// ─────────────────────────────────────────────────────────────
// Briefing Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * GET /intent/briefing
 * Get the user's briefing with signals and recommendations
 */
intentRouter.get('/briefing', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const validation = validate(briefingOptionsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const briefing = await recommendationsService.getBriefing(
      req.tenantContext!.customerId,
      req.tenantContext!.userId,
      validation.data
    );

    res.json({
      success: true,
      data: briefing,
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
 * POST /intent/briefing/refresh
 * Refresh signals and recommendations
 */
intentRouter.post('/briefing/refresh', authorize(PERMISSIONS.INTENT_WRITE), async (req, res, next) => {
  try {
    const result = await recommendationsService.refreshBriefing(
      req.tenantContext!.customerId
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
 * GET /intent/context
 * Get contextual recommendations for a specific entity (opportunity, account, etc.)
 * Used for contextual sidebars on detail pages
 */
intentRouter.get('/context', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const validation = validate(contextualOptionsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await recommendationsService.getContextualRecommendations(
      req.tenantContext!.customerId,
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

// ─────────────────────────────────────────────────────────────
// Signals Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * GET /intent/signals
 * List signals
 */
intentRouter.get('/signals', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const validation = validate(listSignalsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await signalsService.listSignals(
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
 * GET /intent/signals/counts
 * Get signal counts by type
 */
intentRouter.get('/signals/counts', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const counts = await signalsService.getSignalCounts(
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

/**
 * GET /intent/signals/:id
 * Get a single signal
 */
intentRouter.get('/signals/:id', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const signal = await signalsService.getSignal(
      req.tenantContext!.customerId,
      req.params.id as SignalId
    );

    res.json({
      success: true,
      data: signal,
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
 * POST /intent/signals/:id/resolve
 * Resolve/dismiss a signal
 */
intentRouter.post('/signals/:id/resolve', authorize(PERMISSIONS.INTENT_WRITE), async (req, res, next) => {
  try {
    const { status } = req.body;
    const signal = await signalsService.resolveSignal(
      req.tenantContext!.customerId,
      req.params.id as SignalId,
      status || 'resolved'
    );

    res.json({
      success: true,
      data: signal,
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
// Recommendations Endpoints
// ─────────────────────────────────────────────────────────────

/**
 * GET /intent/recommendations
 * List recommendations
 */
intentRouter.get('/recommendations', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const validation = validate(listRecommendationsSchema, req.query);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await recommendationsService.listRecommendations(
      req.tenantContext!.customerId,
      {
        ...validation.data,
        userId: validation.data.userId || req.tenantContext!.userId,
      }
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
 * GET /intent/recommendations/:id
 * Get a single recommendation
 */
intentRouter.get('/recommendations/:id', authorize(PERMISSIONS.INTENT_READ), async (req, res, next) => {
  try {
    const recommendation = await recommendationsService.getRecommendation(
      req.tenantContext!.customerId,
      req.params.id as RecommendationId
    );

    res.json({
      success: true,
      data: recommendation,
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
 * PATCH /intent/recommendations/:id
 * Update recommendation status
 */
intentRouter.patch('/recommendations/:id', authorize(PERMISSIONS.INTENT_WRITE), async (req, res, next) => {
  try {
    const validation = validate(updateStatusSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const recommendation = await recommendationsService.updateRecommendationStatus(
      req.tenantContext!.customerId,
      req.params.id as RecommendationId,
      validation.data.status,
      validation.data.snoozedUntil ? new Date(validation.data.snoozedUntil) : undefined
    );

    res.json({
      success: true,
      data: recommendation,
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
 * POST /intent/recommendations/:id/feedback
 * Record feedback on a recommendation
 */
intentRouter.post('/recommendations/:id/feedback', authorize(PERMISSIONS.INTENT_WRITE), async (req, res, next) => {
  try {
    const validation = validate(feedbackSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const feedback = await recommendationsService.recordFeedback(
      req.tenantContext!.customerId,
      req.params.id as RecommendationId,
      req.tenantContext!.userId,
      validation.data.action,
      validation.data.feedbackData
    );

    res.json({
      success: true,
      data: feedback,
      meta: {
        requestId: req.headers['x-request-id'] as string,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

export { intentRouter };
