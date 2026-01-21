# Bevyly - AI Agents

> Specification for autonomous sales agents

---

## Agent Philosophy

Bevyly's agents are designed with a clear principle: **do the work, get human approval**. Every agent:

1. Operates autonomously based on configuration
2. Queues outputs for human review
3. Learns from approval/rejection patterns
4. Provides transparency into its decisions

**Key:** All agents are included in every pricing tier. Volume limits differentiate plans, not agent access.

---

## Agent Categories

### 1. Prospecting Agents

Find and qualify potential customers.

### 2. Outreach Agents

Communicate with prospects across channels.

### 3. Engagement Agents

Track responses and determine next actions.

---

## Prospecting Agents

### Lead Source Agent

**Purpose:** Find companies matching your Ideal Customer Profile (ICP) from data providers.

| Attribute | Value |
|-----------|-------|
| Input | ICP definition (industry, size, location, etc.) |
| Output | New accounts in CRM |
| Data Source | Apollo.io |
| Approval Required | No (data import) |
| Trigger | Manual, scheduled, or threshold-based |

**Configuration Options:**
- Target industries
- Company size range (employees)
- Revenue range
- Geographic regions
- Technology stack filters
- Hiring signals
- Funding signals

**Workflow:**
```
ICP Config → Query Apollo → Dedupe vs. existing → Create accounts → Notify user
```

---

### Enrichment Agent

**Purpose:** Add firmographic data and intent signals to existing accounts.

| Attribute | Value |
|-----------|-------|
| Input | Account IDs or new accounts |
| Output | Enriched account data + intent scores |
| Data Source | Apollo.io, Clearbit (future) |
| Approval Required | No (data enrichment) |
| Trigger | On account creation, scheduled batch |

**Enrichment Fields:**
- Employee count (verified)
- Revenue estimate
- Funding history
- Technology stack
- Social profiles
- Recent news
- Hiring activity
- Intent signals

**Intent Signal Sources:**
- Job postings mentioning relevant keywords
- Technology changes (new tools adopted)
- Funding announcements
- Leadership changes
- Website traffic surges

---

### Contact Finder Agent

**Purpose:** Identify and verify decision-makers at target accounts.

| Attribute | Value |
|-----------|-------|
| Input | Account IDs |
| Output | Verified contacts with email/phone |
| Data Source | Apollo.io |
| Approval Required | No (data import) |
| Trigger | On account creation, manual request |

**Contact Selection Criteria:**
- Title patterns (VP Sales, Director Marketing, etc.)
- Department filters
- Seniority level
- Location preferences

**Verification:**
- Email validation
- Phone number format check
- Deliverability scoring

---

### Scoring Agent

**Purpose:** Prioritize leads based on fit and intent signals.

| Attribute | Value |
|-----------|-------|
| Input | Leads or contacts |
| Output | Fit scores, intent scores, tier assignment |
| Data Source | Internal data + enrichment |
| Approval Required | No (scoring) |
| Trigger | On lead creation, data change, scheduled |

**Scoring Dimensions:**

**Fit Score (0-100):**
- Company size match
- Industry match
- Technology match
- Budget indicators
- Geographic match

**Intent Score (0-100):**
- Website visits
- Content downloads
- Email engagement
- Social activity
- Hiring signals
- Funding signals

**Tier Assignment:**
| Tier | Criteria | Action |
|------|----------|--------|
| Hot | Fit 70+ AND Intent 70+ | Immediate outreach |
| Warm | Fit 50+ AND Intent 50+ | Standard sequence |
| Cold | Fit 30+ OR Intent 30+ | Nurture sequence |
| Disqualified | Below thresholds | Archive |

---

## Outreach Agents

### Email Agent

**Purpose:** Draft and send personalized cold emails.

| Attribute | Value |
|-----------|-------|
| Input | Contact + context (company, signals) |
| Output | Email drafts in approval queue |
| AI Model | OpenAI GPT-4 |
| Approval Required | **Yes** |
| Trigger | Sequence step, hot lead alert |

**Personalization Variables:**
- First name, company name
- Recent news/events
- Mutual connections
- Relevant case studies
- Industry-specific pain points

**Email Structure:**
```
1. Hook (personalized opener)
2. Problem (pain point identification)
3. Solution (value proposition)
4. Proof (social proof or case study)
5. CTA (specific ask)
```

**Quality Checks:**
- Spam word detection
- Length optimization
- Personalization validation
- CAN-SPAM compliance

---

### Email Responder Agent

**Purpose:** Handle incoming email replies intelligently.

| Attribute | Value |
|-----------|-------|
| Input | Incoming email + thread context |
| Output | Response draft in approval queue |
| AI Model | OpenAI GPT-4 |
| Approval Required | **Yes** |
| Trigger | Email received |

**Response Types:**
| Reply Type | Agent Action |
|------------|--------------|
| Interested | Schedule meeting CTA |
| Question | Answer + CTA |
| Objection | Handle objection + CTA |
| Not now | Add to nurture, set follow-up |
| Unsubscribe | Process opt-out, confirm |
| Wrong person | Request referral |
| Out of office | Parse return date, schedule |

**Conversation Memory:**
- Previous email history
- Company context
- Contact preferences
- Objections raised

---

### Voice Agent

**Purpose:** Make AI-powered phone calls for outreach and follow-ups.

| Attribute | Value |
|-----------|-------|
| Input | Contact + call script/context |
| Output | Call recording + transcript + outcome |
| Provider | Bland.ai |
| Approval Required | **Yes** (before call) |
| Trigger | Sequence step, manual request |

**Call Types:**
- Cold outreach
- Follow-up on email
- Meeting confirmation
- Meeting reminder
- Post-meeting check-in

