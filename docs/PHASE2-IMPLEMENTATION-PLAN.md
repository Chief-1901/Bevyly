# Phase 2: Agent Infrastructure - Implementation Plan

> Detailed technical plan for implementing the agent infrastructure layer

**Version:** 1.0
**Created:** January 22, 2026
**Status:** Ready for Implementation

---

## Executive Summary

Phase 2 transforms Bevyly from a traditional CRM into an AI-powered sales operating system by introducing:

1. **External AI Integrations** - OpenAI for intelligence, Apollo.io for data
2. **Agent Orchestration Framework** - Execute, monitor, and control AI agents
3. **Approval Queue System** - Human-in-the-loop for agent outputs
4. **Agent Console & Configuration** - UI for managing agents

**Estimated Scope:** ~40 files across backend and frontend

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT LAYER                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   OpenAI     │    │  Apollo.io   │    │   Bland.ai   │          │
│  │  Provider    │    │   Provider   │    │  (Phase 4)   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┘          │
│         │                   │                                        │
│         └─────────┬─────────┘                                        │
│                   ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  AGENT ORCHESTRATOR                          │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
│  │  │ Queue   │ │ Execute │ │ Monitor │ │ Config  │           │   │
│  │  │ Manager │ │ Engine  │ │ Service │ │ Store   │           │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                   │                                                  │
│                   ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  APPROVAL QUEUE                              │   │
│  │  Pending Items │ Review Interface │ Bulk Actions            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Tasks

### Task 1: Database Schema for Agents

**Priority:** Critical
**Files to Create/Modify:**

```
backend/src/shared/db/schema/
├── agents.ts           # NEW - Agent configs, runs, approval items
└── index.ts            # MODIFY - Export new schemas
```

**Schema Definitions:**

```typescript
// agents.ts

// Agent configuration per tenant
export const agentConfigs = pgTable('agent_configs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  agentType: varchar('agent_type', { length: 50 }).notNull(), // lead_source, enrichment, email_drafter, etc.
  name: varchar('name', { length: 100 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  config: jsonb('config').notNull(), // Agent-specific configuration
  schedule: varchar('schedule', { length: 100 }), // Cron expression
  limits: jsonb('limits'), // { daily: 100, hourly: 20 }
  approvalRequired: boolean('approval_required').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('agent_configs_customer_idx').on(table.customerId),
  typeIdx: index('agent_configs_type_idx').on(table.agentType),
}));

// Agent execution history
export const agentRuns = pgTable('agent_runs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  agentConfigId: varchar('agent_config_id', { length: 36 }).references(() => agentConfigs.id),
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // pending, running, completed, failed, cancelled
  trigger: varchar('trigger', { length: 50 }).notNull(), // manual, scheduled, event, api
  input: jsonb('input'), // Input parameters
  output: jsonb('output'), // Results/artifacts
  error: text('error'),
  itemsProcessed: integer('items_processed').default(0),
  itemsSucceeded: integer('items_succeeded').default(0),
  itemsFailed: integer('items_failed').default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('agent_runs_customer_idx').on(table.customerId),
  statusIdx: index('agent_runs_status_idx').on(table.status),
  createdAtIdx: index('agent_runs_created_at_idx').on(table.createdAt),
}));

// Items pending human approval
export const approvalItems = pgTable('approval_items', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  agentRunId: varchar('agent_run_id', { length: 36 }).references(() => agentRuns.id),
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  itemType: varchar('item_type', { length: 50 }).notNull(), // email_draft, lead_import, enrichment, etc.
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  content: jsonb('content').notNull(), // The actual content to approve
  context: jsonb('context'), // Supporting context (lead info, etc.)
  status: varchar('status', { length: 20 }).default('pending').notNull(), // pending, approved, rejected, edited
  reviewedBy: varchar('reviewed_by', { length: 36 }).references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  editedContent: jsonb('edited_content'), // If user edited before approving
  rejectionReason: text('rejection_reason'),
  expiresAt: timestamp('expires_at'), // Auto-expire stale items
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('approval_items_customer_idx').on(table.customerId),
  statusIdx: index('approval_items_status_idx').on(table.status),
  priorityIdx: index('approval_items_priority_idx').on(table.priority),
  createdAtIdx: index('approval_items_created_at_idx').on(table.createdAt),
}));

// API credentials for external services
export const integrationCredentials = pgTable('integration_credentials', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull().references(() => customers.id),
  provider: varchar('provider', { length: 50 }).notNull(), // openai, apollo, bland
  credentials: text('credentials').notNull(), // Encrypted JSON
  status: varchar('status', { length: 20 }).default('active').notNull(),
  lastVerifiedAt: timestamp('last_verified_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  customerProviderIdx: index('integration_creds_customer_provider_idx').on(table.customerId, table.provider),
}));
```

