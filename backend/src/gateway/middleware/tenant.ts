import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../../shared/logger/index.js';

const tenantLogger = createLogger({ module: 'gateway-tenant' });

/**
 * Tenant context middleware
 * Ensures tenant context is properly set for downstream services
 */
export function tenantContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If we have tenant context from auth, log it and set headers for downstream services
  if (req.tenantContext) {
    tenantLogger.debug(
      {
        customerId: req.tenantContext.customerId,
        userId: req.tenantContext.userId,
        path: req.path,
        method: req.method,
      },
      'Request with tenant context'
    );
    
    // The proxy middleware will forward these headers to downstream services
    // This is handled in the proxy config, but we log here for visibility
  } else if (!isPublicPath(req.originalUrl)) {
    // For non-public paths, missing tenant context is an error
    tenantLogger.warn(
      {
        path: req.originalUrl,
        method: req.method,
      },
      'Non-public request missing tenant context'
    );
    
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  next();
}

/**
 * Check if a path is public (doesn't require auth)
 */
function isPublicPath(path: string): boolean {
  const publicPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/signup',
    '/api/v1/auth/refresh',
    '/api/v1/emails/track',
    '/health',
    '/ready',
    '/live',
    '/metrics',
  ];
  
  return publicPaths.some(p => path.startsWith(p));
}

/**
 * Extract tenant context from request headers (for downstream services)
 */
export function extractTenantContext(req: Request): {
  customerId?: string;
  userId?: string;
  userEmail?: string;
  roles?: string[];
} | null {
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
    customerId,
    userId,
    userEmail,
    roles,
  };
}

/**
 * Middleware for downstream services to extract tenant context from headers
 */
export function serviceAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const context = extractTenantContext(req);

  if (!context) {
    // Check for direct auth (for local development or service-to-service calls)
    if (req.tenantContext) {
      return next();
    }

    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No tenant context provided',
      },
    });
    return;
  }

  // Set tenant context on request
  req.tenantContext = {
    customerId: context.customerId!,
    userId: context.userId!,
    userEmail: context.userEmail || '',
    roles: context.roles || [],
  };

  next();
}

