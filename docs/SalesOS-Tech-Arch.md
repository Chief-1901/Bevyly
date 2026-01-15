# SalesOS: TECHNICAL ARCHITECTURE & SYSTEM DESIGN DOCUMENT
## Complete End-to-End System Architecture

**Version:** 1.0  
**Status:** Production-Ready  
**Date:** January 2026  
**Author:** Technical Leadership

---

## TABLE OF CONTENTS

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Agent Architecture](#agent-architecture)
4. [Data Flow & Event Streaming](#data-flow--event-streaming)
5. [Database Design](#database-design)
6. [API Design](#api-design)
7. [Integration Architecture](#integration-architecture)
8. [Security & Compliance](#security--compliance)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Scalability & Performance](#scalability--performance)
11. [Monitoring & Observability](#monitoring--observability)
12. [Error Handling & Resilience](#error-handling--resilience)

---

## ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Web Dashboard    │  │ Mobile App   │  │ CRM Extensions  │   │
│  │ (React/Next.js)  │  │ (React Native)│  │ (Salesforce,    │   │
│  │                  │  │              │  │  HubSpot plugin) │   │
│  └──────────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ (HTTPS/gRPC)
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY LAYER                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ API Gateway (Kong/AWS API Gateway)                      │   │
│  │ - Rate limiting, authentication, routing               │   │
│  │ - Request validation, response caching                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER (Microservices)               │
│                                                                  │
│  PHASE 1 SERVICES:                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Email Service    │  │ Calendar     │  │ CRM Sync Service │ │
│  │ (Email sending,  │  │ Service      │  │ (Real-time       │ │
│  │ tracking)        │  │ (Meet/Zoom)  │  │  sync to CRM)    │ │
│  └──────────────────┘  └──────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐                        │
│  │ Engagement       │  │ Lead Management                        │
│  │ Service          │  │ (Account/Contact CRUD)                │
│  │ (Scoring)        │  │                                        │
│  └──────────────────┘  └──────────────┘                        │
│                                                                  │
│  PHASE 2 SERVICES:                                              │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Lead Source      │  │ Enrichment   │  │ Contact Finder   │ │
│  │ Service          │  │ Service      │  │ Service          │ │
│  │ (Find companies) │  │ (Deep dive)  │  │ (Find people)    │ │
│  └──────────────────┘  └──────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐                        │
│  │ Scoring Service  │  │ Sequence     │                        │
│  │ (Rank leads)     │  │ Service      │                        │
│  │                  │  │ (Build plans)│                        │
│  └──────────────────┘  └──────────────┘                        │
│                                                                  │
│  FUTURE SERVICES:                                               │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ Discovery Service│  │ Proposal     │  │ Closing Service  │ │
│  │ (Call recording, │  │ Service      │  │ (Negotiation,    │ │
│  │ transcription)   │  │ (Proposal    │  │  contract)       │ │
│  │                  │  │  generation) │  │                  │ │
│  └──────────────────┘  └──────────────┘  └──────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EVENT STREAMING LAYER                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Kafka / AWS Kinesis                                      │   │
│  │ Topics:                                                  │   │
│  │ - email.sent, email.opened, email.clicked, email.reply  │   │
│  │ - contact.created, contact.updated, contact.enriched    │   │
│  │ - account.created, account.enriched, account.scored     │   │
│  │ - meeting.scheduled, meeting.attended, meeting.declined │   │
│  │ - sequence.created, sequence.started, sequence.paused   │   │
│  │ - engagement.updated, intent.detected, escalation       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                            │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ PostgreSQL       │  │ Redis (Cache)│  │ S3 (File Store)  │ │
│  │ (Primary DB)     │  │ (Hot data)   │  │ (Documents,      │ │
│  │ - Accounts       │  │ - Sessions   │  │  attachments)    │ │
│  │ - Contacts       │  │ - CRM sync   │  │                  │ │
│  │ - Activities     │  │   state      │  │                  │ │
│  │ - Integrations   │  │ - Rate limits│  │                  │ │
│  │ - Logs           │  │              │  │                  │ │
│  └──────────────────┘  └──────────────┘  └──────────────────┘ │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────┐                        │
│  │ Elasticsearch    │  │ TimescaleDB  │                        │
│  │ (Search/Analytics│  │ (Time-series │                        │
│  │ - Full-text      │  │  metrics)    │                        │
│  │ - Aggregations   │  │              │                        │
│  │ - Dashboards)    │  │              │                        │
│  └──────────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │ CRMs         │  │ Email        │  │ Data Sources         │ │
│  │ - Salesforce │  │ - Gmail      │  │ - Apollo.io          │ │
│  │ - HubSpot    │  │ - Outlook    │  │ - ZoomInfo           │ │
│  │ - Pipedrive  │  │ - SES        │  │ - Hunter.io          │ │
│  │ - Custom     │  │              │  │ - Clearbit           │ │
│  └──────────────┘  └──────────────┘  │ - LinkedIn API       │ │
│                                       │ - G2 API             │ │
│  ┌──────────────┐  ┌──────────────┐  │ - News APIs          │ │
│  │ Calendar     │  │ Communication│  └──────────────────────┘ │
│  │ - Google Cal │  │ - Slack      │                           │
│  │ - Outlook    │  │ - Teams      │   ┌──────────────────────┐ │
│  │ - Zoom       │  │ - SMS        │   │ AI Models            │ │
│  │ - Teams      │  │              │   │ - GPT-4              │ │
│  │ - Custom     │  │              │   │ - Claude             │ │
│  └──────────────┘  └──────────────┘   │ - Local LLMs         │ │
│                                       └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Microservices** - Each agent is independent service, can scale separately
2. **Event-Driven** - Services communicate via events, not direct calls
3. **Async-First** - Long operations are async with webhooks/polling
4. **Stateless** - Services are stateless, state in databases/cache
5. **API-First** - All integrations via APIs, webhook support
6. **Observable** - Comprehensive logging, tracing, metrics
7. **Resilient** - Retry logic, fallbacks, graceful degradation
8. **Secure** - Zero-trust, encryption, compliance

---

## CORE COMPONENTS

### 1. Email Service

**Responsibilities:**
- Send emails via multiple providers (Gmail, Outlook, SES)
- Track email events (sent, opened, clicked, replied)
- Manage warm-up sequences
- Handle bounces and unsubscribes
- Personalize email content

**Technology Stack:**
- **Runtime:** Node.js / Python
- **Email Providers:** Gmail API, Outlook API, AWS SES
- **Tracking:** Pixel tracking (unique URLs), open detection
- **Queue:** Bull/RabbitMQ (for async sending)
- **Storage:** PostgreSQL (activities), S3 (templates)

**Key APIs:**
```
POST /emails/send
  Body: { to, subject, body, template_id, variables }
  Returns: { email_id, scheduled_time }

GET /emails/{email_id}/tracking
  Returns: { sent_at, opened_at, clicked_at, replied_at, unsubscribed }

POST /emails/{email_id}/reply-detection
  Webhook from email provider
  Triggered: email.reply event → engagement updated
```

**Database Schema:**
```sql
emails
├── id (uuid)
├── customer_id (uuid)
├── contact_id (uuid)
├── from_address (text)
├── to_address (text)
├── subject (text)
├── body (text)
├── template_id (uuid)
├── provider (enum: gmail, outlook, ses)
├── status (enum: draft, scheduled, sent, opened, clicked, replied)
├── sent_at (timestamp)
├── opened_at (timestamp)
├── clicked_at (timestamp)
├── replied_at (timestamp)
├── unsubscribed (boolean)
├── bounce_type (enum: hard, soft, null)
├── bounce_reason (text)
├── created_at (timestamp)
├── updated_at (timestamp)
└── metadata (jsonb)

email_tracking_pixels
├── id (uuid)
├── email_id (uuid)
├── pixel_url (text - unique)
├── created_at (timestamp)
```

---

### 2. Calendar Service

**Responsibilities:**
- Fetch rep's available time slots
- Propose meetings to prospects
- Create calendar events
- Send meeting reminders
- Log attendee info

**Technology Stack:**
- **Runtime:** Node.js
- **Calendar APIs:** Google Calendar, Outlook, Zoom, Teams
- **Storage:** PostgreSQL (events, availability)
- **Queue:** Bull (for scheduled reminders)

**Key APIs:**
```
GET /calendar/{rep_id}/availability
  Query: date_range, min_duration
  Returns: available_slots (15-min increments)

POST /meetings/propose
  Body: { contact_id, rep_id, slots: [{ start, end }, ...] }
  Returns: { meeting_id, email_sent }

POST /meetings/{meeting_id}/accept
  Body: { prospect_slot_index }
  Returns: { calendar_invite_sent, video_link }

POST /webhooks/calendar-changed
  Webhook from calendar provider
  Updates: meeting.scheduled event
```

**Database Schema:**
```sql
rep_availability
├── id (uuid)
├── rep_id (uuid)
├── date (date)
├── start_time (time)
├── end_time (time)
├── timezone (text)
├── meeting_min_duration (integer - minutes)
├── buffer_between_meetings (integer - minutes)
├── status (enum: busy, available, blackout)
└── created_at (timestamp)

meetings
├── id (uuid)
├── customer_id (uuid)
├── rep_id (uuid)
├── contact_id (uuid)
├── proposed_slots (jsonb array)
├── selected_slot (jsonb)
├── status (enum: proposed, accepted, declined, completed, no-show)
├── calendar_event_id (text)
├── video_link (text)
├── attendee_count (integer)
├── duration_minutes (integer)
├── recording_url (text)
├── notes (text)
├── created_at (timestamp)
├── updated_at (timestamp)
└── scheduled_at (timestamp)
```

---

### 3. CRM Sync Service

**Responsibilities:**
- Bi-directional sync with CRM
- Update records in CRM in real-time
- Handle conflicts (CRM manual edits)
- Maintain sync state
- Provide webhooks for external changes

**Technology Stack:**
- **Runtime:** Node.js
- **CRM SDKs:** Salesforce (jsforce), HubSpot (hubspot), Pipedrive (pipedrive)
- **Storage:** PostgreSQL (sync state), Redis (active syncs)
- **Message Queue:** Kafka (event streaming)

**Sync Flow:**
```
Event occurs in SalesOS
    ↓
Event published to Kafka
    ↓
CRM Sync Service consumes event
    ↓
Transform SalesOS → CRM data
    ↓
Check conflict (did CRM manual change occur?)
    ↓
Update CRM via API
    ↓
Log sync state (success/failure)
    ↓
Emit crm.synced event
```

**Database Schema:**
```sql
crm_sync_state
├── id (uuid)
├── customer_id (uuid)
├── crm_type (enum: salesforce, hubspot, pipedrive)
├── crm_id (text)
├── salesos_id (uuid)
├── entity_type (enum: account, contact, activity, opportunity)
├── last_synced_at (timestamp)
├── last_synced_direction (enum: to_crm, from_crm)
├── last_crm_modified_at (timestamp)
├── last_salesos_modified_at (timestamp)
├── sync_status (enum: synced, pending, failed, conflict)
├── error_message (text)
├── retry_count (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

crm_field_mapping
├── id (uuid)
├── customer_id (uuid)
├── crm_type (enum: salesforce, hubspot, pipedrive)
├── salesos_field (text) - e.g., "engagement_score"
├── crm_field (text) - e.g., "SalesOS_Engagement_Score__c"
├── transform_function (text) - optional transformation logic
├── created_at (timestamp)
```

---

### 4. Engagement Service

**Responsibilities:**
- Calculate engagement scores
- Detect intent signals
- Trigger escalations
- Suggest next best actions
- Track contact lifecycle

**Technology Stack:**
- **Runtime:** Python (ML heavy)
- **ML Library:** scikit-learn, TensorFlow
- **Storage:** PostgreSQL (scores), Redis (cache)
- **Message Queue:** Kafka (event streaming)

**Scoring Model:**
```
Engagement Score = (email_opens * 0.25) + (email_clicks * 0.35) 
                 + (email_replies * 0.40)

Intent Score = (hiring_signal * 0.20) + (funding_signal * 0.25)
             + (news_signal * 0.15) + (review_signal * 0.20)
             + (website_signal * 0.20)

Priority Score = (Engagement * 0.4) + (Intent * 0.4) + (Fit * 0.2)
```

**Key APIs:**
```
GET /contacts/{contact_id}/engagement-score
  Returns: { score: 0-100, last_updated, components }

POST /webhooks/contact-activity
  Triggered on: email open, click, reply, meeting, call
  Updates: engagement_score event

GET /contacts/{contact_id}/next-best-action
  Returns: { action: "schedule_demo", confidence: 0.85, reason }
```

**Database Schema:**
```sql
engagement_scores
├── id (uuid)
├── contact_id (uuid)
├── email_opens (integer)
├── email_clicks (integer)
├── email_replies (integer)
├── meeting_attended (boolean)
├── call_duration (integer - seconds)
├── total_score (integer - 0-100)
├── intent_score (integer - 0-100)
├── priority_score (integer - 0-100)
├── tier (enum: 1, 2, 3, 4)
├── last_activity_at (timestamp)
├── calculated_at (timestamp)
└── updated_at (timestamp)

intent_signals
├── id (uuid)
├── account_id (uuid)
├── signal_type (enum: hiring, funding, news, website, review, conference)
├── signal_value (text) - actual data
├── source (text) - where we found it
├── detected_at (timestamp)
├── confidence (0-1)
├── score_contribution (integer)
└── created_at (timestamp)
```

---

### 5. Lead Source Service (Phase 2)

**Responsibilities:**
- Query data sources for companies
- Filter by ICP criteria
- Score companies by fit
- Deduplicate results
- Store in CRM

**Technology Stack:**
- **Runtime:** Python (data heavy)
- **Data APIs:** Apollo SDK, ZoomInfo API, LinkedIn API
- **Storage:** PostgreSQL (leads), Elasticsearch (search)
- **Cache:** Redis (search filters, recent results)

**Key APIs:**
```
POST /lead-sources/search
  Body: {
    industry: ["SaaS", "FinTech"],
    company_size_min: 50,
    company_size_max: 500,
    revenue_min: 10000000,
    revenue_max: 50000000,
    location: ["US"]
  }
  Returns: { job_id, status }

GET /lead-sources/search/{job_id}
  Returns: { status, progress, results: [...] }
  Results: { company_id, company_name, fit_score, data_source }

GET /lead-sources/search/{job_id}/export
  Returns: Companies added to CRM as Accounts
```

**Database Schema:**
```sql
lead_sources
├── id (uuid)
├── customer_id (uuid)
├── name (text)
├── api_name (text - "apollo", "zoominfo", "linkedin")
├── api_key (text - encrypted)
├── rate_limit_monthly (integer)
├── cost_per_lead (float)
├── is_active (boolean)
├── last_used_at (timestamp)
├── created_at (timestamp)
└── metadata (jsonb)

source_search_jobs
├── id (uuid)
├── customer_id (uuid)
├── filters (jsonb)
├── source_ids (uuid array)
├── status (enum: queued, running, completed, failed)
├── total_found (integer)
├── added_to_crm (integer)
├── cost_incurred (float)
├── started_at (timestamp)
├── completed_at (timestamp)
└── error_message (text)

companies_found
├── id (uuid)
├── customer_id (uuid)
├── external_id (text - api source id)
├── name (text)
├── domain (text)
├── industry (text)
├── company_size (text)
├── revenue (bigint)
├── founded_year (integer)
├── location (text)
├── fit_score (float - 0-1)
├── fit_score_components (jsonb)
├── crm_account_id (text)
├── status (enum: found, enriched, contacted)
├── created_at (timestamp)
└── updated_at (timestamp)
```

---

### 6. Enrichment Service (Phase 2)

**Responsibilities:**
- Research companies deeply
- Detect intent signals
- Identify tech stack
- Calculate intent score
- Store enriched data

**Technology Stack:**
- **Runtime:** Python
- **Data APIs:** Clearbit, Hunter, News APIs, Web scraping
- **Storage:** PostgreSQL (enriched data)
- **Cache:** Redis (lookups)

**Key APIs:**
```
POST /enrichment/enrich-company
  Body: { company_id, domain }
  Returns: { job_id }

GET /enrichment/enrich-company/{job_id}
  Returns: { status, enriched_data }

Enriched Data includes:
- Firmographics (size, revenue, funding)
- Intent signals (hiring, news, funding)
- Tech stack
- Recent updates
```

---

### 7. Contact Finder Service (Phase 2)

**Responsibilities:**
- Find people at target companies
- Identify decision makers
- Verify email addresses
- Enrich with LinkedIn data
- Rank by authority

**Technology Stack:**
- **Runtime:** Node.js
- **APIs:** Apollo, Hunter, LinkedIn API
- **Email Verification:** ZeroBounce, RocketReach
- **Storage:** PostgreSQL

---

### 8. Scoring Service (Phase 2)

**Responsibilities:**
- Score each contact (Fit + Intent = Priority)
- Tier contacts (Tier 1-4)
- Select sequence type
- Calculate optimal timing
- Extract personalization hooks

**Technology Stack:**
- **Runtime:** Python
- **ML:** scikit-learn, custom models
- **Storage:** PostgreSQL, Redis cache

---

## AGENT ARCHITECTURE

### Agent Pattern

Each agent follows this pattern:

```python
class Agent:
    def __init__(self, name, config):
        self.name = name
        self.config = config
        self.kafka_client = KafkaClient(config)
        self.db = PostgreSQL(config)
        self.logger = Logger(config)
    
    def listen(self):
        """Subscribe to input events"""
        self.kafka_client.subscribe(self.input_topics)
        while True:
            event = self.kafka_client.next_message()
            try:
                self.process_event(event)
            except Exception as e:
                self.handle_error(event, e)
    
    def process_event(self, event):
        """Core logic - agent-specific"""
        raise NotImplementedError()
    
    def publish_event(self, event_type, data):
        """Publish result events"""
        event = {
            'type': event_type,
            'timestamp': now(),
            'data': data
        }
        self.kafka_client.publish(event)
        self.logger.info(f"Published: {event_type}")
    
    def handle_error(self, event, error):
        """Error handling with retries"""
        retry_count = event.get('retry_count', 0)
        if retry_count < 3:
            event['retry_count'] = retry_count + 1
            self.kafka_client.publish(event)
        else:
            self.logger.error(f"Max retries reached: {error}")
            self.publish_event('agent.failed', {
                'agent': self.name,
                'event': event,
                'error': str(error)
            })
```

### Email Agent (Concrete Example)

```python
class EmailAgent(Agent):
    def process_event(self, event):
        if event['type'] == 'email.send_requested':
            self.send_email(event['data'])
        elif event['type'] == 'email.opened':
            self.handle_email_opened(event['data'])
        elif event['type'] == 'email.replied':
            self.handle_email_replied(event['data'])
    
    def send_email(self, data):
        contact_id = data['contact_id']
        template_id = data['template_id']
        variables = data['variables']
        
        # Fetch contact
        contact = self.db.contacts.get(contact_id)
        
        # Fetch template
        template = self.db.email_templates.get(template_id)
        
        # Personalize
        subject = template.subject.format(**variables)
        body = template.body.format(**variables)
        
        # Send via provider
        provider = self.get_provider(contact.customer_id)
        result = provider.send(
            to=contact.email,
            subject=subject,
            body=body
        )
        
        # Log activity
        email = Email(
            contact_id=contact_id,
            to_address=contact.email,
            subject=subject,
            status='sent',
            provider=provider.name,
            sent_at=now()
        )
        self.db.emails.create(email)
        
        # Publish event
        self.publish_event('email.sent', {
            'email_id': email.id,
            'contact_id': contact_id,
            'sent_at': email.sent_at
        })
    
    def handle_email_opened(self, data):
        email_id = data['email_id']
        email = self.db.emails.get(email_id)
        
        if email.status != 'opened':
            email.status = 'opened'
            email.opened_at = now()
            self.db.emails.update(email)
            
            self.publish_event('email.opened', {
                'email_id': email_id,
                'contact_id': email.contact_id,
                'opened_at': email.opened_at
            })
            
            # Trigger engagement update
            self.publish_event('engagement.updated', {
                'contact_id': email.contact_id
            })
```

### Agent Coordination Pattern

Agents communicate via Kafka topics, not direct calls:

```
Email Agent creates message:
├─ Publishes: email.sent
├─ Listens for: email.opened, email.replied

Email opened event triggers:
├─ Engagement Agent (recalculate score)
├─ CRM Sync Agent (update CRM)

High engagement triggers:
├─ Calendar Agent (propose meeting)
├─ Sequence Agent (send follow-up)
```

---

## DATA FLOW & EVENT STREAMING

### Event-Driven Architecture

All inter-service communication happens via Kafka topics (asynchronous):

```
Kafka Topics Structure:

email.*
├─ email.send_requested (in)
├─ email.sent (out)
├─ email.failed (out)
├─ email.opened (in - from webhook)
├─ email.clicked (in - from webhook)
├─ email.replied (in - from webhook)
└─ email.unsubscribed (in - from webhook)

contact.*
├─ contact.created
├─ contact.updated
├─ contact.enriched
├─ contact.scored
└─ contact.sequenced

account.*
├─ account.created
├─ account.enriched
├─ account.scored
└─ account.lifecycle_changed

meeting.*
├─ meeting.proposed
├─ meeting.accepted
├─ meeting.declined
├─ meeting.scheduled
├─ meeting.reminded
├─ meeting.attended
└─ meeting.no_show

sequence.*
├─ sequence.created
├─ sequence.started
├─ sequence.paused
├─ sequence.resumed
└─ sequence.completed

engagement.*
├─ engagement.updated
├─ engagement.scored
├─ intent.detected
├─ escalation.triggered
└─ next_action.suggested

crm.*
├─ crm.sync_requested
├─ crm.synced
├─ crm.sync_failed
└─ crm.conflict_detected
```

### Event Schema

```json
{
  "event_id": "uuid",
  "event_type": "email.opened",
  "timestamp": "2026-01-03T15:30:00Z",
  "customer_id": "cust_123",
  "entity_id": "email_456",
  "entity_type": "email",
  "source": "email_agent",
  "data": {
    "email_id": "email_456",
    "contact_id": "contact_789",
    "opened_at": "2026-01-03T15:30:00Z",
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0..."
  },
  "metadata": {
    "version": "1.0",
    "source_system": "SendGrid",
    "retry_count": 0
  }
}
```

### Event Flow Example: Email Workflow

```
User sends email request
    ↓
Email Agent receives: email.send_requested
    ↓
Validates, personalizes, sends via provider
    ↓
Publishes: email.sent
    ├─ CRM Sync consumes (logs to CRM)
    ├─ Engagement Service consumes (tracks)
    └─ Dashboard updates (real-time via WebSocket)
    ↓
Provider webhook: prospect opens email
    ↓
Email Agent receives: email.opened
    ↓
Publishes: email.opened
    ├─ Engagement Service consumes
    │  └─ Recalculates engagement score
    │     └─ Publishes: engagement.updated
    │        ├─ Calendar Agent (propose meeting?)
    │        ├─ Sequence Agent (send follow-up?)
    │        └─ CRM Sync (update engagement field)
    └─ Dashboard updates (real-time)
```

---

## DATABASE DESIGN

### Core Database Schema

```sql
-- CUSTOMERS & AUTH
customers
├── id (uuid primary key)
├── name (text)
├── email (text)
├── subscription_plan (enum: starter, growth, enterprise)
├── api_key (text)
├── created_at (timestamp)
└── updated_at (timestamp)

users
├── id (uuid)
├── customer_id (uuid fk)
├── email (text)
├── role (enum: admin, manager, rep, viewer)
├── password_hash (text)
├── created_at (timestamp)
└── is_active (boolean)

-- SALES ENTITIES
accounts
├── id (uuid)
├── customer_id (uuid fk)
├── crm_id (text - Salesforce/HubSpot id)
├── name (text)
├── domain (text)
├── industry (text)
├── company_size (enum)
├── revenue (bigint)
├── location (text)
├── fit_score (float - 0-1)
├── intent_score (float - 0-1)
├── status (enum: prospect, active, closed-won, closed-lost)
├── owner_id (uuid fk users)
├── created_at (timestamp)
├── updated_at (timestamp)
└── metadata (jsonb)

contacts
├── id (uuid)
├── customer_id (uuid fk)
├── account_id (uuid fk)
├── crm_id (text)
├── first_name (text)
├── last_name (text)
├── email (text)
├── phone (text)
├── linkedin_url (text)
├── title (text)
├── seniority (enum: executive, director, manager, individual-contributor)
├── engagement_score (int - 0-100)
├── intent_score (int - 0-100)
├── tier (enum: 1, 2, 3, 4)
├── status (enum: new, engaged, responded, qualified, disqualified)
├── created_at (timestamp)
└── updated_at (timestamp)

-- ACTIVITIES
emails (see above)
meetings (see above)
calls
├── id (uuid)
├── contact_id (uuid fk)
├── rep_id (uuid fk)
├── status (enum: scheduled, completed, missed, declined)
├── scheduled_at (timestamp)
├── started_at (timestamp)
├── duration_seconds (integer)
├── recording_url (text)
├── transcript (text)
├── notes (text)
├── outcome (enum: scheduled_demo, need_more_time, qualified, disqualified)
├── created_at (timestamp)
└── updated_at (timestamp)

-- SEQUENCES & AUTOMATION
sequences
├── id (uuid)
├── customer_id (uuid fk)
├── name (text)
├── description (text)
├── type (enum: manual, automated)
├── steps (jsonb array) - steps in sequence
├── default_for_tier (enum: 1, 2, 3, 4)
├── status (enum: draft, active, paused, archived)
├── created_at (timestamp)
└── updated_at (timestamp)

contact_sequences
├── id (uuid)
├── contact_id (uuid fk)
├── sequence_id (uuid fk)
├── status (enum: not_started, in_progress, completed, paused)
├── current_step (integer)
├── started_at (timestamp)
├── completed_at (timestamp)
└── paused_at (timestamp)

-- INTEGRATIONS & CONFIG
crm_integrations
├── id (uuid)
├── customer_id (uuid fk)
├── crm_type (enum: salesforce, hubspot, pipedrive)
├── account_id (text)
├── access_token (text - encrypted)
├── refresh_token (text - encrypted)
├── is_active (boolean)
├── last_synced_at (timestamp)
├── created_at (timestamp)
└── updated_at (timestamp)

email_provider_accounts
├── id (uuid)
├── customer_id (uuid fk)
├── provider (enum: gmail, outlook, ses)
├── email_address (text)
├── access_token (text - encrypted)
├── is_active (boolean)
├── warmup_status (enum: not_started, in_progress, completed)
├── daily_send_limit (integer)
├── created_at (timestamp)
└── updated_at (timestamp)

-- TEMPLATES
email_templates
├── id (uuid)
├── customer_id (uuid fk)
├── name (text)
├── subject (text)
├── body (text)
├── variables (text array)
├── created_at (timestamp)
└── updated_at (timestamp)
```

### Indexing Strategy

```sql
-- Performance-critical indexes
CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_contacts_customer ON contacts(customer_id);
CREATE INDEX idx_contacts_account ON contacts(account_id);
CREATE INDEX idx_contacts_tier ON contacts(tier) WHERE tier IN (1,2);
CREATE INDEX idx_emails_contact ON emails(contact_id);
CREATE INDEX idx_emails_status ON emails(status);
CREATE INDEX idx_emails_sent_at ON emails(sent_at DESC);
CREATE INDEX idx_engagement_scores_contact ON engagement_scores(contact_id);
CREATE INDEX idx_meetings_rep ON meetings(rep_id);

-- Search indexes (Elasticsearch)
-- Full-text search on accounts, contacts
```

---

## API DESIGN

### REST API Structure

**Base URL:** `https://api.salesos.com/v1`

**Authentication:** OAuth 2.0 + API Key backup

**Rate Limiting:** 1,000 req/min per customer

### Core Endpoints

```
ACCOUNTS
  POST   /accounts               - Create account
  GET    /accounts               - List accounts (paginated)
  GET    /accounts/{id}          - Get account details
  PATCH  /accounts/{id}          - Update account
  DELETE /accounts/{id}          - Delete account
  GET    /accounts/{id}/contacts - List account's contacts
  GET    /accounts/{id}/activities - List account's activities

CONTACTS
  POST   /contacts               - Create contact
  GET    /contacts               - List contacts (with filters)
  GET    /contacts/{id}          - Get contact details
  PATCH  /contacts/{id}          - Update contact
  DELETE /contacts/{id}          - Delete contact
  GET    /contacts/{id}/activities - List contact's activities
  GET    /contacts/{id}/engagement-score - Get engagement score
  POST   /contacts/{id}/propose-meeting - Propose meetings

EMAILS
  POST   /emails/send            - Send email
  GET    /emails/{id}            - Get email details
  GET    /emails/{id}/tracking   - Get tracking events
  POST   /emails/templates       - Create template
  GET    /emails/templates       - List templates
  PATCH  /emails/templates/{id}  - Update template

MEETINGS
  POST   /meetings/propose       - Propose meeting
  GET    /meetings/{id}          - Get meeting details
  PATCH  /meetings/{id}/accept   - Accept proposed meeting
  PATCH  /meetings/{id}/decline  - Decline proposed meeting
  GET    /meetings/{id}/attendees - Get attendee list

SEQUENCES
  POST   /sequences              - Create sequence
  GET    /sequences              - List sequences
  PATCH  /sequences/{id}         - Update sequence
  POST   /contacts/{id}/sequence - Add contact to sequence
  DELETE /contacts/{id}/sequence/{seq_id} - Remove from sequence

DASHBOARDS
  GET    /dashboards/overview    - Main dashboard data
  GET    /dashboards/pipeline    - Pipeline visualization
  GET    /dashboards/forecasts   - Revenue forecast
  GET    /dashboards/team        - Team performance
  GET    /reports/{report_type}  - Custom reports
```

### Request/Response Example

```json
POST /emails/send
{
  "contact_id": "contact_123",
  "template_id": "template_456",
  "variables": {
    "first_name": "John",
    "company_name": "Acme Corp"
  },
  "scheduled_for": "2026-01-04T09:00:00Z",
  "track_opens": true,
  "track_clicks": true
}

Response (201 Created):
{
  "id": "email_789",
  "contact_id": "contact_123",
  "status": "scheduled",
  "sent_at": null,
  "scheduled_for": "2026-01-04T09:00:00Z",
  "created_at": "2026-01-03T15:30:00Z"
}
```

### Webhook Events

Services can register webhooks for events:

```json
POST /webhooks
{
  "url": "https://customer.example.com/webhooks/salesos",
  "events": [
    "email.opened",
    "email.replied",
    "meeting.accepted",
    "engagement.updated"
  ]
}

Webhook delivery (POST to customer URL):
{
  "event_id": "evt_123",
  "type": "email.opened",
  "timestamp": "2026-01-03T15:30:00Z",
  "data": {
    "email_id": "email_456",
    "contact_id": "contact_789",
    "opened_at": "2026-01-03T15:30:00Z"
  }
}
```

---

## INTEGRATION ARCHITECTURE

### CRM Integration Pattern

```
SalesOS ←→ Salesforce/HubSpot/Pipedrive

Bidirectional Sync:
- SalesOS → CRM: Account created, contact created, activity logged
- CRM → SalesOS: Account/Contact modified, opportunity created, stage changed

Conflict Resolution:
- If both systems modified same field:
  1. Check timestamp (newer wins)
  2. User preference (SalesOS or CRM)
  3. Manual review (force user to resolve)
```

### Third-Party API Integration Pattern

```python
class APIIntegration:
    def __init__(self, api_key, api_base):
        self.api_key = api_key
        self.api_base = api_base
        self.session = requests.Session()
    
    def make_request(self, method, endpoint, **kwargs):
        url = f"{self.api_base}/{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'User-Agent': 'SalesOS/1.0'
        }
        
        try:
            response = self.session.request(
                method, url, headers=headers, **kwargs, timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RateLimitError:
            # Handle rate limiting with exponential backoff
            raise RetryableError("Rate limited")
        except requests.exceptions.ConnectionError:
            # Handle connection errors
            raise RetryableError("Connection failed")
    
    def search_companies(self, filters):
        return self.make_request('POST', 'search', json=filters)
    
    def get_company(self, company_id):
        return self.make_request('GET', f'companies/{company_id}')
```

---

## SECURITY & COMPLIANCE

### Authentication & Authorization

```
API Key-based:
├─ Customer API Key (for integrations)
├─ Generated per customer, can be rotated
├─ Stored hashed in database
└─ Rate-limited per key

OAuth 2.0:
├─ For third-party integrations
├─ Authorization Code flow
├─ Tokens stored encrypted
└─ Automatic refresh

Role-Based Access Control:
├─ Admin (full access)
├─ Manager (team views, reporting)
├─ Rep (personal leads/pipeline)
└─ Viewer (read-only dashboards)
```

### Data Security

```
Encryption at Transit:
├─ All HTTPS (TLS 1.2+)
├─ API endpoints require HTTPS
└─ Webhooks must be HTTPS

Encryption at Rest:
├─ Database: AES-256 (RDS encryption)
├─ Sensitive fields: Application-level encryption
│  └─ API keys, access tokens, passwords
├─ Backups: Encrypted
└─ S3 storage: Server-side encryption

PII Protection:
├─ Contact emails hashed in some tables
├─ Phone numbers tokenized
├─ SSN/credit card: never stored
└─ GDPR right to deletion implemented
```

### Compliance

```
GDPR:
├─ Consent management (prior consent for processing)
├─ Data portability (export all customer data)
├─ Right to deletion (delete all data within 30 days)
├─ Data processing agreements (DPA)
└─ Privacy policy (clear, in customer language)

CAN-SPAM:
├─ Unsubscribe link (in every email)
├─ Physical address (in email footer)
├─ Honor unsubscribe within 10 days
└─ Accurate subject lines

CCPA:
├─ Consumer privacy notice (at collection)
├─ Opt-out mechanism (unsubscribe)
├─ Do-not-sell list honored
└─ Business associate agreements

SOC 2 Type II:
├─ Annual audit
├─ Security controls documented
├─ Access controls verified
├─ Change management process
└─ Incident response plan
```

---

## DEPLOYMENT & INFRASTRUCTURE

### Infrastructure Stack

```
Cloud Provider: AWS (us-east-1, eu-west-1 for GDPR)

Compute:
├─ EKS (Kubernetes) for orchestration
├─ Services deployed as Docker containers
├─ Auto-scaling based on CPU/Memory
└─ Health checks every 30 seconds

Database:
├─ RDS PostgreSQL (Multi-AZ for HA)
├─ Read replicas for reporting queries
├─ Automated daily backups
├─ Point-in-time recovery (30 days)

Cache:
├─ ElastiCache Redis (Multi-AZ)
├─ Sessions, rate limits, hot data
└─ Auto-failover enabled

Message Queue:
├─ Managed Kafka (MSK)
├─ 7-day message retention
├─ Multi-AZ deployment

Storage:
├─ S3 for file storage (templates, documents)
├─ Versioning enabled
├─ Cross-region replication
└─ Lifecycle policies (old files to Glacier)

CDN:
├─ CloudFront for API caching
├─ Static assets cached
└─ GZIP compression enabled
```

### Deployment Process

```
GitHub (code repository)
    ↓ (on main branch push)
GitHub Actions CI/CD
    ├─ Run tests
    ├─ Build Docker image
    ├─ Push to ECR
    ├─ Deploy to staging
    ├─ Run smoke tests
    ├─ Deploy to production (blue-green)
    └─ Health checks
```

---

## SCALABILITY & PERFORMANCE

### Performance Targets

| Operation | Target | Method |
|-----------|--------|--------|
| Email send | < 5 sec | Queue + async processing |
| CRM sync | < 1 sec | Event-driven, webhooks |
| Contact search | < 3 sec | Elasticsearch index |
| Dashboard load | < 2 sec | Redis caching |
| API response | < 500ms | App-level caching |

### Horizontal Scaling

```
Email Service:
├─ Scale with message volume
├─ 10 instances per 100K emails/day
└─ Load balanced round-robin

Calendar Service:
├─ Scale with concurrent users
├─ 5 instances per 1,000 users
└─ Sticky sessions for calendar state

Enrichment Service:
├─ Batch processing
├─ 10-20 parallel workers
└─ Job queue (Bull)

CRM Sync Service:
├─ Stateless
├─ Scale with event volume
└─ No special affinity needed
```

### Caching Strategy

```
Redis Cache Layers:
├─ Session cache (user logins)
├─ Rate limit counters
├─ API response caching (5 min TTL)
├─ CRM sync state (to avoid re-syncing)
├─ Recent searches (for autocomplete)
└─ Engagement scores (updated real-time)

Cache Invalidation:
├─ Time-based (TTL) for most data
├─ Event-based for critical data
└─ Manual purge for specific keys
```

---

## MONITORING & OBSERVABILITY

### Logging Strategy

```
Structured Logging:
├─ JSON format (not plain text)
├─ Fields: timestamp, level, service, message, context
├─ Centralized: CloudWatch Logs
├─ Retention: 30 days (searchable), 1 year (archived)

Log Levels:
├─ ERROR: Service failures, data loss risks
├─ WARN: Degraded performance, retries
├─ INFO: Key business events (email sent, meeting scheduled)
└─ DEBUG: Detailed flow (disabled in prod)
```

### Metrics & Monitoring

```
Prometheus Metrics:
├─ HTTP request latency (p50, p95, p99)
├─ Error rates by endpoint
├─ Queue depth (Kafka consumer lag)
├─ Database connection pool usage
├─ Email delivery rate
├─ API rate limit usage
└─ CRM sync failures

Alerts (PagerDuty):
├─ Error rate > 1% (immediate)
├─ API latency p99 > 2sec (10 min)
├─ Service unavailable (immediate)
├─ Database CPU > 80% (5 min)
├─ Disk usage > 90% (1 hour)
└─ CRM sync lag > 5 min (5 min)
```

### Distributed Tracing

```
Jaeger/X-Ray for tracing:
├─ Every request traced end-to-end
├─ Service-to-service calls tracked
├─ Database queries traced
├─ Cache hits/misses visible
└─ Latency bottlenecks identified
```

---

## ERROR HANDLING & RESILIENCE

### Retry Logic

```python
# Exponential backoff with jitter
def retry_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except RetryableError:
            if attempt == max_retries - 1:
                raise
            wait_time = (2 ** attempt) + random(0, 1)
            sleep(wait_time)
```

### Circuit Breaker Pattern

```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.last_failure = None
    
    def call(self, func, *args, **kwargs):
        if self.is_open():
            raise CircuitBreakerOpenError()
        
        try:
            result = func(*args, **kwargs)
            self.on_success()
            return result
        except Exception as e:
            self.on_failure()
            raise
    
    def is_open(self):
        if self.failure_count >= self.failure_threshold:
            # Check if timeout has passed
            if time.time() - self.last_failure > self.timeout:
                self.half_open()
                return False
            return True
        return False
    
    def on_success(self):
        self.failure_count = 0
    
    def on_failure(self):
        self.failure_count += 1
        self.last_failure = time.time()
```

### Fallback Strategies

```
CRM Sync:
├─ Primary: Real-time Salesforce API
├─ Fallback: Batch sync every 5 min
└─ Fallback: Queue and retry until success

Email Sending:
├─ Primary: Customer's email account (Gmail/Outlook)
├─ Fallback: AWS SES
└─ Fallback: Queue for retry

Lead Data:
├─ Primary: Apollo.io
├─ Fallback: ZoomInfo or Hunter
└─ Fallback: LinkedIn (rate-limited free)
```

---

**END OF TECHNICAL ARCHITECTURE DOCUMENT**

This architecture is production-ready and designed for:
- High availability (99.9% uptime)
- Scalability (100K+ concurrent users)
- Security (SOC 2 compliance)
- Observability (tracing, logging, metrics)
- Resilience (retry logic, fallbacks, circuit breakers)