**Migration:** Create `0003_add_agent_tables.sql`

---

### Task 2: OpenAI Integration

**Priority:** Critical
**Files to Create:**

```
backend/src/integrations/
├── openai/
│   ├── index.ts          # Export barrel
│   ├── client.ts         # OpenAI client factory
│   ├── types.ts          # Type definitions
│   └── prompts/          # Prompt templates
│       ├── email-draft.ts
│       ├── lead-scoring.ts
│       └── response-classification.ts
```

**Implementation:**

```typescript
// client.ts
import OpenAI from 'openai';
import { config } from '@/shared/config';
import { decrypt } from '@/shared/utils/crypto';
import { db } from '@/shared/db/client';
import { integrationCredentials } from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { CustomerId } from '@/shared/types';

interface OpenAIClientOptions {
  customerId: CustomerId;
  model?: string;
}

export async function getOpenAIClient(options: OpenAIClientOptions): Promise<OpenAI> {
  const { customerId } = options;

  // Try tenant-specific key first
  const [credential] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.customerId, customerId),
        eq(integrationCredentials.provider, 'openai'),
        eq(integrationCredentials.status, 'active')
      )
    )
    .limit(1);

  let apiKey: string;

  if (credential) {
    const decrypted = JSON.parse(decrypt(credential.credentials));
    apiKey = decrypted.apiKey;
  } else if (config.openai.apiKey) {
    // Fall back to platform key (for starter plans)
    apiKey = config.openai.apiKey;
  } else {
    throw new Error('No OpenAI API key configured');
  }

  return new OpenAI({ apiKey });
}

// Wrapper with retry logic and rate limiting
export async function generateCompletion(
  client: OpenAI,
  options: {
    model?: string;
    messages: OpenAI.Chat.ChatCompletionMessageParam[];
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const { model = 'gpt-4-turbo-preview', messages, temperature = 0.7, maxTokens = 1000 } = options;

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
  });

  return response.choices[0]?.message?.content ?? '';
}
```

**Prompt Templates:**

```typescript
// prompts/email-draft.ts
export const emailDraftPrompt = (context: {
  contactName: string;
  companyName: string;
  industry: string;
  recentNews?: string;
  painPoints?: string[];
  productValue: string;
  senderName: string;
  senderTitle: string;
}) => `
You are a sales development representative drafting a cold outreach email.

CONTACT: ${context.contactName} at ${context.companyName} (${context.industry})
${context.recentNews ? `RECENT NEWS: ${context.recentNews}` : ''}
${context.painPoints?.length ? `PAIN POINTS: ${context.painPoints.join(', ')}` : ''}

VALUE PROPOSITION: ${context.productValue}
SENDER: ${context.senderName}, ${context.senderTitle}

Write a personalized cold email following this structure:
1. Personalized hook (reference something specific about them)
2. Problem identification (1 sentence)
3. Solution hint (1 sentence)
4. Soft CTA (question, not hard sell)

Requirements:
- Keep under 150 words
- Conversational tone
- No buzzwords or jargon
- Sound human, not AI-generated

Return JSON: { "subject": "...", "body": "..." }
`;
```

---

### Task 3: Apollo.io Integration

**Priority:** Critical
**Files to Create:**

```
backend/src/integrations/
├── apollo/
│   ├── index.ts          # Export barrel
│   ├── client.ts         # Apollo API client
│   ├── types.ts          # Type definitions
│   ├── search.ts         # Company/people search
│   └── enrich.ts         # Enrichment functions
```

**Implementation:**

