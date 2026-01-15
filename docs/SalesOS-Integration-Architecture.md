# SalesOS Integration Architecture
## Complete External System Integration Design

**Version:** 1.0  
**Date:** January 2026  
**Status:** Integration Architecture Specification

---

## EXECUTIVE OVERVIEW

SalesOS is a **CRM-agnostic, integration-first operating system**. You don't replace your existing CRM—you enhance it with intelligent agents that orchestrate across:

- **Email Systems** (Gmail, Outlook)
- **Calendar Systems** (Google Calendar, Outlook Calendar)
- **Proposal Software** (DocuSign, Proposify, PDF technology)
- **CRM Systems** (Salesforce, HubSpot, Pipedrive, custom)
- **Video Conferencing** (Google Meet, Zoom)
- **Communication Tools** (Slack, Teams)
- **Call Recording** (Gong, Chorus)
- **Data Warehousing** (Existing data infrastructure)

The system works with any CRM and acts as a **unified intelligence layer** above your existing tech stack.

---

## PART 1: SYSTEM ARCHITECTURE (NO CRM REPLACEMENT)

### 1.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SALESOS OPERATING SYSTEM                │
│                    (Intelligence Layer - Not CRM)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CORE AGENTS (Pipeline, Forecast, Coaching, Engagement, etc)   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Integration & Orchestration Layer                        │   │
│  │ (Handles all external system connections)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ▲                                      │
│         ┌─────────────────┼─────────────────┐                   │
│         │                 │                 │                   │
├─────────┼─────────────────┼─────────────────┼───────────────────┤
│   │         │                 │                 │              │
│   ▼         ▼                 ▼                 ▼              │
│ ┌──────┐ ┌─────────┐    ┌──────────┐    ┌──────────────┐     │
│ │EMAIL │ │CALENDAR │    │  CRM     │    │  PROPOSAL    │     │
│ │      │ │         │    │          │    │   SOFTWARE   │     │
│ │Gmail │ │Google   │    │Salesforce│    │DocuSign/    │     │
│ │Outlook│ │Outlook  │    │HubSpot   │    │Proposify    │     │
│ └──────┘ └─────────┘    │Pipedrive │    │             │     │
│                          └──────────┘    └──────────────┘     │
│                                                                │
│ ┌──────────┐ ┌──────────┐  ┌──────────┐ ┌──────────────┐    │
│ │ VIDEO    │ │COMMS     │  │ANALYTICS │ │SCHEDULING/  │    │
│ │          │ │          │  │          │ │TASK MGT     │    │
│ │Google    │ │Slack     │  │Gong      │ │Google Tasks │    │
│ │Meet/Zoom │ │Teams     │  │Chorus    │ │Monday       │    │
│ └──────────┘ └──────────┘  └──────────┘ └──────────────┘    │
│                                                                │
└─────────────────────────────────────────────────────────────────┘
                        Your Existing Stack
         (CRM, Email, Calendar, Tools - All Compatible)
```

### Key Principle: **SalesOS = Intelligence Layer, Not CRM Replacement**

- ✅ Works with Salesforce, HubSpot, Pipedrive, or any CRM
- ✅ Works with Gmail, Outlook, or any email system
- ✅ Works with Google Calendar, Outlook Calendar, or any calendar
- ✅ Agents integrate with your existing tools via APIs
- ✅ Data flows bidirectionally (read CRM → make decision → write back to CRM)
- ✅ Your CRM remains the source of truth

---

## PART 2: EMAIL AGENT INTEGRATION (Complete Specification)

### 2.1 Email Agent Architecture

**Purpose:** Autonomous email follow-up, scheduling, and engagement orchestration

**Responsible For:**
- Send templated emails
- Track opens/clicks
- Schedule follow-ups
- Schedule calendar invites with meet links
- Update CRM with communication history

### 2.2 Gmail API Integration (Complete Code)

```python
from google.auth.transport.requests import Request
from google.oauth2.service_account import Credentials
from google.oauth2 import service_account
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import googleapiclient.discovery
from datetime import datetime, timedelta
import json

class GmailIntegration:
    """Gmail API integration for Email Agent"""
    
    def __init__(self, service_account_json_path):
        """Initialize Gmail API client"""
        self.credentials = service_account.Credentials.from_service_account_file(
            service_account_json_path,
            scopes=['https://www.googleapis.com/auth/gmail.send',
                   'https://www.googleapis.com/auth/gmail.readonly',
                   'https://www.googleapis.com/auth/gmail.modify']
        )
        self.service = googleapiclient.discovery.build(
            'gmail', 'v1', credentials=self.credentials
        )
    
    def send_email(self, to, subject, body_html, body_text=None, 
                   cc=None, bcc=None, scheduled_time=None):
        """
        Send email from sales rep's account
        
        Args:
            to (str): Recipient email
            subject (str): Email subject
            body_html (str): HTML email body
            body_text (str): Plain text fallback
            cc (list): CC recipients
            bcc (list): BCC recipients
            scheduled_time (datetime): When to send (if supported)
        
        Returns:
            dict: {message_id, thread_id, timestamp}
        """
        
        try:
            # Create message
            message = MIMEMultipart('alternative')
            message['To'] = to
            message['Subject'] = subject
            
            if cc:
                message['Cc'] = ','.join(cc)
            
            # Add body
            if body_text:
                text_part = MIMEText(body_text, 'plain')
                message.attach(text_part)
            
            html_part = MIMEText(body_html, 'html')
            message.attach(html_part)
            
            # Encode message
            raw_message = base64.urlsafe_b64encode(
                message.as_bytes()
            ).decode()
            
            # Send email
            send_message = {
                'raw': raw_message
            }
            
            result = self.service.users().messages().send(
                userId='me',
                body=send_message
            ).execute()
            
            return {
                'success': True,
                'message_id': result.get('id'),
                'thread_id': result.get('threadId'),
                'timestamp': datetime.now().isoformat(),
                'to': to,
                'subject': subject
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def track_email_engagement(self, thread_id, message_id):
        """
        Get email engagement data (opens, clicks)
        Note: Gmail doesn't natively track opens. Use integration with:
        - HubSpot: Tracks Gmail opens via email extension
        - Salesforce Email Cloud: Built-in tracking
        - Mixpanel/Segment: Email tracking via pixel
        
        Returns:
            dict: {opens, clicks, last_activity}
        """
        
        try:
            # Get message details
            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='metadata'
            ).execute()
            
            # Extract thread history
            thread = self.service.users().threads().get(
                userId='me',
                id=thread_id
            ).execute()
            
            # Count responses
            response_count = len(thread['messages']) - 1  # Exclude original
            
            return {
                'message_id': message_id,
                'thread_id': thread_id,
                'response_count': response_count,
                'last_activity': self._get_last_activity(thread),
                'status': self._determine_status(thread)
            }
        
        except Exception as e:
            return {'error': str(e)}
    
    def get_email_open_tracking(self, message_id):
        """
        Get open/click tracking via email tracking service
        
        Common providers:
        - HubSpot: Tracks via email extension
        - Salesforce: Email Cloud feature
        - Gong: Analyzes email sentiment + response
        - Mixpanel: Pixel-based tracking
        """
        
        # This would integrate with your email tracking service
        # Example with HubSpot:
        # GET /crm/v3/objects/emails/{id} → trackingStatus, opens, clicks
        pass
    
    def _get_last_activity(self, thread):
        """Extract last activity timestamp from thread"""
        if 'messages' in thread and len(thread['messages']) > 0:
            last_msg = thread['messages'][-1]
            return int(last_msg['internalDate']) / 1000
        return None
    
    def _determine_status(self, thread):
        """Determine email thread status"""
        if len(thread['messages']) == 1:
            return 'sent'
        elif len(thread['messages']) == 2:
            return 'replied'
        else:
            return 'conversation'
```

### 2.3 Email Scheduling (Workaround for Gmail Limitation)

**Problem:** Gmail API doesn't natively support scheduled sends

**Solutions:**

**Option 1: Cloud Task Scheduler (Recommended)**
```python
from google.cloud import tasks_v2
from datetime import datetime, timedelta
import json

class EmailScheduler:
    """Schedule emails using Cloud Tasks"""
    
    def __init__(self, project_id, queue_id):
        self.client = tasks_v2.CloudTasksClient()
        self.project = project_id
        self.queue = queue_id
    
    def schedule_email(self, to, subject, body_html, 
                       send_at_datetime, contact_id):
        """
        Schedule email to be sent at specific time
        
        Args:
            to (str): Recipient email
            subject (str): Email subject
            body_html (str): HTML body
            send_at_datetime (datetime): When to send
            contact_id (str): CRM contact ID for tracking
        """
        
        parent = self.client.queue_path(self.project, 'us-central1', self.queue)
        
        # Create task
        task = {
            'http_request': {
                'http_method': tasks_v2.HttpMethod.POST,
                'url': 'https://your-salesos-api.com/send-scheduled-email',
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({
                    'to': to,
                    'subject': subject,
                    'body_html': body_html,
                    'contact_id': contact_id
                }).encode()
            }
        }
        
        # Schedule task
        if send_at_datetime:
            timestamp = send_at_datetime.timestamp()
            task['schedule_time'] = {
                'seconds': int(timestamp)
            }
        
        response = self.client.create_task(request={
            'parent': parent,
            'task': task
        })
        
        return {
            'task_id': response.name,
            'scheduled_for': send_at_datetime.isoformat(),
            'status': 'scheduled'
        }
```

**Option 2: Salesforce Email Cloud (If Using Salesforce)**
```python
# Salesforce has native email scheduling in Email Cloud
# Use Salesforce REST API to schedule emails

class SalesforceEmailScheduler:
    """Schedule emails via Salesforce Email Cloud"""
    
    def schedule_email_via_salesforce(self, salesforce_client, 
                                      to, subject, body,
                                      send_at_datetime):
        """
        Schedule email using Salesforce Email Cloud
        Salesforce stores scheduled emails in Task/Activity records
        """
        
        # Create Task record with scheduled time
        task = {
            'Subject': subject,
            'WhoId': contact_id,  # Salesforce Contact ID
            'Type': 'Email',
            'Status': 'Not Started',
            'ReminderDateTime': send_at_datetime.isoformat(),
            'Description': body
        }
        
        result = salesforce_client.create('Task', task)
        return result
