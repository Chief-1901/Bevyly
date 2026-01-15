import { Router } from 'express';
import { z } from 'zod';
import { validate, emailSchema } from '../../shared/validation/index.js';
import { ValidationFailedError } from '../../shared/errors/index.js';
import { authenticate, authorize } from './middleware.js';
import { PERMISSIONS } from './rbac.js';
import * as authService from './service.js';
import type { CustomerId, UserId } from '../../shared/types/index.js';

const router = Router();

// ─────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────

const signupSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(100),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  companyName: z.string().min(2).max(255),
  companySlug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/).optional(),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).optional(),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

/**
 * POST /auth/signup
 * Create a new account (customer + user)
 */
router.post('/signup', async (req, res, next) => {
  try {
    const validation = validate(signupSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await authService.signup(validation.data);

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

/**
 * POST /auth/login
 * Authenticate and get tokens
 */
router.post('/login', async (req, res, next) => {
  try {
    const validation = validate(loginSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await authService.login(validation.data);

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
 * POST /auth/refresh
 * Get new access token using refresh token
 */
router.post('/refresh', async (req, res, next) => {
  try {
    const validation = validate(refreshSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    const result = await authService.refresh(validation.data.refreshToken);

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
 * POST /auth/logout
 * Revoke refresh token
 */
router.post('/logout', async (req, res, next) => {
  try {
    const validation = validate(refreshSchema, req.body);
    if (!validation.success) {
      throw new ValidationFailedError(validation.errors);
    }

    await authService.revokeRefreshToken(validation.data.refreshToken);

    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
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
 * GET /auth/me
 * Get current user info
 */
router.get('/me', authenticate(), async (req, res, next) => {
  try {
    const context = req.tenantContext!;

    res.json({
      success: true,
      data: {
        userId: context.userId,
        customerId: context.customerId,
        email: context.userEmail,
        roles: context.roles,
      },
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
// API Key management routes
// ─────────────────────────────────────────────────────────────

/**
 * GET /auth/api-keys
 * List all API keys for the customer
 */
router.get(
  '/api-keys',
  authenticate(),
  authorize(PERMISSIONS.API_KEYS_READ),
  async (req, res, next) => {
    try {
      const keys = await authService.listApiKeys(req.tenantContext!.customerId);

      res.json({
        success: true,
        data: keys,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /auth/api-keys
 * Create a new API key
 */
router.post(
  '/api-keys',
  authenticate(),
  authorize(PERMISSIONS.API_KEYS_WRITE),
  async (req, res, next) => {
    try {
      const validation = validate(createApiKeySchema, req.body);
      if (!validation.success) {
        throw new ValidationFailedError(validation.errors);
      }

      const key = await authService.createApiKey(
        req.tenantContext!.customerId,
        req.tenantContext!.userId,
        validation.data
      );

      res.status(201).json({
        success: true,
        data: key,
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /auth/api-keys/:id
 * Revoke an API key
 */
router.delete(
  '/api-keys/:id',
  authenticate(),
  authorize(PERMISSIONS.API_KEYS_DELETE),
  async (req, res, next) => {
    try {
      await authService.revokeApiKey(req.tenantContext!.customerId, req.params.id);

      res.json({
        success: true,
        data: { message: 'API key revoked' },
        meta: {
          requestId: req.headers['x-request-id'] as string,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export { router as authRoutes };
