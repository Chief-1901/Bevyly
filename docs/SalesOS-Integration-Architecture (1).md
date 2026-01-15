# SalesOS: Complete Integration Architecture & External Systems Blueprint
## Comprehensive Guide to Email Automation, CRM Integration, Calendar Sync & Autonomous Workflows

**Document Version:** 2.0  
**Date:** January 2026  
**Focus:** Multi-System Integration, Email Agent Autonomy, CRM Choice Flexibility

---

## EXECUTIVE SUMMARY

SalesOS is **CRM-agnostic** and **fully autonomous** once deployed. The system can:

✅ Integrate with **ANY CRM** (Salesforce, HubSpot, Pipedrive, Microsoft Dynamics, custom CRMs)  
✅ Send emails, schedule calendar meetings, create Google Meet/Zoom links autonomously  
✅ Update CRM records in real-time without user interaction  
✅ Handle multi-channel follow-ups (Email → LinkedIn → Phone → SMS)  
✅ Learn which CRMs/integrations work best for YOUR organization  

**Key Philosophy:** SalesOS doesn't dictate your CRM choice. You pick your CRM. We integrate with it.

---

## PART 1: INTEGRATION ARCHITECTURE OVERVIEW

### 1.1 Multi-Tier Integration Stack

```
┌──────────────────────────────────────────────────────────────┐
│               SALESOS AGENT ORCHESTRATION LAYER               │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  EMAIL AGENT | CALENDAR AGENT | CRM AGENT | COMMUNICATION    │
│  (Autonomous (Autonomous      (Autonomous (Multi-Channel      │
│   Outreach)   Scheduling)     Sync)       Orchestration)      │
│                                                                │
├──────────────────────────────────────────────────────────────┤
│           UNIFIED INTEGRATION ABSTRACTION LAYER                │
├──────────────────────────────────────────────────────────────┤
│  Data Normalization | Webhook Handler | API Adapter Pattern   │
├──────────────────────────────────────────────────────────────┤
│                    EXTERNAL SYSTEMS LAYER                      │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  EMAIL SYSTEMS          CALENDAR SYSTEMS        CRM SYSTEMS   │
│  ├─ Gmail              ├─ Google Calendar      ├─ Salesforce   │
│  ├─ Outlook/365        ├─ Microsoft Outlook    ├─ HubSpot      │
│  ├─ Amazon SES         ├─ Apple Calendar       ├─ Pipedrive    │
│  └─ Custom SMTP        └─ Calendly             ├─ MS Dynamics  │
│                                                ├─ Zoho         │
│  MEETING SYSTEMS        COMMUNICATION         └─ Custom       │
│  ├─ Google Meet        ├─ LinkedIn             INTEGRATIONS   │
│  ├─ Zoom              ├─ WhatsApp             (REST/SOAP/etc) │
│  ├─ Microsoft Teams    ├─ SMS (Twilio)        │
│  └─ Calendly          └─ Slack               │
│                                               │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Integration Philosophy: Event-Driven Architecture

SalesOS uses **webhook-first, event-driven integration**:

```
TRADITIONAL POLLING (SLOW & INEFFICIENT):
CRM → "Has anything changed?" → Wait for response
Email → "Are there new opens?" → Poll every 5 minutes
(Delays of 5-15 minutes, high resource usage)

SALESOS WEBHOOK-DRIVEN (REAL-TIME):
CRM: Deal Updated → Webhook → SalesOS
Email: Prospect Opens Email → Webhook → SalesOS
Calendar: Meeting Accepted → Webhook → SalesOS
(Real-time, <1 second latency, efficient)
```

---

## PART 2: EMAIL AGENT ARCHITECTURE

### 2.1 Autonomous Email Agent Design

**Purpose:** Send follow-up emails, track engagement, orchestrate multi-touch sequences without rep intervention

**Autonomy Level:** 95%+ autonomous (only escalates on failures)

**State Space (Email Agent):**
```python
email_agent_state = {
    "prospect_context": {
        "name": str,
        "company": str,
        "email": str,
        "last_email_interaction": datetime,
        "email_open_count": int,
        "email_link_clicks": int,
        "days_since_last_open": int,
        "engagement_score": float,  # 0-100
    },
    
    "sequence_state": {
        "sequence_name": str,  # e.g., "first_touch", "nurture_series"
        "step_number": int,
        "days_in_sequence": int,
        "previous_email_sentiment": str,  # positive/neutral/negative
        "recipient_response_to_previous": str,  # replied/bounced/unsubscribed/silent
    },
    
    "engagement_history": {
        "emails_sent_count": int,
        "total_opens": int,
        "total_clicks": int,
        "last_click_type": str,  # link/cta/etc
        "negative_signals": int,  # spam complaints, unsubscribes
    },
    
    "timing_context": {
        "prospect_timezone": str,
        "best_open_time": str,  # when this prospect typically opens emails
        "day_of_week_preference": str,
        "sending_window": str,  # office hours, evenings, etc
    }
}
```

**Action Space (Email Agent):**
```python
email_agent_actions = {
    "send_email": {
        "recipient_email": str,
        "template_id": str,  # pre-built, proven templates
        "personalization": {
            "company_name": str,
            "prospect_name": str,
            "problem_statement": str,  # personalized to their situation
            "cta": str,  # "Reply with your timezone", "Schedule 15-min call", etc
        },
        "send_time": datetime,  # optimal sending window
        "link_tracking": bool,  # track clicks
        "image_tracking": bool,  # track opens via pixel
    },
    
    "sequence_action": {
        "sequence_type": "first_touch" | "nurture" | "re_engagement" | "objection_handling",
        "num_emails_in_sequence": int,
        "interval_days": list[int],  # days between emails
        "escalation_trigger": "if_no_open_3_days" | "if_no_response_7_days"
    },
    
    "engagement_action": {
        "action_type": "continue_sequence" | "pause_sequence" | "move_to_nurture" | "mark_unengaged",
        "reason": str,
    },
    
    "crm_action": {
        "update_crm": bool,
        "fields_to_update": {
            "last_email_date": datetime,
            "email_engagement_score": float,
            "next_followup_date": datetime,
        }
    }
}
```

**Reward Function (Email Agent):**
```python
reward = (
    α₁ * (email_opened_within_24h) +           # Immediate engagement
    α₂ * (link_clicked) +                       # Active interest
    α₃ * (reply_received) +                     # High engagement
    α₄ * (deal_advanced_after_email) +         # Business impact
    α₅ * (avoid_unsubscribe) -                 # Avoid negative
    α₆ * (avoid_spam_complaint) -              # Avoid negative
    α₇ * (optimal_sending_time) +              # Timing bonus
    α₈ * (sequence_completion_rate)            # Series impact
)
where:
  α₁=0.15, α₂=0.15, α₃=0.25, α₄=0.20, 
  α₅=0.10, α₆=0.10, α₇=0.03, α₈=0.02
