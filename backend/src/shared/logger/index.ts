import pino from 'pino';
import { config } from '../config/index.js';

const transport = config.logPretty
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    }
  : undefined;

export const logger = pino({
  level: config.logLevel,
  transport,
  base: {
    service: config.otelServiceName,
    env: config.nodeEnv,
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export type Logger = typeof logger;

/**
 * Create a child logger with additional context
 */
export function createLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings);
}

/**
 * Create a request-scoped logger
 */
export function createRequestLogger(requestId: string, customerId?: string, userId?: string) {
  return logger.child({
    requestId,
    customerId,
    userId,
  });
}

