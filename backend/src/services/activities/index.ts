/**
 * Bevyly Activities Service
 * 
 * Handles activity tracking and timeline management.
 * - Log activities (notes, calls, etc.)
 * - Activity timelines for accounts/contacts
 * - Activity summaries
 */

// Initialize OpenTelemetry first (must be before other imports)
import '../../shared/telemetry/index.js';

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';

import { config } from '../../shared/config/index.js';
import { createLogger } from '../../shared/logger/index.js';
import { generateRequestId } from '../../shared/utils/id.js';
import { errorHandler, notFoundHandler } from '../../shared/middleware/error.js';
import { healthRoutes } from '../../shared/routes/health.js';
import { activityRoutes } from '../../modules/activities/routes.js';

const serviceLogger = createLogger({ module: 'activities-service' });

const app = express();

const SERVICE_PORT = parseInt(process.env.SERVICE_PORT || '3006', 10);
const SERVICE_NAME = process.env.SERVICE_NAME || 'activities';

// ─────────────────────────────────────────────────────────────
// Core middleware
// ─────────────────────────────────────────────────────────────

app.set('trust proxy', 1);
app.use(helmet());

app.use(
  cors({
    origin: config.nodeEnv === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') 
      : '*',
    credentials: true,
  })
);

// Request ID from gateway or generate new
app.use((req, _res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || generateRequestId();
  next();
});

// Request logging
app.use(
  pinoHttp({
    logger: serviceLogger,
    genReqId: (req) => req.headers['x-request-id'] as string,
    redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
  })
);

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────

app.use('/', healthRoutes);

// ─────────────────────────────────────────────────────────────
// Activities routes
// ─────────────────────────────────────────────────────────────

// Mount at root (gateway strips /api/v1/activities prefix)
// The authenticate() middleware in routes handles both gateway headers and direct JWT
app.use('/', activityRoutes);

// Also mount at full path for direct access without gateway
app.use('/api/v1/activities', activityRoutes);

// ─────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────

app.use(notFoundHandler);
app.use(errorHandler);

// ─────────────────────────────────────────────────────────────
// Server startup
// ─────────────────────────────────────────────────────────────

const server = app.listen(SERVICE_PORT, config.host, () => {
  serviceLogger.info(
    {
      host: config.host,
      port: SERVICE_PORT,
      service: SERVICE_NAME,
      env: config.nodeEnv,
    },
    `📝 Activities Service listening on ${config.host}:${SERVICE_PORT}`
  );
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  serviceLogger.info({ signal }, 'Received shutdown signal');

  server.close(() => {
    serviceLogger.info('Activities Service HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    serviceLogger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };

