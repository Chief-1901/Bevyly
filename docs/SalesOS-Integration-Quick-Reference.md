# SalesOS Integration Quick Reference
## Copy-Paste Ready Integration Checklist

---

## QUICK ANSWER TO YOUR QUESTIONS

### Question 1: "Email Agent Follow-up + Calendar + CRM Update?"

**Answer: ✅ YES, Completely Automated**

```python
# This is what happens automatically:

1. ENGAGEMENT AGENT DECIDES
   "This deal needs follow-up in 2 days"
   confidence: 87%

2. AUTOMATICALLY EXECUTES:
   
   a) SEND EMAIL via Gmail
      - Subject: "Following up on our conversation"
      - Body: Personalized HTML template
      - Track: Opens, clicks, responses
   
   b) SCHEDULE CALENDAR EVENT via Google Calendar
      - Creates event: "Follow-up Call with [Prospect]"
      - Automatically generates Google Meet link
      - Adds prospect to attendees
      - Sends calendar invite
   
   c) LOG TO CRM (Salesforce/HubSpot/Pipedrive)
      - Creates Task/Activity record
      - Links to Opportunity/Deal
      - Records email subject + meeting time
      - Updates Next Step field
      - Logs "Agent initiated follow-up sequence"
   
   d) TRACK ENGAGEMENT
      - Monitors email open (if Gmail integration enabled)
      - Tracks calendar acceptance
      - Monitors Meet link clicks
      - Reports back to Agent

3. PROSPECT RECEIVES:
   - Email #1: Personalized follow-up message
   - Calendar invite: With Google Meet link
   - [Optional] Reminder: 24 hours before meeting

4. YOUR CRM SHOWS:
   - Task created: "Follow-up email sent"
   - Activity logged: Email timestamp
   - Calendar event linked: Meeting scheduled
   - Agent confidence: 87% probability
```

### Question 2: "Update in Salesforce or another CRM the user chooses?"

**Answer: ✅ YES, Works with ANY CRM**

```python
# Configuration at startup:

CHOICE 1: Using Salesforce
config = {
    'crm_type': 'salesforce',
    'instance_url': 'https://yourinstance.salesforce.com',
    'client_id': 'xxx',
    'client_secret': 'xxx'
}
# → All agent actions automatically update Salesforce

CHOICE 2: Using HubSpot
config = {
    'crm_type': 'hubspot',
    'api_key': 'xxx'
}
# → All agent actions automatically update HubSpot

CHOICE 3: Using Pipedrive
config = {
    'crm_type': 'pipedrive',
    'api_token': 'xxx',
    'company_domain': 'yourcompany'
}
# → All agent actions automatically update Pipedrive

CHOICE 4: Using Custom CRM
# You implement adapter following our interface
# → All agent actions use your adapter

# SWITCH ANYTIME (just change config)
# System is CRM-agnostic
```

### Question 3: "Or do we have a CRM for that matter or everything's completely autonomous?"

**Answer: ✅ THREE OPTIONS**

```python
OPTION 1: SalesOS + Your Existing CRM (Recommended for Start)
┌──────────────────────────────────────────────┐
│         SalesOS Intelligence Layer           │  ← Makes decisions
├──────────────────────────────────────────────┤
│  Email → Calendar → Task → Update CRM        │  ← Orchestrates
├──────────────────────────────────────────────┤
│     Your Salesforce/HubSpot/Pipedrive        │  ← Source of truth
└──────────────────────────────────────────────┘

Workflow:
1. Rep makes sale in CRM
2. CRM notifies SalesOS (webhook)
3. SalesOS agents analyze deal
4. Agents automatically send follow-ups, schedule calls
5. All activities logged back to CRM
6. Rep sees everything in CRM as usual

Cost: Just SalesOS ($880K Year 1)
Benefit: Safe, leverages existing investment
Time: Fastest to implement (CRM already configured)


OPTION 2: SalesOS as Primary System
┌──────────────────────────────────────────────┐
│      SalesOS (Intelligence + Data)           │  ← Everything
├──────────────────────────────────────────────┤
│  BigQuery + Email + Calendar + Webhooks      │  ← Infrastructure
├──────────────────────────────────────────────┤
│  CRM (Salesforce) - Read-only for compliance │  ← Backup
└──────────────────────────────────────────────┘

Workflow:
1. SalesOS owns all deal/contact data
2. Agents make all decisions autonomously
3. Optionally sync to CRM for audit trail
4. Rep uses SalesOS UI primarily

Cost: SalesOS + BigQuery costs
Benefit: Maximum autonomy, pure agent system
Time: Medium (need to migrate data)


OPTION 3: Fully Autonomous SalesOS
┌──────────────────────────────────────────────┐
│      SalesOS (Complete Operating System)     │  ← Standalone
├──────────────────────────────────────────────┤
│ Email → Calendar → Proposals → Contracts     │  ← All features
├──────────────────────────────────────────────┤
│ No CRM needed (BigQuery is database)         │  ← Self-contained
└──────────────────────────────────────────────┘

Workflow:
1. Reps use SalesOS dashboard
2. Agents manage everything
3. No external CRM at all
4. Export reports when needed

Cost: SalesOS only
Benefit: Simplest, most efficient
Time: Longest (build new workflows)
Risk: Highest (no legacy system fallback)


RECOMMENDATION:
Start with Option 1 (keep your CRM)
→ Prove value (3-6 months)
→ Migrate to Option 2 (SalesOS primary)
→ Eventually Option 3 (fully autonomous)
```