```typescript
// client.ts
import { config } from '@/shared/config';
import { decrypt } from '@/shared/utils/crypto';
import { db } from '@/shared/db/client';
import { integrationCredentials } from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { CustomerId } from '@/shared/types';
import { logger } from '@/shared/logger';

const APOLLO_BASE_URL = 'https://api.apollo.io/v1';

interface ApolloClientOptions {
  customerId: CustomerId;
}

export async function getApolloClient(options: ApolloClientOptions) {
  const { customerId } = options;

  const [credential] = await db
    .select()
    .from(integrationCredentials)
    .where(
      and(
        eq(integrationCredentials.customerId, customerId),
        eq(integrationCredentials.provider, 'apollo'),
        eq(integrationCredentials.status, 'active')
      )
    )
    .limit(1);

  if (!credential && !config.apollo?.apiKey) {
    throw new Error('No Apollo.io API key configured');
  }

  const apiKey = credential
    ? JSON.parse(decrypt(credential.credentials)).apiKey
    : config.apollo.apiKey;

  return new ApolloClient(apiKey);
}

class ApolloClient {
  constructor(private apiKey: string) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${APOLLO_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error({ endpoint, status: response.status, error }, 'Apollo API error');
      throw new Error(`Apollo API error: ${response.status}`);
    }

    return response.json();
  }

  // Search for companies matching ICP
  async searchOrganizations(params: {
    industry?: string[];
    employeeCount?: { min?: number; max?: number };
    revenue?: { min?: number; max?: number };
    locations?: string[];
    technologies?: string[];
    page?: number;
    perPage?: number;
  }) {
    return this.request<ApolloOrganizationSearchResponse>('/organizations/search', {
      method: 'POST',
      body: JSON.stringify({
        organization_industry_tag_ids: params.industry,
        organization_num_employees_ranges: params.employeeCount
          ? [`${params.employeeCount.min || 0}-${params.employeeCount.max || ''}`]
          : undefined,
        organization_locations: params.locations,
        currently_using_any_of_technology_uids: params.technologies,
        page: params.page || 1,
        per_page: params.perPage || 25,
      }),
    });
  }

  // Search for people at specific companies
  async searchPeople(params: {
    organizationIds?: string[];
    titles?: string[];
    seniorityLevels?: string[];
    departments?: string[];
    page?: number;
    perPage?: number;
  }) {
    return this.request<ApolloPeopleSearchResponse>('/people/search', {
      method: 'POST',
      body: JSON.stringify({
        organization_ids: params.organizationIds,
        person_titles: params.titles,
        person_seniorities: params.seniorityLevels,
        person_departments: params.departments,
        page: params.page || 1,
        per_page: params.perPage || 25,
      }),
    });
  }

  // Enrich a specific organization
  async enrichOrganization(domain: string) {
    return this.request<ApolloOrganizationEnrichResponse>('/organizations/enrich', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  }

  // Enrich a specific person
  async enrichPerson(params: { email?: string; linkedinUrl?: string }) {
    return this.request<ApolloPersonEnrichResponse>('/people/match', {
      method: 'POST',
      body: JSON.stringify({
        email: params.email,
        linkedin_url: params.linkedinUrl,
      }),
    });
  }
}
```

---

### Task 4: Agent Orchestration Framework

**Priority:** Critical
**Files to Create:**

```
backend/src/modules/agents/
├── index.ts                    # Module entry
├── routes.ts                   # API endpoints
├── orchestrator/
│   ├── index.ts               # Orchestrator service
│   ├── executor.ts            # Agent execution engine
│   ├── scheduler.ts           # Cron-based scheduling
│   └── queue.ts               # Job queue manager
├── base/
│   ├── agent.interface.ts     # Base agent interface
│   ├── agent.registry.ts      # Agent type registry
│   └── agent.context.ts       # Execution context
├── config/
│   └── service.ts             # Agent config CRUD
└── runs/
    └── service.ts             # Run history CRUD
```

**Base Agent Interface:**

```typescript
// base/agent.interface.ts
import { CustomerId } from '@/shared/types';

export interface AgentContext {
  customerId: CustomerId;
  userId: string;
  runId: string;
  configId?: string;
  trigger: 'manual' | 'scheduled' | 'event' | 'api';
  abortSignal?: AbortSignal;
}

export interface AgentInput {
  [key: string]: unknown;
}

export interface AgentOutput {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  results: unknown[];
  errors?: Array<{ item: unknown; error: string }>;
  approvalItemIds?: string[]; // Items sent to approval queue
}

export interface AgentConfig {
  [key: string]: unknown;
}

export interface BaseAgent<
  TInput extends AgentInput = AgentInput,
  TOutput extends AgentOutput = AgentOutput,
  TConfig extends AgentConfig = AgentConfig
> {
  readonly type: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly requiresApproval: boolean;

  // Validate configuration
  validateConfig(config: TConfig): Promise<{ valid: boolean; errors?: string[] }>;

  // Validate input before execution
  validateInput(input: TInput): Promise<{ valid: boolean; errors?: string[] }>;

  // Execute the agent
  execute(context: AgentContext, input: TInput, config: TConfig): Promise<TOutput>;

  // Clean up resources
  cleanup?(context: AgentContext): Promise<void>;
}
```

