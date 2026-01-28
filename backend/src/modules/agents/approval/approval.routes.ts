/**
 * Approval Queue API Routes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireTenant, getTenantContext } from '../../../shared/middleware/tenant-guard.js';
import { authorize } from '../../auth/middleware.js';
import { PERMISSIONS } from '../../auth/rbac.js';
import * as approvalService from './approval.service.js';
import type { ApprovalQueueItemId } from '../../../shared/types/index.js';
import type { FitScoreBucket, ApprovalStatus } from '../types.js';

export const approvalRoutes = new Hono()
  .use('*', requireTenant())

  // GET /approval/summary - Get queue statistics
  .get('/summary', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const summary = await approvalService.getApprovalQueueSummary(customerId);

    return c.json({
      success: true,
      data: summary,
    });
  })

  // GET /approval/stats - Get stats by agent type
  .get('/stats', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const stats = await approvalService.getApprovalStatsByAgent(customerId);

    return c.json({
      success: true,
      data: stats,
    });
  })

  // GET /approval - List approval items
  .get(
    '/',
    authorize(PERMISSIONS.LEADS_READ),
    zValidator(
      'query',
      z.object({
        status: z.enum(['pending', 'approved', 'rejected', 'expired']).optional(),
        bucket: z.enum(['high', 'medium', 'low']).optional(),
        batchId: z.string().optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
    ),
    async (c) => {
      const { customerId } = getTenantContext(c);
      const query = c.req.valid('query');

      const result = await approvalService.listApprovalQueue(customerId, {
        status: query.status as ApprovalStatus,
        bucket: query.bucket as FitScoreBucket,
        batchId: query.batchId,
        page: query.page,
        limit: query.limit,
      });

      return c.json({
        success: true,
        data: result.items,
        pagination: result.pagination,
      });
    }
  )

  // GET /approval/:id - Get single item
  .get('/:id', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const { id } = c.req.param();

    const item = await approvalService.getApprovalItem(
      customerId,
      id as ApprovalQueueItemId
    );

    if (!item) {
      return c.json({ success: false, error: { message: 'Item not found' } }, 404);
    }

    return c.json({
      success: true,
      data: item,
    });
  })

  // POST /approval/approve - Approve selected items
  .post(
    '/approve',
    authorize(PERMISSIONS.LEADS_WRITE),
    zValidator(
      'json',
      z.object({
        itemIds: z.array(z.string()).min(1).max(100),
      })
    ),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { itemIds } = c.req.valid('json');

      const result = await approvalService.approveItems(
        customerId,
        userId,
        itemIds as ApprovalQueueItemId[]
      );

      return c.json({
        success: true,
        data: result,
      });
    }
  )

  // POST /approval/reject - Reject selected items
  .post(
    '/reject',
    authorize(PERMISSIONS.LEADS_WRITE),
    zValidator(
      'json',
      z.object({
        itemIds: z.array(z.string()).min(1).max(100),
        reason: z.string().optional(),
      })
    ),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { itemIds, reason } = c.req.valid('json');

      const result = await approvalService.rejectItems(
        customerId,
        userId,
        itemIds as ApprovalQueueItemId[],
        reason
      );

      return c.json({
        success: true,
        data: result,
      });
    }
  )

  // POST /approval/approve-all - Approve all in bucket
  .post(
    '/approve-all',
    authorize(PERMISSIONS.LEADS_WRITE),
    zValidator(
      'json',
      z.object({
        bucket: z.enum(['high', 'medium', 'low']).optional(),
        maxCredits: z.number().int().positive().optional(),
      })
    ),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { bucket, maxCredits } = c.req.valid('json');

      const result = await approvalService.approveAllInBucket(customerId, userId, {
        bucket: bucket as FitScoreBucket,
        maxCredits,
      });

      return c.json({
        success: true,
        data: result,
      });
    }
  );
