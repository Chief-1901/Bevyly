# SalesOS Backend - Microservices Architecture

This is the backend for SalesOS, implemented as a microservices architecture with event-driven communication.

## Architecture Overview

```
Frontend (3010)
     ↓
API Gateway (3000)
     ↓
┌────────┬────────┬────────┬────────┬────────┬────────┐
│Auth    │CRM     │Email   │Calendar│Sequence│Activity│
│3001    │3002    │3003    │3004    │3005    │3006    │
└────────┴────────┴────────┴────────┴────────┴────────┘
              ↓
        Outbox Table
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Kafka Publisher    Kafka Consumer
    Worker             Worker
              ↓
         Redpanda/Kafka
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| **Gateway** | 3000 | API Gateway with auth, rate limiting, routing |
| **Auth** | 3001 | User authentication, JWT tokens, RBAC |
| **CRM** | 3002 | Accounts, Contacts, Opportunities |
| **Email** | 3003 | Email sending (Gmail/Outlook), tracking |
| **Calendar** | 3004 | Meetings, scheduling, availability |
| **Sequences** | 3005 | Email sequences, enrollment |
| **Activities** | 3006 | Activity timeline, notes, calls |

## Workers

- **Kafka Publisher**: Polls outbox table and publishes events to Kafka
- **Kafka Consumer**: Consumes events from Kafka and routes to handlers

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your Supabase DATABASE_URL and other settings

# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed

# Start Redpanda (Kafka) in Docker
docker-compose up -d redpanda
```

### Development

```bash
# Option 1: Start all services + workers (recommended)
npm run dev:all

# Option 2: Start services only
npm run dev:services

# Option 3: Start workers only
npm run dev:workers

# Option 4: Start individual services
npm run dev:gateway
npm run dev:auth
npm run dev:crm
npm run dev:email
npm run dev:calendar
npm run dev:sequences
npm run dev:activities
npm run dev:kafka-publisher
npm run dev:kafka-consumer
```

### Production

```bash
# Build
npm run build

# Start services
npm run start:gateway
npm run start:auth
npm run start:crm
npm run start:email
npm run start:calendar
npm run start:sequences
npm run start:activities

# Start workers
npm run start:kafka-publisher
npm run start:kafka-consumer
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption (for OAuth tokens)
ENCRYPTION_KEY=your-32-char-key

# Kafka
KAFKA_ENABLED=true
KAFKA_BROKERS=localhost:9092

# Services (for microservices mode)
EMAIL_SERVICE_URL=http://localhost:3003
CALENDAR_SERVICE_URL=http://localhost:3004
SEQUENCES_SERVICE_URL=http://localhost:3005
ACTIVITIES_SERVICE_URL=http://localhost:3006

# Email Provider (default fallback)
EMAIL_PROVIDER=mock  # or gmail, outlook
```

## Email Providers

SalesOS supports tenant-specific email provider configuration:

### Supported Providers

1. **Gmail** - OAuth2 with Gmail API
2. **Outlook/Office 365** - OAuth2 with Microsoft Graph API
3. **Mock** - Development/testing provider (no actual sending)

### Provider Setup

Email provider credentials are stored per-tenant in the `email_provider_accounts` table:

```sql
-- Example: Add a Gmail account for a tenant
INSERT INTO email_provider_accounts (
  id, customer_id, provider, email,
  access_token, refresh_token,
  is_default, status
) VALUES (
  'epa_xxxxx',
  'cus_xxxxx',
  'gmail',
  'user@example.com',
  encrypt('access_token_here'),  -- Encrypted
  encrypt('refresh_token_here'),  -- Encrypted
  true,
  'active'
);
```

The Email Service automatically selects the appropriate provider based on the tenant's configuration.

## API Gateway Routes

All routes are proxied through the Gateway at `http://localhost:3000`:

```
POST   /api/v1/auth/login          → Auth Service
POST   /api/v1/auth/signup         → Auth Service
POST   /api/v1/auth/refresh        → Auth Service

GET    /api/v1/accounts            → CRM Service
POST   /api/v1/accounts            → CRM Service
GET    /api/v1/contacts            → CRM Service
POST   /api/v1/contacts            → CRM Service
GET    /api/v1/opportunities       → CRM Service

POST   /api/v1/emails/send         → Email Service
GET    /api/v1/emails              → Email Service
GET    /api/v1/emails/track/*      → Email Service (public, no auth)

GET    /api/v1/calendar/meetings   → Calendar Service
POST   /api/v1/calendar/meetings/propose → Calendar Service

GET    /api/v1/sequences           → Sequences Service
POST   /api/v1/sequences           → Sequences Service

GET    /api/v1/activities          → Activities Service
POST   /api/v1/activities/notes    → Activities Service
```

## Authentication

Services support two authentication modes:

1. **Gateway Mode** (production): Gateway verifies JWT and passes tenant context via headers
2. **Direct Mode** (development/testing): Services verify JWT directly

### Public Routes

Some routes (e.g., email tracking pixels) are public and don't require authentication:
- `GET /api/v1/emails/track/open/:id`
- `GET /api/v1/emails/track/click/:id`

## Event Flow

1. **Business Operation** → Service writes to DB + Outbox (same transaction)
2. **Kafka Publisher Worker** → Polls outbox, publishes to Kafka
3. **Kafka Topics** → Events distributed to interested consumers
4. **Kafka Consumer Worker** → Processes events, updates Activities/Engagement
5. **Idempotency** → `processed_events` table prevents duplicate processing

### Example Event Flow

```
User creates contact
    ↓
CRM Service writes to contacts + outbox
    ↓
Publisher reads outbox → Kafka topic: contact.created
    ↓
Consumer processes event
    ↓
- Activity Service: Log "Contact Created" activity
- Engagement Service: Initialize engagement score
```

## Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (DB browser)
npm run db:studio
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test:coverage
```

## Troubleshooting

### Services won't start

**Issue**: Port already in use  
**Solution**: Check that ports 3000-3006 are available

### Kafka connection errors

**Issue**: Cannot connect to Kafka  
**Solution**: 
```bash
# Check Redpanda is running
docker ps | grep redpanda

# Start Redpanda
docker-compose up -d redpanda
```

### Database connection errors

**Issue**: Cannot connect to database  
**Solution**: 
- Verify `DATABASE_URL` in `.env`
- Check Supabase project is active
- Verify SSL settings for Supabase

### Email sending fails

**Issue**: No provider configured  
**Solution**: 
- For development: Set `EMAIL_PROVIDER=mock` in `.env`
- For production: Configure Gmail/Outlook credentials in `email_provider_accounts` table

## Documentation

- **[Project Status Bible](../docs/Project-Status-Bible.md)** - Architecture, decisions, runbooks
- **[Technical Architecture](../docs/SalesOS-Tech-Arch.md)** - Detailed technical design
- **[Implementation Guide](../docs/SalesOS-Implementation.md)** - Step-by-step building guide
- **[API Reference](../docs/SalesOS-API-Integration.md)** - Complete API documentation

## License

Private - All Rights Reserved
