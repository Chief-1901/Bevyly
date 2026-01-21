# Bevyly - Technical Architecture

> System architecture and technology stack

---

## Architecture Overview

Bevyly uses a **modular monolith** architecture with event-driven communication. This provides the simplicity of a monolith for development while enabling future decomposition into microservices if needed.

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js 14)                       │
│   /briefing, /leads, /accounts, /contacts, /opportunities, etc.     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │ HTTP/REST
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Hono)                           │
│   Authentication │ Rate Limiting │ Tenant Context │ Request Routing  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CRM Service   │    │  Intent Service │    │  Agent Service  │
│  accounts,      │    │  signals,       │    │  orchestration, │
│  contacts,      │    │  patterns,      │    │  execution,     │
│  opportunities  │    │  recommendations│    │  approvals      │
└────────┬────────┘    └────────┬────────┘    └────────┬────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT BUS (Kafka)                            │
│   Domain Events │ Integration Events │ Agent Commands                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Redis Cache   │    │  External APIs  │
│   (Supabase)    │    │   (Sessions,    │    │  OpenAI, Apollo │
│                 │    │    Rate Limits) │    │  Bland.ai, etc  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component primitives |
| Recharts | Data visualization |
| React Query | Server state management |
| Zod | Schema validation |

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js 20 | Runtime |
| TypeScript | Type safety |
| Hono | Web framework (fast, lightweight) |
| Drizzle ORM | Type-safe database access |
| Zod | Schema validation |
| jose | JWT handling |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database (via Supabase) |
| Redis | Caching, sessions, rate limiting |
| Kafka | Event streaming (Redpanda) |
| Vercel | Frontend hosting (planned) |
| Railway/Render | Backend hosting (planned) |

### External Services

| Service | Purpose |
|---------|---------|
| OpenAI | AI model for agents |
| Apollo.io | Lead data + enrichment |
| Bland.ai | AI voice calls |
| Stripe | Billing + subscriptions |
| Gmail API | Email integration |
| Microsoft Graph | Outlook integration |
| Google Calendar | Calendar sync |

---

## Backend Architecture

### Directory Structure

```
backend/src/
├── gateway/                 # API Gateway
│   ├── index.ts            # Gateway server entry
│   ├── middleware/
│   │   ├── auth.ts         # JWT + API key auth
│   │   ├── tenant.ts       # Multi-tenant context
│   │   └── rateLimit.ts    # Rate limiting
│   └── routes.ts           # Route aggregation
├── modules/                 # Feature modules
│   ├── auth/               # Authentication
│   │   ├── routes.ts
│   │   ├── service.ts
│   │   └── rbac.ts         # Role-based access
│   ├── crm/                # CRM entities
│   │   ├── accounts/
│   │   ├── contacts/
│   │   └── opportunities/
│   ├── leads/              # Lead management
│   │   ├── routes.ts
│   │   └── service.ts
│   ├── intent/             # Intent-driven features
│   │   ├── routes.ts
│   │   ├── signals.service.ts
│   │   └── recommendations.service.ts
│   ├── agents/             # Agent orchestration (planned)
│   │   ├── orchestrator/
│   │   ├── lead-source/
│   │   ├── enrichment/
│   │   ├── email/
│   │   └── voice/
│   ├── approvals/          # Approval queue (planned)
│   ├── events/             # Event handling
│   │   ├── kafka-consumer.ts
│   │   ├── kafka-producer.ts
│   │   └── handlers/
│   └── billing/            # Stripe integration (planned)
├── services/               # Business services
│   └── crm/
│       └── index.ts        # Service composition
├── shared/                 # Shared utilities
│   ├── db/
│   │   ├── client.ts       # Database connection
│   │   ├── schema/         # Drizzle schemas
│   │   └── seed.ts         # Seed data
│   ├── types/
│   │   └── index.ts        # Branded types
│   └── utils/
│       └── id.ts           # ID generation
└── server.ts               # Main entry point
```

### Module Pattern

Each module follows a consistent structure:

```typescript
// routes.ts - API endpoints
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { service } from './service';

export const routes = new Hono()
  .get('/', async (c) => {
    const items = await service.list(c.get('tenantId'));
    return c.json(items);
  })
  .post('/', zValidator('json', createSchema), async (c) => {
    const data = c.req.valid('json');
    const item = await service.create(c.get('tenantId'), data);
    return c.json(item, 201);
  });

// service.ts - Business logic
export const service = {
  async list(tenantId: string) {
    return db.select().from(table).where(eq(table.customerId, tenantId));
  },
  async create(tenantId: string, data: CreateInput) {
    // Business logic, validation, events
  },
};
```

---

## Database Schema

### Core Tables