**Orchestrator Service:**

```typescript
// orchestrator/index.ts
import { db } from '@/shared/db/client';
import { agentRuns, agentConfigs, approvalItems } from '@/shared/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateAgentRunId } from '@/shared/types';
import { logger } from '@/shared/logger';
import { agentRegistry } from '../base/agent.registry';
import { AgentContext, AgentInput, AgentOutput } from '../base/agent.interface';
import { CustomerId } from '@/shared/types';
import { publishEvent } from '@/modules/events/outbox';

export interface RunAgentOptions {
  customerId: CustomerId;
  userId: string;
  agentType: string;
  configId?: string;
  input?: AgentInput;
  trigger?: 'manual' | 'scheduled' | 'event' | 'api';
}

export async function runAgent(options: RunAgentOptions): Promise<string> {
  const { customerId, userId, agentType, configId, input = {}, trigger = 'manual' } = options;

  // Get agent implementation
  const agent = agentRegistry.get(agentType);
  if (!agent) {
    throw new Error(`Unknown agent type: ${agentType}`);
  }

  // Get config if specified
  let config = {};
  if (configId) {
    const [savedConfig] = await db
      .select()
      .from(agentConfigs)
      .where(
        and(
          eq(agentConfigs.id, configId),
          eq(agentConfigs.customerId, customerId)
        )
      )
      .limit(1);

    if (!savedConfig) {
      throw new Error(`Agent config not found: ${configId}`);
    }

    if (!savedConfig.enabled) {
      throw new Error('Agent is disabled');
    }

    config = savedConfig.config;
  }

  // Validate config and input
  const configValidation = await agent.validateConfig(config);
  if (!configValidation.valid) {
    throw new Error(`Invalid config: ${configValidation.errors?.join(', ')}`);
  }

  const inputValidation = await agent.validateInput(input);
  if (!inputValidation.valid) {
    throw new Error(`Invalid input: ${inputValidation.errors?.join(', ')}`);
  }

  // Create run record
  const runId = generateAgentRunId();
  await db.insert(agentRuns).values({
    id: runId,
    customerId,
    agentConfigId: configId,
    agentType,
    status: 'pending',
    trigger,
    input,
    createdAt: new Date(),
  });

  // Execute asynchronously
  executeAgent(runId, agent, { customerId, userId, runId, trigger }, input, config)
    .catch(error => {
      logger.error({ runId, error }, 'Agent execution failed');
    });

  return runId;
}

async function executeAgent(
  runId: string,
  agent: BaseAgent,
  context: AgentContext,
  input: AgentInput,
  config: unknown
): Promise<void> {
  const log = logger.child({ runId, agentType: agent.type });

  try {
    // Update status to running
    await db.update(agentRuns)
      .set({ status: 'running', startedAt: new Date() })
      .where(eq(agentRuns.id, runId));

    log.info('Agent execution started');

    // Execute
    const output = await agent.execute(context, input, config);

    // Update with results
    await db.update(agentRuns)
      .set({
        status: 'completed',
        output,
        itemsProcessed: output.itemsProcessed,
        itemsSucceeded: output.itemsSucceeded,
        itemsFailed: output.itemsFailed,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));

    // Publish completion event
    await publishEvent({
      eventType: 'agent.run.completed',
      aggregateType: 'agent',
      aggregateId: runId,
      customerId: context.customerId,
      payload: {
        runId,
        agentType: agent.type,
        itemsProcessed: output.itemsProcessed,
        itemsSucceeded: output.itemsSucceeded,
        itemsFailed: output.itemsFailed,
      },
    });

    log.info({ output }, 'Agent execution completed');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await db.update(agentRuns)
      .set({
        status: 'failed',
        error: errorMessage,
        completedAt: new Date(),
      })
      .where(eq(agentRuns.id, runId));

    await publishEvent({
      eventType: 'agent.run.failed',
      aggregateType: 'agent',
      aggregateId: runId,
      customerId: context.customerId,
      payload: { runId, agentType: agent.type, error: errorMessage },
    });

    log.error({ error }, 'Agent execution failed');
    throw error;

  } finally {
    await agent.cleanup?.(context);
  }
}
```