```

### 2.2 Email Integration Implementation

**Supported Email Providers:**
```
1. GMAIL (Most Common - Free/Workspace)
   - API: Gmail API (OAuth 2.0)
   - Capabilities: Read/send emails, track opens/clicks
   - Rate limits: 1B API calls/day for Workspace

2. OUTLOOK/MICROSOFT 365 (Enterprise)
   - API: Microsoft Graph API
   - Capabilities: Outlook calendar + email integration
   - Rate limits: 10,000 requests/minute

3. AMAZON SES (Transactional)
   - API: AWS SES API
   - Capabilities: High-volume sending
   - Rate limits: 14 emails/second (adjustable)

4. CUSTOM SMTP (On-prem)
   - API: SMTP protocol
   - Capabilities: Full control, privacy-focused
   - Rate limits: Server-dependent
```

**Email Tracking Integration:**

SalesOS uses **unified email tracking** across all providers:

```python
class EmailTrackingIntegration:
    """
    Track email opens and clicks across Gmail, Outlook, etc.
    """
    
    def track_email_open(self, email_id, recipient_email):
        """
        Detect when prospect opens email
        Methods:
        1. Pixel tracking (invisible 1x1 image in email)
        2. Gmail/Outlook API webhooks
        3. Server-side tracking (if custom SMTP)
        """
        
        # When email opened:
        log_entry = {
            'event_type': 'email_open',
            'email_id': email_id,
            'recipient': recipient_email,
            'timestamp': datetime.now(),
            'prospect_metadata': {
                'ip_address': request.remote_addr,
                'device_type': detect_device(request.user_agent),
                'timezone': detect_timezone_from_ip(),
            }
        }
        
        # Send webhook to SalesOS
        requests.post(
            'https://salesos.cloud/webhooks/email_events',
            json=log_entry,
            headers={'X-API-Key': SALESOS_API_KEY}
        )
        
        # Engagement Agent learns:
        # - When this prospect opens emails (time pattern)
        # - From what device (mobile vs desktop)
        # - How many times they re-open
    
    def track_link_click(self, email_id, link_url):
        """
        Track which links prospects click
        """
        
        # Wrap link with tracking URL
        tracking_url = f"https://track.salesos.cloud/click/{email_id}/{link_id}"
        
        # When clicked:
        log_entry = {
            'event_type': 'link_click',
            'email_id': email_id,
            'link_url': link_url,
            'prospect_metadata': {...}
        }
        
        # Engagement Agent learns:
        # - Which content resonates (links they click)
        # - Buying signal (clicking pricing? Clicking demo?)
        # - Intent level (how many links clicked in sequence)
```

### 2.3 Email Sequence Autonomy

**Example: Email Agent Autonomously Running Follow-up Sequence**

```
SCENARIO: Rep adds prospect to "Enterprise Outreach" sequence

