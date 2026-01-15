# Phase 1.5: Frontend UI Completion Roadmap

**Start Date:** TBD (User Decision)  
**Duration:** 6-8 weeks  
**Goal:** Complete user-facing interfaces for Email, Calendar, Sequences, and Activities modules

**Important:** Phase naming aligns with `docs/Project-Status-Bible.md`:
- **Phase 1**: Backend microservices foundation (implemented)
- **Phase 1.5**: Frontend UI completion for existing services (this document)
- **Phase 2+**: AI Agents + Agent Console UI (see `docs/PHASE-2-AGENTS-ROADMAP.md`)

---

## 🎯 Overview

Phase 1 successfully delivered:
- ✅ **7 Production-Ready Microservices**
- ✅ **Complete Backend APIs**
- ✅ **Event-Driven Architecture**
- ✅ **Multi-Tenant Infrastructure**

Phase 2 will complete:
- ⏳ **Advanced Frontend UI Features**
- ⏳ **OAuth Integration Flows**
- ⏳ **Rich User Interactions**
- ⏳ **Visual Builders & Editors**

---

## 📅 Sprint Plan

### Sprint 0: Brand/Labels Alignment (Week 0 / Week 1)
**Goal:** Align the app’s product name, labels, and theme to the approved UI reference.

#### Frontend Tasks
- Standardize product name (e.g., “SalesOS”) across sidebar/header/login
- Align navigation labels to the approved sitemap
- Validate theme tokens (colors/typography/radii) match the reference
- Document “source of truth” for design (Figma / prompt output / screenshots)

**Deliverable:** UI branding and labels match the agreed design reference

---

### Sprint 1: Email Provider OAuth (Week 1)
**Goal:** Users can connect Gmail and Outlook accounts

#### Backend Prerequisites
- ✅ `email_provider_accounts` table exists
- ✅ Gmail provider implementation complete
- ✅ Outlook provider implementation complete
- ✅ OAuth credential encryption ready

#### Frontend Tasks
1. **Settings Page** (`/settings/email-providers`)
   - Create settings layout
   - Add "Connected Accounts" section
   - Display list of connected accounts
   - Add "Connect New Account" button

2. **Gmail OAuth Flow**
   - Create `/api/auth/gmail/initiate` route handler
   - Build Gmail consent screen redirect
   - Create `/api/auth/gmail/callback` handler
   - Store OAuth tokens securely
   - Handle token refresh

3. **Outlook OAuth Flow**
   - Create `/api/auth/outlook/initiate` route handler
   - Build Microsoft consent screen redirect
   - Create `/api/auth/outlook/callback` handler
   - Store OAuth tokens securely
   - Handle token refresh

4. **Account Management**
   - Add "Set as Default" action
   - Add "Disconnect" action
   - Show last sync time
   - Display connection status
   - Add re-authentication flow

**Deliverable:** Users can connect and manage email provider accounts

---

### Sprint 2: Email Composition UI (Week 2)
**Goal:** Users can compose and send emails

#### Frontend Tasks
1. **Email Compose Modal**
   - Create modal component
   - Add recipient field with contact/lead search
   - Add CC/BCC fields
   - Add subject field
   - Integrate rich text editor (TipTap recommended)

2. **Rich Text Editor**
   - Install and configure TipTap
   - Add formatting toolbar (bold, italic, lists, links)
   - Add image upload support
   - Add mention support (@contact)
   - Add variable insertion ({{first_name}}, etc.)

3. **Template Picker**
   - Add template dropdown
   - Fetch templates from API
   - Apply template to editor
   - Support variable replacement

4. **Email Options**
   - Add tracking toggles (open tracking, click tracking)
   - Add send later scheduling
   - Add draft auto-save
   - Add send from account selector

5. **Send Functionality**
   - Wire up send button to `/api/v1/emails` endpoint
   - Handle validation errors
   - Show success notification
   - Redirect to emails list

**Deliverable:** Users can compose and send tracked emails

---

### Sprint 3: Email Analytics Dashboard (Week 3)
**Goal:** Users can view email performance

#### Frontend Tasks
1. **Email Detail Page** (`/emails/[id]`)
   - Display email content
   - Show recipient info
   - Display send time
   - Show delivery status

2. **Analytics Section**
   - Display open count and rate
   - Display click count and rate
   - Show engagement timeline
   - List clicked links
   - Show geographic data (if available)