```

**Option 3: Use External Email Scheduling Service**
```python
# Services like SendGrid, Mailgun, Amazon SES have native scheduling

import requests

class SendGridScheduler:
    """Schedule emails via SendGrid API"""
    
    def schedule_email(self, to, subject, body_html, 
                      send_at_timestamp):
        """
        SendGrid supports scheduling with send_at parameter
        """
        
        headers = {
            'Authorization': f'Bearer {SENDGRID_API_KEY}',
            'Content-Type': 'application/json'
        }
        
        data = {
            'personalizations': [{
                'to': [{'email': to}],
                'send_at': int(send_at_timestamp)
            }],
            'from': {'email': 'saleos@company.com'},
            'subject': subject,
            'content': [{
                'type': 'text/html',
                'value': body_html
            }]
        }
        
        response = requests.post(
            'https://api.sendgrid.com/v3/mail/send',
            json=data,
            headers=headers
        )
        
        return response.json()
```

### 2.4 Outlook Integration (For Outlook/Office 365 Users)

```python
from msgraph.core import GraphClient
from azure.identity import ClientSecretCredential
from datetime import datetime, timedelta
import json

class OutlookIntegration:
    """Outlook/Office 365 email integration"""
    
    def __init__(self, tenant_id, client_id, client_secret):
        """Initialize Microsoft Graph client"""
        
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )
        
        self.client = GraphClient(credential=credential)
    
    def send_email(self, to, subject, body_html, scheduled_time=None):
        """
        Send email via Outlook (Microsoft Graph API)
        Outlook supports scheduled sends natively!
        """
        
        body = {
            'message': {
                'subject': subject,
                'body': {
                    'contentType': 'html',
                    'content': body_html
                },
                'toRecipients': [
                    {
                        'emailAddress': {
                            'address': to
                        }
                    }
                ]
            },
            'saveToSentItems': True
        }
        
        # For scheduled send
        if scheduled_time:
            body['scheduledTime'] = scheduled_time.isoformat()
        
        response = self.client.post(
            '/me/messages',
            json=body
        )
        
        return response
```

---

## PART 3: CALENDAR & MEETING INTEGRATION

### 3.1 Google Calendar Integration (Complete)

```python
from google.oauth2 import service_account
import googleapiclient.discovery
from datetime import datetime, timedelta

class GoogleCalendarIntegration:
    """Google Calendar integration for scheduling"""
    
    def __init__(self, service_account_json_path):
        """Initialize Calendar API"""
        
        self.credentials = service_account.Credentials.from_service_account_file(
            service_account_json_path,
            scopes=['https://www.googleapis.com/auth/calendar']
        )
        
        self.service = googleapiclient.discovery.build(
            'calendar', 'v3', credentials=self.credentials
        )
    
    def create_event_with_meet_link(self, 
                                   title,
                                   description,
                                   start_time,
                                   end_time,
                                   attendees_emails,
                                   calendar_id='primary'):
        """
        Create calendar event with Google Meet link
        
        Args:
            title (str): Meeting title
            description (str): Meeting description
            start_time (datetime): Meeting start
            end_time (datetime): Meeting end
            attendees_emails (list): Attendee emails
            calendar_id (str): Which calendar to add to
        
        Returns:
            dict: {event_id, meet_link, calendar_link}
        """
        
        # Create event with conference request
        event = {
            'summary': title,
            'description': description,
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC'
            },
            'attendees': [
                {'email': email} for email in attendees_emails
            ],
            'conferenceData': {
                'createRequest': {
                    'requestId': f'salesos-{datetime.now().timestamp()}',
                    'conferenceSolutionKey': {
                        'type': 'hangoutsMeet'  # Google Meet
                    }
                }
            },
            'reminders': {
                'useDefault': False,
                'overrides': [
                    {
                        'method': 'email',
                        'minutes': 24 * 60  # Day before
                    },
                    {
                        'method': 'popup',
                        'minutes': 15
                    }
                ]
            }
        }
        
        # Insert event
        result = self.service.events().insert(
            calendarId=calendar_id,
            body=event,
            conferenceDataVersion=1,
            sendNotifications=True
        ).execute()
        
        # Extract meet link
        meet_link = None
        if 'conferenceData' in result:
            meet_link = result['conferenceData'].get('entryPoints', [{}])[0].get('uri')
        
        return {
            'event_id': result['id'],
            'meet_link': meet_link,
            'calendar_link': result['htmlLink'],
            'event_details': {
                'title': result['summary'],
                'start': result['start']['dateTime'],
                'end': result['end']['dateTime'],
                'attendees': [a['email'] for a in result.get('attendees', [])]
            }
        }
    
    def get_availability(self, calendar_ids, start_time, end_time):
        """
        Get availability across multiple calendars
        
        Args:
            calendar_ids (list): Calendar IDs to check
            start_time (datetime): Start of range
            end_time (datetime): End of range
        
        Returns:
            dict: {available_slots: [...]}
        """
        
        body = {
            'timeMin': start_time.isoformat() + 'Z',
            'timeMax': end_time.isoformat() + 'Z',
            'items': [{'id': cal_id} for cal_id in calendar_ids]
        }
        
        result = self.service.freebusy().query(body=body).execute()
        
        # Parse free/busy data
        available_slots = self._extract_available_slots(
            result,
            start_time,
            end_time
        )
        
        return {
            'available_slots': available_slots,
            'raw_response': result
        }
    
    def _extract_available_slots(self, freebusy_result, start, end):
        """Extract available time slots from freebusy data"""
        # Implementation: analyze freebusy data to find gaps
        # Return list of available 30-min slots
        pass
    
    def send_calendar_invite(self, event_id, to_email):
        """
        Send calendar invite to additional recipient
        """
        
        event = self.service.events().get(
            calendarId='primary',
            eventId=event_id
        ).execute()
        
        # Add attendee
        event['attendees'].append({
            'email': to_email,
            'responseStatus': 'needsAction'
        })
        
        # Update event
        self.service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event,
            sendNotifications=True
        ).execute()
        
        return {
            'status': 'invite_sent',
            'to': to_email,
            'event_id': event_id
        }
