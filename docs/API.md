# Bevyly - API Documentation

> REST API reference for Bevyly

---

## Overview

The Bevyly API is a RESTful API that allows you to programmatically access and manage your sales data. All API access is over HTTPS and accessed from `https://api.bevyly.com`.

**Base URL:** `https://api.bevyly.com/api/v1`

**Local Development:** `http://localhost:3020/api/v1`

---

## Authentication

### API Keys

For programmatic access, use API keys generated in Settings > API Keys.

```bash
curl -H "Authorization: Bearer bev_sk_live_..." \
  https://api.bevyly.com/api/v1/accounts
```

### JWT Tokens

For web application access, use JWT tokens obtained via login.

```bash
# Login to get token
curl -X POST https://api.bevyly.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "..."}'

# Response
{
  "token": "eyJ...",
  "user": { "id": "usr_...", "email": "user@example.com" }
}

# Use token
curl -H "Authorization: Bearer eyJ..." \
  https://api.bevyly.com/api/v1/accounts
```

---

## Common Patterns

### Pagination

List endpoints support cursor-based pagination:

```bash
GET /api/v1/accounts?limit=20&cursor=acc_xyz
```

Response includes pagination info:
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "limit": 20,
    "cursor": "acc_xyz",
    "nextCursor": "acc_abc"
  }
}
```

### Filtering

Most list endpoints support filtering:

```bash
GET /api/v1/leads?status=new&source=apollo
GET /api/v1/opportunities?stage=negotiation&minValue=10000
```

### Sorting

```bash
GET /api/v1/accounts?sort=created_at&order=desc
```

### Error Responses

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Account not found",
    "details": { "id": "acc_xyz" }
  }
}
```

| HTTP Status | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid/missing auth |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Server Error |

---

## Rate Limits

| Tier | Requests/Minute |
|------|-----------------|
| Pro | 60 |
| Max | 300 |
| Ultra | 1,000 |
| Enterprise | Custom |

Rate limit headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 298
X-RateLimit-Reset: 1640000000
```

---

## Endpoints

### Authentication

#### Login

```
POST /api/v1/auth/login
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "usr_abc123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

#### Signup

```
POST /api/v1/auth/signup
```

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe",
  "companyName": "Acme Inc"
}
```

---

### Leads

#### List Leads

```
GET /api/v1/leads
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status (new, contacted, qualified, converted, rejected) |
| source | string | Filter by source |
| limit | number | Items per page (default: 20, max: 100) |
| cursor | string | Pagination cursor |

**Response:**
```json
{
  "data": [
    {
      "id": "lead_abc123",
      "companyName": "Acme Corp",
      "contactFirstName": "Jane",
      "contactLastName": "Smith",
      "contactEmail": "jane@acme.com",
      "contactTitle": "VP Sales",
      "status": "new",
      "fitScore": 85,
      "intentScore": 72,
      "source": "apollo",
      "createdAt": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 127,
    "limit": 20,
    "nextCursor": "lead_xyz789"
  }
}
```

#### Get Lead

```
GET /api/v1/leads/:id
```

#### Create Lead

```
POST /api/v1/leads
```

**Request:**
```json
{
  "companyName": "Acme Corp",
  "domain": "acme.com",
  "industry": "Technology",
  "employeeCount": 250,
  "contactFirstName": "Jane",
  "contactLastName": "Smith",
  "contactEmail": "jane@acme.com",
  "contactTitle": "VP Sales",
  "source": "manual"
}
```

#### Update Lead

```
PUT /api/v1/leads/:id
```

#### Delete Lead

```
DELETE /api/v1/leads/:id
```

#### Convert Lead

```
POST /api/v1/leads/:id/convert
```

Converts a lead to an Account + Contact.

**Response:**
```json
{
  "lead": { "id": "lead_abc", "status": "converted" },
  "account": { "id": "acc_xyz", "name": "Acme Corp" },
  "contact": { "id": "con_123", "email": "jane@acme.com" }
}
```

#### Reject Lead

```
POST /api/v1/leads/:id/reject
```

**Request:**
```json
{
  "reason": "Not a good fit"
}
```