---

### Task 5: Approval Queue System

**Priority:** Critical
**Files to Create:**

```
backend/src/modules/approvals/
├── index.ts              # Module entry
├── routes.ts             # API endpoints
├── service.ts            # Approval queue operations
└── types.ts              # Type definitions
```

**Service Implementation:**

```typescript
// service.ts
import { db } from '@/shared/db/client';
import { approvalItems, users } from '@/shared/db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { generateApprovalItemId, CustomerId, UserId } from '@/shared/types';
import { publishEvent } from '@/modules/events/outbox';

export interface CreateApprovalItemOptions {
  customerId: CustomerId;
  agentRunId?: string;
  agentType: string;
  itemType: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  description?: string;
  content: unknown;
  context?: unknown;
  expiresAt?: Date;
}

export async function createApprovalItem(options: CreateApprovalItemOptions): Promise<string> {
  const id = generateApprovalItemId();

  await db.insert(approvalItems).values({
    id,
    customerId: options.customerId,
    agentRunId: options.agentRunId,
    agentType: options.agentType,
    itemType: options.itemType,
    priority: options.priority || 'normal',
    title: options.title,
    description: options.description,
    content: options.content,
    context: options.context,
    status: 'pending',
    expiresAt: options.expiresAt,
    createdAt: new Date(),
  });

  return id;
}

export async function listApprovalItems(
  customerId: CustomerId,
  filters?: {
    status?: string;
    agentType?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }
) {
  const { status = 'pending', agentType, priority, page = 1, limit = 20 } = filters || {};

  const conditions = [eq(approvalItems.customerId, customerId)];

  if (status) conditions.push(eq(approvalItems.status, status));
  if (agentType) conditions.push(eq(approvalItems.agentType, agentType));
  if (priority) conditions.push(eq(approvalItems.priority, priority));

  const [items, countResult] = await Promise.all([
    db.select()
      .from(approvalItems)
      .where(and(...conditions))
      .orderBy(
        sql`CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END`,
        desc(approvalItems.createdAt)
      )
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ count: sql<number>`count(*)` })
      .from(approvalItems)
      .where(and(...conditions)),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total: countResult[0]?.count || 0,
      totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
    },
  };
}

export async function approveItem(
  customerId: CustomerId,
  itemId: string,
  userId: UserId,
  editedContent?: unknown
): Promise<void> {
  const [item] = await db
    .select()
    .from(approvalItems)
    .where(
      and(
        eq(approvalItems.id, itemId),
        eq(approvalItems.customerId, customerId),
        eq(approvalItems.status, 'pending')
      )
    )
    .limit(1);

  if (!item) {
    throw new Error('Approval item not found or already processed');
  }

  await db.update(approvalItems)
    .set({
      status: editedContent ? 'edited' : 'approved',
      reviewedBy: userId,
      reviewedAt: new Date(),
      editedContent,
    })
    .where(eq(approvalItems.id, itemId));

  await publishEvent({
    eventType: 'approval.item.approved',
    aggregateType: 'approval',
    aggregateId: itemId,
    customerId,
    payload: {
      itemId,
      itemType: item.itemType,
      agentType: item.agentType,
      wasEdited: !!editedContent,
      content: editedContent || item.content,
    },
  });
}

export async function rejectItem(
  customerId: CustomerId,
  itemId: string,
  userId: UserId,
  reason?: string
): Promise<void> {
  const [item] = await db
    .select()
    .from(approvalItems)
    .where(
      and(
        eq(approvalItems.id, itemId),
        eq(approvalItems.customerId, customerId),
        eq(approvalItems.status, 'pending')
      )
    )
    .limit(1);

  if (!item) {
    throw new Error('Approval item not found or already processed');
  }

  await db.update(approvalItems)
    .set({
      status: 'rejected',
      reviewedBy: userId,
      reviewedAt: new Date(),
      rejectionReason: reason,
    })
    .where(eq(approvalItems.id, itemId));

  await publishEvent({
    eventType: 'approval.item.rejected',
    aggregateType: 'approval',
    aggregateId: itemId,
    customerId,
    payload: { itemId, itemType: item.itemType, agentType: item.agentType, reason },
  });
}

export async function bulkApprove(
  customerId: CustomerId,
  itemIds: string[],
  userId: UserId
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const itemId of itemIds) {
    try {
      await approveItem(customerId, itemId, userId);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

export async function getApprovalStats(customerId: CustomerId) {
  const stats = await db
    .select({
      status: approvalItems.status,
      count: sql<number>`count(*)`,
    })
    .from(approvalItems)
    .where(eq(approvalItems.customerId, customerId))
    .groupBy(approvalItems.status);

  const byAgent = await db
    .select({
      agentType: approvalItems.agentType,
      pending: sql<number>`count(*) filter (where status = 'pending')`,
      approved: sql<number>`count(*) filter (where status = 'approved')`,
      rejected: sql<number>`count(*) filter (where status = 'rejected')`,
    })
    .from(approvalItems)
    .where(eq(approvalItems.customerId, customerId))
    .groupBy(approvalItems.agentType);

  return {
    total: stats.reduce((sum, s) => sum + s.count, 0),
    byStatus: Object.fromEntries(stats.map(s => [s.status, s.count])),
    byAgent,
  };
}
```