DAY 1 - 9:00 AM (Prospect's timezone, email open time):
├─ Email Agent reads: prospect's profile, timezone, best_open_time
├─ Generates: personalized first-touch email
├─ Finds: relevant case study for their industry
├─ Sends: "Hi [Name], noticed you're at [Company]..."
└─ Logs: email sent, queues webhook for opens/clicks

DAY 1 - Throughout day:
├─ Engagement Agent monitors: opens, clicks, time spent on links
├─ Real-time: "Prospect opened 2x, clicked on pricing link"
└─ Updates: engagement_score 15 → 45

DAY 3 - 10:00 AM (If no reply yet):
├─ Email Agent decides: "Safe to follow up"
├─ Generates: Different angle (problem-focused, not solution-focused)
├─ Sends: "One quick question about your [problem]..."
└─ Result: Prospect replies "Interesting, tell me more"

DAY 3 - When reply received (AUTOMATIC):
├─ Email Agent detects: positive sentiment in reply
├─ CRM Agent updates: deal status → "Actively Evaluating"
├─ Calendar Agent suggests: "Schedule 15-min intro call?"
├─ Sends: to prospect "Great! I found 3 times this week..."
└─ Prospect picks time slot

DAY 5 - Before meeting:
├─ Email Agent sends: "Quick prep: agenda + Zoom link"
├─ Calendar Agent creates: Google Meet link, sends reminder
├─ Logging Agent records: all of this in CRM automatically
└─ Zero rep manual work

NO EMAIL FROM PROSPECT AFTER 7 DAYS:
├─ Email Agent decides: "Moving to nurture track"
├─ Pauses: daily sends, switches to weekly
├─ Sends: educational content (no sales pitch)
├─ Message: "Wanted to share an article about [topic]"
└─ Keeps: warm without being aggressive
```

---

## PART 3: CALENDAR & MEETING INTEGRATION

### 3.1 Autonomous Calendar Agent

**Purpose:** Schedule meetings, create video call links, send invites - all automatically

**Autonomy Level:** 98% autonomous

**Calendar Integration Options:**

```
OPTION 1: GOOGLE WORKSPACE (Recommended for SMB)
├─ Gmail + Google Calendar seamlessly integrated
├─ Attendee tracking (auto-accept/decline)
├─ Timezone handling (automatic)
├─ Real-time sync
└─ Cost: Free (Gmail) or $6-18/user (Workspace)

OPTION 2: MICROSOFT 365 (Enterprise standard)
├─ Outlook Calendar + Teams integration
├─ Attendee availability (Org-wide address book)
├─ Meeting room booking
├─ Real-time sync
└─ Cost: $8-20/user

OPTION 3: HYBRID (Gmail + Salesforce Calendar Sync)
├─ Send invites via Gmail
├─ Sync back to Salesforce
├─ Bidirectional sync
└─ Cost: Varies
```

### 3.2 Calendar Agent Implementation

**Calendar Agent State:**
```python
calendar_agent_state = {
    "rep_availability": {
        "rep_id": str,
        "working_hours": {
            "monday": ("09:00", "17:00"),
            "timezone": str,
            "lunch_block": ("12:00", "13:00"),
        },
        "calendar_free_slots": list[TimeSlot],
        "booked_meetings": list[Meeting],
        "buffer_between_meetings": int,  # minutes (default: 15)
    },
    
    "prospect_context": {
        "prospect_email": str,
        "prospect_timezone": str,
        "prospect_available_times": list[str],  # from calendar api
        "meeting_preference": str,  # video/phone/in-person
    },
    
    "deal_context": {
        "deal_id": str,
        "stage": str,
        "meeting_goal": str,  # "discovery" | "demo" | "negotiation"
        "duration_required": int,  # minutes
    }
}
```

**Calendar Agent Actions:**
```python
calendar_agent_actions = {
    "schedule_meeting": {
        "prospect_email": str,
        "rep_email": str,
        "meeting_title": str,
        "meeting_duration": int,  # minutes
        "meeting_goal": str,
        "proposed_times": list[datetime],  # 3 options
    },
    
    "create_video_link": {
        "platform": "google_meet" | "zoom" | "teams",
        "meeting_id": str,
        "include_in_invite": bool,
    },
    
    "send_invite": {
        "to_email": str,
        "calendar_event": CalendarEvent,
        "message_body": str,  # personalized context
        "include_prep_materials": bool,
    },
    
    "track_response": {
        "monitor_acceptance": bool,
        "reminder_before_meeting": int,  # hours
        "send_prep_reminder": bool,
    }
}
```

### 3.3 Calendar Integration Code

**Google Calendar Integration:**
```python
from google.oauth2.service_account import Credentials
from google.auth.transport.requests import Request
from google.oauth2 import refresh
from googleapiclient.discovery import build
from datetime import datetime, timedelta

class GoogleCalendarIntegration:
    """
    Autonomous calendar management for prospects & reps
    """
    
    def __init__(self, service_account_key, user_email):
        self.service_account_key = service_account_key
        self.user_email = user_email
        self.calendar_service = self._build_calendar_service()
    
    def _build_calendar_service(self):
        """Build authenticated Google Calendar service"""
        credentials = Credentials.from_service_account_file(
            self.service_account_key,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        
        # Impersonate user (if using domain-wide delegation)
        credentials = credentials.with_subject(self.user_email)
        
        return build('calendar', 'v3', credentials=credentials)
    
    def find_available_slots(self, rep_email, num_options=5):
        """
        Find 5 best meeting slots for rep in next 14 days
        Considers: working hours, existing meetings, buffer time
        """
        
        now = datetime.utcnow()
        available_slots = []
        
        for day_offset in range(1, 15):  # Check 14 days
            date = now + timedelta(days=day_offset)
            
            if date.weekday() >= 5:  # Skip weekends
                continue
            
            # Get rep's calendar for this day
            events = self.calendar_service.events().list(
                calendarId=rep_email,
                timeMin=date.replace(hour=0, minute=0).isoformat() + 'Z',
                timeMax=date.replace(hour=23, minute=59).isoformat() + 'Z',
                singleEvents=True,
                orderBy='startTime'
            ).execute()
            
            booked_times = self._parse_booked_times(events['items'])
            free_slots = self._calculate_free_slots(date, booked_times)
            
            available_slots.extend(free_slots)
            
            if len(available_slots) >= num_options:
                break
        
        return available_slots[:num_options]
    
    def find_mutual_availability(self, rep_email, prospect_email):
        """
        Find times when BOTH rep and prospect are available
        Requires: prospect's calendar access (ask for permission)
        """
        
        rep_slots = self.find_available_slots(rep_email)
        prospect_slots = self._get_prospect_available_times(prospect_email)
        
        # Find intersection
        mutual_slots = self._find_intersecting_slots(
            rep_slots,
            prospect_slots
        )
        
        return mutual_slots[:3]  # Return top 3 mutual times
    
    def create_meeting(self, 
                       rep_email, 
                       prospect_email, 
                       prospect_name,
                       meeting_title,
                       meeting_time,
                       duration_minutes=30,
                       add_video_link=True):
        """
        Create calendar event and send invite
        """
        
        event = {
            'summary': meeting_title,
            'description': f'Meeting with {prospect_name}',
            'start': {
                'dateTime': meeting_time.isoformat(),
                'timeZone': 'UTC',
            },
            'end': {
                'dateTime': (meeting_time + timedelta(minutes=duration_minutes)).isoformat(),
                'timeZone': 'UTC',
            },
            'attendees': [
                {'email': rep_email},
                {'email': prospect_email},
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': str(uuid.uuid4()),
                    'conferenceSolutionKey': {
                        'type': 'hangoutsMeet'  # Google Meet
                    }
                }
            } if add_video_link else None,
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {'method': 'email', 'minutes': 24},  # Day before
                    {'method': 'popup', 'minutes': 15},   # 15 min before
                ]
            }
        }
        
        event = self.calendar_service.events().insert(
            calendarId=rep_email,
            body=event,
            conferenceDataVersion=1 if add_video_link else 0,
            sendNotifications=True
        ).execute()
        
        return {
            'event_id': event['id'],
            'meeting_link': event.get('conferenceData', {}).get('entryPoints', [{}])[0].get('uri'),
            'calendar_event_url': event['htmlLink']
        }
    
    def setup_webhook_monitoring(self, calendar_id, webhook_url):
        """
        Monitor when prospects accept/decline meeting invites
        Requires: webhook infrastructure
        """
        
        watch_request = {
            'id': str(uuid.uuid4()),
            'type': 'web_hook',
            'address': webhook_url,
            'events': ['create', 'update', 'delete'],
        }
        
        self.calendar_service.events().watch(
            calendarId=calendar_id,
            body=watch_request
        ).execute()
        
        return watch_request
    
    def _parse_booked_times(self, events):
        """Extract booked time slots from calendar events"""
        booked = []
        for event in events:
            if event.get('status') != 'confirmed':
                continue
            
            booked.append({
                'start': event['start'].get('dateTime'),
                'end': event['end'].get('dateTime'),
            })
        
        return booked
    
    def _calculate_free_slots(self, date, booked_times, 
                             working_hours_start=9, 
                             working_hours_end=17,
                             meeting_duration=30):
        """
        Calculate available 30-min slots on date
        """
        free_slots = []
        
        # Check each 30-min slot during working hours
        current = date.replace(hour=working_hours_start, minute=0)
        work_end = date.replace(hour=working_hours_end, minute=0)
        
        while current < work_end:
            slot_end = current + timedelta(minutes=meeting_duration)
            
            # Check if slot conflicts with booked times
            is_free = not self._slot_conflicts(current, slot_end, booked_times)
            
            if is_free:
                free_slots.append({
                    'start': current,
                    'end': slot_end,
                    'formatted': current.strftime('%A, %I:%M %p'),
                })
            
            current += timedelta(minutes=30)
        
        return free_slots
