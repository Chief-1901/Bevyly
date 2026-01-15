# SalesOS: Project Status Bible

**Version:** 1.2  
**Created:** January 4, 2026  
**Last Updated:** January 6, 2026  
**Status:** Active Development - All Core Services Extracted

---

## Purpose

This document is the **single source of truth** for tracking the current state of the SalesOS project. It is updated continuously as the project evolves and includes:

- Current architecture snapshot
- Milestone tracking
- Decision log (ADRs-lite)
- Change log
- Runbooks
- Security posture

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Milestone Tracker](#milestone-tracker)
3. [Decision Log](#decision-log)
4. [Change Log](#change-log)
5. [Runbooks](#runbooks)
6. [Security Posture](#security-posture)

---

## Current Architecture

### System Overview (Microservices Mode)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (Next.js 15)                       │
│                          Port: 3010                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ BFF Auth Pattern: /api/auth/* routes proxy to backend          │ │
│  │ HttpOnly cookies for JWT tokens                                 │ │
│  │ Middleware-based route protection                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY (Express)                        │
│                          Port: 3000                                  │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ - JWT/API Key authentication                                    │ │
│  │ - Rate limiting                                                 │ │
│  │ - Request ID generation                                         │ │
│  │ - Tenant context extraction                                     │ │
│  │ - Path rewriting (/api/v1/accounts → /accounts)                 │ │
│  │ - Proxying to downstream services                               │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┬───────────────┬───────────────┐
    ▼               ▼               ▼               ▼               ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│  Auth   │  │   CRM   │  │  Email  │  │Calendar │  │Sequences│  │Activities│
│  :3001  │  │  :3002  │  │  :3003  │  │  :3004  │  │  :3005  │  │  :3006  │
└─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘
                    │                              │
                    └──────────────┬───────────────┘
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY                                  │
│                         Port: 3000                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ - Rate limiting (100 req/min per customer)                      │ │
│  │ - JWT verification                                              │ │
│  │ - Request ID generation                                         │ │
│  │ - CORS handling                                                 │ │
│  │ - Tenant context propagation                                    │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
    ┌───────────────┼───────────────┬───────────────┬───────────────┐
    ▼               ▼               ▼               ▼               ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│Auth:3001 │  │CRM:3002  │  │Email:3003│  │Cal:3004  │  │Seq:3005  │  │Act:3006  │
│- Login   │  │- Accounts│  │- Send    │  │- Meetings│  │- Sequences│  │- Timeline│
│- Signup  │  │- Contacts│  │- Track   │  │- Schedule│  │- Enroll  │  │- Notes   │
│- Refresh │  │- Opps    │  │- Gmail   │  │- Avail   │  │- Steps   │  │- Calls   │
│- API Keys│  │- Pipeline│  │- Outlook │  │          │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    ▼
                          ┌─────────────────────┐
                          │ TRANSACTIONAL OUTBOX│
                          │ (Postgres Table)    │
                          └─────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
                  ┌──────────────┐    ┌──────────────┐
                  │Kafka Publisher│   │Kafka Consumer│
                  │   Worker      │   │   Worker     │
                  └──────────────┘    └──────────────┘
                          │                   │
                          └─────────┬─────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EVENT BUS (Redpanda/Kafka)                   │
│                         Port: 9092                                   │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │ Topics:                                                          │ │
│  │ - account.created, account.updated, account.deleted             │ │
│  │ - contact.created, contact.updated, contact.deleted             │ │
│  │ - email.sent, email.opened, email.clicked, email.replied        │ │
│  │ - meeting.proposed, meeting.confirmed, meeting.completed        │ │
│  │ - engagement.score_updated, engagement.intent_signal_detected   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
         │  PostgreSQL  │  │    Redis     │  │   S3/Minio   │
         │  Port: 5432  │  │  Port: 6379  │  │  (future)    │
         │              │  │              │  │              │
         │ - All tables │  │ - Sessions   │  │ - Attachments│
         │ - Audit logs │  │ - Rate limits│  │ - Templates  │
         │ - Outbox     │  │ - Cache      │  │              │
         └──────────────┘  └──────────────┘  └──────────────┘
```

### Technology Stack

| Layer | Technology | Version | Notes |
|-------|------------|---------|-------|
| **Frontend** | Next.js | 15.1.0 | App Router, React 19 |
| **Frontend UI** | Tailwind CSS | 3.4.16 | Custom theme tokens |
| **Backend Runtime** | Node.js | 20+ | ESM modules |
| **Backend Framework** | Express.js | 4.21.0 | With middleware stack |
| **Database** | PostgreSQL (Supabase) | 16 | Cloud-hosted, DB-only mode |
| **ORM** | Drizzle ORM | 0.35.0 | Type-safe queries |
| **Cache** | Redis | 7 | Via Docker |
| **Event Bus** | Redpanda | Latest | Kafka-compatible |
| **Auth** | JWT (jose) | 5.9.3 | Access + Refresh tokens |
| **Password Hashing** | Argon2 | 0.41.1 | Industry standard |
| **Observability** | OpenTelemetry | 1.27.0 | Tracing + Metrics |
| **Logging** | Pino | 9.4.0 | Structured JSON logs |
| **Validation** | Zod | 3.23.8 | Schema validation |
| **Testing (FE)** | Playwright | 1.49.0 | E2E + Visual tests |
| **Testing (BE)** | Vitest | 2.1.1 | Unit + Integration |

### Service Boundaries

| Service | Responsibility | Port | Status |
|---------|---------------|------|--------|
| **API Gateway** | Routing, auth verification, rate limiting, tenant propagation | 3000 | ✅ Extracted |
| **Auth Service** | Login, signup, tokens, API keys, RBAC | 3001 | ✅ Extracted |
| **CRM Service** | Accounts, contacts, opportunities, pipeline | 3002 | ✅ Extracted |
| **Email Service** | Send (Gmail/Outlook), track, templates | 3003 | ✅ Extracted |
| **Calendar Service** | Meetings, availability, reminders | 3004 | ✅ Extracted |
| **Sequences Service** | Outreach sequences, enrollment, steps | 3005 | ✅ Extracted |
| **Activities Service** | Activity timeline, notes, calls | 3006 | ✅ Extracted |
| **Kafka Publisher Worker** | Outbox → Kafka event publishing | - | ✅ Standalone |
| **Kafka Consumer Worker** | Kafka → Event handlers | - | ✅ Standalone |
| **Engagement Service** | Scoring, intent detection | TBD | ⏳ Future |

### Database Schema (Tables)

| Table | Description | Multi-tenant |
|-------|-------------|--------------|
| `customers` | Tenant/organization records | Root table |
| `users` | User accounts per tenant | Yes |
| `user_roles` | RBAC role assignments | Yes |
| `api_keys` | API key credentials | Yes |
| `refresh_tokens` | JWT refresh tokens | Yes |
| `accounts` | CRM accounts/companies | Yes |
| `contacts` | CRM contacts/people | Yes |
| `opportunities` | Sales opportunities | Yes |
| `emails` | Email records + tracking | Yes |
| `email_clicks` | Email click tracking | Yes |
| `email_provider_accounts` | Gmail/Outlook OAuth credentials | Yes |
| `email_templates` | Reusable templates | Yes |
| `meetings` | Calendar meetings | Yes |
| `sequences` | Outreach sequences | Yes |
| `sequence_enrollments` | Contact enrollments | Yes |
| `activities` | Activity timeline | Yes |
| `engagement_scores` | Contact engagement | Yes |
| `outbox` | Transactional outbox | Yes |
| `processed_events` | Idempotency tracking | Yes |
| `audit_log` | Change audit trail | Yes |

---

## Milestone Tracker

### Phase 1: Foundation (Current)

| Milestone | Target | Status | Completion |
|-----------|--------|--------|------------|
| Project Status Bible | Week 1 | ✅ Complete | Jan 4, 2026 |
| Database migrations baseline | Week 1 | ✅ Complete | Jan 4, 2026 |
| Event bus (Redpanda) setup | Week 1 | ✅ Complete | Jan 4, 2026 |
| API Gateway skeleton | Week 1-2 | ✅ Complete | Jan 4, 2026 |
| Auth Service extraction | Week 2 | ✅ Complete | Jan 4, 2026 |
| CRM Service extraction | Week 2 | ✅ Complete | Jan 4, 2026 |
| Outbox → Kafka bridge | Week 2-3 | ✅ Complete | Jan 4, 2026 |
| Local E2E working | Week 3 | ✅ Complete | Jan 4, 2026 |
| **Supabase DB Cutover** | Week 3 | ✅ Complete | Jan 4, 2026 |
| **UI E2E Verified** | Week 3 | ✅ Complete | Jan 4, 2026 |

### Phase 1: MVP - Backend (Weeks 3-8)

| Milestone | Backend | Frontend | Status | Notes |
|-----------|---------|----------|--------|-------|
| Email Service extraction | ✅ Complete | ⚠️ Basic | **Backend Complete** | Jan 6, 2026 - API ready, UI needs work |
| Gmail/Outlook provider integration | ✅ Complete | ❌ Missing | **Backend Only** | Jan 6, 2026 - OAuth UI needed |
| Calendar Service extraction | ✅ Complete | ⚠️ Basic | **Backend Complete** | Jan 6, 2026 - API ready, UI needs work |
| Sequences Service extraction | ✅ Complete | ⚠️ Basic | **Backend Complete** | Jan 6, 2026 - API ready, UI needs work |
| Activities Service extraction | ✅ Complete | ⚠️ Basic | **Backend Complete** | Jan 6, 2026 - API ready, UI needs work |
| Kafka workers (standalone) | ✅ Complete | N/A | ✅ Complete | Jan 6, 2026 |
| Engagement scoring | ⏳ Pending | ⏳ Pending | ⏳ Pending | Score calculation |
| CRM sync (bi-directional) | ⏳ Pending | ⏳ Pending | ⏳ Pending | Salesforce/HubSpot |
| Dashboard & pipeline views | ✅ Complete | ✅ Complete | ✅ Complete | Jan 4, 2026 |

### Phase 1.5: Frontend UI Completion (Weeks 5-8)

**Status:** ⏳ **NEXT PRIORITY**

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| Brand/Labels Alignment (SalesOS vs Bevyly) | Week 5 | ⏳ Pending | Align product name, nav labels, and design tokens to approved UI reference |
| Email Provider OAuth UI | Week 5 | ⏳ Pending | Connect Gmail/Outlook accounts |
| Email Composition UI | Week 5-6 | ⏳ Pending | Compose, send, track emails |
| Email Analytics Dashboard | Week 6 | ⏳ Pending | Opens, clicks, engagement |
| Meeting Scheduling UI | Week 6-7 | ⏳ Pending | Create, schedule meetings |
| Calendar View Component | Week 7 | ⏳ Pending | Day/week/month grid |
| Sequence Builder UI | Week 7-8 | ⏳ Pending | Visual sequence editor |
| Activity Timeline UI | Week 8 | ⏳ Pending | Activity visualization |

### Phase 2: Prospecting Layer (Weeks 9-12)

**Key clarification:** In Phase 1 we implemented **microservices (APIs)**. In Phase 2+ we implement **agents (autonomous workers)** that use those APIs + Kafka events.

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| Agent Console UI (MVP) | Week 9 | ⏳ Pending | UI to configure agents, integrations, view runs/errors, approvals, and agent health |
| Lead Source Agent (MVP) | Week 9-10 | ⏳ Pending | Apollo/ZoomInfo/providers; generate leads and publish events |
| Enrichment Agent (MVP) | Week 10-11 | ⏳ Pending | Enrich contacts/accounts; firmographics + signals; publish events |
| Contact Finder Agent (MVP) | Week 11 | ⏳ Pending | Find decision makers; verify emails; publish events |
| Scoring Agent (MVP) | Week 12 | ⏳ Pending | Fit + intent score; tiering; selects sequence/cadence |
| Pipeline/Deal Insights (Agent-assisted) | Week 12 | ⏳ Pending | Early pipeline prioritization using scoring + engagement signals (not full forecasting) |

### Phase 3: Advanced Features (Post-Launch)

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| Outreach Agents (Email/LinkedIn/Voice/SMS) | TBD | ⏳ Pending | Autonomous multi-channel outreach + follow-ups/campaigns (built on Sequences + providers) |
| Engagement Agent (Autonomous) | TBD | ⏳ Pending | React to opens/clicks/replies; trigger follow-ups; update scores |
| Calendar Agent (Autonomous) | TBD | ⏳ Pending | Scheduling automation, reminders, reschedules |
| CRM Agent (Autonomous) | TBD | ⏳ Pending | Bi-directional sync + hygiene automation |
| Forecasting Agent | TBD | ⏳ Pending | Revenue predictions + pipeline forecasting |
| Coaching Agent | TBD | ⏳ Pending | Next-best-actions, rep coaching, playbooks |
| Discovery Agent | TBD | ⏳ Pending | Call transcription + insights |
| Proposal Agent | TBD | ⏳ Pending | Auto-generation of proposals/templates |

--- 

## Services vs Agents (Important Distinction)

### Services (Implemented)
- **What they are:** Stateless APIs (microservices) that expose CRUD + business operations.
- **Status:** ✅ Implemented for Auth/CRM/Email/Calendar/Sequences/Activities + Gateway + Workers.

### Agents (Planned)
- **What they are:** Long-running autonomous workers that consume Kafka events, call services/APIs, write results back to Postgres, and publish new events.
- **Status:** ⏳ Planned starting **Phase 2** (Prospecting) and expanding in **Phase 3** (Outreach/Engagement/Closing).

---

## Decision Log

### ADR-001: Microservices Architecture (January 4, 2026)

**Status:** Accepted

**Context:**  
The docs specify a microservices architecture with Kafka-based event streaming. The initial implementation was a modular monolith with a transactional outbox pattern.

**Decision:**  
Migrate to microservices now rather than later, to avoid accumulating coupling and to align with the documented architecture.

**Consequences:**
- More initial complexity
- Better scalability and team autonomy
- Cleaner service boundaries from the start
- Kafka/Redpanda required from day one

---

### ADR-002: Authentication Model (January 4, 2026)

**Status:** Accepted

**Context:**  
Enterprise customers may require SSO (OIDC/SAML), but this adds complexity. The current implementation supports email/password with JWT.

**Decision:**  
Start with email/password + JWT + RBAC with hardening (rotation, session management, audit). Add SSO as a Phase 2+ feature.

**Consequences:**
- Faster time to market
- RBAC provides sufficient enterprise controls initially
- SSO can be added without major refactoring

---

### ADR-003: Event Bus Choice (January 4, 2026)

**Status:** Accepted

**Context:**  
The docs specify Kafka. Options considered: Kafka, Redpanda, RabbitMQ, AWS SQS/SNS.

**Decision:**  
Use Redpanda (Kafka-compatible) for local development. It's lighter weight, easier to run locally, and fully compatible with Kafka APIs.

**Consequences:**
- Same Kafka client libraries work
- Lower resource usage for local dev
- Easy migration to managed Kafka in production

---

### ADR-004: Transactional Outbox Pattern (January 4, 2026)

**Status:** Accepted

**Context:**  
Need reliable event publishing with exactly-once semantics.

**Decision:**  
Keep the transactional outbox pattern. Events are written to the `outbox` table in the same transaction as business operations, then published to Kafka by a separate worker.

**Consequences:**
- Guaranteed consistency between DB and events
- Slightly higher latency (polling interval)
- Idempotent consumers required

---

### ADR-005: Multi-Tenant Isolation Strategy (January 4, 2026)

**Status:** Accepted

**Context:**  
Enterprise-grade systems require strict tenant isolation to prevent data leakage.

**Decision:**  
All database queries MUST include `customer_id` in WHERE clauses. The gateway extracts tenant context from JWT and propagates it to services. Services validate tenant ownership on every operation.

**Consequences:**
- Strong isolation at the application layer
- Single database with tenant-scoped queries
- Audit logging includes tenant context

---

### ADR-006: Email Provider Architecture (January 6, 2026)

**Status:** Accepted

**Context:**  
Email sending requires integration with Gmail and Outlook. Each tenant may use different email accounts and providers.

**Decision:**  
- Create an `email_provider_accounts` table to store per-tenant OAuth credentials (encrypted)
- Implement a provider abstraction layer with Gmail, Outlook, and Mock providers
- Use `getEmailProviderForTenant(customerId)` to select the right provider at runtime
- Support multiple accounts per tenant with a "default" flag

**Consequences:**
- Tenants can bring their own email accounts
- OAuth credentials are encrypted at rest
- Providers are swappable without code changes
- Requires OAuth flow implementation for account connection

---

### ADR-007: Standalone Workers for Event Processing (January 6, 2026)

**Status:** Accepted

**Context:**  
The outbox publisher and Kafka consumer were initially in-process. For production scalability, they should run as separate workers.

**Decision:**  
- Create standalone worker scripts: `workers/kafka-publisher.ts` and `workers/kafka-consumer.ts`
- Workers can be scaled independently of API services
- Idempotency enforced via `processed_events` table with `event_id` as primary key
- Workers implement graceful shutdown and retry logic

**Consequences:**
- Better resource isolation and scaling
- Workers can be restarted without affecting API availability
- Requires separate processes/containers in deployment
- Simplifies debugging of event processing issues

---

### ADR-008: Gateway-Based Authentication for Services (January 6, 2026)

**Status:** Accepted

**Context:**  
Microservices behind the gateway receive pre-authenticated requests. Services need to support both gateway mode (headers) and direct mode (JWT).

**Decision:**  
- Modify `authenticate()` middleware to check for tenant context from headers first (gateway mode)
- If no headers, fall back to JWT verification (direct mode)
- Services trust the gateway's tenant context propagation
- Public routes (e.g., email tracking) bypass authentication entirely

**Consequences:**
- Services work both behind gateway and standalone
- Reduces redundant JWT verification overhead
- Gateway becomes the single authentication checkpoint in production
- Services remain testable with direct JWT access

---

## Change Log

### January 6, 2026

**Major Updates:**
- ✅ Extracted Email, Calendar, Sequences, and Activities services to standalone Express apps (ports 3003-3006)
- ✅ Implemented Gmail and Outlook email provider integrations with OAuth credential storage
- ✅ Created standalone Kafka publisher and consumer workers for event processing
- ✅ Updated `authenticate()` middleware to support both gateway headers and direct JWT
- ✅ Added `email_provider_accounts` table for tenant-specific email credentials
- ✅ Updated npm scripts to run all 7 services + 2 workers concurrently
- ✅ Comprehensive E2E verification checklist added to documentation
- 📝 Updated architecture diagrams to reflect all 7 services

**New Scripts:**
- `npm run dev:all` - Start all services + workers
- `npm run dev:services` - Start only the 7 services
- `npm run dev:workers` - Start only Kafka workers
- `npm run start:email`, `start:calendar`, `start:sequences`, `start:activities` - Production service scripts
- `npm run start:kafka-publisher`, `start:kafka-consumer` - Production worker scripts

### January 4, 2026

| Time | Change | Files | Author |
|------|--------|-------|--------|
| 00:00 | Initial Project Status Bible created | `docs/Project-Status-Bible.md` | AI Assistant |
| 00:15 | Created baseline database migration from Drizzle schema | `backend/drizzle/0000_initial_schema.sql` | AI Assistant |
| 00:16 | Updated migrate.ts with better error handling and path resolution | `backend/src/shared/db/migrate.ts` | AI Assistant |
| 00:16 | Updated .gitignore to clarify drizzle folder behavior | `backend/.gitignore` | AI Assistant |
| 00:25 | Added Redpanda (Kafka-compatible) to docker-compose with topic init | `backend/docker-compose.yml` | AI Assistant |
| 00:26 | Created Kafka client module with producer/consumer utilities | `backend/src/shared/kafka/client.ts`, `backend/src/shared/kafka/index.ts` | AI Assistant |
| 00:27 | Added kafkajs dependency and Kafka config to backend | `backend/package.json`, `backend/src/shared/config/index.ts`, `backend/env.example` | AI Assistant |
| 00:35 | Created API Gateway with proxy routing and JWT auth | `backend/src/gateway/index.ts`, `backend/src/gateway/middleware/auth.ts`, `backend/src/gateway/middleware/tenant.ts` | AI Assistant |
| 00:36 | Added gateway scripts and http-proxy-middleware | `backend/package.json` | AI Assistant |
| 00:40 | Created Auth Service as standalone microservice | `backend/src/services/auth/index.ts` | AI Assistant |
| 00:45 | Created CRM Service as standalone microservice | `backend/src/services/crm/index.ts` | AI Assistant |
| 00:50 | Implemented Kafka publisher worker for outbox events | `backend/src/modules/events/kafka-publisher.ts` | AI Assistant |
| 00:55 | Implemented Kafka consumer with activity/engagement handlers | `backend/src/modules/events/kafka-consumer.ts` | AI Assistant |
| 00:56 | Updated activity handler with Kafka-compatible exports | `backend/src/modules/events/handlers/activity.handler.ts` | AI Assistant |
| 00:57 | Updated engagement handler with Kafka-compatible exports | `backend/src/modules/events/handlers/engagement.handler.ts` | AI Assistant |
| 01:05 | Updated backend env.example with service URLs | `backend/env.example` | AI Assistant |
| 01:06 | Updated backend README for microservices architecture | `backend/README.md` | AI Assistant |
| 01:07 | Updated runbooks with microservices local dev setup | `docs/Project-Status-Bible.md` | AI Assistant |
| 01:38 | Fixed login route to access tokens.accessToken | `frontend/src/app/api/auth/login/route.ts` | AI Assistant |
| 01:39 | Fixed signup route to access tokens.accessToken | `frontend/src/app/api/auth/signup/route.ts` | AI Assistant |
| 01:40 | Fixed refresh route to preserve refresh token | `frontend/src/app/api/auth/refresh/route.ts` | AI Assistant |
| 01:41 | Fixed OpenTelemetry ATTR_DEPLOYMENT_ENVIRONMENT_NAME | `backend/src/shared/telemetry/index.ts` | AI Assistant |
| 01:45 | Fixed accounts page response parsing | `frontend/src/app/(app)/accounts/page.tsx` | AI Assistant |
| 12:17 | **Supabase DB Cutover** - Applied baseline schema to Supabase cloud PostgreSQL | Supabase MCP migrations | AI Assistant |
| 12:17 | Updated DATABASE_URL configuration for Supabase with SSL | `backend/.env`, `backend/env.example` | AI Assistant |
| 12:17 | Added SSL support for Supabase connections | `backend/src/shared/db/client.ts`, `backend/src/shared/db/migrate.ts` | AI Assistant |
| 12:17 | Ran migrations and seed against Supabase - verified 27 tables created | `npm run db:migrate`, `npm run db:seed` | AI Assistant |
| 12:18 | Fixed contacts page response parsing (same as accounts fix) | `frontend/src/app/(app)/contacts/page.tsx` | AI Assistant |
| 12:19 | Fixed opportunities page response parsing | `frontend/src/app/(app)/opportunities/page.tsx` | AI Assistant |
| 12:20 | E2E verified - Dashboard, Accounts (2), Contacts (3), Opportunities (2) all display seeded data | UI E2E test | AI Assistant |
| 12:20 | Added Supabase setup documentation to README | `backend/README.md` | AI Assistant |
| 13:00 | Removed redundant `authenticate()` from CRM routes - using tenant-guard instead | `backend/src/modules/crm/routes.ts` | AI Assistant |
| 13:05 | Fixed CRM route mounting - each resource at distinct path (/accounts, /contacts, /opportunities) | `backend/src/services/crm/index.ts` | AI Assistant |
| 13:10 | Added path rewriting to gateway - `/api/v1/accounts` → `/accounts` | `backend/src/gateway/index.ts` | AI Assistant |
| 13:15 | **Microservices E2E Verified** - Full flow: Frontend (3010) → Gateway (3000) → Auth (3001) / CRM (3002) → Supabase | UI E2E test | AI Assistant |
| 13:15 | Updated architecture diagram in Project Status Bible to reflect microservices mode | `docs/Project-Status-Bible.md` | AI Assistant |

---

### ADR-006: Supabase for Cloud Database (January 4, 2026)

**Status:** Accepted

**Context:**  
Need a production-ready cloud database. Options: AWS RDS, GCP Cloud SQL, Supabase, Railway.

**Decision:**  
Use Supabase for hosted PostgreSQL (DB-only mode). We use our own JWT + RBAC auth, not Supabase Auth.

**Consequences:**
- Free tier available for development
- Direct PostgreSQL access with SSL
- Need to URL-encode special characters in password
- Compatible with existing Drizzle ORM
- Easy migration to any PostgreSQL provider later

---

## Runbooks

### Supabase Database Setup

SalesOS uses **Supabase for hosted PostgreSQL** (DB-only mode; we use our own JWT auth).

#### Connection String Format

```
postgresql://postgres:<PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres?sslmode=require
```

#### URL-Encoding Special Characters

**CRITICAL:** If your password contains special characters, URL-encode them:

| Character | Encoded |
|-----------|---------|
| `@` | `%40` |
| `#` | `%23` |
| `$` | `%24` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |

Example: `Bevyly@20001` → `Bevyly%4020001`

#### Supabase Setup Steps

```bash
# 1. Get connection string from Supabase Dashboard → Settings → Database

# 2. Update backend/.env with Supabase DATABASE_URL and SSL settings
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.wholtcsgqsobvtueyujr.supabase.co:5432/postgres?sslmode=require
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false  # Required for Supabase in dev

# 3. Run migrations
cd backend
npm run db:migrate

# 4. Seed demo data
npm run db:seed

# 5. Verify counts
# Use Supabase SQL Editor:
SELECT 
  (SELECT count(*) FROM accounts) as accounts,
  (SELECT count(*) FROM contacts) as contacts,
  (SELECT count(*) FROM opportunities) as opportunities;
```

#### Current Supabase Project

| Property | Value |
|----------|-------|
| Project Ref | `wholtcsgqsobvtueyujr` |
| Project URL | `https://wholtcsgqsobvtueyujr.supabase.co` |
| Tables Created | 27 |
| Seeded Data | 1 customer, 2 users, 2 accounts, 3 contacts, 2 opportunities |

---

### Local Development Setup

#### Prerequisites

- Node.js 20+
- Docker + Docker Compose (for Redis, Redpanda)
- Supabase account (or local PostgreSQL via Docker)
- Git

#### Quick Start (Microservices Mode)

```bash
# 1. Clone repository
git clone <repo-url>
cd Bevyly

# 2. Start infrastructure (PostgreSQL, Redis, Redpanda)
cd backend
docker-compose up -d

# 3. Wait for services to be healthy (especially Redpanda)
docker-compose ps
# Wait for redpanda-init to complete (creates Kafka topics)

# 4. Install backend dependencies
npm install

# 5. Configure environment
cp env.example .env
# Edit .env with proper JWT_SECRET and ENCRYPTION_KEY
# Example values for local dev:
# JWT_SECRET=your-super-secret-jwt-key-at-least-32-chars
# ENCRYPTION_KEY=your-encryption-key-at-least-32-chars

# 6. Run migrations
npm run db:migrate

# 7. Seed demo data (optional but recommended)
npm run db:seed

# 8. Start all backend services (RECOMMENDED - single command):
npm run dev:all
# This starts Gateway (3000), Auth (3001), and CRM (3002) concurrently

# 9. In another terminal, start frontend:
cd ../frontend
npm install
npm run dev  # Runs on port 3010

# 10. Open browser to http://localhost:3010
#     Login with: admin@demo.salesos.dev / demo123!

# ALTERNATIVE: Start services individually (if dev:all doesn't work on Windows):
# Terminal 1: npm run dev:gateway
# Terminal 2: npm run dev:auth
# Terminal 3: npm run dev:crm
```

#### Monolith Mode (Legacy)

For simpler development, you can still run the monolith server:

```bash
cd backend
npm run dev  # Runs on port 3000 with all modules in one process
```

#### Demo Credentials (after seeding)

| User | Email | Password |
|------|-------|----------|
| Admin | admin@demo.salesos.dev | demo123! |
| Sales Rep | rep@demo.salesos.dev | demo123! |

### Troubleshooting

#### Database Connection Failed

```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

#### Redis Connection Failed

```bash
# Check if Redis is running
docker-compose ps

# Test connection
docker-compose exec redis redis-cli ping
```

#### Migrations Not Found

```bash
# Generate migrations from schema
npm run db:generate

# Check drizzle/ folder exists
ls -la drizzle/
```

#### Frontend Can't Connect to Backend

```bash
# Ensure BACKEND_URL is set correctly
# In frontend, check that backend is running on port 3000
curl http://localhost:3000/health
```

### Deployment Notes

#### Environment Variables (Production)

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | Use managed PostgreSQL |
| `REDIS_URL` | Yes | Use managed Redis |
| `JWT_SECRET` | Yes | Min 32 chars, rotate periodically |
| `ENCRYPTION_KEY` | Yes | Min 32 chars, for token encryption |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Yes | Observability backend |

---

## Known-Good E2E Checklist (Verified January 4, 2026)

### Microservices Mode

| Component | Port | Status | Notes |
|-----------|------|--------|-------|
| Frontend | 3010 | ✅ Verified | Next.js 15, BFF auth pattern |
| API Gateway | 3000 | ✅ Verified | JWT auth, tenant context, path rewriting |
| Auth Service | 3001 | ✅ Verified | Signup/login/refresh, API keys |
| CRM Service | 3002 | ✅ Verified | Accounts/contacts/opportunities |
| Supabase DB | cloud | ✅ Verified | 27 tables, seeded data |

### Verified User Flows

| Flow | Status | Notes |
|------|--------|-------|
| Login via UI | ✅ | admin@demo.salesos.dev / demo123! |
| Dashboard display | ✅ | Shows stats, Recent Transactions |
| Accounts list | ✅ | 2 accounts (Acme, Globex) |
| Contacts list | ✅ | 3 contacts (Bob, Jane, John) |
| Opportunities list | ✅ | 2 opportunities ($120k, $50k) |

### Key Fixes Applied

1. **CRM Routes**: Removed redundant `authenticate()` - using tenant-guard middleware instead
2. **Path Rewriting**: Gateway rewrites `/api/v1/accounts` → `/accounts` for CRM service
3. **SSL Configuration**: Set `DATABASE_SSL_REJECT_UNAUTHORIZED=false` in `.env` for Supabase (no env var workaround needed)
4. **Frontend Port**: Changed to 3010 to avoid conflict with Auth Service on 3001
5. **Backend Scripts**: Use `npm run dev:all` to start gateway + auth + crm with concurrently

### E2E Verification Checklist (Updated: Jan 6, 2026)

This checklist verifies the complete microservices architecture with all services running.

#### Prerequisites

```bash
# 1. Ensure all dependencies installed
cd backend && npm install
cd ../frontend && npm install

# 2. Verify Supabase connection
# Check backend/.env has valid DATABASE_URL

# 3. Run migrations if needed
cd backend && npm run db:migrate

# 4. Start Redpanda (Kafka) in Docker
docker-compose up -d redpanda
```

#### Starting Services

```bash
# Option 1: Start all services + workers (recommended for development)
cd backend
npm run dev:all

# This starts:
# - Gateway (3000)
# - Auth Service (3001)
# - CRM Service (3002)
# - Email Service (3003)
# - Calendar Service (3004)
# - Sequences Service (3005)
# - Activities Service (3006)
# - Kafka Publisher Worker
# - Kafka Consumer Worker

# Option 2: Start services and workers separately
npm run dev:services  # All 7 services
npm run dev:workers   # Kafka publisher + consumer

# Start Frontend (separate terminal)
cd frontend
npm run dev  # Starts on port 3010
```

#### Verification Steps

| # | Test | Endpoint/Action | Expected Result |
|---|------|-----------------|-----------------|
| 1 | Gateway health | `GET http://localhost:3000/health` | `{"status":"ok"}` |
| 2 | Auth health | `GET http://localhost:3001/health` | `{"status":"ok"}` |
| 3 | CRM health | `GET http://localhost:3002/health` | `{"status":"ok"}` |
| 4 | Email health | `GET http://localhost:3003/health` | `{"status":"ok"}` |
| 5 | Calendar health | `GET http://localhost:3004/health` | `{"status":"ok"}` |
| 6 | Sequences health | `GET http://localhost:3005/health` | `{"status":"ok"}` |
| 7 | Activities health | `GET http://localhost:3006/health` | `{"status":"ok"}` |
| 8 | Login via Gateway | `POST http://localhost:3000/api/v1/auth/login` | JWT tokens returned |
| 9 | List Accounts (via Gateway) | `GET http://localhost:3000/api/v1/accounts` (with JWT) | Accounts array |
| 10 | List Contacts (via Gateway) | `GET http://localhost:3000/api/v1/contacts` (with JWT) | Contacts array |
| 11 | Email tracking pixel | `GET http://localhost:3000/api/v1/emails/track/open/:id` | 1x1 transparent GIF (no auth) |
| 12 | Frontend Dashboard | Navigate to `http://localhost:3010` | Login page loads |
| 13 | Frontend Login | Login with demo credentials | Dashboard displays |
| 14 | Kafka Publisher Worker | Check logs for "Kafka publisher started" | Worker running |
| 15 | Kafka Consumer Worker | Check logs for "Kafka consumer started" | Worker running |
| 16 | Event Flow (E2E) | Create a contact via API → Check activities timeline | Activity created via Kafka event |

#### Known-Good Configuration

**Database**: Supabase-hosted PostgreSQL  
**Event Bus**: Redpanda (Kafka-compatible) in Docker  
**Services**: 7 standalone Express apps (Gateway + 6 services)  
**Workers**: 2 standalone Node processes (Publisher + Consumer)  
**Frontend**: Next.js 15 on port 3010

#### Troubleshooting

**Problem**: Services fail to start  
**Solution**: Check that ports 3000-3006 are available

**Problem**: Kafka connection errors  
**Solution**: Ensure Redpanda is running: `docker ps | grep redpanda`

**Problem**: Database connection errors  
**Solution**: Verify `DATABASE_URL` in `.env` and check Supabase project is active

**Problem**: "Authentication failed" when calling service directly  
**Solution**: Services accept both JWT (direct) and gateway headers. Use gateway at :3000 or add valid JWT to Authorization header

**Problem**: Email tracking not working  
**Solution**: Verify `/api/v1/emails/track` is in `publicTrackingRoutes` in gateway config

---

## Security Posture

### Authentication

| Control | Implementation | Status |
|---------|---------------|--------|
| Password hashing | Argon2 | ✅ Active |
| JWT access tokens | 15 min expiry | ✅ Active |
| JWT refresh tokens | 7 day expiry | ✅ Active |
| Token storage | HttpOnly cookies | ✅ Active |
| API keys | Hashed, revocable | ✅ Active |
| Rate limiting | 100 req/min/customer | ✅ Active |

### Authorization (RBAC)

| Role | Permissions |
|------|------------|
| `admin` | Full access to all resources |
| `manager` | Team views, reporting, manage reps |
| `sales_rep` | Own leads, pipeline, activities |
| `viewer` | Read-only dashboard access |

### Tenant Isolation

| Layer | Control |
|-------|---------|
| Database | All queries scoped by `customer_id` |
| API | Tenant context extracted from JWT |
| Events | Events tagged with `customer_id` |
| Audit | All changes logged with tenant |

### Data Protection

| Control | Implementation |
|---------|---------------|
| Encryption in transit | TLS 1.2+ required |
| Encryption at rest | Database-level (RDS) |
| Sensitive field encryption | App-level (ENCRYPTION_KEY) |
| PII handling | Minimal storage, tokenization |

### Audit Logging

| Event | Logged |
|-------|--------|
| User login/logout | ✅ |
| API key create/revoke | ✅ |
| Account create/update/delete | ✅ |
| Contact create/update/delete | ✅ |
| Opportunity stage changes | ✅ |
| Email send | ✅ |
| Meeting schedule | ✅ |

### Secrets Management

| Secret | Storage | Rotation |
|--------|---------|----------|
| `JWT_SECRET` | Environment variable | Manual (recommended: 90 days) |
| `ENCRYPTION_KEY` | Environment variable | Manual (recommended: 90 days) |
| `DATABASE_URL` | Environment variable | As needed |
| API keys | Database (hashed) | User-controlled |
| OAuth tokens | Database (encrypted) | Auto-refresh |

---

## Appendix

### Useful Commands

```bash
# Backend
npm run dev              # Start dev server
npm run build            # Build for production
npm run test             # Run tests
npm run db:generate      # Generate migrations
npm run db:migrate       # Run migrations
npm run db:seed          # Seed demo data
npm run db:studio        # Open Drizzle Studio

# Frontend
npm run dev              # Start dev server (port 3010)
npm run build            # Build for production
npm test                 # Run Playwright tests
npm run test:ui          # Run tests with UI

# Docker
docker-compose up -d     # Start infrastructure
docker-compose down      # Stop infrastructure
docker-compose logs -f   # Follow logs
```

### API Health Checks

```bash
# Basic health
curl http://localhost:3000/health

# Readiness (DB + Redis)
curl http://localhost:3000/ready

# Liveness
curl http://localhost:3000/live

# Metrics
curl http://localhost:3000/metrics
```

---

## Next Milestones (Post-Supabase)

### Immediate Next Steps

1. **Microservices E2E** - Frontend → Gateway → Auth/CRM Services (turn off monolith mode)
2. **Outbox → Kafka** - Run publisher + consumer as separate workers (not in-process)
3. **Email Service MVP** - Send + tracking → activity timeline updates

### Architecture Flow (Target)

```mermaid
flowchart LR
  Frontend --> Gateway
  Gateway --> AuthService
  Gateway --> CrmService
  AuthService --> SupabasePostgres
  CrmService --> SupabasePostgres
  CrmService --> Outbox
  Outbox --> Kafka
  Kafka --> Consumers
  Consumers --> SupabasePostgres
```

### E2E Verification Checklist (Known-Good State)

| Test | Status | Notes |
|------|--------|-------|
| Login with demo credentials | ✅ Pass | admin@demo.salesos.dev / demo123! |
| Dashboard shows revenue ($170k) | ✅ Pass | 2 opportunities summed |
| Dashboard shows 3 contacts | ✅ Pass | From seed data |
| Accounts page shows 2 accounts | ✅ Pass | Acme + Globex |
| Contacts page shows 3 contacts | ✅ Pass | John, Jane, Bob |
| Opportunities page shows 2 opps | ✅ Pass | $120k + $50k |
| Recent Transactions table | ✅ Pass | Shows seeded opps |

---

**Document Maintainers:** Development Team  
**Review Cadence:** Weekly during active development