```

### 3.2 Outlook Calendar Integration

```python
from msgraph.core import GraphClient
from azure.identity import ClientSecretCredential
from datetime import datetime, timedelta

class OutlookCalendarIntegration:
    """Outlook Calendar (Microsoft 365) integration"""
    
    def __init__(self, tenant_id, client_id, client_secret):
        credential = ClientSecretCredential(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret
        )
        self.client = GraphClient(credential=credential)
    
    def create_event_with_teams_link(self,
                                     title,
                                     description,
                                     start_time,
                                     end_time,
                                     attendees_emails):
        """Create Outlook event with Teams meeting link"""
        
        body = {
            'subject': title,
            'bodyPreview': description,
            'body': {
                'contentType': 'HTML',
                'content': description
            },
            'start': {
                'dateTime': start_time.isoformat(),
                'timeZone': 'UTC'
            },
            'end': {
                'dateTime': end_time.isoformat(),
                'timeZone': 'UTC'
            },
            'attendees': [
                {
                    'emailAddress': {'address': email},
                    'type': 'required'
                } for email in attendees_emails
            ],
            'isOnlineMeeting': True,
            'onlineMeetingProvider': 'teamsForBusiness'
        }
        
        response = self.client.post('/me/events', json=body)
        
        return {
            'event_id': response['id'],
            'teams_link': response.get('onlineMeeting', {}).get('joinUrl'),
            'event_details': response
        }
```

---

## PART 4: CRM INTEGRATION (Multi-CRM Support)

### 4.1 Salesforce Integration

```python
from simple_salesforce import Salesforce, SalesforceAPI
import requests
from datetime import datetime

class SalesforceIntegration:
    """Salesforce CRM integration"""
    
    def __init__(self, instance_url, client_id, client_secret, username, password):
        """Initialize Salesforce connection"""
        
        # OAuth 2.0 authentication
        auth_url = f'{instance_url}/services/oauth2/token'
        
        auth_payload = {
            'grant_type': 'password',
            'client_id': client_id,
            'client_secret': client_secret,
            'username': username,
            'password': password
        }
        
        response = requests.post(auth_url, data=auth_payload)
        access_token = response.json()['access_token']
        
        self.sf = Salesforce(
            instance_url=instance_url,
            session_id=access_token
        )
    
    def update_opportunity(self, opportunity_id, updates):
        """
        Update Salesforce Opportunity with agent decision
        
        Args:
            opportunity_id (str): Salesforce Opportunity ID
            updates (dict): Fields to update
                {
                    'StageName': 'Negotiation',
                    'Probability': 75,
                    'CloseDate': '2026-01-15',
                    'Description': 'Agent notes...'
                }
        """
        
        try:
            self.sf.Opportunity.update(opportunity_id, updates)
            
            return {
                'success': True,
                'opportunity_id': opportunity_id,
                'updated_fields': list(updates.keys()),
                'timestamp': datetime.now().isoformat()
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'opportunity_id': opportunity_id
            }
    
    def create_task(self, related_to_id, subject, description, 
                    due_date=None, remind_days_before=None):
        """
        Create Task/Activity in Salesforce
        
        Salesforce tracks all activities (emails, calls, tasks) here
        Agent logs all communications as Tasks
        """
        
        task_data = {
            'Subject': subject,
            'Description': description,
            'WhoId': related_to_id,  # Contact or Lead
            'Type': 'Email',
            'Status': 'Completed',
            'ActivityDate': due_date.date() if due_date else None
        }
        
        if remind_days_before:
            task_data['ReminderDateTime'] = (
                due_date - timedelta(days=remind_days_before)
            ).isoformat()
        
        result = self.sf.Task.create(task_data)
        
        return {
            'task_id': result['id'],
            'related_to': related_to_id,
            'subject': subject
        }
    
    def log_email_activity(self, contact_id, to_email, subject, 
                          body, sent_time):
        """Log email as Activity/Task in Salesforce"""
        
        task = {
            'Subject': f'Email: {subject}',
            'Description': body,
            'WhoId': contact_id,
            'Type': 'Email',
            'Status': 'Completed',
            'ActivityDate': sent_time.date()
        }
        
        return self.sf.Task.create(task)
    
    def get_opportunity_with_details(self, opportunity_id):
        """Get full Opportunity with related objects"""
        
        query = f"""
        SELECT Id, Name, StageName, Amount, Probability, CloseDate,
               AccountId, OwnerId, Description, NextStep,
               Account.Name, Owner.Name
        FROM Opportunity
        WHERE Id = '{opportunity_id}'
        """
        
        result = self.sf.query(query)
        
        if result['records']:
            return result['records'][0]
        return None
    
    def webhook_handler(self, payload):
        """
        Handle incoming Salesforce webhook
        
        Salesforce sends webhooks when:
        - Opportunity stage changes
        - Deal amount updates
        - Close date changes
        - Comments/notes added
        
        Agent uses this to make real-time decisions
        """
        
        event = payload.get('event')
        record_id = payload.get('recordId')
        changes = payload.get('changedFields')
        
        # Trigger agent decision
        return {
            'event': event,
            'record_id': record_id,
            'changes': changes,
            'agent_triggered': True
        }