---

## INTEGRATION SETUP MATRIX

| System | Email | Calendar | CRM Update | Scheduling | Cost |
|--------|-------|----------|-----------|-----------|------|
| **Gmail** | ✅ Native | ✅ Via Calendar | ✅ To any CRM | ⚠️ Via Cloud Tasks | $0 |
| **Outlook** | ✅ Native | ✅ Native | ✅ To any CRM | ✅ Native | $0 |
| **Salesforce** | ⚠️ Via SFEC | ✅ Via Calendar | ✅ Native | ✅ Via SFEC | Included |
| **HubSpot** | ✅ Via Gmail | ✅ Via Calendar | ✅ Native | ✅ Via Scheduler | Included |
| **Pipedrive** | ✅ Via Gmail | ✅ Via Calendar | ✅ Native | ✅ Via Scheduler | Included |

Legend:
- ✅ = Fully supported, no workaround needed
- ⚠️ = Supported via workaround
- Integration works with SalesOS immediately

---

## COPY-PASTE: Complete Integration Setup

### Setup Step 1: Configure Email

```python
# config/email_config.py

if USE_GMAIL:
    EMAIL_CONFIG = {
        'type': 'gmail',
        'service_account_path': '/secrets/gmail-sa.json',
        'sender_email': 'saleos@company.com',
        'tracking_enabled': True  # via HubSpot/Salesforce
    }

elif USE_OUTLOOK:
    EMAIL_CONFIG = {
        'type': 'outlook',
        'tenant_id': os.getenv('OUTLOOK_TENANT_ID'),
        'client_id': os.getenv('OUTLOOK_CLIENT_ID'),
        'client_secret': os.getenv('OUTLOOK_CLIENT_SECRET'),
        'sender_email': 'saleos@company.com',
        'scheduling_native': True  # Outlook supports this
    }

# Initialize in main app
from email_integration import GmailIntegration, OutlookIntegration

email_client = (
    GmailIntegration(EMAIL_CONFIG['service_account_path'])
    if EMAIL_CONFIG['type'] == 'gmail'
    else OutlookIntegration(
        EMAIL_CONFIG['tenant_id'],
        EMAIL_CONFIG['client_id'],
        EMAIL_CONFIG['client_secret']
    )
)
```

### Setup Step 2: Configure Calendar

```python
# config/calendar_config.py

CALENDAR_CONFIG = {
    'type': 'google',  # or 'outlook'
    'service_account_path': '/secrets/calendar-sa.json',
    'create_meet_links': True,
    'add_attendees_automatically': True,
    'send_reminders': True
}

from calendar_integration import GoogleCalendarIntegration

calendar_client = GoogleCalendarIntegration(
    CALENDAR_CONFIG['service_account_path']
)
```

### Setup Step 3: Configure CRM

```python
# config/crm_config.py

# Choose ONE CRM (or use multiple adapters):

CRM_CONFIG = {
    'primary_crm': 'salesforce',  # or 'hubspot', 'pipedrive'
    
    'salesforce': {
        'instance_url': 'https://yourinstance.salesforce.com',
        'client_id': os.getenv('SALESFORCE_CLIENT_ID'),
        'client_secret': os.getenv('SALESFORCE_CLIENT_SECRET'),
        'username': os.getenv('SALESFORCE_USERNAME'),
        'password': os.getenv('SALESFORCE_PASSWORD'),
        'webhook_secret': os.getenv('SALESFORCE_WEBHOOK_SECRET')
    },
    
    'hubspot': {
        'api_key': os.getenv('HUBSPOT_API_KEY'),
        'webhook_secret': os.getenv('HUBSPOT_WEBHOOK_SECRET')
    },
    
    'pipedrive': {
        'api_token': os.getenv('PIPEDRIVE_API_TOKEN'),
        'company_domain': os.getenv('PIPEDRIVE_DOMAIN')
    }
}

from crm_integration import CRMFactory

crm_client = CRMFactory.create_adapter(
    CRM_CONFIG['primary_crm'],
    CRM_CONFIG[CRM_CONFIG['primary_crm']]
)
```

