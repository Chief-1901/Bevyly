# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bevyly is an intent-driven sales operating system built on the philosophy "Meaning over Data." Instead of dashboard-first design, it surfaces contextual next-best-actions that guide users toward outcomes. The app answers "What should I do next?" before "What are the numbers?"

## Current Status (Updated: January 22, 2026)

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | ✅ Complete | 100% |
| Phase 1.5: Frontend Enhancements | 🔄 In Progress | 60% |
| Phase 2: Agent Infrastructure | ⏳ Not Started | 0% |

### Recently Completed (January 21-22, 2026)
- ✅ Contacts detail page with tabs
- ✅ Opportunities Kanban board with drag-and-drop
- ✅ Accounts detail enhancements (health score, edit modal, custom fields)
- ✅ TypeScript build fixes
- ✅ Playwright E2E tests
- ✅ SalesOS → Bevyly rebranding (85%)
- ✅ **Settings Module Complete** (January 22, 2026)
  - Profile page (user info, avatar, password change)
  - Team page (member management, roles, invites)
  - Integrations page (OAuth/API key connections)
  - Notifications page (preference toggles)
  - Appearance page (theme, density, formats)

### Next Priority Tasks
1. Briefing page enhancements (agent activity feed, pipeline snapshot)
2. Email compose UI
3. Calendar grid view
4. Sequences visual builder
5. Agent Console (Phase 2)

See `docs/FRONTEND-IMPLEMENTATION-PLAN.md` for detailed implementation guide.

## Development Commands

### Backend (Node.js + Express)

```bash
cd backend

# Development
npm run dev:services      # Run gateway + all 6 services (most common)
npm run dev:all           # Run everything including Kafka workers
npm run dev               # Run monolith mode (single server)

# Individual services (for debugging)
npm run dev:gateway       # Port 3000 - API Gateway
npm run dev:auth          # Port 3001 - Authentication
npm run dev:crm           # Port 3002 - CRM (accounts, contacts, opportunities)
npm run dev:email         # Port 3003 - Email service
npm run dev:calendar      # Port 3004 - Calendar/meetings
npm run dev:sequences     # Port 3005 - Email sequences
npm run dev:activities    # Port 3006 - Activity tracking

# Database
npm run db:migrate        # Apply migrations
npm run db:seed           # Seed test data
npm run db:studio         # Open Drizzle Studio UI

# Quality
npm run lint              # ESLint
npm run test              # Vitest
npm run test:coverage     # Coverage report
```

### Frontend (Next.js 15)

```bash
cd frontend

npm run dev               # Dev server on port 3010
npm run build             # Production build
npm run lint              # ESLint via Next.js
npm run test              # Playwright E2E tests
npm run test:ui           # Playwright UI mode
```

### Ports

| Service | Port |
|---------|------|
| Frontend | 3010 |
| Gateway | 3000 (or 3020 in monolith) |
| Auth | 3001 |
| CRM | 3002 |
| Email | 3003 |
| Calendar | 3004 |
| Sequences | 3005 |
| Activities | 3006 |

## Architecture

### Dual-Layer UI Model

```
┌──────────────────────────────────────────────────────┐
│           GENERATIVE UI LAYER (Intent)               │
│  /briefing - Action Cards, Signals, Recommendations  │
│  "What do I need to know? What's my next step?"      │
└────────────────────────┬─────────────────────────────┘
                         │ CTAs route to data
                         ▼
┌──────────────────────────────────────────────────────┐
│        DETERMINISTIC UI LAYER (Data Truth)           │
│  /leads, /opportunities, /accounts, /contacts        │
│  Tables, detail pages, forms, filters                │
└──────────────────────────────────────────────────────┘
```

### Backend: Modular Monolith

The backend can run as a monolith (`npm run dev`) or as independent microservices (`npm run dev:services`).

```
backend/src/
├── gateway/              # API Gateway - auth, routing, rate limiting
├── modules/
│   ├── auth/            # JWT auth, API keys, RBAC
│   ├── crm/             # Accounts, Contacts, Opportunities
│   ├── leads/           # Lead management with convert/reject
│   ├── intent/          # Signals, Recommendations, Briefing
│   ├── events/          # Kafka event publishing and handlers
│   ├── email/           # Email service
│   ├── calendar/        # Meetings
│   ├── sequences/       # Email sequences
│   └── activities/      # Activity timeline
├── shared/
│   ├── db/schema/       # Drizzle ORM schemas
│   ├── types/           # Branded types for IDs
│   └── middleware/      # Auth, tenant, error handling
└── workers/             # Kafka publisher/consumer
```

### Frontend: Next.js App Router

