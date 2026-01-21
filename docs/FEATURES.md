# Bevyly - Features

> Complete feature breakdown by module

---

## Module Overview

| Module | Route | Status | Description |
|--------|-------|--------|-------------|
| Briefing | `/briefing` | Complete | Primary entry point, action queue |
| Leads | `/leads` | Complete | Pre-conversion lead management |
| Accounts | `/accounts` | Complete | Company/account management |
| Contacts | `/contacts` | Complete | Contact management |
| Opportunities | `/opportunities` | Complete | Deal pipeline |
| Emails | `/emails` | UI Needed | Email inbox + sent |
| Calendar | `/calendar` | Enhancement | Meetings and scheduling |
| Sequences | `/sequences` | UI Needed | Outreach sequences |
| Activities | `/activities` | UI Needed | Activity timeline |
| Analytics | `/analytics` | Planned | Reports + dashboards |
| Agents | `/agents` | Planned | Agent console |
| Approvals | `/approvals` | Planned | Review queue |
| Settings | `/settings` | Complete | Configuration |

---

## Core Modules

### Briefing (`/briefing`)

**Purpose:** Primary entry point answering "What needs my attention?"

**Features:**
- Priority summary cards (High/Medium/Low counts)
- Action Cards with recommended next steps
- Active signals list
- Agent activity feed (planned)
- Pipeline snapshot (planned)

**Key Components:**
- `BriefingContent.tsx` - Main briefing UI
- `ActionCard.tsx` - Base action card
- `CardRegistry.tsx` - Whitelisted card types

**API Endpoints:**
- `GET /api/v1/intent/briefing` - Get recommendations
- `POST /api/v1/intent/briefing/refresh` - Detect new signals
- `POST /api/v1/intent/feedback` - Record user response

---

### Leads (`/leads`)

**Purpose:** Manage pre-conversion prospects before they become accounts/contacts.

**Features:**
- Lead table with status filters
- Add lead modal
- Lead detail view
- Convert to Account/Contact
- Reject with reason
- Fit/Intent scoring display
- Bulk import (planned)

**Statuses:**
| Status | Description |
|--------|-------------|
| New | Just created/imported |
| Contacted | Initial outreach sent |
| Qualified | Meets criteria |
| Converted | Became account/contact |
| Rejected | Disqualified |

**API Endpoints:**
- `GET /api/v1/leads` - List leads
- `POST /api/v1/leads` - Create lead
- `GET /api/v1/leads/:id` - Get lead
- `PUT /api/v1/leads/:id` - Update lead
- `DELETE /api/v1/leads/:id` - Delete lead
- `POST /api/v1/leads/:id/convert` - Convert to account/contact
- `POST /api/v1/leads/:id/reject` - Reject lead

---

### Accounts (`/accounts`)

**Purpose:** Manage companies you're selling to or tracking.

**Features:**
- Account list with search/filter
- Account detail page
- Associated contacts
- Associated opportunities
- Activity timeline
- Custom fields

**Key Fields:**
- Company name, domain, industry
- Employee count, revenue
- Account owner
- Health score (planned)

**API Endpoints:**
- `GET /api/v1/accounts` - List accounts
- `POST /api/v1/accounts` - Create account
- `GET /api/v1/accounts/:id` - Get account
- `PUT /api/v1/accounts/:id` - Update account
- `DELETE /api/v1/accounts/:id` - Delete account

---

### Contacts (`/contacts`)

**Purpose:** Manage individual people at accounts.

**Features:**
- Contact list with search/filter
- Contact detail page
- Associated account
- Communication history
- Custom fields

**Key Fields:**
- Name, email, phone
- Title, department
- Account association
- Contact owner

**API Endpoints:**
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/contacts` - Create contact
- `GET /api/v1/contacts/:id` - Get contact
- `PUT /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact

---

### Opportunities (`/opportunities`)

**Purpose:** Manage sales pipeline and deals.

**Features:**
- Opportunity list with stage filters
- Kanban board view (planned)
- Opportunity detail page
- Stage progression
- Value and probability
- Close date tracking
- Activity logging

**Default Stages:**
1. Prospecting
2. Discovery
3. Proposal
4. Negotiation
5. Closed Won
6. Closed Lost

**Key Fields:**
- Name, value, stage
- Close date, probability
- Associated account
- Primary contact
- Owner