```sql
-- Multi-tenant organization
CREATE TABLE customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users within organizations
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM: Accounts (companies)
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255),
  industry VARCHAR(100),
  employee_count INTEGER,
  -- ... additional fields
);

-- CRM: Contacts (people)
CREATE TABLE contacts (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  account_id VARCHAR(36) REFERENCES accounts(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  -- ... additional fields
);

-- CRM: Opportunities (deals)
CREATE TABLE opportunities (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  account_id VARCHAR(36) REFERENCES accounts(id),
  name VARCHAR(255) NOT NULL,
  stage VARCHAR(50),
  value BIGINT,
  -- ... additional fields
);

-- Leads (pre-conversion)
CREATE TABLE leads (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  company_name VARCHAR(255),
  contact_email VARCHAR(255),
  status VARCHAR(50) DEFAULT 'new',
  fit_score INTEGER,
  intent_score INTEGER,
  -- ... additional fields
);
```

### Intent Tables

```sql
-- Detected signals
CREATE TABLE signals (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  entity_type VARCHAR(50),
  entity_id VARCHAR(36),
  signal_type VARCHAR(50),
  severity VARCHAR(20),
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clustered patterns
CREATE TABLE patterns (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  pattern_type VARCHAR(50),
  signal_ids VARCHAR(36)[],
  confidence REAL,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Action recommendations
CREATE TABLE recommendations (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  pattern_id VARCHAR(36) REFERENCES patterns(id),
  action_type VARCHAR(50),
  priority VARCHAR(20),
  title VARCHAR(255),
  rationale TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Agent Tables (Planned)

```sql
-- Agent configurations
CREATE TABLE agent_configs (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  agent_type VARCHAR(50),
  enabled BOOLEAN DEFAULT true,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent run history
CREATE TABLE agent_runs (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  agent_type VARCHAR(50),
  status VARCHAR(20),
  input JSONB,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Approval queue
CREATE TABLE approval_items (
  id VARCHAR(36) PRIMARY KEY,
  customer_id VARCHAR(36) REFERENCES customers(id),
  agent_run_id VARCHAR(36) REFERENCES agent_runs(id),
  item_type VARCHAR(50),
  content JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by VARCHAR(36) REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Event-Driven Architecture

### Event Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│  Action  │────▶│  Outbox  │────▶│  Kafka   │
│  (API)   │     │  Table   │     │  Topic   │
└──────────┘     └──────────┘     └────┬─────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
     ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
     │   Signal     │          │   Agent      │          │  Analytics   │
     │   Detector   │          │   Trigger    │          │   Handler    │
     └──────────────┘          └──────────────┘          └──────────────┘
```

### Event Types

**Domain Events:**
- `account.created`, `account.updated`
- `contact.created`, `contact.updated`
- `opportunity.created`, `opportunity.stage_changed`
- `lead.created`, `lead.converted`
- `email.sent`, `email.opened`, `email.clicked`
- `meeting.scheduled`, `meeting.completed`

**Integration Events:**
- `enrichment.completed`
- `voice_call.completed`
- `calendar.synced`

**Agent Commands:**
- `agent.source_leads`
- `agent.enrich_account`
- `agent.draft_email`
- `agent.make_call`

### Outbox Pattern

Events are first written to an outbox table, then published to Kafka:

```typescript
// Within a transaction
await db.transaction(async (tx) => {
  // 1. Perform the action
  const account = await tx.insert(accounts).values(data).returning();

  // 2. Write to outbox
  await tx.insert(outbox).values({
    eventType: 'account.created',
    payload: account,
  });
});

// Separate process publishes from outbox to Kafka
```

---

## Multi-Tenancy

### Isolation Strategy

Bevyly uses **row-level multi-tenancy** with a shared database:

1. Every table has a `customer_id` column
2. Every query includes `WHERE customer_id = ?`
3. Tenant context is set at the gateway level
4. Row-level security (RLS) as defense-in-depth

### Tenant Context Flow

```
Request → Gateway → Extract tenant from JWT → Set context → Module → Query with tenant filter
```

```typescript
// Gateway middleware
app.use(async (c, next) => {
  const token = c.req.header('Authorization');
  const { customerId, userId } = verifyToken(token);
  c.set('tenantId', customerId);
  c.set('userId', userId);
  await next();
});

// Module query
const accounts = await db
  .select()
  .from(accountsTable)
  .where(eq(accountsTable.customerId, c.get('tenantId')));
```

---

## Authentication & Authorization

### Authentication Methods

1. **JWT Tokens** - For web application
2. **API Keys** - For programmatic access

### JWT Structure

```typescript
interface JWTPayload {
  sub: string;        // User ID
  cid: string;        // Customer ID
  email: string;
  role: string;
  permissions: string[];
  exp: number;
  iat: number;
}
```

### Role-Based Access Control (RBAC)

**Default Roles:**
| Role | Description |
|------|-------------|
| `owner` | Full access, billing |
| `admin` | Full access, no billing |
| `member` | Standard access |
| `viewer` | Read-only |

**Permission Structure:**
```typescript
const permissions = {
  'accounts:read': ['owner', 'admin', 'member', 'viewer'],
  'accounts:write': ['owner', 'admin', 'member'],
  'accounts:delete': ['owner', 'admin'],
  'settings:billing': ['owner'],
  // ... etc
};
```

---

## Frontend Architecture

### App Router Structure

```
frontend/src/app/
├── (app)/                   # Authenticated routes
│   ├── layout.tsx          # Dashboard shell
│   ├── briefing/           # Primary entry
│   ├── leads/
│   ├── accounts/
│   ├── contacts/
│   ├── opportunities/
│   ├── emails/
│   ├── calendar/
│   ├── sequences/
│   ├── activities/
│   ├── analytics/          # Planned
│   ├── agents/             # Planned
│   ├── approvals/          # Planned
│   └── settings/
├── (auth)/                  # Public auth routes
│   ├── login/
│   └── signup/
├── api/                     # API routes (BFF)
│   └── intent/
└── layout.tsx               # Root layout
```

### Component Organization

```
frontend/src/components/
├── ui/                      # Design system primitives
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Table.tsx
│   ├── Menu.tsx
│   └── index.ts
├── dashboard/               # Dashboard-specific
│   ├── DashboardShell.tsx
│   ├── Header.tsx
│   ├── Sidebar.tsx
│   └── UserDropdown.tsx
├── intent/                  # Action cards
│   ├── CardRegistry.tsx
│   ├── ActionCard.tsx
│   ├── LeadsReadyCard.tsx
│   ├── DealStalledCard.tsx
│   └── ...
└── charts/                  # Recharts wrappers (planned)
    ├── PipelineFunnel.tsx
    ├── ConversionChart.tsx
    └── ActivityHeatmap.tsx
```

### API Client

```typescript
// frontend/src/lib/api/server.ts
const api = {
  accounts: {
    list: () => fetch('/api/v1/accounts'),
    get: (id) => fetch(`/api/v1/accounts/${id}`),
    create: (data) => fetch('/api/v1/accounts', { method: 'POST', body: data }),
    // ...
  },
  leads: {
    list: () => fetch('/api/v1/leads'),
    convert: (id) => fetch(`/api/v1/leads/${id}/convert`, { method: 'POST' }),
    // ...
  },
  intent: {
    getBriefing: () => fetch('/api/v1/intent/briefing'),
    refresh: () => fetch('/api/v1/intent/briefing/refresh', { method: 'POST' }),
    // ...
  },
};
```

---

## Security Considerations

### Input Validation
- All inputs validated with Zod schemas
- SQL injection prevented by parameterized queries (Drizzle)
- XSS prevented by React's default escaping

### Authentication
- Passwords hashed with bcrypt
- JWTs signed with strong keys
- Tokens expire in 24 hours
- Refresh token rotation

### Data Protection
- TLS for all connections
- Sensitive data encrypted at rest
- PII handling per GDPR requirements

### Rate Limiting
- Per-IP and per-user limits
- Sliding window algorithm
- Graceful degradation

---

## Deployment Architecture (Planned)

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Cloudflare                                │
│   WAF │ DDoS Protection │ CDN │ DNS                                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Vercel       │    │  Railway/Render │    │   Redpanda      │
│  (Frontend)     │    │   (Backend)     │    │   (Kafka)       │
└─────────────────┘    └────────┬────────┘    └─────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │ Supabase │ │  Upstash │ │ External │
             │ (Postgres)│ │ (Redis)  │ │  APIs    │
             └──────────┘ └──────────┘ └──────────┘
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_DIRECT_URL=postgresql://...

# Authentication
JWT_SECRET=...
JWT_EXPIRES_IN=86400

# Kafka
KAFKA_BROKERS=...
KAFKA_USERNAME=...
KAFKA_PASSWORD=...

# External Services
OPENAI_API_KEY=...
APOLLO_API_KEY=...
BLAND_API_KEY=...
STRIPE_SECRET_KEY=...

# Email
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
```

---

## Performance Considerations

### Database
- Indexes on frequently queried columns
- Connection pooling via Supabase
- Query optimization with Drizzle

### Caching
- Redis for session data
- Redis for rate limit counters
- React Query for client-side caching

### Event Processing
- Kafka partitioning by tenant
- Consumer groups for scaling
- Dead letter queues for failures

### Frontend
- Next.js ISR where applicable
- Image optimization
- Code splitting by route
