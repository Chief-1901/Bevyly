# Bevyly - Compliance

> GDPR, CAN-SPAM, and data handling policies

---

## Compliance Philosophy

Compliance isn't an afterthought at Bevyly—it's built into how our agents operate. Every automated outreach respects recipient preferences, legal requirements, and ethical boundaries.

**Key Principles:**
1. Consent before contact (where required)
2. Easy opt-out on every message
3. Honest identification
4. Data minimization
5. Right to deletion

---

## Email Compliance

### CAN-SPAM Act (United States)

The CAN-SPAM Act governs commercial email in the United States. Bevyly ensures compliance through:

#### Requirements Met

| Requirement | How Bevyly Handles |
|-------------|-------------------|
| No false headers | Emails sent from your real address |
| Accurate subject lines | AI trained to avoid misleading subjects |
| Identify as advertisement | Commercial nature is clear |
| Include physical address | Required in email settings |
| Opt-out mechanism | Unsubscribe link in every email |
| Honor opt-outs promptly | Processed within 10 business days |
| Monitor third parties | N/A - we don't use third-party senders |

#### Configuration

In **Settings > Compliance > CAN-SPAM**:

```
Physical Address: 123 Main St, Suite 100, San Francisco, CA 94102
Opt-out Processing: Automatic (immediate)
Suppression List Sync: Real-time
```

### GDPR (European Union)

The General Data Protection Regulation applies to EU residents. Bevyly provides tools for compliance:

#### Lawful Basis for Processing

Bevyly supports two primary legal bases:

1. **Legitimate Interest** - B2B prospecting to business contacts
2. **Consent** - When explicitly obtained

Configure in **Settings > Compliance > GDPR**:

```
Default Legal Basis: Legitimate Interest
Consent Required Regions: [Configure]
Consent Collection: [Link to form]
```

#### Data Subject Rights

Bevyly supports all GDPR rights:

| Right | Implementation |
|-------|----------------|
| Right to Access | Export all data for a contact |
| Right to Rectification | Edit contact information |
| Right to Erasure | Delete contact and all history |
| Right to Restrict | Pause all processing |
| Right to Portability | Export in standard format |
| Right to Object | Opt-out of processing |

#### Data Processing Records

Bevyly maintains records of:
- What data is collected
- Why it's processed
- How long it's retained
- Who has access

Access via **Settings > Compliance > GDPR > Data Records**.

### CASL (Canada)

Canada's Anti-Spam Legislation requires express or implied consent:

| Consent Type | When Applicable |
|--------------|-----------------|
| Express | Contact opted in explicitly |
| Implied | Existing business relationship, published address |

Configure CASL rules in **Settings > Compliance > CASL**.

### PECR (UK)

Post-Brexit, UK follows Privacy and Electronic Communications Regulations:

- Similar to GDPR email rules
- B2B exemption for relevant marketing
- Unsubscribe required on every email

---

## Phone Compliance

### TCPA (United States)

The Telephone Consumer Protection Act governs phone outreach:

#### Requirements

| Requirement | How Bevyly Handles |
|-------------|-------------------|
| Do-Not-Call Registry | Checked before every call |
| Internal DNC list | Maintained automatically |
| Time restrictions | Calls only 8am-9pm local |
| Caller ID | Your business number displayed |
| Consent for autodialed | Voice Agent introduces as AI |

#### Do-Not-Call Integration

Bevyly checks numbers against:
- National Do-Not-Call Registry
- Your internal suppression list
- Contact-specific opt-outs

Configure in **Settings > Compliance > TCPA**:

```
DNC Registry Enabled: Yes
Registry Update Frequency: Weekly
Call Window: 9:00 AM - 6:00 PM local
```

### Recording Consent

Call recording laws vary by state/country:

| Jurisdiction | Consent Required |
|--------------|------------------|
| One-party states (US) | Caller only |
| Two-party states (US) | Both parties |
| EU/UK | Both parties |
| Canada | One party |

Bevyly's Voice Agent can announce recording:

```
"This call may be recorded for quality purposes. Do you consent to continue?"
```

Configure in **Settings > Compliance > Call Recording**.

---

## Data Protection

### Data Collection

Bevyly collects and processes:

| Data Type | Source | Purpose |
|-----------|--------|---------|
| Contact info | User input, Apollo | Outreach |
| Company data | User input, Apollo | Targeting |
| Email content | Gmail/Outlook | Reply tracking |
| Call recordings | Bland.ai | Quality, training |
| Usage data | Application | Product improvement |

### Data Retention

Default retention periods:

| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| Contact records | Until deleted | User controls |
| Email history | 2 years | Business records |
| Call recordings | 90 days | Quality assurance |
| Activity logs | 1 year | Troubleshooting |
| Audit logs | 7 years | Compliance |

Customize in **Settings > Compliance > Data Retention**.

### Data Security

| Measure | Implementation |
|---------|----------------|
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Access control | RBAC with audit |
| Backups | Daily, encrypted |
| Incident response | 72-hour notification |

### Sub-processors

