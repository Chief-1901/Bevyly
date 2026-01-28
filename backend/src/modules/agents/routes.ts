/**
 * Agent API Routes
 *
 * Routes for managing agents, runs, and the command interface.
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { requireTenant, getTenantContext } from '../../shared/middleware/tenant-guard.js';
import { authorize } from '../auth/middleware.js';
import { PERMISSIONS } from '../auth/rbac.js';
import { agentRegistry } from './base/agent.registry.js';
import {
  startAgentRun,
  getAgentRun,
  listAgentRuns,
  cancelAgentRun,
} from './base/agent-run.service.js';
import { getIntegrationCredentials } from './credentials.service.js';
import { crawl4aiClient } from './providers/crawl4ai.client.js';
import type { AgentType, AgentInput, IntegrationCredentialData } from './types.js';
import type { AgentRunId } from '../../shared/types/index.js';
import { logger } from '../../shared/logger/index.js';
import { approvalRoutes } from './approval/approval.routes.js';

const log = logger.child({ module: 'agent-routes' });

// ICP Criteria schema for validation
const icpCriteriaSchema = z.object({
  industries: z.array(z.string()).optional(),
  locations: z
    .array(
      z.object({
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .optional(),
  employeeRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  revenueRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  keywords: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional(),
  signals: z.array(z.string()).optional(),
  excludeKeywords: z.array(z.string()).optional(),
  searchQueries: z.array(z.string()).optional(),
});

export const agentRoutes = new Hono()
  .use('*', requireTenant())

  // Mount approval queue routes
  .route('/approval', approvalRoutes)

  // GET /agents - List available agents
  .get('/', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const agents = agentRegistry.getAgentInfo();

    return c.json({
      success: true,
      data: agents,
    });
  })

  // GET /agents/health - Check agent service health
  .get('/health', async (c) => {
    try {
      const crawl4aiHealth = await crawl4aiClient.checkHealth();

      return c.json({
        success: true,
        data: {
          agents: agentRegistry.getTypes().length > 0,
          crawl4ai: crawl4aiHealth,
        },
      });
    } catch (error) {
      log.error({ error }, 'Health check failed');
      return c.json({
        success: true,
        data: {
          agents: agentRegistry.getTypes().length > 0,
          crawl4ai: false,
        },
      });
    }
  })

  // POST /agents/parse-prompt - Parse a natural language prompt into ICP criteria
  .post(
    '/parse-prompt',
    authorize(PERMISSIONS.LEADS_READ),
    zValidator(
      'json',
      z.object({
        prompt: z.string().min(10).max(2000),
      })
    ),
    async (c) => {
      const { prompt } = c.req.valid('json');

      try {
        const result = await crawl4aiClient.parsePrompt(prompt);

        return c.json({
          success: true,
          data: result,
        });
      } catch (error) {
        log.error({ error, prompt }, 'Failed to parse prompt');
        return c.json(
          {
            success: false,
            error: { message: 'Failed to parse prompt. Please try rephrasing.' },
          },
          500
        );
      }
    }
  )

  // POST /agents/run - Run an agent (universal command interface)
  .post(
    '/run',
    authorize(PERMISSIONS.LEADS_WRITE),
    zValidator(
      'json',
      z.object({
        agentType: z.enum(['discovery', 'enrichment']),
        prompt: z.string().optional(),
        criteria: icpCriteriaSchema.optional(),
        params: z.record(z.unknown()).optional(),
      })
    ),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { agentType, prompt, criteria, params } = c.req.valid('json');

      // Get agent from registry
      const agent = agentRegistry.get(agentType as AgentType);
      if (!agent) {
        return c.json(
          {
            success: false,
            error: { message: `Agent type '${agentType}' not found` },
          },
          404
        );
      }

      // Build agent input
      const input: AgentInput = {
        prompt,
        criteria,
        params,
      };

      // Get credentials
      const credentials = await getIntegrationCredentials(customerId);

      // Validate input
      const validation = await agent.validate(
        {
          customerId,
          userId,
          runId: '' as AgentRunId, // Placeholder, will be generated
          credentials,
        },
        input
      );

      if (!validation.valid) {
        return c.json(
          {
            success: false,
            error: {
              message: 'Validation failed',
              details: validation.errors,
            },
          },
          400
        );
      }

      // Start the agent run
      try {
        const run = await startAgentRun({
          customerId,
          userId,
          agentType: agentType as AgentType,
          input,
          credentials,
        });

        return c.json({
          success: true,
          data: {
            runId: run.id,
            status: run.status,
            agentType,
            startedAt: run.startedAt,
          },
        });
      } catch (error) {
        log.error({ error, agentType, customerId }, 'Failed to start agent run');
        return c.json(
          {
            success: false,
            error: { message: 'Failed to start agent run' },
          },
          500
        );
      }
    }
  )

  // GET /agents/runs - List agent runs
  .get(
    '/runs',
    authorize(PERMISSIONS.LEADS_READ),
    zValidator(
      'query',
      z.object({
        agentType: z.enum(['discovery', 'enrichment']).optional(),
        status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
        page: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
      })
    ),
    async (c) => {
      const { customerId } = getTenantContext(c);
      const query = c.req.valid('query');

      const result = await listAgentRuns(customerId, {
        agentType: query.agentType as AgentType,
        status: query.status,
        page: query.page,
        limit: query.limit,
      });

      return c.json({
        success: true,
        data: result.runs,
        pagination: result.pagination,
      });
    }
  )

  // GET /agents/runs/:runId - Get run details
  .get('/runs/:runId', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const { runId } = c.req.param();

    const run = await getAgentRun(customerId, runId as AgentRunId);

    if (!run) {
      return c.json(
        {
          success: false,
          error: { message: 'Run not found' },
        },
        404
      );
    }

    // Get progress if running
    let progress = null;
    if (run.status === 'running') {
      const agent = agentRegistry.get(run.agentType as AgentType);
      if (agent) {
        progress = await agent.getProgress(runId as AgentRunId);
      }
    }

    return c.json({
      success: true,
      data: {
        ...run,
        progress,
      },
    });
  })

  // POST /agents/runs/:runId/cancel - Cancel a run
  .post('/runs/:runId/cancel', authorize(PERMISSIONS.LEADS_WRITE), async (c) => {
    const { customerId } = getTenantContext(c);
    const { runId } = c.req.param();

    try {
      await cancelAgentRun(customerId, runId as AgentRunId);

      return c.json({
        success: true,
        data: { message: 'Run cancellation requested' },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to cancel run';
      return c.json(
        {
          success: false,
          error: { message },
        },
        400
      );
    }
  })

  // GET /agents/runs/:runId/progress - Get run progress (SSE)
  .get('/runs/:runId/progress', authorize(PERMISSIONS.LEADS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const { runId } = c.req.param();

    const run = await getAgentRun(customerId, runId as AgentRunId);

    if (!run) {
      return c.json(
        {
          success: false,
          error: { message: 'Run not found' },
        },
        404
      );
    }

    const agent = agentRegistry.get(run.agentType as AgentType);
    if (!agent) {
      return c.json(
        {
          success: false,
          error: { message: 'Agent not found' },
        },
        404
      );
    }

    const progress = await agent.getProgress(runId as AgentRunId);

    return c.json({
      success: true,
      data: progress || {
        runId,
        status: run.status,
        progress: run.status === 'completed' ? 100 : 0,
      },
    });
  });
