/**
 * Idempotency Middleware
 * 
 * Ensures that requests with the same Idempotency-Key return the same response.
 * This prevents duplicate processing of requests (e.g., double-charging, duplicate emails).
 */

import type { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/client.js';
import { idempotencyKeys } from '../db/schema/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { createLogger } from '../logger/index.js';
import type { CustomerId } from '../types/index.js';

const logger = createLogger({ module: 'idempotency' });

// Default expiry for idempotency keys (24 hours)
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Idempotency middleware
 * 
 * Usage:
 * - Client sends `Idempotency-Key: <unique-key>` header with POST/PATCH/DELETE requests
 * - First request with a key is processed normally
 * - Subsequent requests with the same key return the cached response
 */
export function idempotency() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Only apply to mutating methods
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return next();
    }

    // Check for idempotency key header
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (!idempotencyKey) {
      // No key provided - process normally
      return next();
    }

    // Validate key format (should be a UUID or similar)
    if (idempotencyKey.length < 16 || idempotencyKey.length > 64) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEMPOTENCY_KEY',
          message: 'Idempotency-Key must be between 16 and 64 characters',
        },
      });
      return;
    }

    // Get customer ID from tenant context
    const customerId = req.tenantContext?.customerId;
    if (!customerId) {
      // Can't use idempotency without tenant context
      return next();
    }

    const db = getDb();
    const now = new Date();

    try {
      // Check if we have a cached response for this key
      const [existing] = await db
        .select()
        .from(idempotencyKeys)
        .where(
          and(
            eq(idempotencyKeys.key, idempotencyKey),
            eq(idempotencyKeys.customerId, customerId),
            gt(idempotencyKeys.expiresAt, now)
          )
        )
        .limit(1);

      if (existing) {
        if (existing.status === 'completed') {
          // Return cached response
          logger.debug({
            key: idempotencyKey,
            status: existing.responseStatus,
          }, 'Returning cached idempotent response');

          res.status(existing.responseStatus || 200).json({
            ...existing.responseBody as object,
            meta: {
              ...(existing.responseBody as any)?.meta,
              idempotentReplay: true,
            },
          });
          return;
        }

        if (existing.status === 'processing') {
          // Request is still being processed
          res.status(409).json({
            success: false,
            error: {
              code: 'CONCURRENT_REQUEST',
              message: 'A request with this idempotency key is currently being processed',
            },
          });
          return;
        }

        // If failed, allow retry - continue processing
      }

      // Create or update the idempotency key record
      const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_MS);
      
      await db
        .insert(idempotencyKeys)
        .values({
          key: idempotencyKey,
          customerId: customerId as CustomerId,
          requestPath: req.originalUrl,
          requestMethod: req.method,
          status: 'processing',
          expiresAt,
        })
        .onConflictDoUpdate({
          target: idempotencyKeys.key,
          set: {
            status: 'processing',
            expiresAt,
          },
        });

      // Intercept the response to cache it
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // Store the response
        db.update(idempotencyKeys)
          .set({
            responseStatus: res.statusCode,
            responseBody: body,
            status: res.statusCode >= 200 && res.statusCode < 300 ? 'completed' : 'failed',
          })
          .where(
            and(
              eq(idempotencyKeys.key, idempotencyKey),
              eq(idempotencyKeys.customerId, customerId)
            )
          )
          .catch((err) => {
            logger.error({ err, key: idempotencyKey }, 'Failed to store idempotent response');
          });

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ error, key: idempotencyKey }, 'Idempotency check failed');
      // On error, continue processing - don't block the request
      next();
    }
  };
}

