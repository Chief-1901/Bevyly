import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError, wrapError, isOperationalError } from '../errors/index.js';
import { logger } from '../logger/index.js';

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    meta: {
      requestId: req.headers['x-request-id'] as string,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Global error handler
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const appError = wrapError(err);
  const requestId = req.headers['x-request-id'] as string;

  // Log error
  if (isOperationalError(err)) {
    logger.warn(
      {
        requestId,
        error: {
          code: appError.code,
          message: appError.message,
          stack: appError.stack,
        },
        path: req.path,
        method: req.method,
      },
      'Operational error'
    );
  } else {
    logger.error(
      {
        requestId,
        error: {
          name: err.name,
          message: err.message,
          stack: err.stack,
        },
        path: req.path,
        method: req.method,
      },
      'Unhandled error'
    );
  }

  // Send response
  res.status(appError.statusCode).json({
    success: false,
    error: {
      code: appError.code,
      message: isOperationalError(appError) ? appError.message : 'Internal server error',
      ...(appError.details && { details: appError.details }),
    },
    meta: {
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