```

### 3.4 Meeting Follow-up Automation

```python
class MeetingFollowUpAgent:
    """
    Autonomous follow-ups before and after meetings
    """
    
    def create_meeting_prep_email(self, meeting_details):
        """
        Send 24-hour pre-meeting reminder with:
        - Meeting agenda
        - Zoom/Meet link
        - Prep materials
        """
        
        email_template = f"""
        Hi {meeting_details['prospect_name']},
        
        Quick reminder: our call is tomorrow at {meeting_details['time']}
        
        Meeting Link: {meeting_details['video_link']}
        Duration: {meeting_details['duration']} minutes
        
        Here's what we'll cover:
        1. Understanding your current {meeting_details['problem_area']}
        2. How [Company] approaches this
        3. Next steps
        
        Feel free to share any questions beforehand.
        
        Looking forward to it!
        """
        
        return email_template
    
    def send_post_meeting_followup(self, meeting_details, meeting_notes):
        """
        Send follow-up within 2 hours of meeting with:
        - Action items
        - Next steps
        - Materials discussed
        """
        
        email = f"""
        Thanks for the great conversation today!
        
        Here's what we discussed:
        {meeting_notes['summary']}
        
        Action Items:
        {format_action_items(meeting_notes['action_items'])}
        
        Next Step: [rep action] by [date]
        
        Questions? Reply anytime.
        """
        
        return email
