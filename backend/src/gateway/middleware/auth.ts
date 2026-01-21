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
 * Parse cookies from Cookie header string
 */
function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name && rest.length > 0) {
      cookies[name] = rest.join('=');
    }
  });

  return cookies;
}

/**
 * Gateway authentication middleware
 * Verifies JWT tokens and extracts tenant context
 * 
 * Token sources (in priority order):
 * 1. Authorization: Bearer <token> header
 * 2. access_token cookie (for browser requests via proxy/rewrite)
 */
export async function gatewayAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header first (highest priority)
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // If no Authorization header, try to get token from cookie
    // This supports client-side fetches that go through Next.js rewrite proxy
    if (!token) {
      const cookies = parseCookies(req.headers.cookie);
      token = cookies['access_token'];
      
      if (token) {
        authLogger.debug({ path: req.path }, 'Using access_token from cookie');
      }
    }

    // Also check for API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      // API key authentication
      // SECURITY: Validate API key at gateway level before forwarding to services
      // API keys are validated by the auth service, but we need to ensure
      // the key exists and has basic format validation before passing through
      if (!apiKey || apiKey.length < 20) {
        throw new UnauthorizedError('Invalid API key format');
      }

      // Mark request as API key authenticated
      // The downstream service will perform full validation
      authLogger.debug(
        { path: req.path, keyPrefix: apiKey.substring(0, 8) + '...' },
        'API key authentication - forwarding to service for validation'
      );

      // Set a flag so downstream services know this is API key auth
      req.headers['x-auth-method'] = 'api-key';
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

