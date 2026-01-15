import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from './jwt.js';
import { hasPermission, hasAnyPermission, type Permission } from './rbac.js';
import { UnauthorizedError, ForbiddenError } from '../../shared/errors/index.js';
import { getDb } from '../../shared/db/client.js';
import { apiKeys } from '../../shared/db/schema/users.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import { hash } from '../../shared/utils/crypto.js';
import { config } from '../../shared/config/index.js';
import type { TenantContext, CustomerId, UserId } from '../../shared/types/index.js';

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Extract API key from header
 */
function extractApiKey(req: Request): string | null {
  const apiKey = req.headers['x-api-key'];
  if (typeof apiKey !== 'string') {
    return null;
  }
  return apiKey;
}

/**
 * Validate API key and return tenant context
 */
async function validateApiKey(key: string): Promise<TenantContext | null> {
  // API keys are formatted as: sk_<id>_<secret>
  if (!key.startsWith(config.apiKeyPrefix)) {
    return null;
  }

  const parts = key.split('_');
  if (parts.length !== 3) {
    return null;
  }

  const keyPrefix = `${parts[0]}_${parts[1].substring(0, 8)}`;
  const keyHash = hash(key);

  const db = getDb();

  const [apiKeyRecord] = await db
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.keyPrefix, keyPrefix),
        eq(apiKeys.keyHash, keyHash),
        isNull(apiKeys.revokedAt),
        // Check expiry: either no expiry or not expired
        gt(apiKeys.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!apiKeyRecord) {
    // Also try without expiry check for keys without expiration
    const [apiKeyNoExpiry] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.keyPrefix, keyPrefix),
          eq(apiKeys.keyHash, keyHash),
          isNull(apiKeys.revokedAt),
          isNull(apiKeys.expiresAt)
        )
      )
      .limit(1);

    if (!apiKeyNoExpiry) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.id, apiKeyNoExpiry.id));

    return {
      customerId: apiKeyNoExpiry.customerId as CustomerId,
      userId: (apiKeyNoExpiry.userId || 'system') as UserId,
      userEmail: 'api-key',
      roles: (apiKeyNoExpiry.scopes as string[]) || ['api'],
    };
  }

  // Update last used timestamp
  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, apiKeyRecord.id));

  return {
    customerId: apiKeyRecord.customerId as CustomerId,
    userId: (apiKeyRecord.userId || 'system') as UserId,
    userEmail: 'api-key',
    roles: (apiKeyRecord.scopes as string[]) || ['api'],
  };
}

/**
 * Authentication middleware - validates JWT, API key, or tenant context from gateway headers
 */
export function authenticate() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      // If tenant context already exists (set by gateway headers via requireTenant()),
      // trust it and continue. This allows services to work both directly (JWT/API key)
      // and via the gateway (headers).
      if (req.tenantContext?.customerId && req.tenantContext?.userId) {
        return next();
      }

      // Try JWT
      const token = extractBearerToken(req);
      if (token) {
        const payload = await verifyAccessToken(token);
        req.tenantContext = {
          customerId: payload.cid as CustomerId,
          userId: payload.sub as UserId,
          userEmail: payload.email,
          roles: payload.roles,
        };
        return next();
      }

      // Try API key
      const apiKey = extractApiKey(req);
      if (apiKey) {
        const context = await validateApiKey(apiKey);
        if (context) {
          req.tenantContext = context;
          return next();
        }
      }

      throw new UnauthorizedError('Missing or invalid authentication');
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return next(error);
      }
      return next(new UnauthorizedError('Invalid authentication token'));
    }
  };
}

/**
 * Authorization middleware - checks for required permission
 */
export function authorize(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!hasPermission(req.tenantContext.roles, permission)) {
      return next(new ForbiddenError(`Missing required permission: ${permission}`));
    }

    next();
  };
}

/**
 * Authorization middleware - checks for any of the required permissions
 */
export function authorizeAny(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    if (!hasAnyPermission(req.tenantContext.roles, permissions)) {
      return next(new ForbiddenError(`Missing required permissions`));
    }

    next();
  };
}

/**
 * Optional authentication - sets context if valid token present, but doesn't require it
 */
export function optionalAuth() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req);
      if (token) {
        const payload = await verifyAccessToken(token);
        req.tenantContext = {
          customerId: payload.cid as CustomerId,
          userId: payload.sub as UserId,
          userEmail: payload.email,
          roles: payload.roles,
        };
      }

      const apiKey = extractApiKey(req);
      if (!req.tenantContext && apiKey) {
        const context = await validateApiKey(apiKey);
        if (context) {
          req.tenantContext = context;
        }
      }
    } catch {
      // Ignore auth errors for optional auth
    }

    next();
  };
}