---

### Accounts

#### List Accounts

```
GET /api/v1/accounts
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| industry | string | Filter by industry |
| search | string | Search by name or domain |
| limit | number | Items per page |
| cursor | string | Pagination cursor |

**Response:**
```json
{
  "data": [
    {
      "id": "acc_abc123",
      "name": "Acme Corp",
      "domain": "acme.com",
      "industry": "Technology",
      "employeeCount": 250,
      "revenue": 15000000,
      "ownerId": "usr_xyz",
      "createdAt": "2026-01-10T08:00:00Z"
    }
  ]
}
```

#### Get Account

```
GET /api/v1/accounts/:id
```

Includes associated contacts and opportunities.

#### Create Account

```
POST /api/v1/accounts
```

**Request:**
```json
{
  "name": "Acme Corp",
  "domain": "acme.com",
  "industry": "Technology",
  "employeeCount": 250
}
```

#### Update Account

```
PUT /api/v1/accounts/:id
```

#### Delete Account

```
DELETE /api/v1/accounts/:id
```

---

### Contacts

#### List Contacts

```
GET /api/v1/contacts
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| accountId | string | Filter by account |
| search | string | Search by name or email |

#### Get Contact

```
GET /api/v1/contacts/:id
```

#### Create Contact

```
POST /api/v1/contacts
```

**Request:**
```json
{
  "accountId": "acc_abc123",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@acme.com",
  "phone": "+1-555-0123",
  "title": "VP Sales"
}
```

#### Update Contact

```
PUT /api/v1/contacts/:id
```

#### Delete Contact

```
DELETE /api/v1/contacts/:id
```

---

### Opportunities

#### List Opportunities

```
GET /api/v1/opportunities
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| accountId | string | Filter by account |
| stage | string | Filter by stage |
| minValue | number | Minimum deal value |
| maxValue | number | Maximum deal value |

**Response:**
```json
{
  "data": [
    {
      "id": "opp_abc123",
      "name": "Acme Enterprise Deal",
      "accountId": "acc_xyz",
      "stage": "negotiation",
      "value": 50000,
      "probability": 70,
      "closeDate": "2026-03-15",
      "ownerId": "usr_123",
      "createdAt": "2026-01-05T12:00:00Z"
    }
  ]
}
```

#### Get Opportunity

```
GET /api/v1/opportunities/:id
```

#### Create Opportunity

```
POST /api/v1/opportunities
```

**Request:**
```json
{
  "name": "Acme Enterprise Deal",
  "accountId": "acc_xyz",
  "contactId": "con_123",
  "stage": "prospecting",
  "value": 50000,
  "closeDate": "2026-03-15"
}
```

#### Update Opportunity

```
PUT /api/v1/opportunities/:id
```

#### Delete Opportunity

```
DELETE /api/v1/opportunities/:id
```

---

### Intent / Briefing

#### Get Briefing

```
GET /api/v1/intent/briefing
```

Returns recommendations and signals for the current user.

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_abc",
      "actionType": "review_leads",
      "priority": "high",
      "title": "12 new leads ready for review",
      "rationale": "Lead Source Agent found 12 companies matching your ICP",
      "cta": {
        "label": "Review leads",
        "route": "/leads?status=new"
      }
    }
  ],
  "signals": [
    {
      "id": "sig_xyz",
      "signalType": "deal_stalled",
      "entityType": "opportunity",
      "entityId": "opp_123",
      "severity": "medium",
      "data": {
        "daysSinceActivity": 14,
        "opportunityName": "Acme Deal"
      }
    }
  ],
  "summary": {
    "high": 2,
    "medium": 5,
    "low": 8
  }
}
```

#### Refresh Signals

```
POST /api/v1/intent/briefing/refresh
```

Triggers signal detection and generates new recommendations.

**Response:**
```json
{
  "signalsCreated": 5,
  "recommendationsCreated": 3
}
```

#### Submit Feedback

```
POST /api/v1/intent/feedback
```

Records user response to a recommendation.

**Request:**
```json
{
  "recommendationId": "rec_abc",
  "action": "accepted"
}
```