**API Routes:**

```typescript
// routes.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import * as service from './service';
import { requireTenant, getTenantContext } from '@/shared/middleware/tenant-guard';
import { authorize } from '@/modules/auth/middleware';
import { PERMISSIONS } from '@/modules/auth/rbac';

export const approvalRoutes = new Hono()
  .use('*', requireTenant())

  // List approval items
  .get('/', authorize(PERMISSIONS.APPROVALS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const { status, agentType, priority, page, limit } = c.req.query();

    const result = await service.listApprovalItems(customerId, {
      status,
      agentType,
      priority,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });

    return c.json({ success: true, data: result.items, pagination: result.pagination });
  })

  // Get approval stats
  .get('/stats', authorize(PERMISSIONS.APPROVALS_READ), async (c) => {
    const { customerId } = getTenantContext(c);
    const stats = await service.getApprovalStats(customerId);
    return c.json({ success: true, data: stats });
  })

  // Approve single item
  .post('/:id/approve',
    authorize(PERMISSIONS.APPROVALS_WRITE),
    zValidator('json', z.object({ editedContent: z.unknown().optional() })),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { id } = c.req.param();
      const { editedContent } = c.req.valid('json');

      await service.approveItem(customerId, id, userId, editedContent);
      return c.json({ success: true });
    }
  )

  // Reject single item
  .post('/:id/reject',
    authorize(PERMISSIONS.APPROVALS_WRITE),
    zValidator('json', z.object({ reason: z.string().optional() })),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { id } = c.req.param();
      const { reason } = c.req.valid('json');

      await service.rejectItem(customerId, id, userId, reason);
      return c.json({ success: true });
    }
  )

  // Bulk approve
  .post('/bulk/approve',
    authorize(PERMISSIONS.APPROVALS_WRITE),
    zValidator('json', z.object({ itemIds: z.array(z.string()).min(1).max(100) })),
    async (c) => {
      const { customerId, userId } = getTenantContext(c);
      const { itemIds } = c.req.valid('json');

      const result = await service.bulkApprove(customerId, itemIds, userId);
      return c.json({ success: true, data: result });
    }
  );
```

---

### Task 6: Agent Console Frontend

**Priority:** Critical
**Files to Create:**

```
frontend/src/app/(app)/agents/
├── page.tsx              # Agent list view
├── [type]/
│   ├── page.tsx          # Agent detail/config
│   └── runs/
│       └── page.tsx      # Run history
├── layout.tsx            # Agents layout
└── components/
    ├── AgentCard.tsx     # Agent summary card
    ├── AgentConfigForm.tsx
    ├── RunHistoryTable.tsx
    └── AgentStatusBadge.tsx
```

**Agent List Page:**