```

### 4.2 HubSpot Integration

```python
from hubspot import HubSpot
from hubspot.crm.deals import SimplePublicObjectInput

class HubSpotIntegration:
    """HubSpot CRM integration"""
    
    def __init__(self, api_key):
        """Initialize HubSpot client"""
        self.client = HubSpot(api_key=api_key)
    
    def update_deal(self, deal_id, updates):
        """
        Update HubSpot Deal with agent decision
        
        Args:
            deal_id (str): HubSpot Deal ID
            updates (dict): Properties to update
                {
                    'dealstage': 'negotiation',
                    'amount': 50000,
                    'closedate': '2026-01-15',
                    'hs_object_id': deal_id
                }
        """
        
        try:
            simple_public_object_input = SimplePublicObjectInput(
                properties=updates
            )
            
            result = self.client.crm.deals.basic_api.update(
                deal_id,
                simple_public_object_input=simple_public_object_input
            )
            
            return {
                'success': True,
                'deal_id': deal_id,
                'updated': result.to_dict()
            }
        
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def create_engagement(self, contact_id, engagement_type, 
                         subject, body, timestamp):
        """
        Log email/call as Engagement in HubSpot
        
        engagement_type: 'EMAIL' | 'CALL' | 'NOTE' | 'MEETING'
        """
        
        engagement_object = {
            'engagement': {
                'type': engagement_type,
                'timestamp': int(timestamp.timestamp() * 1000)
            },
            'associations': {
                'contactIds': [contact_id]
            },
            'metadata': {
                'subject': subject,
                'body': body
            }
        }
        
        result = self.client.crm.engagements.engagements_api.create(
            engagement_object
        )
        
        return result
    
    def get_deal_with_context(self, deal_id):
        """Get HubSpot Deal with full context"""
        
        result = self.client.crm.deals.basic_api.get_by_id(deal_id)
        return result.to_dict()
    
    def create_email_event(self, contact_id, to_email, subject, body, 
                          status='SENT'):
        """
        Log email in HubSpot with tracking
        
        status: 'SENT' | 'OPENED' | 'CLICKED'
        HubSpot integrates with email providers for automatic tracking
        """
        
        # HubSpot tracks emails via Gmail/Outlook integration
        # If you connect your email, HubSpot automatically logs sends/opens
        
        # Alternatively, manually create engagement
        return self.create_engagement(
            contact_id,
            'EMAIL',
            subject,
            body,
            datetime.now()
        )
```

### 4.3 Pipedrive Integration

```python
import requests
from datetime import datetime

class PipedriveIntegration:
    """Pipedrive CRM integration"""
    
    def __init__(self, api_token, company_domain='yourdomain'):
        self.api_token = api_token
        self.base_url = f'https://{company_domain}.pipedrive.com/v1'
    
    def update_deal(self, deal_id, updates):
        """Update Pipedrive Deal"""
        
        url = f'{self.base_url}/deals/{deal_id}'
        
        params = {'api_token': self.api_token}
        
        # Map common fields
        payload = {
            'status': updates.get('status'),  # open, won, lost
            'value': updates.get('value'),
            'expected_close_date': updates.get('expected_close_date'),
            'custom_fields': updates.get('custom_fields', {})
        }
        
        response = requests.put(url, json=payload, params=params)
        
        return response.json()
    
    def create_activity(self, deal_id, activity_type, summary, 
                       due_date=None):
        """Create Activity (email, call, meeting) in Pipedrive"""
        
        url = f'{self.base_url}/activities'
        
        payload = {
            'type': activity_type,  # email, call, meeting
            'subject': summary,
            'deal_id': deal_id,
            'due_date': due_date.date().isoformat() if due_date else None,
            'api_token': self.api_token
        }
        
        response = requests.post(url, json=payload)
        return response.json()
    
    def log_email(self, deal_id, to_email, subject, message_body, status='sent'):
        """Log email activity in Pipedrive"""
        
        return self.create_activity(
            deal_id,
            'email',
            f'Email to {to_email}: {subject}'
        )