Actions: `accepted`, `declined`, `snoozed`

---

### Sequences (Planned)

#### List Sequences

```
GET /api/v1/sequences
```

#### Get Sequence

```
GET /api/v1/sequences/:id
```

#### Create Sequence

```
POST /api/v1/sequences
```

#### Update Sequence

```
PUT /api/v1/sequences/:id
```

#### Add Contact to Sequence

```
POST /api/v1/sequences/:id/contacts
```

#### Remove Contact from Sequence

```
DELETE /api/v1/sequences/:id/contacts/:contactId
```

---

### Activities

#### List Activities

```
GET /api/v1/activities
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| entityType | string | Filter by entity (account, contact, opportunity) |
| entityId | string | Filter by specific entity |
| type | string | Filter by activity type (email, call, meeting, note) |

#### Create Activity

```
POST /api/v1/activities
```

**Request:**
```json
{
  "type": "note",
  "entityType": "opportunity",
  "entityId": "opp_abc",
  "content": "Had a great call, moving to proposal stage",
  "metadata": {}
}
```

---

### Agents (Planned)

#### List Agent Configs

```
GET /api/v1/agents
```

#### Get Agent Config

```
GET /api/v1/agents/:agentType
```

#### Update Agent Config

```
PUT /api/v1/agents/:agentType
```

**Request:**
```json
{
  "enabled": true,
  "config": {
    "icpFilters": {
      "industries": ["Technology", "Healthcare"],
      "employeeRange": [50, 500]
    }
  }
}
```

#### Trigger Agent Run

```
POST /api/v1/agents/:agentType/run
```

#### Get Agent Run History

```
GET /api/v1/agents/:agentType/runs
```

---

### Approvals (Planned)

#### List Pending Approvals

```
GET /api/v1/approvals
```

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| agentType | string | Filter by agent type |
| itemType | string | Filter by item type (email, call) |

#### Get Approval Item

```
GET /api/v1/approvals/:id
```

#### Approve Item

```
POST /api/v1/approvals/:id/approve
```

**Request:**
```json
{
  "modifications": {
    "content": "Updated email content..."
  }
}
```

#### Reject Item

```
POST /api/v1/approvals/:id/reject
```

**Request:**
```json
{
  "reason": "Tone doesn't match our brand"
}
```

#### Bulk Approve

```
POST /api/v1/approvals/bulk-approve
```

**Request:**
```json
{
  "ids": ["apv_123", "apv_456", "apv_789"]
}
```

---

## Webhooks (Planned)

Configure webhooks to receive real-time notifications.

### Webhook Events

| Event | Description |
|-------|-------------|
| `lead.created` | New lead added |
| `lead.converted` | Lead converted to account/contact |
| `opportunity.stage_changed` | Deal moved stages |
| `opportunity.won` | Deal closed won |
| `email.replied` | Prospect replied to email |
| `meeting.booked` | Meeting scheduled |

### Webhook Payload

```json
{
  "id": "evt_abc123",
  "type": "lead.created",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "lead": {
      "id": "lead_xyz",
      "companyName": "Acme Corp"
    }
  }
}
```

### Webhook Security

Webhooks include a signature header for verification:

```
X-Bevyly-Signature: sha256=abc123...
```

Verify using your webhook secret:
```javascript
const crypto = require('crypto');
const signature = crypto
  .createHmac('sha256', webhookSecret)
  .update(payload)
  .digest('hex');
```

---

## SDKs (Planned)

### JavaScript/TypeScript

```bash
npm install @bevyly/sdk
```

```typescript
import { Bevyly } from '@bevyly/sdk';

const bevyly = new Bevyly({ apiKey: 'bev_sk_live_...' });

const leads = await bevyly.leads.list({ status: 'new' });
const account = await bevyly.accounts.create({
  name: 'Acme Corp',
  domain: 'acme.com',
});
```

### Python

```bash
pip install bevyly
```

```python
from bevyly import Bevyly

bevyly = Bevyly(api_key='bev_sk_live_...')

leads = bevyly.leads.list(status='new')
account = bevyly.accounts.create(
    name='Acme Corp',
    domain='acme.com'
)
```