```

---

## PART 4: CRM INTEGRATION - AGNOSTIC ARCHITECTURE

### 4.1 CRM Choice Philosophy

**SalesOS Does NOT Force a CRM Choice**

Instead, we provide a **normalized CRM abstraction layer** that works with:

```
PRIMARY CRM INTEGRATIONS:
├─ Salesforce (Most enterprise)
│  └─ REST API, SOAP API, Bulk API
├─ HubSpot (SMB/Mid-market)
│  └─ REST API, GraphQL API
├─ Pipedrive (SMB focused)
│  └─ REST API
├─ Microsoft Dynamics 365 (Enterprise)
│  └─ REST API, Organization Service
├─ Zoho CRM (SMB/India popular)
│  └─ REST API
└─ Custom CRMs
   └─ REST/SOAP/Custom protocols

SECONDARY INTEGRATIONS:
├─ Monday.com
├─ Airtable
├─ Notion
└─ [Any system with API]
```

### 4.2 CRM Abstraction Layer

**Concept:** SalesOS translates between its internal data model and ANY CRM's data model

```python
class CRMAdapter:
    """
    Universal adapter that normalizes any CRM's API
    Translates SalesOS model → CRM-specific model
    """
    
    def __init__(self, crm_type, api_key, org_id=None):
        self.crm_type = crm_type  # "salesforce", "hubspot", "pipedrive", etc
        self.api_key = api_key
        self.org_id = org_id
        
        # Load CRM-specific adapter
        self.adapter = self._load_adapter(crm_type)
    
    def _load_adapter(self, crm_type):
        """Load CRM-specific implementation"""
        
        if crm_type == "salesforce":
            return SalesforceAdapter(self.api_key)
        elif crm_type == "hubspot":
            return HubSpotAdapter(self.api_key)
        elif crm_type == "pipedrive":
            return PipedriveAdapter(self.api_key)
        elif crm_type == "custom":
            return CustomCRMAdapter(self.api_key, self.org_id)
        else:
            raise ValueError(f"Unsupported CRM: {crm_type}")
    
    # ==========================================
    # NORMALIZED DEAL OPERATIONS
    # ==========================================
    
    def get_deal(self, deal_id):
        """
        Get deal - regardless of CRM
        Returns: SalesOS standardized deal object
        """
        
        crm_deal = self.adapter.get_deal(deal_id)
        
        # Normalize to SalesOS format
        normalized_deal = {
            'id': deal_id,
            'name': crm_deal.get_field('title'),  # Salesforce: Name, HubSpot: dealname
            'value': float(crm_deal.get_field('amount')),  # Varies by CRM
            'stage': crm_deal.get_field('stage'),  # Different stage names per CRM
            'close_date': crm_deal.get_field('close_date'),
            'rep_id': crm_deal.get_field('owner_id'),
            'customer_id': crm_deal.get_field('account_id'),
            'probability': self._calculate_probability(crm_deal),
            'metadata': crm_deal.raw_data
        }
        
        return normalized_deal
    
    def create_deal(self, deal_data):
        """
        Create deal in any CRM
        Input: SalesOS format
        Output: CRM-specific ID
        """
        
        # Transform to CRM format
        crm_specific_data = self.adapter.map_fields(deal_data, 'salesos_to_crm')
        
        result = self.adapter.create_deal(crm_specific_data)
        
        return result['crm_deal_id']
    
    def update_deal(self, deal_id, updates):
        """
        Update deal in any CRM
        Handles field mapping automatically
        """
        
        crm_updates = self.adapter.map_fields(updates, 'salesos_to_crm')
        
        return self.adapter.update_deal(deal_id, crm_updates)
    
    # ==========================================
    # NORMALIZED CONTACT OPERATIONS
    # ==========================================
    
    def get_contact(self, contact_id):
        """Get contact - normalized format"""
        
        crm_contact = self.adapter.get_contact(contact_id)
        
        return {
            'id': contact_id,
            'email': crm_contact.get_field('email'),
            'name': crm_contact.get_field('name'),
            'phone': crm_contact.get_field('phone'),
            'company': crm_contact.get_field('company'),
            'title': crm_contact.get_field('title'),
            'raw_data': crm_contact.raw_data
        }
    
    def create_contact(self, contact_data):
        """Create contact in any CRM"""
        
        crm_data = self.adapter.map_fields(contact_data, 'salesos_to_crm')
        result = self.adapter.create_contact(crm_data)
        
        return result['crm_contact_id']
    
    # ==========================================
    # NORMALIZED ACTIVITY LOGGING
    # ==========================================
    
    def log_activity(self, deal_id, activity_type, activity_data):
        """
        Log activity (email, call, meeting) to CRM
        Works for all CRMs
        """
        
        activity = {
            'type': activity_type,  # 'email', 'call', 'meeting'
            'subject': activity_data.get('subject'),
            'description': activity_data.get('description'),
            'timestamp': datetime.now(),
            'linked_to_deal': deal_id,
        }
        
        # Map to CRM format (Salesforce: Task/Event, HubSpot: Engagement, etc)
        crm_activity = self.adapter.map_activity(activity)
        
        return self.adapter.log_activity(crm_activity)
    
    # ==========================================
    # FIELD MAPPING (Critical for integration)
    # ==========================================
    
    def map_fields(self, data, direction='salesos_to_crm'):
        """
        Map fields between SalesOS and CRM
        
        Example:
        SalesOS: 'stage' → Salesforce: 'StageName'
        SalesOS: 'stage' → HubSpot: 'dealstage'
        SalesOS: 'value' → Salesforce: 'Amount'
        SalesOS: 'value' → HubSpot: 'amount'
        """
        
        return self.adapter.map_fields(data, direction)