**API Endpoints:**
- `GET /api/v1/opportunities` - List opportunities
- `POST /api/v1/opportunities` - Create opportunity
- `GET /api/v1/opportunities/:id` - Get opportunity
- `PUT /api/v1/opportunities/:id` - Update opportunity
- `DELETE /api/v1/opportunities/:id` - Delete opportunity

---

### Emails (`/emails`)

**Purpose:** Unified email interface for outreach and responses.

**Status:** Backend exists, UI enhancement needed

**Planned Features:**
- Inbox view (synced from Gmail/Outlook)
- Sent emails view
- Compose with AI suggestions
- Templates library
- Tracking (opens, clicks)
- Thread view

---

### Calendar (`/calendar`)

**Purpose:** Meeting management and scheduling.

**Status:** Basic UI exists, enhancement needed

**Planned Features:**
- Calendar sync (Google, Outlook)
- Meeting scheduling links
- Prep notes for meetings
- Post-meeting follow-up suggestions
- No-show tracking

---

### Sequences (`/sequences`)

**Purpose:** Automated multi-step outreach campaigns.

**Status:** Backend exists, UI enhancement needed

**Planned Features:**
- Sequence builder
- Multi-channel steps (email, call, LinkedIn)
- Personalization variables
- Performance metrics
- A/B testing

---

### Activities (`/activities`)

**Purpose:** Timeline of all sales activities.

**Status:** UI enhancement needed

**Planned Features:**
- Activity feed view
- Filter by type (email, call, meeting, note)
- Filter by entity (account, contact, opportunity)
- Log activity manually
- Activity templates

---

## Planned Modules

### Agents (`/agents`)

**Purpose:** Configure and monitor AI agents.

**Planned Features:**
- Agent list with status (active/paused)
- Per-agent configuration
  - ICP settings
  - Email templates
  - Call scripts
- Run history with logs
- Health monitoring
- Throughput metrics
- Error alerts

---

### Approvals (`/approvals`)

**Purpose:** Review queue for AI-generated actions.

**Planned Features:**
- Batch review interface
- Side-by-side: AI draft vs. edit
- Approve all / Approve selected
- Edit before approval
- Reject with feedback
- Context panel showing lead info

---

### Analytics (`/analytics`)

**Purpose:** Reports and dashboards for business insights.

**Planned Features:**
- Pipeline funnel visualization
- Revenue forecast
- Conversion rates over time
- Agent performance metrics
- Activity heatmaps
- Lead source attribution
- Custom date ranges
- Export to CSV/PDF

---

### Onboarding (`/onboarding`)

**Purpose:** Guided setup wizard for new users.

**Planned Features:**
- Welcome flow
- Connect email (Gmail/Outlook)
- Define ICP
- Import existing leads
- Configure agents
- Send first campaign

---

### Billing (`/billing`)

**Purpose:** Subscription and payment management.

**Planned Features:**
- Current plan display
- Usage meters
- Upgrade/downgrade
- Payment method management
- Invoice history
- Stripe integration

---

### Compliance (`/compliance`)

**Purpose:** GDPR/CAN-SPAM compliance dashboard.

**Planned Features:**
- Opt-out management
- Consent tracking
- Data retention settings
- Export user data
- Delete user data
- Audit log viewer

---

## Settings (`/settings`)

**Purpose:** Application configuration.

**Available Settings:**

| Section | Features |
|---------|----------|
| Profile | User info, password, avatar |
| Team | Invite users, manage roles |
| API Keys | Generate/revoke API keys |
| Integrations | Connect third-party services |
| Notifications | Email/push preferences |
| Appearance | Theme, language |

---

## Feature Availability by Tier

| Feature | Pro | Max | Ultra | Enterprise |
|---------|-----|-----|-------|------------|
| All CRM modules | Yes | Yes | Yes | Yes |
| All agents | Yes | Yes | Yes | Yes |
| Email integration | Yes | Yes | Yes | Yes |
| Voice calls | Yes | Yes | Yes | Yes |
| Basic analytics | Yes | Yes | Yes | Yes |
| Advanced analytics | - | Yes | Yes | Yes |
| API access | - | Yes | Yes | Yes |
| Audit logs | - | - | Yes | Yes |
| SSO | - | - | - | Yes |
| Custom roles | - | - | - | Yes |

See [Pricing](./PRICING.md) for complete tier comparison.