### Setup Step 4: Wire Everything Together

```python
# main.py

from email_integration import email_client
from calendar_integration import calendar_client
from crm_integration import crm_client
from agents import EmailAgent, EngagementAgent

# Initialize integration orchestrator
orchestrator = IntegrationOrchestrator(
    email=email_client,
    calendar=calendar_client,
    crm=crm_client
)

# Create agents with integration access
engagement_agent = EngagementAgent(
    integrations=orchestrator,
    config=agent_config
)

# Agent automatically has access to:
# engagement_agent.email.send_email()
# engagement_agent.calendar.create_event_with_meet_link()
# engagement_agent.crm.update_opportunity()
# engagement_agent.crm.create_task()
```

---

## WORKFLOW: Email Agent in Action

```python
class EmailAgent:
    """Engagement agent sending emails + scheduling"""
    
    def decide_follow_up(self, deal_id):
        """Agent decides to follow up"""
        
        # 1. DECISION (from agent logic)
        decision = {
            'action': 'send_follow_up_email',
            'prospect_email': 'prospect@company.com',
            'contact_id': 'Salesforce Contact ID',
            'deal_id': deal_id,
            'confidence': 0.87
        }
        
        # 2. EXECUTE (orchestrator handles all integrations)
        result = self.integrations.execute_follow_up_workflow(
            prospect_email=decision['prospect_email'],
            contact_id=decision['contact_id'],
            deal_id=decision['deal_id']
        )
        
        # What happens automatically:
        # ✅ Email sent via Gmail/Outlook
        # ✅ Calendar event created with Meet link
        # ✅ Calendar invite sent to prospect
        # ✅ Task logged in Salesforce/HubSpot/Pipedrive
        # ✅ Opportunity Next Step updated
        # ✅ Activity recorded with timestamp
        # ✅ Agent decision logged to audit trail
        # ✅ Engagement tracked for later analysis
        
        return {
            'email_sent': result['email_id'],
            'meeting_scheduled': result['event_id'],
            'meet_link': result['meet_link'],
            'crm_updated': result['crm_update_id'],
            'prospect_gets': [
                'Email about follow-up',
                'Google Calendar invite',
                'Google Meet link'
            ],
            'your_crm_shows': [
                'Email activity logged',
                'Meeting scheduled',
                'Next action date set'
            ]
        }
```

---

## TROUBLESHOOTING: Common Integration Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Emails not sending | Gmail API quota | Check API quotas, use SendGrid for high volume |
| Calendar invites not received | Meeting link generation failing | Enable Calendar API, check service account perms |
| CRM not updating | Webhook not triggered | Check webhook URL, verify authentication |
| Meet link not generated | Conference API disabled | Enable Google Calendar API in GCP project |
| Prospect data not syncing | Rate limiting | Implement exponential backoff retry logic |
| Duplicate activities in CRM | Multiple syncs running | Add deduplication check in sync logic |

---

## WHAT YOUR REP SEES

**In their CRM (Salesforce/HubSpot/Pipedrive):**

```
OPPORTUNITY: Acme Corp - $50K Deal

Timeline:
Jan 2 - 2:45 PM: EMAIL SENT (Agent)
        "Following up on our conversation"
        [View Email Content]

Jan 2 - 2:46 PM: CALENDAR INVITE SENT (Agent)
        "Follow-up Call with John"
        Meeting: Jan 4, 10:00 AM
        [Join Google Meet: meet.google.com/xxx-xxx-xxx]

Jan 4 - 10:15 AM: MEETING COMPLETED
        Duration: 30 minutes
        Next Step: Send proposal
        [Add Note]

---

NEXT STEPS (Agent Recommended):
"Send proposal with 3 pricing tiers"
Confidence: 82%
[Accept] [Modify] [Decline]
```

---

## FINAL ANSWER SUMMARY

### Your Questions Answered:

1. **"Email agent who can do follow up and schedule the calendar?"**
   - ✅ YES, completely automated
   - Sends email → Creates calendar event → Generates Meet link → Logs to CRM

2. **"And send google meet invites?"**
   - ✅ YES, automatic with calendar creation
   - Meet link generated automatically
   - Invite sent to prospect
   - Link included in follow-up email

3. **"And update the same in Salesforce or another CRM?"**
   - ✅ YES, works with any CRM
   - Salesforce → HubSpot → Pipedrive → Custom
   - Switch CRM by changing one config file

4. **"Do we have a CRM or everything's completely autonomous?"**
   - ✅ Three options:
     - Option 1: Use your existing CRM (safest)
     - Option 2: SalesOS primary, CRM secondary
     - Option 3: Fully autonomous SalesOS (no CRM needed)

### All of this happens AUTOMATICALLY with ZERO user interaction (except initial config).

**The Email Agent literally does everything you asked in one autonomous decision.**