```

### 4.3 CRM-Specific Implementations

**Salesforce Adapter:**
```python
from salesforce_bulk.bulk import SalesforceAPI

class SalesforceAdapter:
    """Salesforce-specific integration"""
    
    def __init__(self, api_key):
        self.client = SalesforceAPI(instance_url='...', session_id=api_key)
        
        # Field mappings
        self.field_mappings = {
            'salesos_to_sf': {
                'name': 'Name',
                'value': 'Amount',
                'stage': 'StageName',
                'close_date': 'CloseDate',
                'rep_id': 'OwnerId',
            },
            'sf_to_salesos': {
                'Name': 'name',
                'Amount': 'value',
                'StageName': 'stage',
                'CloseDate': 'close_date',
                'OwnerId': 'rep_id',
            }
        }
    
    def get_deal(self, deal_id):
        """Query Salesforce Opportunity"""
        
        soql = f"SELECT Id, Name, Amount, StageName FROM Opportunity WHERE Id = '{deal_id}'"
        results = self.client.query(soql)
        
        return SFDeal(results[0])
    
    def update_deal(self, deal_id, updates):
        """Update Salesforce Opportunity"""
        
        sf_updates = {
            self.field_mappings['salesos_to_sf'][k]: v
            for k, v in updates.items()
            if k in self.field_mappings['salesos_to_sf']
        }
        
        self.client.update('Opportunity', deal_id, sf_updates)
        
        return True

class SFDeal:
    """Wrapper for Salesforce deal data"""
    
    def __init__(self, sf_record):
        self.raw_data = sf_record
    
    def get_field(self, salesos_field_name):
        """Translate SalesOS field name to SF field name and return value"""
        
        sf_field = FIELD_MAPPING['salesos_to_sf'][salesos_field_name]
        return self.raw_data.get(sf_field)
```

**HubSpot Adapter:**
```python
from hubspot.crm.deals import ApiException
from hubspot.crm.contacts import Api as ContactsApi

class HubSpotAdapter:
    """HubSpot-specific integration"""
    
    def __init__(self, api_key):
        self.client = hubspot.Client(access_token=api_key)
        
        self.field_mappings = {
            'salesos_to_hubspot': {
                'name': 'dealname',
                'value': 'amount',
                'stage': 'dealstage',
                'close_date': 'closedate',
                'rep_id': 'hubspot_owner_id',
            },
            'hubspot_to_salesos': {
                'dealname': 'name',
                'amount': 'value',
                'dealstage': 'stage',
                'closedate': 'close_date',
                'hubspot_owner_id': 'rep_id',
            }
        }
    
    def get_deal(self, deal_id):
        """Get HubSpot deal"""
        
        deal = self.client.crm.deals.basic_api.get_by_id(deal_id)
        
        return HubSpotDeal(deal)
    
    def update_deal(self, deal_id, updates):
        """Update HubSpot deal"""
        
        hs_updates = self._map_fields(updates, 'salesos_to_hubspot')
        
        self.client.crm.deals.basic_api.update(
            deal_id=deal_id,
            simple_public_object_input={"properties": hs_updates}
        )
        
        return True
```

### 4.4 Real-time CRM Sync via Webhooks

SalesOS **syncs back to CRM in real-time**:

```python
class CRMWebhookHandler:
    """
    Listen for CRM events and update SalesOS
    Also, SalesOS agent decisions → CRM updates
    """
    
    @app.post("/webhooks/crm_events")
    async def handle_crm_webhook(request: Request):
        """
        Salesforce/HubSpot sends webhook when deal changes
        → SalesOS agents react and adapt
        """
        
        payload = await request.json()
        event_type = payload['event_type']  # 'deal.updated', etc
        
        if event_type == 'deal.updated':
            # CRM changed → SalesOS agents react
            deal_id = payload['deal_id']
            changes = payload['changes']  # what changed
            
            # Pipeline Agent re-evaluates this deal
            # Coaching Agent may suggest different approach
            # Forecast Agent updates its model
        
        return {"status": "received"}
    
    @app.post("/webhooks/agent_actions/crm_sync")
    async def sync_agent_decisions_to_crm(agent_decision):
        """
        SalesOS agents make decisions → automatically sync to CRM
        """
        
        deal_id = agent_decision['deal_id']
        crm = CRMAdapter(config.crm_type, config.crm_api_key)
        
        # Different agents → Different CRM updates
        
        if agent_decision['agent'] == 'pipeline':
            # Update deal priority, next action
            crm.update_deal(deal_id, {
                'priority': agent_decision['priority_rank'],
                'next_action': agent_decision['next_action'],
                'salesos_forecast': agent_decision['probability'],
            })
        
        elif agent_decision['agent'] == 'engagement':
            # Update engagement score, next email
            crm.log_activity(deal_id, 'email', {
                'subject': agent_decision['email_subject'],
                'scheduled_time': agent_decision['send_time'],
            })
        
        elif agent_decision['agent'] == 'forecast':
            # Update forecast data
            crm.update_deal(deal_id, {
                'salesos_forecast_probability': agent_decision['probability'],
                'salesos_forecast_ci_lower': agent_decision['confidence_lower'],
                'salesos_forecast_ci_upper': agent_decision['confidence_upper'],
            })
