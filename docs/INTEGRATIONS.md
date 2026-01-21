# Bevyly - Integrations

> Third-party service connections and configuration

---

## Integration Overview

Bevyly integrates with best-in-class services to power the autonomous sales workflow. Each integration is designed to "just work" with minimal configuration.

| Integration | Purpose | Status | Required Tier |
|-------------|---------|--------|---------------|
| Gmail | Email sending/receiving | Planned | All |
| Outlook | Email sending/receiving | Planned | All |
| Google Calendar | Meeting scheduling | Planned | All |
| Apollo.io | Lead sourcing + enrichment | Planned | All |
| OpenAI | AI agent intelligence | Planned | All |
| Bland.ai | AI voice calls | Planned | All |
| Stripe | Billing + subscriptions | Planned | N/A |
| Zapier | Workflow automation | Planned | Max+ |
| Webhooks | Custom integrations | Planned | Max+ |

---

## Email Integrations

### Why User's Own Email?

Bevyly sends emails through your connected Gmail or Outlook account rather than a shared sending service. Benefits:

1. **Better deliverability** - Emails come from your domain
2. **Replies go to your inbox** - Seamless thread management
3. **No warm-up required** - Established reputation
4. **Natural sending limits** - Avoids spam flags

### Gmail Integration

#### Setup

1. Go to **Settings > Integrations > Gmail**
2. Click **Connect Gmail**
3. Authorize Bevyly to:
   - Read emails (for reply detection)
   - Send emails (for outreach)
   - Manage labels (for organization)
4. Select which email address to use

#### Permissions Required

| Scope | Purpose |
|-------|---------|
| `gmail.readonly` | Read incoming emails for reply detection |
| `gmail.send` | Send outreach emails |
| `gmail.labels` | Organize with Bevyly labels |
| `gmail.modify` | Mark emails as read/archived |

#### Configuration Options

| Setting | Description | Default |
|---------|-------------|---------|
| Daily send limit | Max emails per day | 200 |
| Sending hours | When to send | 9am-6pm |
| Signature | Use Gmail signature | Yes |
| Thread replies | Reply in thread | Yes |

### Outlook Integration

#### Setup

1. Go to **Settings > Integrations > Outlook**
2. Click **Connect Outlook**
3. Sign in with Microsoft account
4. Grant permissions

#### Permissions Required

| Permission | Purpose |
|------------|---------|
| `Mail.Read` | Read incoming emails |
| `Mail.Send` | Send outreach emails |
| `Mail.ReadWrite` | Mark as read, organize |

---

## Calendar Integration

### Google Calendar

#### Setup

1. Go to **Settings > Integrations > Google Calendar**
2. Click **Connect Google Calendar**
3. Select which calendar(s) to use
4. Configure availability settings

#### Features

- **Read availability** - Meeting Agent checks your free/busy
- **Create events** - Booked meetings appear on calendar
- **Sync meetings** - Import existing meetings for context

#### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Working hours | Bookable hours | 9am-5pm |
| Buffer time | Gap between meetings | 15 min |
| Meeting duration | Default length | 30 min |
| Video link | Auto-add meet link | Yes |

### Outlook Calendar

Similar setup to Google Calendar, using Microsoft Graph API.

---

## Lead Data - Apollo.io

### Overview

Apollo.io powers Bevyly's lead sourcing and enrichment capabilities. We chose Apollo for:

- Largest B2B contact database
- High data quality
- Reasonable pricing
- Good API reliability

### Setup

1. Go to **Settings > Integrations > Apollo**
2. Enter your Apollo API key
3. Configure sync preferences

#### Getting Apollo API Key

1. Log into Apollo.io
2. Go to Settings > Integrations > API
3. Generate new API key
4. Copy to Bevyly

### Features Used

| Feature | Bevyly Agent | Purpose |
|---------|--------------|---------|
| People Search | Lead Source | Find contacts matching ICP |
| Company Enrichment | Enrichment | Add firmographics |
| Email Verification | Contact Finder | Verify email deliverability |
| Buying Intent | Enrichment | Identify in-market buyers |

### Credit Usage

Apollo operations consume credits:

| Operation | Credits |
|-----------|---------|
| Person search (per result) | 1 |
| Company enrichment | 1 |
| Email verification | 1 |
| Phone number reveal | 5 |

Bevyly tracks your Apollo credit usage in Settings > Integrations > Apollo.

### ICP Configuration

Define your Ideal Customer Profile for Lead Source Agent:

```json
{
  "industries": ["Technology", "Healthcare", "Financial Services"],
  "employeeRange": {
    "min": 50,
    "max": 500
  },
  "revenueRange": {
    "min": 5000000,
    "max": 100000000
  },
  "locations": ["United States", "Canada"],
  "technologies": ["Salesforce", "HubSpot"],
  "titles": ["VP Sales", "Director of Sales", "Head of Revenue"],
  "excludeExisting": true
}
```

---

## AI Provider - OpenAI

### Overview

OpenAI powers the intelligence behind Bevyly's agents:

- Email drafting and personalization
- Reply intent classification
- Call script generation
- Lead scoring rationale

### Setup

1. Go to **Settings > Integrations > OpenAI**
2. Enter your OpenAI API key
3. Select model preferences

### Models Used