```
frontend/src/
├── app/
│   ├── (auth)/          # Login, signup (public)
│   ├── (app)/           # Protected routes
│   │   ├── briefing/    # PRIMARY ENTRY - intent-driven dashboard
│   │   ├── leads/       # Lead management
│   │   ├── opportunities/
│   │   ├── accounts/
│   │   └── contacts/
│   └── api/intent/      # Generative UI endpoints
├── components/
│   ├── intent/          # Action Card registry
│   └── ui/              # Design system components
└── lib/api/server.ts    # Server-side authenticated API client
```

## Key Patterns

### Branded Types for IDs

All entity IDs use branded types for compile-time safety (see `backend/src/shared/types/index.ts`):

```typescript
type CustomerId = Brand<string, 'CustomerId'>;   // cus_*
type UserId = Brand<string, 'UserId'>;           // usr_*
type AccountId = Brand<string, 'AccountId'>;     // acc_*
type LeadId = Brand<string, 'LeadId'>;           // lead_*
type SignalId = Brand<string, 'SignalId'>;       // sig_*
```

Use the corresponding generator functions: `generateCustomerId()`, `generateLeadId()`, etc.

### Multi-Tenancy

Every authenticated request carries tenant context extracted from JWT:

```typescript
interface TenantContext {
  customerId: CustomerId;
  userId: UserId;
  userEmail: string;
  roles: string[];
}
```

**All database queries must filter by `customerId`** for tenant isolation.

### RBAC

Roles: `ADMIN`, `MANAGER`, `SALES_REP`, `VIEWER`

Authorization on routes:
```typescript
router.post('/endpoint', authorize(PERMISSIONS.LEADS_WRITE), handler);
```

Permissions defined in `backend/src/modules/auth/rbac.ts`.

### Event-Driven Processing

Events flow through Kafka with handlers for cross-cutting concerns:

```
Action → Kafka Topic → Handlers (activity logging, engagement scoring, intent signals)
```

Topics: `account.*`, `contact.*`, `opportunity.*`, `lead.*`, `email.*`, `meeting.*`

Idempotency tracked via `processed_events` table.

### API Response Envelope

All responses use standard envelope:

```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100 },
  "meta": { "requestId": "req_...", "timestamp": "..." }
}
```

### Validation

All input validated with Zod schemas before processing.

## File Naming Conventions

- Routes: `*.routes.ts` or `routes.ts`
- Services: `*.service.ts` or `service.ts`
- Event handlers: `*.handler.ts`
- Database schemas: `backend/src/shared/db/schema/*.ts`

## Intent System (Key Feature)

The intent module (`backend/src/modules/intent/`) powers the briefing page:

- **Signals**: Detected patterns (e.g., "Deal stalled 30 days")
- **Recommendations**: Actionable next steps with rationale
- **Action Cards**: Frontend components registered in `frontend/src/components/intent/`

## Tech Stack

**Backend**: Node.js 20+, Express, PostgreSQL + Drizzle ORM, Kafka, Redis, Zod, Pino logging

**Frontend**: Next.js 15, React 19, Tailwind CSS, Vercel AI SDK, Playwright

## API Versioning

All endpoints use `/api/v1/` prefix. Key routes:
- `/api/v1/auth/*` - Authentication
- `/api/v1/leads/*` - Lead management
- `/api/v1/intent/*` - Briefing, signals, recommendations
- `/api/v1/accounts/*`, `/api/v1/contacts/*`, `/api/v1/opportunities/*` - CRM

## Database & Environment

### Supabase Connection
The project uses Supabase PostgreSQL. Due to SSL certificate chain issues, migrations require:

```bash
# Run migrations with TLS workaround
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run db:migrate
```

### Environment Variables
Backend `.env` must include:
```
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
JWT_SECRET=<min 32 chars>
ENCRYPTION_KEY=<min 32 chars>
```

### Starting Development
```bash
# Backend (run with TLS workaround for Supabase)
cd backend
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dev:services

# Frontend (separate terminal)
cd frontend
npm run dev
```

## Key Documentation Files

| File | Purpose |
|------|---------|
| `docs/FRONTEND-IMPLEMENTATION-PLAN.md` | Detailed frontend task breakdown |
| `docs/IMPLEMENTATION-STATUS.md` | Overall project progress |
| `docs/PHASE1-AUDIT-REPORT.md` | Code quality audit results |
| `docs/ARCHITECTURE.md` | System architecture overview |
| `docs/API.md` | API endpoint documentation |
| `docs/AGENTS.md` | AI agent specifications |

## MCP Servers

The project uses these MCP servers (configured in `.mcp.json`):
- **GitHub**: Repository operations via `@modelcontextprotocol/server-github`
- **Context7**: Documentation lookup via `@upstash/context7-mcp`
- **Supabase**: Database operations via Supabase MCP (HTTP endpoint)

## Git Workflow

- `main` - Production-ready code
- `develop` - Integration branch for features
- `production` - Deployed production code
- Feature branches: `claude/*` or `feature/*`

Always work on `develop` branch for new features, then merge to `main` when ready.