Bevyly uses these sub-processors:

| Provider | Purpose | Location |
|----------|---------|----------|
| Supabase | Database | US |
| Vercel | Frontend hosting | Global |
| OpenAI | AI processing | US |
| Apollo.io | Lead data | US |
| Bland.ai | Voice calls | US |
| Stripe | Billing | US |

Full list and DPAs available in **Settings > Compliance > Sub-processors**.

---

## Suppression Management

### Global Suppression List

Contacts on the suppression list will never receive outreach:

- Email unsubscribes
- Call opt-outs
- Manual additions
- Legal requests

### Managing Suppressions

**View:** Settings > Compliance > Suppression List

**Add manually:**
```
POST /api/v1/compliance/suppressions
{
  "email": "person@example.com",
  "reason": "manual_add",
  "channel": "all"
}
```

**Import bulk:**
Upload CSV with email addresses to suppress.

**Export:**
Download full suppression list for backup or audit.

### Suppression Sync

Suppressions sync in real-time across:
- Email sequences
- Voice agent queue
- Lead import filters

---

## Audit Logging

### What's Logged

| Event | Details Captured |
|-------|------------------|
| User login | User, IP, timestamp |
| Data access | User, records, timestamp |
| Data modification | User, before/after, timestamp |
| Data deletion | User, what, timestamp |
| Email sent | Recipient, content, timestamp |
| Call made | Recipient, duration, outcome |
| Opt-out received | Channel, source, timestamp |
| Settings changed | User, setting, old/new value |

### Accessing Audit Logs

**UI:** Settings > Compliance > Audit Logs

**API:**
```
GET /api/v1/audit-logs?startDate=2026-01-01&endDate=2026-01-31
```

**Export:** Download as CSV or JSON for external analysis.

### Log Retention

- Standard: 1 year
- Ultra tier: 3 years
- Enterprise: 7 years (or custom)

---

## Compliance Dashboard

The Compliance Dashboard (/compliance) provides:

### Overview Metrics

- Opt-out rate (last 30 days)
- Suppression list size
- Pending data requests
- Compliance score

### Alerts

- High opt-out rate warning
- DNC list update needed
- Data retention review due
- Sub-processor change notification

### Quick Actions

- Process opt-out request
- Handle data subject request
- Export compliance report
- Review audit logs

---

## Data Subject Requests

### Handling Requests

When you receive a data subject request:

1. **Verify identity** - Confirm requester is the data subject
2. **Log request** - Record in Settings > Compliance > Data Requests
3. **Process within timeframe** - GDPR: 30 days, CCPA: 45 days
4. **Respond** - Provide data or confirm deletion

### Request Types

| Request | Action | Tool |
|---------|--------|------|
| Access | Export all data | Contact > Export |
| Rectification | Edit data | Contact > Edit |
| Erasure | Delete all data | Contact > Delete |
| Restriction | Pause processing | Contact > Pause |
| Portability | Export machine-readable | Contact > Export (JSON) |
| Objection | Add to suppression | Suppression List |

### Automated Processing

For verified requests, Bevyly can auto-process:

1. Email received at privacy@yourdomain.com
2. Bevyly parses request type
3. Identity verification sent
4. Upon verification, request processed
5. Confirmation sent

Configure in **Settings > Compliance > Automated Requests**.

---

## Certifications & Reports

### SOC 2 Type II

Bevyly maintains SOC 2 Type II certification covering:
- Security
- Availability
- Confidentiality

Report available under NDA for Enterprise customers.

### GDPR Compliance

- Data Processing Agreement available
- Standard Contractual Clauses supported
- UK Addendum available

### Security Questionnaires

Pre-filled responses available for:
- SIG Lite
- CAIQ
- VSA

Contact security@bevyly.com for custom questionnaires.

---

## Best Practices

### Email Outreach

1. **Clear sender name** - Use real names, not "Sales Team"
2. **Relevant content** - Personalize based on actual research
3. **Easy opt-out** - Single-click unsubscribe
4. **Reasonable frequency** - Don't email daily
5. **Honor preferences** - Respect opt-outs immediately

### Phone Outreach

1. **Introduce clearly** - "Hi, this is [AI name] calling from [Company]"
2. **Respect time** - Call during business hours only
3. **Accept no** - If they say stop, stop immediately
4. **Document consent** - Record if they agree to continue

### Data Handling

1. **Collect minimally** - Only what you need
2. **Store securely** - Encryption everywhere
3. **Retain appropriately** - Delete when no longer needed
4. **Access control** - Least privilege principle
5. **Audit regularly** - Review who accessed what

---

## Getting Help

### Compliance Questions

- Email: compliance@bevyly.com
- Documentation: This page + in-app guides
- Enterprise: Dedicated compliance contact

### Legal Requests

For subpoenas, court orders, or legal inquiries:
- Email: legal@bevyly.com
- Include case number and jurisdiction

### Report a Concern

If you believe Bevyly or a customer is violating compliance:
- Email: compliance@bevyly.com
- Anonymous reporting available