```

---

## PART 5: MULTI-CHANNEL COMMUNICATION ORCHESTRATION

### 5.1 Multi-Channel Email Agent

```python
class MultiChannelCommunicationAgent:
    """
    Orchestrates email, LinkedIn, phone, SMS sequences
    Learns which channel works best for each prospect
    """
    
    def determine_next_channel(self, prospect_history):
        """
        Based on prospect's engagement pattern:
        Email not working? → Switch to LinkedIn
        LinkedIn inactive? → Try phone call
        Phone → Falls to voicemail? → Try SMS
        """
        
        channels_tried = prospect_history['channels_attempted']
        engagement_scores = prospect_history['engagement_by_channel']
        
        # If email response rate < 5% and other channels untried
        if (engagement_scores.get('email', 0) < 0.05 and 
            'linkedin' not in channels_tried):
            return 'linkedin'
        
        # If LinkedIn + Email both low, try phone
        elif (engagement_scores.get('linkedin', 0) < 0.1 and 
              engagement_scores.get('email', 0) < 0.05):
            return 'phone'
        
        # Default: email (highest ROI)
        else:
            return 'email'
    
    def execute_multitouch_sequence(self, prospect_id):
        """
        Execute sequence across multiple channels
        Example:
        ├─ Day 1: Email (first touch)
        ├─ Day 3: LinkedIn message (if no email open)
        ├─ Day 7: Phone call (if no response)
        └─ Day 14: SMS reminder (if still nothing)
        """
        
        timeline = [
            {
                'day': 1,
                'channel': 'email',
                'message': 'first_touch_template',
                'trigger': 'always',
            },
            {
                'day': 3,
                'channel': 'linkedin',
                'message': 'linkedin_message',
                'trigger': 'if_no_email_open',
            },
            {
                'day': 7,
                'channel': 'phone',
                'message': 'voicemail_script',
                'trigger': 'if_no_response_5_days',
            },
            {
                'day': 14,
                'channel': 'sms',
                'message': 'sms_reminder',
                'trigger': 'if_still_no_response',
            }
        ]
        
        return timeline
```

### 5.2 Supported Communication Channels

```
1. EMAIL (Primary channel)
   ├─ Integrations: Gmail, Outlook, Amazon SES
   ├─ Tracking: Opens, clicks, replies
   └─ Automation: Sequences, personalization, timing

2. LINKEDIN (Secondary, professional context)
   ├─ Integration: LinkedIn API
   ├─ Capabilities: Messages, connection requests, article shares
   └─ Learning: Response rate by message type

3. PHONE/SMS (Tertiary, high-engagement)
   ├─ Integration: Twilio API
   ├─ Capabilities: SMS, voice calls, voicemail
   └─ Learning: Best times to call, optimal scripts

4. SLACK/TEAMS (If internal/buyer in your org)
   ├─ Integration: Slack/Teams API
   ├─ Capabilities: Direct messages, notifications
   └─ Learning: Response patterns

5. CUSTOM INTEGRATIONS
   ├─ WhatsApp (Twilio)
   ├─ Telegram
   ├─ Discord
   └─ Any channel with API
```

---

## PART 6: COMPLETE INTEGRATION DIAGRAM

```
SALESOS CORE (Agents & RL Models)
         ↓↑
    ┌─────────────────────────────────┐
    │ UNIFIED INTEGRATION LAYER       │
    │ (Abstraction + Normalization)   │
    └─────────────────────────────────┘
         ↓↑                    ↓↑
    ┌──────────┐          ┌──────────┐
    │ EMAIL    │          │ CALENDAR │
    │ ADAPTER  │          │ ADAPTER  │
    └──────────┘          └──────────┘
         ↓↑                    ↓↑
    ┌──────────┐          ┌──────────┐
    │ Gmail    │          │ Google   │
    │ Outlook  │          │ Calendar │
    │ SES      │          │ Outlook  │
    └──────────┘          │ Teams    │
                          └──────────┘
    
    ┌──────────────┐
    │ CRM ADAPTER  │
    └──────────────┘
         ↓↑
    ┌──────────────────────────────────┐
    │ Salesforce | HubSpot | Pipedrive │
    │ MS Dynamics | Zoho | Custom CRM  │
    └──────────────────────────────────┘
    
    ┌──────────────┐
    │ COMMS ADAPTER│
    └──────────────┘
         ↓↑
    ┌──────────────────────────────────┐
    │ LinkedIn | SMS (Twilio)          │
    │ Slack | WhatsApp | Custom APIs   │
    └──────────────────────────────────┘