3. **Email List Enhancements**
   - Add open/click badges to list
   - Add engagement indicators
   - Sort by engagement
   - Filter by engagement tier

**Deliverable:** Users can track email performance

---

### Sprint 4: Meeting Scheduling UI (Week 4)
**Goal:** Users can schedule meetings

#### Frontend Tasks
1. **Meeting Creation Modal**
   - Create modal component
   - Add title field
   - Add date/time picker component
   - Add duration selector
   - Add meeting type selector (call, video, in-person)

2. **Attendee Management**
   - Add internal attendee selector (users)
   - Add external attendee selector (contacts)
   - Add email input for ad-hoc attendees
   - Display attendee list

3. **Meeting Options**
   - Add location field (for in-person)
   - Add video provider dropdown (Zoom, Meet, Teams)
   - Add description/notes field
   - Add reminder settings
   - Add recurrence options (optional)

4. **Calendar Sync Settings**
   - Add "Connect Google Calendar" button
   - Add "Connect Outlook Calendar" button
   - Display sync status
   - Add sync preferences

**Deliverable:** Users can schedule meetings

---

### Sprint 5: Calendar View Component (Week 5)
**Goal:** Users can visualize their calendar

#### Frontend Tasks
1. **Calendar Grid Component**
   - Build day view
   - Build week view
   - Build month view
   - Add view toggle

2. **Meeting Display**
   - Show meetings on calendar grid
   - Color-code by type/status
   - Add hover tooltips
   - Support click to view details

3. **Calendar Interactions**
   - Drag-and-drop to reschedule
   - Click empty slot to create meeting
   - Double-click meeting to edit
   - Right-click for context menu

4. **Availability Visualization**
   - Show busy/free times
   - Display availability windows
   - Add availability editor

**Deliverable:** Users have visual calendar interface

---

### Sprint 6-7: Sequence Builder UI (Week 6-7)
**Goal:** Users can create outreach sequences

#### Frontend Tasks
1. **Sequence Builder Canvas**
   - Create drag-and-drop canvas
   - Build step component library
   - Add connection lines between steps
   - Implement zoom/pan controls

2. **Step Types**
   - Email step card
   - Wait/delay step card
   - Task step card
   - Conditional branch card (optional)

3. **Step Configuration**
   - Email step modal
     - Template selector
     - From account selector
     - Subject line editor
     - Body editor with variables
   - Wait step modal
     - Duration input (hours/days)
     - Business hours only toggle
   - Task step modal
     - Task title
     - Task description
     - Assignee selector

4. **Sequence Settings**
   - Sequence name
   - Sequence description
   - Status toggle (active/paused)
   - Enrollment rules
   - Exit conditions

5. **Enrollment Interface**
   - Contact selector
   - Bulk enrollment
   - CSV upload
   - Enrollment preview

**Deliverable:** Users can build and manage sequences

---

### Sprint 8: Activity Timeline UI (Week 8)
**Goal:** Users can track activity history

#### Frontend Tasks
1. **Timeline Component**
   - Build vertical timeline layout
   - Add activity cards
   - Group by date
   - Add infinite scroll

2. **Activity Types**
   - Email sent/opened/clicked card
   - Meeting scheduled/completed card
   - Call logged card
   - Note added card
   - Task created/completed card
   - Opportunity stage changed card

3. **Activity Creation**
   - Add note modal
   - Log call modal
   - Create task modal
   - Link to entities (account, contact, opp)

4. **Filtering & Search**
   - Filter by activity type
   - Filter by date range
   - Filter by user
   - Filter by entity
   - Search activity content

**Deliverable:** Users have comprehensive activity tracking

---

## 🛠 Technology Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS
- **Rich Text:** TipTap (recommended) or Quill
- **Calendar:** React Big Calendar or FullCalendar
- **Drag & Drop:** @dnd-kit or react-beautiful-dnd
- **Forms:** React Hook Form + Zod validation
- **State:** React Query for server state
- **Date/Time:** date-fns or dayjs

### Integration
- **OAuth:** NextAuth.js or custom implementation
- **File Upload:** Uploadthing or S3 direct upload
- **Real-time:** WebSockets (optional, for live updates)

---

## 📋 Acceptance Criteria