```tsx
// page.tsx
import { Suspense } from 'react';
import { getAgentConfigs, getAgentStats } from '@/lib/api/agents';
import { AgentCard } from './components/AgentCard';
import { Button } from '@/components/ui/Button';

const AGENT_TYPES = [
  {
    type: 'lead_source',
    name: 'Lead Source Agent',
    description: 'Find companies matching your ICP from Apollo.io',
    icon: 'Search',
    category: 'Prospecting',
  },
  {
    type: 'enrichment',
    name: 'Enrichment Agent',
    description: 'Add firmographic data and intent signals to accounts',
    icon: 'Database',
    category: 'Prospecting',
  },
  {
    type: 'contact_finder',
    name: 'Contact Finder Agent',
    description: 'Find decision-makers at target accounts',
    icon: 'Users',
    category: 'Prospecting',
  },
  {
    type: 'scoring',
    name: 'Scoring Agent',
    description: 'Prioritize leads based on fit and intent signals',
    icon: 'TrendingUp',
    category: 'Prospecting',
  },
  {
    type: 'email_drafter',
    name: 'Email Drafter Agent',
    description: 'Draft personalized cold emails for review',
    icon: 'Mail',
    category: 'Outreach',
  },
];

export default async function AgentsPage() {
  const [configs, stats] = await Promise.all([
    getAgentConfigs(),
    getAgentStats(),
  ]);

  const configsByType = new Map(configs.map(c => [c.agentType, c]));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">AI Agents</h1>
          <p className="text-gray-500 mt-1">
            Configure and monitor your autonomous sales agents
          </p>
        </div>
        <Button href="/approvals" variant="outline">
          View Approval Queue ({stats.pendingApprovals})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_TYPES.map(agent => (
          <AgentCard
            key={agent.type}
            agent={agent}
            config={configsByType.get(agent.type)}
            stats={stats.byAgent[agent.type]}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### Task 7: Approval Queue Frontend

**Priority:** Critical
**Files to Create:**

```
frontend/src/app/(app)/approvals/
├── page.tsx              # Queue list view
├── [id]/
│   └── page.tsx          # Single item review
├── layout.tsx
└── components/
    ├── ApprovalCard.tsx
    ├── ApprovalFilters.tsx
    ├── BulkActions.tsx
    ├── EmailPreview.tsx
    └── ApprovalActions.tsx
```

**Approval Queue Page:**

```tsx
// page.tsx
'use client';

import { useState } from 'react';
import { useApprovalItems, useApprovalStats } from '@/hooks/useApprovals';
import { ApprovalCard } from './components/ApprovalCard';
import { ApprovalFilters } from './components/ApprovalFilters';
import { BulkActions } from './components/BulkActions';
import { Badge } from '@/components/ui/Badge';

