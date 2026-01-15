/**
 * SalesOS API Gateway
 * 
 * Single entrypoint for all API requests. Handles:
 * - Authentication (JWT verification)
 * - Tenant context extraction and propagation
 * - Rate limiting
 * - Request routing to downstream services
 * - CORS
 * - Request/response logging
 */

// Initialize OpenTelemetry first (must be before other imports)
import '../shared/telemetry/index.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';

import { config } from '../shared/config/index.js';
import { logger, createLogger } from '../shared/logger/index.js';
import { generateRequestId } from '../shared/utils/id.js';
import { errorHandler, notFoundHandler } from '../shared/middleware/error.js';
import { healthRoutes } from '../shared/routes/health.js';
import { metricsRoutes } from '../shared/routes/metrics.js';
import { gatewayAuthMiddleware } from './middleware/auth.js';
import { tenantContextMiddleware } from './middleware/tenant.js';

const gatewayLogger = createLogger({ module: 'gateway' });

const app = express();

// Service URLs - in production these would be service discovery
const SERVICE_URLS = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  crm: process.env.CRM_SERVICE_URL || 'http://localhost:3002',
  email: process.env.EMAIL_SERVICE_URL || 'http://localhost:3003',
  calendar: process.env.CALENDAR_SERVICE_URL || 'http://localhost:3004',
  sequences: process.env.SEQUENCES_SERVICE_URL || 'http://localhost:3005',
  activities: process.env.ACTIVITIES_SERVICE_URL || 'http://localhost:3006',
};

// ─────────────────────────────────────────────────────────────
// Core middleware
// ─────────────────────────────────────────────────────────────

// Trust proxy for proper IP detection behind load balancers
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.nodeEnv === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') 
      : ['http://localhost:3010', 'http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  })
);

// Request ID generation and propagation
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
  next();
});

// Request logging
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] as string,
    customProps: (req) => ({
      requestId: req.headers['x-request-id'],
    }),
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
  })
);

// Body parsing - ONLY for non-proxied routes (health, metrics, etc.)
// For API routes, the proxy will forward the raw body to downstream services
// Do NOT add express.json() here - it consumes the body stream and breaks proxying

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use customer ID from JWT if available, otherwise API key or IP
    const tenantContext = (req as any).tenantContext;
    if (tenantContext?.customerId) {
      return tenantContext.customerId;
    }
    return (req.headers['x-api-key'] as string) || req.ip || 'unknown';
  },
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    });
  },
});

// ─────────────────────────────────────────────────────────────
// Health & Metrics (no auth required)
// ─────────────────────────────────────────────────────────────

app.use('/', healthRoutes);
app.use('/metrics', metricsRoutes);

// ─────────────────────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────────────────────

// Apply rate limiting to all /api routes
app.use('/api/', limiter);

// Auth routes - public (no auth required for login/signup)
// Note: These are checked against the full request path (req.originalUrl), not req.path
const authPublicRoutes = ['/api/v1/auth/login', '/api/v1/auth/signup', '/api/v1/auth/refresh'];

// Public tracking routes (no auth)
const publicTrackingRoutes = ['/api/v1/emails/track'];

// Check if route is public
function isPublicRoute(path: string): boolean {
  if (authPublicRoutes.some(route => path.startsWith(route))) {
    return true;
  }
  if (publicTrackingRoutes.some(route => path.startsWith(route))) {
    return true;
  }
  return false;
}

// Conditional auth middleware - skip for public routes
app.use('/api/', (req, res, next) => {
  // Use originalUrl to get the full path including the mount point
  const fullPath = req.originalUrl.split('?')[0]; // Remove query string
  if (isPublicRoute(fullPath)) {
    return next();
  }
  return gatewayAuthMiddleware(req, res, next);
});

// Tenant context middleware (after auth)
app.use('/api/', tenantContextMiddleware);

// ─────────────────────────────────────────────────────────────
// Service Proxies
// ─────────────────────────────────────────────────────────────

// Common proxy options
const createProxyOptions = (target: string, serviceName: string, pathRewrite?: Options['pathRewrite']): Options => ({
  target,
  changeOrigin: true,
  pathRewrite, // Optional path rewriting
  on: {
    proxyReq: (proxyReq, req: any) => {
      // Forward tenant context headers
      if (req.tenantContext) {
        proxyReq.setHeader('x-customer-id', req.tenantContext.customerId);
        proxyReq.setHeader('x-user-id', req.tenantContext.userId);
        proxyReq.setHeader('x-user-email', req.tenantContext.userEmail);
        proxyReq.setHeader('x-user-roles', JSON.stringify(req.tenantContext.roles));
      }
      // Forward request ID
      if (req.headers['x-request-id']) {
        proxyReq.setHeader('x-request-id', req.headers['x-request-id']);
      }
      gatewayLogger.debug(
        { 
          service: serviceName, 
          path: req.path,
          target,
        }, 
        'Proxying request'
      );
    },
    error: (err, _req, res: any) => {
      gatewayLogger.error({ err, service: serviceName }, 'Proxy error');
      if (res.writeHead) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: `${serviceName} service is currently unavailable`,
          },
        }));
      }
    },
  },
});

// Auth Service
app.use(
  '/api/v1/auth',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.auth, 'auth'))
);

// CRM Service - Accounts, Contacts, Opportunities
// Express strips the mount path, so we use pathRewrite function to add the resource name
app.use(
  '/api/v1/accounts',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.crm, 'crm', (path) => `/accounts${path}`))
);

app.use(
  '/api/v1/contacts',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.crm, 'crm', (path) => `/contacts${path}`))
);

app.use(
  '/api/v1/opportunities',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.crm, 'crm', (path) => `/opportunities${path}`))
);

// Email Service
app.use(
  '/api/v1/emails',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.email, 'email'))
);

// Calendar Service
app.use(
  '/api/v1/calendar',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.calendar, 'calendar'))
);

// Sequences Service
app.use(
  '/api/v1/sequences',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.sequences, 'sequences'))
);

// Activities Service
app.use(
  '/api/v1/activities',
  createProxyMiddleware(createProxyOptions(SERVICE_URLS.activities, 'activities'))
);

// ─────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// Server startup
// ─────────────────────────────────────────────────────────────

const GATEWAY_PORT = parseInt(process.env.GATEWAY_PORT || '3000', 10);

const server = app.listen(GATEWAY_PORT, config.host, () => {
  gatewayLogger.info(
    {
      host: config.host,
      port: GATEWAY_PORT,
      env: config.nodeEnv,
      services: SERVICE_URLS,
    },
    `🚀 SalesOS API Gateway listening on ${config.host}:${GATEWAY_PORT}`
  );
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  gatewayLogger.info({ signal }, 'Received shutdown signal');

  server.close(() => {
    gatewayLogger.info('Gateway HTTP server closed');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    gatewayLogger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };

