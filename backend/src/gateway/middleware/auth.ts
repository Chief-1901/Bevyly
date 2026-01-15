import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { config } from '../../shared/config/index.js';
import { createLogger } from '../../shared/logger/index.js';
import { UnauthorizedError } from '../../shared/errors/index.js';

const authLogger = createLogger({ module: 'gateway-auth' });

export interface TenantContext {
  customerId: string;
  userId: string;
  userEmail: string;
  roles: string[];
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

/**
 * Gateway authentication middleware
 * Verifies JWT tokens and extracts tenant context
 */
export async function gatewayAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header or cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // Also check for API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      // API key auth is handled by individual services
      // Just pass through and let the service validate
      return next();
    }

    if (!token) {
      throw new UnauthorizedError('No authentication token provided');
    }

    // Verify JWT
    const secret = new TextEncoder().encode(config.jwtSecret);
    
    try {
      const { payload } = await jwtVerify(token, secret, {
        algorithms: ['HS256'],
      });

      // Extract tenant context from JWT claims
      const tenantContext: TenantContext = {
        customerId: payload.cid as string,
        userId: payload.sub as string,
        userEmail: payload.email as string,
        roles: (payload.roles as string[]) || [],
      };

      if (!tenantContext.customerId || !tenantContext.userId) {
        throw new UnauthorizedError('Invalid token claims');
      }

      // Attach context to request
      req.tenantContext = tenantContext;

      authLogger.debug(
        {
          customerId: tenantContext.customerId,
          userId: tenantContext.userId,
          path: req.path,
        },
        'Request authenticated'
      );

      next();
    } catch (jwtError: any) {
      if (jwtError.code === 'ERR_JWT_EXPIRED') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
        },
      });
      return;
    }

    authLogger.error({ err: error }, 'Auth middleware error');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Authentication failed',
      },
    });
  }
}

