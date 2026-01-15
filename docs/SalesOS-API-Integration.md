# SalesOS: API & INTEGRATION GUIDE
## Complete API Reference & Integration Documentation

**Version:** 1.0  
**Status:** Production-Ready  
**Date:** January 2026

---

## TABLE OF CONTENTS

1. [API Overview](#api-overview)
2. [Authentication](#authentication)
3. [Core API Endpoints](#core-api-endpoints)
4. [Integration Patterns](#integration-patterns)
5. [CRM Integrations](#crm-integrations)
6. [Webhook Events](#webhook-events)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [SDK & Libraries](#sdk--libraries)

---

## API OVERVIEW

### Base URL

```
Production: https://api.salesos.com/v1
Staging:    https://staging-api.salesos.com/v1
Development: http://localhost:3000/v1
```

### API Versions

- **v1**: Current (Phase 1 - 2)
- **v2**: Future (extensible)

### Protocol

- **Format:** JSON
- **Protocol:** HTTPS (TLS 1.2+)
- **Response Encoding:** gzip

### Response Format

**Success Response (2xx):**
```json
{
  "success": true,
  "data": {
    // resource data
  },
  "meta": {
    "timestamp": "2026-01-03T15:30:00Z",
    "request_id": "req_abc123"
  }
}
```

**Error Response (4xx, 5xx):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Email address is invalid",
    "details": {
      "field": "email",
      "issue": "format"
    }
  },
  "meta": {
    "timestamp": "2026-01-03T15:30:00Z",
    "request_id": "req_abc123"
  }
}
```

---

## AUTHENTICATION

### API Key Authentication

**For server-to-server integrations:**

```
Header: Authorization: Bearer {api_key}
```

**Generate API Key:**
```
POST /auth/api-keys
Body: { name: "Integration Key" }
Response: { key: "sk_live_abc123..." }
```

**Revoke API Key:**
```
DELETE /auth/api-keys/{key_id}
```

### OAuth 2.0 Authentication

**For third-party integrations (CRM, email providers):**

**Authorization Code Flow:**
```
1. Redirect to: https://auth.salesos.com/oauth/authorize?
   client_id={client_id}
   &redirect_uri={your_redirect_uri}
   &scope=crm.read,crm.write,email.read
   &response_type=code

2. User authorizes → redirected to {redirect_uri}?code={auth_code}

3. Exchange code for token:
   POST /oauth/token
   Body: {
     client_id: {client_id},
     client_secret: {client_secret},
     code: {auth_code},
     grant_type: "authorization_code"
   }
   Response: {
     access_token: "at_abc123...",
     refresh_token: "rt_def456...",
     expires_in: 3600
   }

4. Use access token:
   Header: Authorization: Bearer {access_token}
```

**Refresh Token:**
```
POST /oauth/token
Body: {
  client_id: {client_id},
  client_secret: {client_secret},
  refresh_token: {refresh_token},
  grant_type: "refresh_token"
}
```

### JWT (For Frontend)

**Login:**
```
POST /auth/login
Body: { email, password }
Response: {
  token: "eyJhbGc...",
  expires_in: 86400
}
```

**Validate Token:**
```
Header: Authorization: Bearer {token}
```

---

## CORE API ENDPOINTS

### ACCOUNTS

**Create Account**
```
POST /accounts
Content-Type: application/json

{
  "name": "Acme Corporation",
  "domain": "acme.com",
  "industry": "SaaS",
  "company_size": "50-100",
  "revenue": 25000000,
  "location": "San Francisco, CA"
}

Response (201):
{
  "data": {
    "id": "acc_abc123",
    "name": "Acme Corporation",
    "fit_score": 0.85,
    "intent_score": 0,
    "status": "prospect",
    "created_at": "2026-01-03T15:30:00Z"
  }
}
```

**List Accounts**
```
GET /accounts?tier=1,2&sort=-fit_score&limit=50&offset=0

Response:
{
  "data": [
    { "id": "acc_1", "name": "Company 1", ... },
    { "id": "acc_2", "name": "Company 2", ... }
  ],
  "meta": {
    "total": 1250,
    "limit": 50,
    "offset": 0
  }
}
```

**Get Account**
```
GET /accounts/{account_id}

Response:
{
  "data": {
    "id": "acc_abc123",
    "name": "Acme Corporation",
    "domain": "acme.com",
    "fit_score": 0.85,
    "intent_score": 0.45,
    "status": "prospect",
    "contacts": [ { "id": "con_1", "name": "John Doe", ... } ],
    "activities": [ { type: "email", ... } ],
    "created_at": "2026-01-03T15:30:00Z"
  }
}
```

**Update Account**
```
PATCH /accounts/{account_id}
Body: {
  "status": "active",
  "notes": "High-value prospect"
}

Response (200): { data: { ... } }
```

**Delete Account**
```
DELETE /accounts/{account_id}
Response (204): No content
```

---

### CONTACTS

**Create Contact**
```
POST /contacts
Body: {
  "account_id": "acc_abc123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@acme.com",
  "title": "VP Sales",
  "linkedin_url": "https://linkedin.com/in/johndoe"
}

Response (201):
{
  "data": {
    "id": "con_xyz789",
    "email": "john@acme.com",
    "engagement_score": 0,
    "tier": 4,
    "status": "new"
  }
}
```

**List Contacts**
```
GET /contacts?account_id={account_id}&tier=1,2&engagement_score_min=50

Response:
{
  "data": [ ... ],
  "meta": { "total": 45, ... }
}
```

**Get Contact**
```
GET /contacts/{contact_id}

Response:
{
  "data": {
    "id": "con_xyz789",
    "account_id": "acc_abc123",
    "email": "john@acme.com",
    "engagement_score": 65,
    "intent_score": 45,
    "tier": 2,
    "activities": [ ... ],
    "next_best_action": {
      "action": "schedule_meeting",
      "confidence": 0.82
    }
  }
}
```

**Get Contact Engagement Score**
```
GET /contacts/{contact_id}/engagement-score

Response:
{
  "data": {
    "score": 65,
    "components": {
      "email_opens": 3,
      "email_clicks": 2,
      "email_replies": 1,
      "meetings_attended": 0
    },
    "tier": 2,
    "last_activity": "2026-01-03T10:30:00Z",
    "calculated_at": "2026-01-03T15:30:00Z"
  }
}
```

---

### EMAILS

**Send Email**
```
POST /emails/send
Body: {
  "contact_id": "con_xyz789",
  "template_id": "tpl_abc123",
  "variables": {
    "first_name": "John",
    "company_name": "Acme Corp"
  },
  "scheduled_for": "2026-01-04T09:00:00Z",
  "track_opens": true,
  "track_clicks": true
}

Response (201):
{
  "data": {
    "id": "email_123",
    "contact_id": "con_xyz789",
    "status": "scheduled",
    "scheduled_for": "2026-01-04T09:00:00Z",
    "created_at": "2026-01-03T15:30:00Z"
  }
}
```

**Get Email**
```
GET /emails/{email_id}

Response:
{
  "data": {
    "id": "email_123",
    "contact_id": "con_xyz789",
    "subject": "Hello John - let's talk about Acme",
    "status": "opened",
    "sent_at": "2026-01-04T09:00:00Z",
    "opened_at": "2026-01-04T09:05:00Z",
    "clicked_at": "2026-01-04T09:07:00Z",
    "replied_at": null
  }
}
```

**List Email Templates**
```
GET /emails/templates

Response:
{
  "data": [
    {
      "id": "tpl_abc123",
      "name": "First Outreach",
      "subject": "Hello {{first_name}} - Quick idea for {{company_name}}",
      "variables": ["first_name", "company_name"],
      "created_at": "2026-01-01T00:00:00Z"
    }
  ]
}
```

**Create Email Template**
```
POST /emails/templates
Body: {
  "name": "First Outreach",
  "subject": "Hello {{first_name}} - Quick idea for {{company_name}}",
  "body": "Hi {{first_name}},\n\n{{company_name}} is...",
  "variables": ["first_name", "company_name"]
}

Response (201): { data: { ... } }
```

---

### MEETINGS

**Propose Meeting**
```
POST /meetings/propose
Body: {
  "contact_id": "con_xyz789",
  "rep_id": "user_456",
  "slots": [
    { "start": "2026-01-06T14:00:00Z", "end": "2026-01-06T14:30:00Z" },
    { "start": "2026-01-06T15:00:00Z", "end": "2026-01-06T15:30:00Z" },
    { "start": "2026-01-06T16:00:00Z", "end": "2026-01-06T16:30:00Z" }
  ]
}

Response (201):
{
  "data": {
    "id": "mtg_abc123",
    "contact_id": "con_xyz789",
    "status": "proposed",
    "proposed_slots": [ ... ],
    "created_at": "2026-01-03T15:30:00Z"
  }
}
```

**Accept Meeting**
```
POST /meetings/{meeting_id}/accept
Body: {
  "selected_slot": 0  // index of preferred slot
}

Response (200):
{
  "data": {
    "id": "mtg_abc123",
    "status": "accepted",
    "selected_slot": { "start": "...", "end": "..." },
    "calendar_event_id": "evt_google123",
    "video_link": "https://meet.google.com/abc-xyz"
  }
}
```

**Get Meeting**
```
GET /meetings/{meeting_id}

Response:
{
  "data": {
    "id": "mtg_abc123",
    "contact_id": "con_xyz789",
    "rep_id": "user_456",
    "status": "scheduled",
    "scheduled_at": "2026-01-06T14:00:00Z",
    "duration_minutes": 30,
    "video_link": "https://meet.google.com/abc-xyz",
    "recording_url": "https://drive.google.com/...",
    "notes": "Discussed pricing, needs follow-up"
  }
}
```

---

### SEQUENCES

**Create Sequence**
```
POST /sequences
Body: {
  "name": "7-Touch SDR Campaign",
  "description": "Initial outreach sequence for cold prospects",
  "steps": [
    {
      "order": 1,
      "type": "email",
      "delay_days": 0,
      "template_id": "tpl_first_email"
    },
    {
      "order": 2,
      "type": "email",
      "delay_days": 3,
      "template_id": "tpl_follow_up_1"
    },
    {
      "order": 3,
      "type": "linkedin",
      "delay_days": 5,
      "message": "Hi {{first_name}}, saw your profile..."
    },
    {
      "order": 4,
      "type": "email",
      "delay_days": 7,
      "template_id": "tpl_follow_up_2"
    }
  ]
}

Response (201):
{
  "data": {
    "id": "seq_abc123",
    "name": "7-Touch SDR Campaign",
    "steps": [ ... ],
    "created_at": "2026-01-03T15:30:00Z"
  }
}
```

**Add Contact to Sequence**
```
POST /contacts/{contact_id}/sequence
Body: {
  "sequence_id": "seq_abc123"
}

Response (201):
{
  "data": {
    "id": "con_seq_xyz",
    "contact_id": "con_xyz789",
    "sequence_id": "seq_abc123",
    "status": "in_progress",
    "current_step": 1,
    "started_at": "2026-01-03T15:30:00Z"
  }
}
```

---

### DASHBOARDS

**Get Overview Dashboard**
```
GET /dashboards/overview?period=last_30_days

Response:
{
  "data": {
    "stats": {
      "total_accounts": 1250,
      "total_contacts": 5000,
      "new_this_month": 350,
      "engagement_avg": 52
    },
    "charts": {
      "pipeline_by_stage": [ ... ],
      "activity_trend": [ ... ],
      "top_engaging_accounts": [ ... ]
    }
  }
}
```

**Get Team Performance Dashboard**
```
GET /dashboards/team-performance

Response:
{
  "data": {
    "reps": [
      {
        "name": "John Smith",
        "emails_sent": 120,
        "open_rate": 0.28,
        "reply_rate": 0.08,
        "meetings_booked": 12,
        "deals_closed": 2
      }
    ]
  }
}
```

---

## INTEGRATION PATTERNS

### Webhook Subscriptions

**Register Webhook**
```
POST /webhooks
Body: {
  "url": "https://your-domain.com/webhooks/salesos",
  "events": [
    "email.opened",
    "email.replied",
    "contact.created",
    "meeting.scheduled"
  ]
}

Response (201):
{
  "data": {
    "id": "wh_abc123",
    "url": "https://your-domain.com/webhooks/salesos",
    "events": [ ... ],
    "active": true
  }
}
```

**Webhook Event Format**
```json
POST https://your-domain.com/webhooks/salesos
Header: X-SalesOS-Signature: sha256=<hmac>

{
  "event_id": "evt_abc123",
  "type": "email.opened",
  "timestamp": "2026-01-03T15:30:00Z",
  "data": {
    "email_id": "email_123",
    "contact_id": "con_xyz789",
    "opened_at": "2026-01-03T15:30:00Z"
  }
}
```

**Webhook Retry Logic:**
- Retry 5 times with exponential backoff
- First retry: 1 minute
- Last retry: 6 hours after initial attempt
- Disable webhook after 5 failed attempts

---

## CRM INTEGRATIONS

### Salesforce Integration

**Install Integration**
```
1. User clicks "Connect Salesforce"
2. Redirected to Salesforce OAuth flow
3. After authorization:
   
   POST /crm/salesforce/connect
   Body: { auth_code }
   Response: { status: "connected" }
```

**Automatic Sync**
```
SalesOS → Salesforce:
- Email sent → Task
- Email opened → Update engagement field
- Meeting scheduled → Event
- Contact created → Contact
- Account created → Account

Salesforce → SalesOS:
- Contact/Account manual edit → Sync back
- Opportunity stage change → Sync opportunity
```

**Manual Field Mapping**
```
GET /crm/salesforce/fields
Response: List of Salesforce fields

POST /crm/salesforce/field-mapping
Body: {
  "salesos_field": "engagement_score",
  "salesforce_field": "SalesOS_Engagement_Score__c",
  "direction": "to_salesforce"
}
```

### HubSpot Integration

```
Similar to Salesforce

1. Connect via OAuth
2. Auto-sync enabled
3. Activity → Engagement automatically
4. Contact properties sync
```

### Pipedrive Integration

```
Similar pattern to HubSpot/Salesforce

Sync: Deals, Activities, Persons, Organizations
```

---

## WEBHOOK EVENTS

### Event Types

**Email Events**
```
email.send_requested      - Email ready to send
email.sent               - Email sent successfully
email.failed             - Email send failed
email.opened             - Prospect opened email
email.clicked            - Prospect clicked link
email.replied            - Prospect replied
email.unsubscribed       - Contact unsubscribed
```

**Contact Events**
```
contact.created          - New contact created
contact.updated          - Contact info updated
contact.enriched         - Contact enriched with data
contact.scored           - Engagement score calculated
contact.tiered           - Tier assigned
```

**Account Events**
```
account.created          - New account created
account.enriched         - Account enriched
account.scored           - Fit score calculated
account.intent_detected  - Intent signal detected
```

**Meeting Events**
```
meeting.proposed         - Meeting proposed to prospect
meeting.accepted         - Prospect accepted
meeting.declined         - Prospect declined
meeting.scheduled        - Calendar event created
meeting.reminded         - Reminder sent
meeting.attended         - Meeting occurred
meeting.no_show          - Prospect didn't attend
```

**Sequence Events**
```
sequence.created         - New sequence created
sequence.started         - Contact added to sequence
sequence.completed       - Sequence completed for contact
sequence.paused          - Sequence paused
```

---

## ERROR HANDLING

### Error Codes

```
200: OK
201: Created
202: Accepted (async operation)
204: No Content

400: Bad Request (invalid input)
401: Unauthorized (auth failed)
403: Forbidden (no permission)
404: Not Found
409: Conflict (resource exists)
429: Too Many Requests (rate limited)

500: Internal Server Error
502: Bad Gateway
503: Service Unavailable
```

### Error Response Examples

**Validation Error**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "issue": "invalid_format",
        "message": "Email must be valid format"
      }
    ]
  }
}
```

**Rate Limit**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "retry_after_seconds": 60
    }
  }
}

Header: Retry-After: 60
```

**CRM API Error**
```json
{
  "success": false,
  "error": {
    "code": "CRM_SYNC_FAILED",
    "message": "Failed to sync with CRM",
    "details": {
      "crm_type": "salesforce",
      "crm_error": "INVALID_FIELD_NAME",
      "crm_message": "Field does not exist"
    }
  }
}
```

---

## RATE LIMITING

### Rate Limits

**Per Customer:**
- 1,000 requests / minute (all endpoints)
- 10,000 requests / hour

**Per Endpoint:**
- List endpoints: 100 requests / minute
- Create endpoints: 50 requests / minute
- Search endpoints: 50 requests / minute

**Burst Limits:**
- Max 100 concurrent requests
- Max 50 concurrent bulk operations

### Rate Limit Headers

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 987
X-RateLimit-Reset: 1672678800

X-RateLimit-Limit-Burst: 100
X-RateLimit-Remaining-Burst: 98
```

### Handling Rate Limits

```python
import time
import requests

def call_api_with_retry(url, **kwargs):
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = requests.get(url, **kwargs)
            
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 60))
                print(f"Rate limited. Retrying in {retry_after}s")
                time.sleep(retry_after)
                continue
            
            response.raise_for_status()
            return response.json()
        
        except requests.exceptions.RequestException as e:
            if attempt == max_retries - 1:
                raise
            time.sleep(2 ** attempt)  # exponential backoff
```

---

## SDK & LIBRARIES

### JavaScript/Node.js SDK

**Installation:**
```bash
npm install @salesos/sdk
```

**Usage:**
```javascript
import SalesOS from '@salesos/sdk';

const client = new SalesOS({
  apiKey: 'sk_live_abc123...'
});

// Create account
const account = await client.accounts.create({
  name: 'Acme Corp',
  domain: 'acme.com'
});

// Send email
const email = await client.emails.send({
  contactId: 'con_123',
  templateId: 'tpl_456',
  variables: { firstName: 'John' }
});

// Listen to webhooks
client.webhooks.on('email.opened', (event) => {
  console.log(`Email opened: ${event.data.email_id}`);
});
```

### Python SDK

**Installation:**
```bash
pip install salesos-sdk
```

**Usage:**
```python
from salesos import SalesOS

client = SalesOS(api_key='sk_live_abc123...')

# Create account
account = client.accounts.create(
    name='Acme Corp',
    domain='acme.com'
)

# Send email
email = client.emails.send(
    contact_id='con_123',
    template_id='tpl_456',
    variables={'first_name': 'John'}
)

# List contacts
contacts = client.contacts.list(
    account_id='acc_123',
    tier=['1', '2']
)
```

### REST Client Examples

**cURL:**
```bash
curl -X POST https://api.salesos.com/v1/emails/send \
  -H "Authorization: Bearer sk_live_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "contact_id": "con_123",
    "template_id": "tpl_456",
    "variables": {"first_name": "John"}
  }'
```

**Postman:**
```
Import: https://docs.salesos.com/postman-collection.json
Set environment variable: api_key = sk_live_abc123...
```

---

**END OF API & INTEGRATION GUIDE**

This document provides complete API reference for all endpoints and integration patterns.

Use this alongside the PRD and Technical Architecture for complete specification.