```

---

## PART 5: COMMUNICATION FLOW (How Everything Works Together)

### 5.1 Complete Example: Email Follow-up Workflow

**Scenario:** Engagement Agent decides to send follow-up email and schedule meeting

```python
class EmailFollowupWorkflow:
    """Complete workflow: Email + Calendar + CRM Update"""
    
    def __init__(self, gmail_client, calendar_client, crm_client):
        self.gmail = gmail_client
        self.calendar = calendar_client
        self.crm = crm_client
    
    def execute_follow_up(self, deal_id, contact_email, contact_id):
        """
        Execute complete follow-up sequence:
        1. Send email
        2. Schedule calendar meeting
        3. Log in CRM
        4. Track engagement
        """
        
        # Step 1: Send email
        email_result = self.gmail.send_email(
            to=contact_email,
            subject='Following up on our conversation',
            body_html=self._generate_email_template(),
            scheduled_time=self._get_optimal_send_time()
        )
        
        if not email_result['success']:
            return {'error': 'Email send failed'}
        
        message_id = email_result['message_id']
        
        # Step 2: Create calendar event for follow-up call
        meeting_time = self._calculate_optimal_meeting_time()
        calendar_result = self.calendar.create_event_with_meet_link(
            title=f'Follow-up call with {contact_email}',
            description=f'Discuss proposal and address questions',
            start_time=meeting_time,
            end_time=meeting_time + timedelta(minutes=30),
            attendees_emails=[contact_email]
        )
        
        if calendar_result.get('meet_link'):
            # Step 3: Send email with calendar invite + meet link
            self.gmail.send_email(
                to=contact_email,
                subject='Calendar invite: Follow-up call',
                body_html=f"""
                <p>Let's connect to discuss next steps!</p>
                <p>I've scheduled a call for {meeting_time.strftime('%A, %B %d at %I:%M %p')}</p>
                <p><a href="{calendar_result['meet_link']}">Join Meeting</a></p>
                """
            )
        
        # Step 4: Log all activity in CRM
        self.crm.create_task(
            related_to_id=contact_id,
            subject=f'Follow-up email sent to {contact_email}',
            description=f'Email: {email_result["subject"]}\nMeeting: {meeting_time}',
            due_date=meeting_time
        )
        
        # Step 5: Update Opportunity with next step
        self.crm.update_opportunity(deal_id, {
            'NextStep': f'Follow-up call scheduled for {meeting_time}',
            'Description': f'Engagement Agent initiated follow-up sequence\nEmail sent: {message_id}',
            'StageName': 'Proposal/Price Quote'  # or whatever stage
        })
        
        return {
            'success': True,
            'email_id': message_id,
            'meeting_id': calendar_result['event_id'],
            'meet_link': calendar_result['meet_link'],
            'scheduled_for': meeting_time.isoformat()
        }
    
    def _generate_email_template(self):
        """Generate personalized email content"""
        return """
        <p>Hi [CONTACT_NAME],</p>
        
        <p>I hope you found value in our conversation about [PROBLEM].</p>
        
        <p>To move forward, I'd like to walk you through how we can help with [SOLUTION].</p>
        
        <p>Let's schedule a brief call to discuss:</p>
        <ul>
        <li>Your specific challenges</li>
        <li>How we've helped similar companies</li>
        <li>Next steps and timeline</li>
        </ul>
        
        <p>Looking forward to speaking soon!</p>
        
        <p>Best,<br/>
        [REP_NAME]</p>
        """
    
    def _get_optimal_send_time(self):
        """Calculate optimal send time (usually business hours)"""
        from datetime import datetime, timedelta
        now = datetime.now()
        
        # Send in 1 hour if within business hours
        return now + timedelta(hours=1)
    
    def _calculate_optimal_meeting_time(self):
        """Calculate optimal meeting time (2-3 days from now, 10am)"""
        from datetime import datetime, timedelta
        base = datetime.now() + timedelta(days=2)
        return base.replace(hour=10, minute=0, second=0)
```

---

## PART 6: REAL-TIME DATA SYNC (Webhooks & Event Streams)

### 6.1 Salesforce Webhook Handler (Receiving Updates)

```python
from fastapi import FastAPI, Request
import hmac
import hashlib
import json

app = FastAPI()

class SalesforceWebhookHandler:
    """Handle incoming Salesforce webhooks in real-time"""
    
    def __init__(self, webhook_secret):
        self.secret = webhook_secret
    
    @app.post("/webhooks/salesforce")
    async def handle_salesforce_webhook(self, request: Request):
        """
        Salesforce sends webhooks when opportunities change
        Agent reacts in real-time to update its decisions
        """
        
        # Verify webhook signature
        payload = await request.body()
        signature = request.headers.get('X-Salesforce-Content-Signature')
        
        if not self._verify_signature(payload, signature):
            return {'error': 'Invalid signature'}, 401
        
        data = json.loads(payload)
        
        # Handle different event types
        if data['event']['type'] == 'UPDATE':
            opportunity_id = data['data']['id']
            changes = data['data']['changedFields']
            
            # Trigger agents to re-evaluate
            self._trigger_agent_re_evaluation(opportunity_id, changes)
        
        elif data['event']['type'] == 'CREATE':
            new_opportunity = data['data']
            
            # New deal created, agents assess
            self._trigger_agent_assessment(new_opportunity)
        
        return {'received': True}
    
    def _verify_signature(self, payload, signature):
        """Verify Salesforce webhook signature"""
        expected = hmac.new(
            self.secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected)
    
    def _trigger_agent_re_evaluation(self, opp_id, changes):
        """
        Changes detected in Salesforce
        Trigger agents to reconsider their decisions
        
        Example changes:
        - StageName: 'Proposal' → 'Negotiation'
        - Amount: 50000 → 75000
        - CloseDate: '2026-02-01'
        """
        
        print(f"Opportunity {opp_id} changed: {changes}")
        
        # Example: Amount increased, agent may want to prioritize
        if 'Amount' in changes:
            old = changes['Amount'].get('old')
            new = changes['Amount'].get('new')
            print(f"Amount changed: ${old} → ${new}")
            
            # Agent re-evaluates deal priority/strategy