| Task | Model | Why |
|------|-------|-----|
| Email drafting | GPT-4 | Best quality output |
| Reply classification | GPT-3.5 | Fast, cost-effective |
| Call scripts | GPT-4 | Natural conversation |
| Scoring rationale | GPT-3.5 | Simple analysis |

### Cost Estimation

| Agent | ~Tokens/Operation | ~Cost |
|-------|-------------------|-------|
| Email Agent | 500 | $0.015 |
| Email Responder | 750 | $0.023 |
| Voice Agent (script) | 1,000 | $0.030 |
| Scoring Agent | 200 | $0.006 |

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Max tokens | Limit output length | 500 |
| Temperature | Creativity (0-1) | 0.7 |
| Model | Primary model | gpt-4 |

---

## Voice Calls - Bland.ai

### Overview

Bland.ai provides AI-powered voice calling capabilities:

- Natural-sounding AI voice
- Real-time conversation handling
- Call recording and transcription
- Outcome detection

### Setup

1. Go to **Settings > Integrations > Bland.ai**
2. Create Bland.ai account and get API key
3. Enter API key in Bevyly
4. Configure voice and script preferences

### Features

| Feature | Description |
|---------|-------------|
| Outbound calls | AI makes calls to prospects |
| Script handling | Dynamic conversation flow |
| Objection handling | Responds to common objections |
| Voicemail detection | Leaves pre-configured message |
| Recording | Full call recording |
| Transcription | Text transcript of call |
| Outcome reporting | Meeting booked, callback, etc. |

### Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| Voice | AI voice selection | "Professional Male" |
| Call hours | When to call | 9am-6pm local |
| Max attempts | Calls per contact | 3 |
| Retry delay | Days between attempts | 2 |
| Voicemail script | Message to leave | Custom |

### Compliance

Bland.ai integration includes:
- Do-not-call list checking
- Recording consent (configurable)
- Time zone respect
- Call frequency limits

---

## Billing - Stripe

### Overview

Stripe handles all billing operations:

- Subscription management
- Payment processing
- Usage-based billing
- Invoice generation

### How It Works

1. User selects plan during signup or upgrade
2. Stripe Checkout handles payment
3. Webhook updates Bevyly subscription status
4. Usage tracked and reported monthly
5. Overages billed at end of period

### Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription |
| `customer.subscription.updated` | Update plan |
| `customer.subscription.deleted` | Downgrade/cancel |
| `invoice.paid` | Record payment |
| `invoice.payment_failed` | Alert user |

---

## Automation - Zapier (Planned)

### Available Triggers

| Trigger | Fires When |
|---------|------------|
| New Lead | Lead created in Bevyly |
| Lead Converted | Lead becomes account/contact |
| New Opportunity | Deal created |
| Stage Changed | Opportunity moves stages |
| Deal Won | Opportunity marked won |
| Meeting Booked | Calendar event created |

### Available Actions

| Action | Does |
|--------|------|
| Create Lead | Add lead to Bevyly |
| Create Account | Add account |
| Create Contact | Add contact |
| Create Opportunity | Add deal |
| Add to Sequence | Enroll contact in sequence |
| Log Activity | Record activity |

### Example Zaps

**Lead from Typeform:**
Typeform submission → Create Lead in Bevyly

**Slack notification:**
Deal Won in Bevyly → Send Slack message

**CRM sync:**
New Contact in Bevyly → Create in Salesforce

---

## Webhooks (Planned)

### Setup

1. Go to **Settings > Integrations > Webhooks**
2. Add endpoint URL
3. Select events to subscribe
4. Copy webhook secret for verification

### Available Events

```
lead.created
lead.updated
lead.converted
lead.rejected
account.created
account.updated
contact.created
contact.updated
opportunity.created
opportunity.updated
opportunity.stage_changed
opportunity.won
opportunity.lost
email.sent
email.opened
email.clicked
email.replied
meeting.booked
meeting.completed
agent.run.completed
approval.pending
approval.approved
approval.rejected
```

### Payload Format

```json
{
  "id": "evt_abc123",
  "type": "lead.converted",
  "timestamp": "2026-01-15T10:30:00Z",
  "data": {
    "leadId": "lead_xyz",
    "accountId": "acc_123",
    "contactId": "con_456"
  }
}
```

### Retry Policy

Failed webhooks are retried:
- 1st retry: 1 minute
- 2nd retry: 5 minutes
- 3rd retry: 30 minutes
- 4th retry: 2 hours
- 5th retry: 24 hours

After 5 failures, webhook is disabled and admin is notified.

---

## Future Integrations

### Under Consideration

| Integration | Use Case | Priority |
|-------------|----------|----------|
| Salesforce | CRM sync for enterprises | Medium |
| HubSpot | CRM sync alternative | Medium |
| Slack | Notifications | High |
| LinkedIn Sales Nav | Social selling | Low (risky) |
| Clearbit | Enrichment alternative | Low |
| ZoomInfo | Enrichment alternative | Low |
| Calendly | Scheduling alternative | Medium |
| Gong | Call intelligence | Low |
| Outreach | Sequence migration | Low |

### Request an Integration

Have a service you'd like integrated? Email integrations@bevyly.com with:
- Service name
- Use case
- Expected volume