**Call Flow:**
```
1. Introduction
2. Permission to continue
3. Value proposition
4. Discovery questions
5. Handle objections
6. CTA (meeting/next step)
7. Wrap-up
```

**Outcomes Tracked:**
- Connected / No answer / Voicemail
- Positive / Negative / Neutral
- Meeting booked
- Call-back requested
- Referred to another person

**Guardrails:**
- Call hours (respect time zones)
- Do-not-call list compliance
- Recording consent (where required)
- Maximum attempts per contact

---

### Meeting Agent

**Purpose:** Schedule meetings when prospects express interest.

| Attribute | Value |
|-----------|-------|
| Input | Positive response + availability |
| Output | Calendar invite + confirmation email |
| Integrations | Google Calendar, Outlook |
| Approval Required | No (after positive response) |
| Trigger | Positive reply detection |

**Scheduling Flow:**
```
1. Detect positive intent
2. Check user availability
3. Offer time slots
4. Parse prospect response
5. Create calendar event
6. Send confirmation
7. Create follow-up reminders
```

**Features:**
- Smart time zone handling
- Buffer time between meetings
- Video conferencing link generation
- Reminder sequences
- Reschedule handling

---

## Engagement Agents

### Engagement Tracker

**Purpose:** Monitor and score prospect engagement across channels.

| Attribute | Value |
|-----------|-------|
| Input | Email events, website visits, calls |
| Output | Engagement scores + signals |
| Approval Required | No (tracking) |
| Trigger | Real-time events |

**Tracked Events:**
| Event | Score Impact |
|-------|--------------|
| Email open | +5 |
| Email click | +15 |
| Email reply | +25 |
| Website visit | +10 |
| Page view (pricing) | +20 |
| Content download | +15 |
| Call answered | +20 |
| Meeting attended | +50 |

**Engagement Signals:**
- Hot (score > 80): Ready for conversion
- Warm (score 40-80): Active interest
- Cool (score 10-40): Some activity
- Cold (score < 10): No engagement

---

### Follow-up Agent

**Purpose:** Determine and execute appropriate follow-up actions.

| Attribute | Value |
|-----------|-------|
| Input | Engagement data + sequence position |
| Output | Follow-up recommendations |
| Approval Required | Depends on action type |
| Trigger | Time-based, engagement-based |

**Follow-up Logic:**
| Scenario | Action |
|----------|--------|
| No reply after 3 days | Follow-up email |
| Opened but no reply | Different angle email |
| Clicked link | Call attempt |
| Replied positively | Meeting Agent |
| No engagement | Move to next sequence step |
| Sequence complete | Add to nurture |

**Timing Rules:**
- Respect sequence cadence
- Time zone awareness
- Avoid weekends (configurable)
- Holiday calendar integration

---

### Handoff Agent

**Purpose:** Identify leads ready for human sales engagement.

| Attribute | Value |
|-----------|-------|
| Input | All signals for a lead |
| Output | Qualified lead + context for AE |
| Approval Required | No (notification) |
| Trigger | Score threshold, explicit interest |

**Handoff Criteria:**
- Meeting booked
- Explicit request to talk
- Score exceeds threshold
- Manual qualification

**Handoff Package:**
- Lead/contact summary
- Company overview
- Engagement history
- Key signals that triggered handoff
- Recommended talking points
- Potential objections

---

## Agent Configuration

### Global Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Working hours | When agents can send/call | 9am-6pm local |
| Daily email limit | Max emails per day | 200 |
| Daily call limit | Max calls per day | 50 |
| Batch approval size | Items per approval batch | 10 |

### Per-Agent Settings

Each agent has specific configuration options accessible via the Agent Console (`/agents`):

```typescript
interface AgentConfig {
  enabled: boolean;
  schedule: CronExpression;
  limits: {
    daily: number;
    hourly: number;
  };
  filters: Record<string, any>;
  templates: string[];
  approvalRequired: boolean;
}
```

---

## Agent Console UI

The Agent Console (`/agents`) provides:

1. **Agent List**
   - Status indicator (active/paused/error)
   - Last run time
   - Today's activity count

2. **Agent Detail**
   - Configuration form
   - Run history
   - Performance metrics
   - Error logs

3. **Health Dashboard**
   - Throughput graphs
   - Error rates
   - Queue depths
   - API usage

---

## Approval Queue

All agent outputs requiring approval flow through the Approval Queue (`/approvals`):

### Queue View
- Filterable by agent type
- Sortable by priority/time
- Bulk actions available

### Review Interface
- Original context (lead info, conversation)
- AI-generated content
- Edit in place
- Approve / Reject / Edit buttons

### Approval Stats
- Approval rate by agent
- Common rejection reasons
- Time to approval
- Edit frequency

---

## Implementation Status

| Agent | Backend | Frontend | Status |
|-------|---------|----------|--------|
| Lead Source | Planned | Planned | Phase 2 |
| Enrichment | Planned | Planned | Phase 2 |
| Contact Finder | Planned | Planned | Phase 2 |
| Scoring | Partial | Planned | Phase 2 |
| Email Agent | Planned | Planned | Phase 3 |
| Email Responder | Planned | Planned | Phase 3 |
| Voice Agent | Planned | Planned | Phase 4 |
| Meeting Agent | Planned | Planned | Phase 4 |
| Engagement Tracker | Partial | Planned | Phase 2 |
| Follow-up Agent | Planned | Planned | Phase 3 |
| Handoff Agent | Planned | Planned | Phase 3 |

See [Implementation Status](./IMPLEMENTATION-STATUS.md) for detailed progress.