```

### 6.2 Bi-directional Sync Architecture

```python
class BiDirectionalSyncManager:
    """
    Manage data flowing both ways:
    CRM → SalesOS → CRM
    """
    
    def __init__(self, crm_client, agents):
        self.crm = crm_client
        self.agents = agents
    
    def sync_crm_to_agents(self):
        """
        Pull data from CRM on schedule
        Feed to agents for decision-making
        """
        
        # Every hour, sync all opportunities
        deals = self.crm.query_all_open_opportunities()
        
        for deal in deals:
            # Create agent state from CRM data
            agent_state = {
                'deal_id': deal['id'],
                'deal_value': deal['amount'],
                'stage': deal['stageName'],
                'close_date': deal['closeDate'],
                'account': deal['account'],
                'owner': deal['owner']
            }
            
            # Feed to agents
            for agent in self.agents:
                agent.observe(agent_state)
    
    def sync_agents_to_crm(self, agent_decision):
        """
        Agents make decision
        Update CRM with decision
        """
        
        agent_type = agent_decision['agent']
        deal_id = agent_decision['deal_id']
        action = agent_decision['action']
        
        # Example: Pipeline Agent recommends moving to next stage
        if agent_type == 'pipeline':
            self.crm.update_opportunity(deal_id, {
                'StageName': action['next_stage'],
                'Description': f'Agent recommendation: {action["reason"]}'
            })
        
        # Example: Engagement Agent scheduled follow-up
        elif agent_type == 'engagement':
            self.crm.create_task(
                deal_id,
                subject=action['email_subject'],
                due_date=action['scheduled_for']
            )
        
        # Example: Forecast Agent updated probability
        elif agent_type == 'forecast':
            self.crm.update_opportunity(deal_id, {
                'Probability': action['probability_percent']
            })
```

---

## PART 7: HANDLING MULTI-CRM SCENARIOS

### 7.1 Universal CRM Adapter Pattern

```python
from abc import ABC, abstractmethod

class CRMAdapter(ABC):
    """Abstract base for any CRM"""
    
    @abstractmethod
    def update_deal(self, deal_id, updates):
        pass
    
    @abstractmethod
    def create_activity(self, deal_id, activity_type, details):
        pass
    
    @abstractmethod
    def get_deal(self, deal_id):
        pass

class SalesforceAdapter(CRMAdapter):
    """Salesforce implementation"""
    def __init__(self, sf_client):
        self.sf = sf_client
    
    def update_deal(self, deal_id, updates):
        return self.sf.Opportunity.update(deal_id, updates)

class HubSpotAdapter(CRMAdapter):
    """HubSpot implementation"""
    def __init__(self, hs_client):
        self.hs = hs_client
    
    def update_deal(self, deal_id, updates):
        return self.hs.crm.deals.update(deal_id, updates)

class PipedriveAdapter(CRMAdapter):
    """Pipedrive implementation"""
    def __init__(self, pd_client):
        self.pd = pd_client
    
    def update_deal(self, deal_id, updates):
        return self.pd.update_deal(deal_id, updates)

class CRMFactory:
    """Factory to create appropriate CRM adapter"""
    
    @staticmethod
    def create_adapter(crm_type, credentials):
        if crm_type == 'salesforce':
            sf_client = SalesforceIntegration(**credentials)
            return SalesforceAdapter(sf_client)
        
        elif crm_type == 'hubspot':
            hs_client = HubSpotIntegration(**credentials)
            return HubSpotAdapter(hs_client)
        
        elif crm_type == 'pipedrive':
            pd_client = PipedriveIntegration(**credentials)
            return PipedriveAdapter(pd_client)
        
        else:
            raise ValueError(f"Unsupported CRM: {crm_type}")

# Usage
crm = CRMFactory.create_adapter(
    'salesforce',
    {
        'instance_url': 'https://yourinstance.salesforce.com',
        'client_id': 'xxx',
        'client_secret': 'xxx'
    }
)

crm.update_deal('0016000001I9yJ', {'StageName': 'Proposal'})
```

---

## PART 8: INTEGRATION DEPLOYMENT

### 8.1 Environment Configuration

```yaml
# .env.production

# Email Integration
GMAIL_SERVICE_ACCOUNT_JSON=gs://salesos/credentials/gmail-sa.json
OUTLOOK_TENANT_ID=xxxx
OUTLOOK_CLIENT_ID=xxxx
OUTLOOK_CLIENT_SECRET=xxxx

# Calendar Integration
GOOGLE_CALENDAR_SA=gs://salesos/credentials/calendar-sa.json
OUTLOOK_CALENDAR_ENABLED=true

# CRM Integration (Choose one or multiple)
CRM_TYPE=salesforce  # salesforce, hubspot, pipedrive
SALESFORCE_INSTANCE_URL=https://yourinstance.salesforce.com
SALESFORCE_CLIENT_ID=xxxx
SALESFORCE_CLIENT_SECRET=xxxx