export default function ApprovalsPage() {
  const [filters, setFilters] = useState({ status: 'pending' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: items, isLoading, mutate } = useApprovalItems(filters);
  const { data: stats } = useApprovalStats();

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds(prev =>
      selected ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === items?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(items?.map(i => i.id) || []);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Approval Queue</h1>
          <p className="text-gray-500 mt-1">
            Review and approve agent-generated content
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="warning">{stats?.byStatus.pending || 0} pending</Badge>
          <Badge variant="success">{stats?.byStatus.approved || 0} approved today</Badge>
        </div>
      </div>

      <ApprovalFilters filters={filters} onChange={setFilters} />

      {selectedIds.length > 0 && (
        <BulkActions
          selectedIds={selectedIds}
          onComplete={() => {
            setSelectedIds([]);
            mutate();
          }}
        />
      )}

      <div className="space-y-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : items?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No items in the approval queue
          </div>
        ) : (
          items?.map(item => (
            <ApprovalCard
              key={item.id}
              item={item}
              selected={selectedIds.includes(item.id)}
              onSelect={(selected) => handleSelect(item.id, selected)}
              onAction={() => mutate()}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

---

### Task 8: Configuration & Environment Variables

**Priority:** High
**Files to Modify:**

```
backend/src/shared/config/index.ts     # Add new config options
backend/.env.example                    # Update example
```

**New Configuration:**

```typescript
// Add to config schema
const configSchema = z.object({
  // ... existing config

  // OpenAI
  openai: z.object({
    apiKey: z.string().optional(),
    defaultModel: z.string().default('gpt-4-turbo-preview'),
    maxTokens: z.number().default(1000),
    temperature: z.number().default(0.7),
  }).optional(),

  // Apollo.io
  apollo: z.object({
    apiKey: z.string().optional(),
    rateLimit: z.number().default(100), // requests per minute
  }).optional(),

  // Agent settings
  agents: z.object({
    enabled: z.boolean().default(true),
    maxConcurrentRuns: z.number().default(5),
    defaultApprovalExpiry: z.number().default(72), // hours
    schedulerEnabled: z.boolean().default(true),
  }).default({}),
});
```

---

### Task 9: Add New Permissions

**Priority:** High
**Files to Modify:**

```
backend/src/modules/auth/rbac.ts
```

**New Permissions:**

```typescript
export const PERMISSIONS = {
  // ... existing permissions

  // Agents
  AGENTS_READ: 'agents:read',
  AGENTS_WRITE: 'agents:write',
  AGENTS_EXECUTE: 'agents:execute',
  AGENTS_DELETE: 'agents:delete',

  // Approvals
  APPROVALS_READ: 'approvals:read',
  APPROVALS_WRITE: 'approvals:write',

  // Integrations
  INTEGRATIONS_READ: 'integrations:read',
  INTEGRATIONS_WRITE: 'integrations:write',
};

// Role mappings
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: [
    // All permissions
  ],
  MANAGER: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.AGENTS_WRITE,
    PERMISSIONS.AGENTS_EXECUTE,
    PERMISSIONS.APPROVALS_READ,
    PERMISSIONS.APPROVALS_WRITE,
    PERMISSIONS.INTEGRATIONS_READ,
    // ...
  ],
  SALES_REP: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.APPROVALS_READ,
    PERMISSIONS.APPROVALS_WRITE, // Can approve their own items
    // ...
  ],
  VIEWER: [
    PERMISSIONS.AGENTS_READ,
    PERMISSIONS.APPROVALS_READ,
    // ...
  ],
};
```

---

### Task 10: Update Navigation

**Priority:** Medium
**Files to Modify:**

```
frontend/src/components/dashboard/Sidebar.tsx
```

**Add Navigation Items:**

```tsx
const navItems = [
  // ... existing items
  { divider: true, label: 'Automation' },
  {
    href: '/agents',
    label: 'AI Agents',
    icon: Bot,
    badge: agentStats?.running > 0 ? agentStats.running : undefined,
  },
  {
    href: '/approvals',
    label: 'Approval Queue',
    icon: CheckSquare,
    badge: approvalStats?.pending > 0 ? approvalStats.pending : undefined,
    badgeVariant: 'warning',
  },
];
```

---

## Implementation Order

### Week 1: Foundation

| Day | Tasks |
|-----|-------|
| 1-2 | Task 1: Database schemas + migrations |
| 3-4 | Task 2: OpenAI integration |
| 5 | Task 3: Apollo.io integration |

### Week 2: Backend Core

| Day | Tasks |
|-----|-------|
| 1-2 | Task 4: Agent orchestration framework |
| 3-4 | Task 5: Approval queue system |
| 5 | Task 8: Configuration + Task 9: Permissions |

### Week 3: Frontend

| Day | Tasks |
|-----|-------|
| 1-2 | Task 6: Agent Console UI |
| 3-4 | Task 7: Approval Queue UI |
| 5 | Task 10: Navigation + integration testing |

---

## Testing Plan

### Unit Tests

- [ ] OpenAI client wrapper
- [ ] Apollo.io client wrapper
- [ ] Agent orchestrator
- [ ] Approval queue service
- [ ] Agent config validation

### Integration Tests

- [ ] Agent execution flow (mock providers)
- [ ] Approval workflow (approve/reject/edit)
- [ ] Event publishing on agent actions

### E2E Tests

- [ ] Agent Console navigation
- [ ] Agent configuration
- [ ] Approval queue interaction
- [ ] Bulk approval actions

---

## Success Criteria

1. **OpenAI integration working** - Can generate email drafts via API
2. **Apollo.io integration working** - Can search and enrich companies
3. **Agent orchestrator running** - Can execute agents manually
4. **Approval queue functional** - Items appear, can approve/reject
5. **UI complete** - Agent Console and Approval Queue accessible
6. **Events flowing** - Agent actions produce events

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API rate limits | High | Implement queue-based throttling |
| API cost overruns | Medium | Add usage tracking and alerts |
| Slow agent execution | Medium | Async execution with progress tracking |
| Approval queue backlog | Low | Auto-expire old items, priority sorting |

---

## Dependencies

### External

- OpenAI API key
- Apollo.io API key
- Existing Kafka infrastructure

### Internal

- Completed Phase 1 (CRM, Events, Intent modules)
- Working authentication and RBAC

---

## Notes

- All agents use the existing branded type system for IDs
- Events follow established outbox pattern
- Multi-tenancy enforced throughout
- API responses use standard envelope format