### Email Module
- [ ] User can connect Gmail account via OAuth
- [ ] User can connect Outlook account via OAuth
- [ ] User can compose email with rich text
- [ ] User can select email template
- [ ] User can send email to contacts
- [ ] User can track email opens and clicks
- [ ] User can view email analytics

### Calendar Module
- [ ] User can schedule meeting
- [ ] User can view calendar in day/week/month view
- [ ] User can drag-and-drop to reschedule
- [ ] User can set meeting type and video provider
- [ ] User can sync with Google/Outlook calendar

### Sequences Module
- [ ] User can create sequence
- [ ] User can add email/wait/task steps
- [ ] User can configure each step
- [ ] User can enroll contacts in sequence
- [ ] User can pause/resume sequence
- [ ] User can view sequence performance

### Activities Module
- [ ] User can view activity timeline
- [ ] User can filter activities by type
- [ ] User can add notes
- [ ] User can log calls
- [ ] User can create tasks
- [ ] Activities auto-populate from other modules

---

## 🧪 Testing Strategy

### Unit Tests
- Component rendering
- User interactions
- Form validation
- OAuth flow logic

### Integration Tests
- API integration
- End-to-end user flows
- OAuth callback handling

### E2E Tests
- Complete email send flow
- Complete meeting schedule flow
- Complete sequence creation flow

---

## 📊 Success Metrics

| Metric | Target |
|--------|--------|
| Email Composition Time | < 2 minutes |
| Meeting Scheduling Time | < 1 minute |
| Sequence Creation Time | < 10 minutes |
| OAuth Connection Success Rate | > 95% |
| User Task Completion Rate | > 80% |
| Bug Rate | < 5% per feature |

---

## 🚀 Deployment Strategy

### Week-by-Week Rollout
- **Week 1:** Email OAuth (settings only, low risk)
- **Week 2:** Email composition (core feature, high value)
- **Week 3:** Email analytics (enhancement)
- **Week 4:** Meeting scheduling (core feature)
- **Week 5:** Calendar view (enhancement)
- **Week 6-7:** Sequence builder (complex feature)
- **Week 8:** Activity timeline (enhancement)

### Feature Flags
Use feature flags for gradual rollout:
- `email_oauth_enabled`
- `email_composition_enabled`
- `meeting_scheduling_enabled`
- `calendar_view_enabled`
- `sequence_builder_enabled`
- `activity_timeline_enabled`

---

## 📚 Documentation Needs

### User Documentation
- [ ] How to connect Gmail account
- [ ] How to connect Outlook account
- [ ] How to compose and send emails
- [ ] How to schedule meetings
- [ ] How to build sequences
- [ ] How to track activities

### Developer Documentation
- [ ] OAuth implementation guide
- [ ] Component library documentation
- [ ] API integration patterns
- [ ] Testing guidelines

---

## 💡 Optional Enhancements (Phase 2+)

### Email Module
- [ ] Email threading/conversation view
- [ ] Smart reply suggestions
- [ ] Email scheduling optimization
- [ ] A/B testing for subject lines

### Calendar Module
- [ ] Smart scheduling assistant
- [ ] Meeting recording integration
- [ ] Automated meeting notes
- [ ] Calendar analytics

### Sequences Module
- [ ] AI-powered sequence suggestions
- [ ] Multi-channel sequences (email + LinkedIn + calls)
- [ ] Sequence templates marketplace
- [ ] Advanced A/B testing

### Activities Module
- [ ] AI activity summarization
- [ ] Predictive task suggestions
- [ ] Activity scoring
- [ ] Team activity leaderboards

---

## 🎓 Learning Resources

### OAuth Implementation
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Gmail OAuth Guide](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Graph OAuth](https://learn.microsoft.com/en-us/graph/auth/)

### Rich Text Editors
- [TipTap Documentation](https://tiptap.dev/)
- [Quill Documentation](https://quilljs.com/)

### Calendar Components
- [React Big Calendar](https://github.com/jquense/react-big-calendar)
- [FullCalendar React](https://fullcalendar.io/docs/react)

### Drag & Drop
- [@dnd-kit Documentation](https://docs.dndkit.com/)
- [react-beautiful-dnd](https://github.com/atlassian/react-beautiful-dnd)

---

**Document Version:** 1.0  
**Created:** January 6, 2026  
**Status:** Ready for implementation  
**Owner:** Development Team