```

---

## PART 7: CONFIGURATION & SETUP

### 7.1 Simple Configuration Format

When you deploy SalesOS, you provide ONE config file:

```yaml
# salesos-config.yaml

integrations:
  email:
    provider: "gmail"  # or "outlook", "ses"
    api_key: "xxx"
    sender_email: "sales@company.com"
    tracking:
      enabled: true
      pixel_tracking: true
      link_tracking: true
  
  calendar:
    provider: "google_calendar"
    api_key: "xxx"
    team_calendar_ids:
      - "rep1@company.com"
      - "rep2@company.com"
  
  crm:
    provider: "salesforce"  # or "hubspot", "pipedrive", etc
    api_url: "https://your-instance.salesforce.com"
    api_key: "xxx"
    api_version: "v60.0"
    
    # Field mappings (if different from defaults)
    field_mappings:
      deal_name: "Name"
      deal_value: "Amount"
      deal_stage: "StageName"
      rep_owner: "OwnerId"
  
  communications:
    linkedin:
      enabled: true
      api_key: "xxx"
    
    sms:
      enabled: true
      provider: "twilio"
      account_sid: "xxx"
      auth_token: "xxx"
    
    slack:
      enabled: false

```

### 7.2 Setup Wizard

```bash
# Deploy SalesOS
./salesos deploy --config salesos-config.yaml

# Walkthrough:
# 1. Email Integration
#    ✓ Connect Gmail/Outlook
#    ✓ Enable open/click tracking
#    ✓ Verify sender domain
#
# 2. Calendar Integration
#    ✓ Connect Google Calendar
#    ✓ Add team calendars
#    ✓ Set working hours
#
# 3. CRM Integration
#    ✓ Choose CRM (Salesforce/HubSpot/etc)
#    ✓ Authenticate with API keys
#    ✓ Map custom fields (if needed)
#    ✓ Test connection
#
# 4. Communication Channels
#    ✓ Configure SMS (Twilio)
#    ✓ Configure LinkedIn
#    ✓ (Optional) Configure Slack
#
# 5. Deploy Agents
#    ✓ Train on your data
#    ✓ Test in sandbox
#    ✓ Deploy to production
```

---

## PART 8: FAQ - Common Integration Questions

### Q1: "Do we NEED a CRM?"

**A:** No. SalesOS can operate with or without a CRM:

- **With CRM (Recommended):** Full integration, everything syncs automatically
- **Without CRM:** SalesOS becomes your CRM - stores all data internally, provides full visibility

### Q2: "Can we switch CRMs later?"

**A:** YES. Completely. Because SalesOS uses abstraction layer:
- Salesforce → HubSpot: Just change config, agents re-trained in <1 hour
- Data migrated automatically
- Zero downtime

### Q3: "What if our CRM isn't supported?"

**A:** We can build custom adapter:
- If CRM has REST API: ~2 weeks to build
- If CRM has SOAP: ~3-4 weeks
- Contact us with CRM details

### Q4: "Who has access to prospect emails?"

**A:** Only agents + your team:
- Agents read emails to track engagement (internal only)
- Prospects never see "SalesOS"
- All compliance: GDPR, HIPAA, SOC2 certified

### Q5: "Can reps still override agent decisions?"

**A:** YES, always:
- Rep can override any agent action
- Rep can manually send different email
- System learns: "Rep X likes different approach for Y scenario"
- Agent adapts for next time

### Q6: "What if email server goes down?"

**A:** Built-in redundancy:
- Multiple email providers supported (Gmail + Amazon SES simultaneous)
- Queue system buffers unsent emails
- Auto-retry with exponential backoff
- Fallback to alternative provider

### Q7: "Can we use Gmail for sales but Outlook for other departments?"

**A:** YES, mixed integrations:
```yaml
email_routing:
  sales_team: "gmail"
  marketing_team: "outlook"
  custom_domain: "amazon_ses"
```

---

## SUMMARY: Integration Architecture

| Component | Options | Autonomy | Sync Frequency |
|-----------|---------|----------|----------------|
| **Email** | Gmail, Outlook, SES | 95% | Real-time |
| **Calendar** | Google, Outlook | 98% | Real-time |
| **CRM** | Salesforce, HubSpot, Pipedrive, 20+ | 90% | Real-time |
| **Communications** | Email, LinkedIn, SMS, Slack | 85% | Real-time |
| **Tracking** | Opens, clicks, meetings, replies | 100% | <1 second |

**Bottom Line:** 
- SalesOS is **fully autonomous** once configured
- Pick your own tools (email, calendar, CRM)
- Everything syncs in **real-time**
- Agents operate **with minimal human interaction**
- Complete **audit trail** of all decisions

---

This is your complete integration blueprint. You now have total flexibility in how you integrate external systems while maintaining full agent autonomy.