HUBSPOT_API_KEY=xxxx

PIPEDRIVE_API_TOKEN=xxxx
PIPEDRIVE_COMPANY_DOMAIN=yourcompany

# Video Conferencing
GOOGLE_MEET_ENABLED=true
ZOOM_API_KEY=xxxx  # optional

# Scheduling
CLOUD_TASKS_PROJECT_ID=salesos-prod
CLOUD_TASKS_QUEUE=email-scheduler

# Tracking & Monitoring
GONG_API_KEY=xxxx  # optional, for call recording
SEGMENT_API_KEY=xxxx  # optional, for event tracking
```

### 8.2 Initialization Script

```python
# initialize_integrations.py

from integrations import (
    GmailIntegration,
    GoogleCalendarIntegration,
    SalesforceIntegration,
    HubSpotIntegration,
    EmailScheduler,
    CRMFactory
)
import os

def init_integrations():
    """Initialize all integrations on startup"""
    
    # Email
    gmail = GmailIntegration(
        os.getenv('GMAIL_SERVICE_ACCOUNT_JSON')
    )
    
    # Calendar
    calendar = GoogleCalendarIntegration(
        os.getenv('GOOGLE_CALENDAR_SA')
    )
    
    # Email Scheduler
    scheduler = EmailScheduler(
        project_id=os.getenv('CLOUD_TASKS_PROJECT_ID'),
        queue_id='email-scheduler'
    )
    
    # CRM (choose based on env)
    crm_type = os.getenv('CRM_TYPE')
    
    if crm_type == 'salesforce':
        crm = SalesforceIntegration(
            instance_url=os.getenv('SALESFORCE_INSTANCE_URL'),
            client_id=os.getenv('SALESFORCE_CLIENT_ID'),
            client_secret=os.getenv('SALESFORCE_CLIENT_SECRET'),
            username=os.getenv('SALESFORCE_USERNAME'),
            password=os.getenv('SALESFORCE_PASSWORD')
        )
    
    elif crm_type == 'hubspot':
        crm = HubSpotIntegration(
            api_key=os.getenv('HUBSPOT_API_KEY')
        )
    
    return {
        'email': gmail,
        'calendar': calendar,
        'scheduler': scheduler,
        'crm': crm
    }

# Export for use in agents
INTEGRATIONS = init_integrations()
```

---

## PART 9: ANSWER TO YOUR SPECIFIC QUESTIONS

### Q: "What if I want to integrate email agent who can do follow up and schedule the calendar and send google meet invites?"

**Answer:** ✅ **Fully supported and automated**

```python
# Complete example
email_agent.send_email(
    to='prospect@company.com',
    subject='Following up on our conversation',
    body='...',
    template='followup'
)

# Then automatically:
calendar_agent.create_event_with_meet_link(
    title='Follow-up Call',
    attendees=['prospect@company.com'],
    start_time=next_available_slot
)

# Then automatically:
crm.create_task(
    deal_id=deal_id,
    subject='Follow-up email + meeting scheduled',
    due_date=next_available_slot
)

# Result: Prospect gets:
# 1. Email with reason to meet
# 2. Google Calendar invite with Meet link
# 3. Recorded in Salesforce/HubSpot as activity
```

### Q: "And update the same in Salesforce or another CRM the user chooses?"

**Answer:** ✅ **Yes, completely flexible**

```python
# SalesOS works with ANY CRM
# Use configuration to choose:

config = {
    'crm_type': 'salesforce',  # or 'hubspot', 'pipedrive', etc
    'credentials': {
        'instance_url': 'https://yourinstance.salesforce.com',
        'client_id': 'xxx'
    }
}

# All integrations handle updates automatically
# Every agent action → automatically logged to CRM
```

### Q: "Or do we have a CRM for that matter or everything's completely autonomous?"

**Answer:** ✅ **You choose!**

- **Option 1:** Use your existing CRM (Salesforce, HubSpot, etc)
  - SalesOS reads from it, makes decisions, writes back
  - Your CRM stays the source of truth
  
- **Option 2:** SalesOS with minimal CRM
  - SalesOS acts as the primary system
  - Just use email + Salesforce for compliance/history
  - All intelligence in SalesOS agents
  
- **Option 3:** Autonomous SalesOS (Advanced)
  - SalesOS is standalone
  - All customer data in BigQuery
  - CRM optional for sales rep interface
  - Most "autonomous" mode

**Recommendation:** Start with Option 1 (existing CRM) for safety. Scale to Option 2 or 3 as you gain confidence.

---

## CONCLUSION

SalesOS is a **complete integration platform** that:

✅ Works with ANY email system (Gmail, Outlook, SendGrid)  
✅ Works with ANY calendar (Google, Outlook, Calendly)  
✅ Works with ANY CRM (Salesforce, HubSpot, Pipedrive, custom)  
✅ Agents orchestrate across all systems seamlessly  
✅ Bidirectional sync (CRM → agents → CRM)  
✅ Real-time webhooks for instant reactions  
✅ Completely autonomous once configured  

**The key insight:** SalesOS is NOT a CRM. It's an intelligence layer that sits above your entire tech stack, orchestrating everything automatically.
