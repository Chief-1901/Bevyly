// Initialize OpenTelemetry first (must be before other imports)
import './shared/telemetry/index.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import rateLimit from 'express-rate-limit';

import { config } from './shared/config/index.js';
import { logger } from './shared/logger/index.js';
import { generateRequestId } from './shared/utils/id.js';
import { errorHandler, notFoundHandler } from './shared/middleware/error.js';
import { healthRoutes } from './shared/routes/health.js';
import { metricsRoutes } from './shared/routes/metrics.js';
import { initializeEventHandlers, startDispatcher } from './modules/events/index.js';

// Module routes
import { authRoutes } from './modules/auth/routes.js';
import { crmRoutes } from './modules/crm/routes.js';
import { emailRoutes } from './modules/email/routes.js';
import { calendarRoutes } from './modules/calendar/routes.js';
import { sequenceRoutes } from './modules/sequences/routes.js';
import { activityRoutes } from './modules/activities/routes.js';
import { leadsRouter } from './modules/leads/routes.js';
import { intentRouter } from './modules/intent/routes.js';

const app = express();

// ─────────────────────────────────────────────────────────────
// Core middleware
// ─────────────────────────────────────────────────────────────

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? process.env.ALLOWED_ORIGINS?.split(',') : '*',
    credentials: true,
  })
);

// Request ID generation
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

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use API key or IP for rate limiting
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
app.use('/api/', limiter);

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

// Health & metrics (no auth required)
app.use('/', healthRoutes);
app.use('/metrics', metricsRoutes);

// API v1 routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/accounts', crmRoutes.accounts);
app.use('/api/v1/contacts', crmRoutes.contacts);
app.use('/api/v1/opportunities', crmRoutes.opportunities);
app.use('/api/v1/emails', emailRoutes);
app.use('/api/v1/calendar', calendarRoutes);
app.use('/api/v1/sequences', sequenceRoutes);
app.use('/api/v1/activities', activityRoutes);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/intent', intentRouter);

// ─────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// Server startup
// ─────────────────────────────────────────────────────────────

// Initialize event handlers
initializeEventHandlers();

const server = app.listen(config.port, config.host, () => {
  logger.info(
    {
      host: config.host,
      port: config.port,
      env: config.nodeEnv,
    },
    `🚀 SalesOS backend listening on ${config.host}:${config.port}`
  );

  // Start event dispatcher in background
  if (config.nodeEnv !== 'test') {
    startDispatcher({ pollInterval: 1000 }).catch((err) => {
      logger.error({ err }, 'Event dispatcher failed');
    });
  }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, 'Received shutdown signal');

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };

