/**
 * Service for managing agent runs
 */

import { eq, and, desc, sql } from 'drizzle-orm';
import { getDb } from '../../../shared/db/client.js';
import { agentRuns, agentConfigs, integrationCredentials } from '../../../shared/db/schema/index.js';
import {
  generateAgentRunId,
  type CustomerId,
  type UserId,
  type AgentRunId,
  type AgentConfigId,
} from '../../../shared/types/index.js';
import { logger } from '../../../shared/logger/index.js';
import { decrypt } from '../../../shared/utils/crypto.js';
import { writeToOutbox, createEvent } from '../../events/outbox.js';
import { agentRegistry } from './agent.registry.js';
import type {
  AgentType,
  AgentRunStatus,
  AgentContext,
  AgentInput,
  AgentOutput,
  ICPCriteria,
  IntegrationCredentialData,
} from '../types.js';

const log = logger.child({ module: 'agent-run-service' });

// Track running agents for cancellation
const runningAgents = new Map<string, { cancel: () => void }>();

/**
 * Start a new agent run
 */
export async function startAgentRun(options: {
  customerId: CustomerId;
  userId: UserId;
  agentType: AgentType;
  prompt?: string;
  criteria?: ICPCriteria;
  params?: Record<string, unknown>;
  configId?: AgentConfigId;
}): Promise<AgentRunId> {
  const { customerId, userId, agentType, prompt, criteria, params, configId } = options;
  const db = getDb();

  // Get agent implementation
  const agent = agentRegistry.get(agentType);
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Get config if specified
  let config: Record<string, unknown> = {};
  if (configId) {
    const [savedConfig] = await db
      .select()
      .from(agentConfigs)
      .where(and(eq(agentConfigs.id, configId), eq(agentConfigs.customerId, customerId)))
      .limit(1);

    if (!savedConfig) {
      throw new Error(`Agent config not found: ${configId}`);
    }
    if (!savedConfig.enabled) {
      throw new Error('Agent is disabled');
    }
    config = (savedConfig.config as Record<string, unknown>) || {};
  }

  // Get credentials for this tenant
  const credentials = await getCredentialsForTenant(customerId);

  // Create run record
  const runId = generateAgentRunId();
  await db.insert(agentRuns).values({
    id: runId,
    customerId,
    userId,
    agentConfigId: configId,
    agentType,
    status: 'pending',
    prompt,
    parsedCriteria: criteria,
    inputParams: params || {},
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  log.info({ runId, agentType, customerId }, 'Agent run created');

  // Build context
  const context: AgentContext = {
    customerId,
    userId,
    runId,
    configId,
    credentials,
  };

  // Build input
  const input: AgentInput = {
    prompt,
    criteria,
    params: { ...config, ...params },
  };

  // Validate before executing
  const validation = await agent.validate(context, input);
  if (!validation.valid) {
    await updateRunStatus(runId, 'failed', {
      error: `Validation failed: ${validation.errors?.join(', ')}`,
    });
    throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
  }

  // Execute asynchronously
  executeAgent(runId, agent, context, input).catch((error) => {
    log.error({ runId, error: error.message }, 'Agent execution failed');
  });

  return runId;
}

/**
 * Execute an agent (internal)
 */
async function executeAgent(
  runId: AgentRunId,
  agent: ReturnType<typeof agentRegistry.get>,
  context: AgentContext,
  input: AgentInput
): Promise<void> {
  if (!agent) return;

  const { customerId } = context;

  try {
    // Update status to running
    await updateRunStatus(runId, 'running', { startedAt: new Date() });

    log.info({ runId, agentType: agent.type }, 'Agent execution started');

    // Execute
    const output = await agent.execute(context, input);

    // Update with results
    await updateRunStatus(runId, output.status, {
      resultsSummary: output.summary,
      leadsDiscovered: output.leadsDiscovered,
      leadsEnriched: output.leadsEnriched,
      creditsUsed: output.creditsUsed,
      completedAt: new Date(),
      errorMessage: output.error,
    });

    // Publish completion event
    await writeToOutbox(
      createEvent(
        `agent.${agent.type}.completed`,
        'agent_run',
        runId,
        customerId,
        {
          runId,
          agentType: agent.type,
          status: output.status,
          leadsDiscovered: output.leadsDiscovered,
          leadsEnriched: output.leadsEnriched,
          creditsUsed: output.creditsUsed,
          userId: context.userId,
        }
      )
    );

    log.info({ runId, output }, 'Agent execution completed');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await updateRunStatus(runId, 'failed', {
      errorMessage,
      completedAt: new Date(),
    });

    await writeToOutbox(
      createEvent(`agent.${agent.type}.failed`, 'agent_run', runId, customerId, {
        runId,
        agentType: agent.type,
        error: errorMessage,
      })
    );

    log.error({ runId, error: errorMessage }, 'Agent execution failed');
    throw error;
  } finally {
    runningAgents.delete(runId);
  }
}

/**
 * Update run status
 */
async function updateRunStatus(
  runId: AgentRunId,
  status: AgentRunStatus,
  data?: {
    startedAt?: Date;
    completedAt?: Date;
    resultsSummary?: Record<string, unknown>;
    leadsDiscovered?: number;
    leadsEnriched?: number;
    creditsUsed?: number;
    errorMessage?: string;
  }
): Promise<void> {
  const db = getDb();
  await db
    .update(agentRuns)
    .set({
      status,
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(agentRuns.id, runId));
}

/**
 * Get a run by ID
 */
export async function getAgentRun(
  customerId: CustomerId,
  runId: AgentRunId
): Promise<typeof agentRuns.$inferSelect | null> {
  const db = getDb();
  const [run] = await db
    .select()
    .from(agentRuns)
    .where(and(eq(agentRuns.id, runId), eq(agentRuns.customerId, customerId)))
    .limit(1);
  return run || null;
}

/**
 * List runs for a tenant
 */
export async function listAgentRuns(
  customerId: CustomerId,
  options?: {
    agentType?: AgentType;
    status?: AgentRunStatus;
    page?: number;
    limit?: number;
  }
): Promise<{
  runs: Array<typeof agentRuns.$inferSelect>;
  total: number;
}> {
  const db = getDb();
  const { agentType, status, page = 1, limit = 20 } = options || {};

  const conditions = [eq(agentRuns.customerId, customerId)];
  if (agentType) conditions.push(eq(agentRuns.agentType, agentType));
  if (status) conditions.push(eq(agentRuns.status, status));

  const [runs, countResult] = await Promise.all([
    db
      .select()
      .from(agentRuns)
      .where(and(...conditions))
      .orderBy(desc(agentRuns.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db
      .select({ count: sql<number>`count(*)` })
      .from(agentRuns)
      .where(and(...conditions)),
  ]);

  return {
    runs,
    total: Number(countResult[0]?.count || 0),
  };
}

/**
 * Cancel a running agent
 */
export async function cancelAgentRun(
  customerId: CustomerId,
  runId: AgentRunId
): Promise<boolean> {
  const run = await getAgentRun(customerId, runId);
  if (!run || run.status !== 'running') {
    return false;
  }

  const agent = agentRegistry.get(run.agentType as AgentType);
  if (agent) {
    await agent.cancel(runId);
  }

  await updateRunStatus(runId, 'cancelled', { completedAt: new Date() });
  return true;
}

/**
 * Get credentials for a tenant
 */
async function getCredentialsForTenant(
  customerId: CustomerId
): Promise<Map<string, IntegrationCredentialData>> {
  const db = getDb();
  const credentials = new Map<string, IntegrationCredentialData>();

  // Get tenant-specific credentials
  const tenantCreds = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.customerId, customerId),
        eq(integrationCredentials.status, 'active')
      )
    );

  // Get platform defaults (customerId is null)
  const platformCreds = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        sql`${integrationCredentials.customerId} IS NULL`,
        eq(integrationCredentials.status, 'active')
      )
    );

  // Platform defaults first, tenant overrides
  for (const cred of [...platformCreds, ...tenantCreds]) {
    try {
      const decryptedKey = cred.apiKey ? decrypt(cred.apiKey) : '';
      const decryptedSecret = cred.apiSecret ? decrypt(cred.apiSecret) : undefined;

      credentials.set(cred.provider, {
        provider: cred.provider as IntegrationCredentialData['provider'],
        apiKey: decryptedKey,
        apiSecret: decryptedSecret,
        config: (cred.config as Record<string, unknown>) || {},
      });
    } catch (error) {
      log.warn(
        { provider: cred.provider, customerId },
        'Failed to decrypt credentials'
      );
    }
  }

  return credentials;
}
