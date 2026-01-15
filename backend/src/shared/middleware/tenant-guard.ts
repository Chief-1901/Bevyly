/**
 * Tenant Guard Middleware
 * 
 * Strict enforcement of tenant context for all protected routes.
 * This middleware ensures that:
 * 1. Tenant context exists
 * 2. CustomerId is valid
 * 3. If headers from gateway are present, they match JWT claims
 */

import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import { createLogger } from '../logger/index.js';
import type { TenantContext, CustomerId, UserId } from '../types/index.js';

const logger = createLogger({ module: 'tenant-guard' });

/**
 * Extract tenant context from gateway headers
 */
export function extractTenantFromHeaders(req: Request): TenantContext | null {
  const customerId = req.headers['x-customer-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const userEmail = req.headers['x-user-email'] as string;
  const rolesHeader = req.headers['x-user-roles'] as string;

  if (!customerId || !userId) {
    return null;
  }

  let roles: string[] = [];
  if (rolesHeader) {
    try {
      roles = JSON.parse(rolesHeader);
    } catch {
      roles = [];
    }
  }

  return {
    customerId: customerId as CustomerId,
    userId: userId as UserId,
    userEmail: userEmail || '',
    roles,
  };
}

/**
 * Tenant guard middleware - REQUIRES tenant context
 * Use this for all routes that access tenant-scoped data
 */
export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction): void => {
    // First, try to extract from headers (set by gateway)
    if (!req.tenantContext) {
      const headerContext = extractTenantFromHeaders(req);
      if (headerContext) {
        req.tenantContext = headerContext;
      }
    }

    // Enforce that tenant context exists
    if (!req.tenantContext) {
      logger.warn({
        path: req.path,
        method: req.method,
        headers: {
          hasCustomerId: !!req.headers['x-customer-id'],
          hasUserId: !!req.headers['x-user-id'],
          hasAuth: !!req.headers.authorization,
        },
      }, 'Request missing tenant context');

      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Tenant context required',
        },
      });
      return;
    }

    // Validate customerId format
    if (!req.tenantContext.customerId || typeof req.tenantContext.customerId !== 'string') {
      logger.error({
        tenantContext: req.tenantContext,
      }, 'Invalid tenant context - missing customerId');

      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT',
          message: 'Invalid tenant context',
        },
      });
      return;
    }

    logger.debug({
      customerId: req.tenantContext.customerId,
      userId: req.tenantContext.userId,
      path: req.path,
      method: req.method,
    }, 'Tenant context validated');

    next();
  };
}

/**
 * Validate that gateway headers match JWT claims
 * Use this in services that receive both JWT and gateway headers
 */
export function validateTenantConsistency() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      return next();
    }

    const headerCustomerId = req.headers['x-customer-id'] as string;
    const headerUserId = req.headers['x-user-id'] as string;

    // If headers are present, they must match the tenant context
    if (headerCustomerId && headerCustomerId !== req.tenantContext.customerId) {
      logger.error({
        headerCustomerId,
        contextCustomerId: req.tenantContext.customerId,
      }, 'SECURITY: Tenant ID mismatch between header and context');

      res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'Tenant context mismatch',
        },
      });
      return;
    }

    if (headerUserId && headerUserId !== req.tenantContext.userId) {
      logger.warn({
        headerUserId,
        contextUserId: req.tenantContext.userId,
      }, 'User ID mismatch between header and context');
      // This is a warning but not a security issue - user might have refreshed token
    }

    next();
  };
}

/**
 * Get tenant context from request (throws if missing)
 */
export function getTenantContext(req: Request): TenantContext {
  if (!req.tenantContext) {
    throw new UnauthorizedError('Tenant context required');
  }
  return req.tenantContext;
}

/**
 * Get customerId from request (throws if missing)
 */
export function getCustomerId(req: Request): CustomerId {
  return getTenantContext(req).customerId;
}

