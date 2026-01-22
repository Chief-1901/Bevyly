# Frontend Implementation Plan - Complete Bevyly UI

**Date:** January 22, 2026
**Status:** Phase 1 Backend Complete | Frontend 75% Complete
**Goal:** Complete all planned frontend features from documentation

---

## Recent Updates (January 21-22, 2026)

### ✅ Completed
- **Contacts Detail Page** - Full implementation with tabs (Overview, Activity, Opportunities, Emails, Meetings)
- **Opportunities Kanban Board** - Drag-and-drop stage changes with @dnd-kit
- **Accounts Detail Enhancements** - Health score indicator, edit modal, custom fields section
- **TypeScript Build Fixes** - CardRegistry and fetcher type errors resolved
- **Playwright E2E Tests** - Added for accounts-detail and opportunities-kanban
- **SalesOS → Bevyly Rebranding** - 85% complete (some backend refs remain)

---

## Current Status Summary

### ✅ COMPLETE (85-100%)
- **Core CRM Pages**: Leads, Accounts, Opportunities (with tables, modals, filtering)
- **Contacts Detail Page**: ✅ NEW - Full detail view with tabs
- **Opportunities Kanban**: ✅ NEW - Drag-and-drop board view
- **Accounts Enhancements**: ✅ NEW - Health score, edit modal, custom fields
- **Briefing Page**: Action cards, signals, AI ordering (85%)
- **Dashboard & Analytics**: KPIs, charts, metrics
- **Design System**: All 13 UI components implemented
- **Intent System**: 4 action card types functional
- **E2E Tests**: ✅ NEW - Playwright tests for key flows

### ⚠️ PARTIAL (30-70%)
- **Emails**: List only (40%), missing compose/templates/tracking
- **Calendar**: List only (30%), missing grid view/sync
- **Sequences**: List only (30%), missing builder/editor
- **Activities**: Feed works (70%), missing detail views
- **Settings**: API Keys only (15%), missing 5 sections

### ❌ NOT STARTED (0%)
- **Agents Console** - Critical for Phase 2
- **Approval Queue** - Critical for Phase 2
- **Onboarding Wizard**
- **Billing Portal**
- **Compliance Dashboard**

---

## Implementation Strategy

### Phase Approach
1. **Complete Core Gaps** (Priority 1) - 2-3 weeks
2. **Enhance Engagement Modules** (Priority 2) - 3-4 weeks
3. **Build Agent Infrastructure UI** (Priority 3) - 2-3 weeks
4. **Launch Business Features** (Priority 4) - 3-4 weeks

---

## PRIORITY 1: Complete Core Gaps

**Timeline:** 2-3 weeks
**Goal:** Finish all partially-implemented core features

### 1.1 Contacts Detail Page ✅ COMPLETE
**Status:** ✅ Fully implemented (January 21, 2026)
**Completed:** Full detail page with tabs (Overview, Activity, Opportunities, Emails, Meetings)

**Requirements:**
- Contact header with name, title, company, avatar
- Tabs: Overview, Activity, Opportunities, Emails, Meetings
- Overview tab:
  - Contact info (email, phone, LinkedIn, etc.)
  - Associated account link
  - Custom fields
  - Tags/labels
- Activity tab: Timeline of interactions
- Opportunities tab: List of opportunities with this contact
- Emails tab: Email thread history
- Meetings tab: Past/upcoming meetings
- Edit mode with inline form
- Delete confirmation

**Files to Create:**
```
frontend/src/app/(app)/contacts/[id]/
├── page.tsx                    # Route wrapper
├── ContactDetailContent.tsx    # Main component
└── loading.tsx                 # Skeleton loader
```

**Implementation Steps:**
1. Create route structure with dynamic `[id]` param
2. Fetch contact data via API (`GET /api/v1/contacts/:id`)
3. Build header component with contact info
4. Implement tabbed interface (Overview, Activity, etc.)
5. Add edit modal with form validation
6. Add delete with confirmation
7. Implement activity timeline component
8. Add related entities (opportunities, emails, meetings)
9. Add skeleton loading state
10. Test with real data

**API Endpoints Needed:**
- `GET /api/v1/contacts/:id` - Get contact details
- `GET /api/v1/contacts/:id/activities` - Get contact activities
- `GET /api/v1/contacts/:id/opportunities` - Get related opportunities
- `GET /api/v1/contacts/:id/emails` - Get email history
- `GET /api/v1/contacts/:id/meetings` - Get meetings
- `PUT /api/v1/contacts/:id` - Update contact
- `DELETE /api/v1/contacts/:id` - Delete contact

---

### 1.2 Opportunities Kanban Board View ✅ COMPLETE
**Status:** ✅ Fully implemented (January 21, 2026)
**Completed:** Drag-and-drop Kanban board with @dnd-kit, view toggle, stage totals

**Requirements:**
- Board view toggle (Table | Board)
- Columns for each opportunity stage:
  - Discovery, Qualification, Proposal, Negotiation, Closed Won, Closed Lost
- Drag-and-drop to change stages
- Opportunity cards showing:
  - Company name
  - Amount
  - Contact name
  - Last activity date
  - Owner avatar
- Board filters (owner, date range)
- Column totals (count + $ amount)
- Empty state per column

**Files to Update/Create:**
```
frontend/src/app/(app)/opportunities/
├── OpportunitiesContent.tsx    # Add view toggle
└── components/
    ├── KanbanBoard.tsx         # New: Board container
    ├── KanbanColumn.tsx        # New: Stage column
    └── OpportunityCard.tsx     # New: Card component
```

**Implementation Steps:**
1. Add view toggle button (Table | Board) to OpportunitiesContent
2. Create KanbanBoard component with columns
3. Create KanbanColumn component with stage header + totals
4. Create OpportunityCard component (compact card design)
5. Implement drag-and-drop with `@dnd-kit` or native HTML5
6. Add optimistic UI updates
7. Call API on stage change: `PATCH /api/v1/opportunities/:id`
8. Add loading states during drag
9. Add filters that work across both views
10. Persist view preference in localStorage

**Libraries Needed:**
- `@dnd-kit/core` and `@dnd-kit/sortable` for drag-and-drop
- Or use native HTML5 drag API

---

### 1.3 Accounts Detail Enhancements ✅ COMPLETE
**Status:** ✅ Fully implemented (January 21, 2026)
**Completed:** Health score indicator, edit modal, custom fields section

**Missing Features:**
- Health score display (visual indicator)
- Edit account details (inline or modal)
- Custom fields management
- Account hierarchy (parent/child accounts)
- Documents/files tab

**Files to Update:**
```
frontend/src/app/(app)/accounts/[id]/
├── AccountDetailContent.tsx    # Enhance existing
└── components/
    ├── HealthScoreIndicator.tsx  # New: Health score widget
    ├── AccountEditModal.tsx      # New: Edit form
    └── CustomFieldsSection.tsx   # New: Dynamic fields
```

**Implementation Steps:**
1. Add health score calculation API endpoint
2. Create HealthScoreIndicator component with color-coded badge
3. Add "Edit Account" button that opens modal
4. Build AccountEditModal with all editable fields
5. Add custom fields section (key-value pairs)
6. Add account hierarchy display (parent account link)
7. Add Documents/Files tab (future: file upload)
8. Update API integration
9. Add optimistic updates
10. Test edit flows

---

### 1.4 Settings Module Completion ✅ COMPLETE
**Status:** ✅ All 5 pages implemented (January 22, 2026)
**Completed:** Profile, Team, Integrations, Notifications, Appearance pages

**Missing Pages:**
1. **Profile** (`/settings/profile`)
2. **Team** (`/settings/team`)
3. **Integrations** (`/settings/integrations`)
4. **Notifications** (`/settings/notifications`)
5. **Appearance** (`/settings/appearance`)

#### 1.4.1 Profile Settings
**File:** `frontend/src/app/(app)/settings/profile/page.tsx`

**Fields:**
- First name, Last name
- Email (read-only or verified flow)
- Avatar upload
- Job title
- Phone number
- Timezone
- Change password section

**Implementation Steps:**
1. Create settings/profile route
2. Fetch user data from `/api/v1/users/me`
3. Build form with validation
4. Add avatar upload (cloudinary/S3)
5. Add change password section (current + new + confirm)
6. Handle form submission
7. Add success/error toasts

#### 1.4.2 Team Settings
**File:** `frontend/src/app/(app)/settings/team/page.tsx`

**Features:**
- Team members table (name, email, role, status, joined date)
- Invite new member modal
- Role management (Admin, Manager, Sales Rep, Viewer)
- Deactivate/reactivate members
- Resend invitation

**Implementation Steps:**
1. Create settings/team route
2. Fetch team members from `/api/v1/users`
3. Build team table with actions column
4. Create invite modal with email + role selection
5. Add invite API call: `POST /api/v1/users/invite`
6. Add role change: `PATCH /api/v1/users/:id/role`
7. Add deactivate: `PATCH /api/v1/users/:id/status`
8. Add permission checks (only admins can manage)

#### 1.4.3 Integrations Settings
**File:** `frontend/src/app/(app)/settings/integrations/page.tsx`

**Integrations:**
- Gmail (OAuth2)
- Outlook (OAuth2)
- Google Calendar (OAuth2)
- Apollo.io (API Key)
- OpenAI (API Key)
- Future: LinkedIn, Bland.ai, etc.

**Layout:**
- Card per integration with:
  - Logo + name
  - Status badge (Connected | Not Connected)
  - "Connect" or "Disconnect" button
  - Configuration options (if connected)

**Implementation Steps:**
1. Create settings/integrations route
2. Fetch integration status: `GET /api/v1/integrations`
3. Build integration cards
4. Add OAuth flow for Gmail/Outlook/Calendar
5. Add API key input for Apollo/OpenAI
6. Add test connection button
7. Add disconnect with confirmation
8. Show connected account email/info

#### 1.4.4 Notifications Settings
**File:** `frontend/src/app/(app)/settings/notifications/page.tsx`

**Features:**
- Email notification preferences:
  - New leads assigned to me
  - Deal stage changes
  - Email replies received
  - Meeting reminders
  - Daily briefing
  - Weekly summary
- In-app notification preferences:
  - Real-time alerts
  - Desktop notifications
- Notification channels: Email, In-app, Slack (future)

**Implementation Steps:**
1. Create settings/notifications route
2. Fetch preferences: `GET /api/v1/users/me/preferences`
3. Build checkbox grid (notification type × channel)
4. Add toggle for each preference
5. Update API: `PATCH /api/v1/users/me/preferences`
6. Add "Test Notification" button
7. Group preferences by category

#### 1.4.5 Appearance Settings
**File:** `frontend/src/app/(app)/settings/appearance/page.tsx`

**Features:**
- Theme selection: Light, Dark, System
- Primary color picker
- Density: Comfortable, Compact, Spacious
- Language selection (future)
- Date format (MM/DD/YYYY, DD/MM/YYYY, etc.)
- Number format (commas, decimals)

**Implementation Steps:**
1. Create settings/appearance route
2. Add theme switcher (already have ThemeSwitch component)
3. Add density radio buttons (affects spacing classes)
4. Add date format dropdown
5. Add number format dropdown
6. Store preferences in localStorage + DB
7. Apply settings globally via context

---

### 1.5 Briefing Page Enhancements
**Status:** 85% complete
**Estimated Time:** 2 days

**Missing Features:**
- Agent activity feed
- Pipeline snapshot widget
- Full signal detail modal (currently shows 5 inline)

**Files to Update:**
```
frontend/src/app/(app)/briefing/
├── BriefingContent.tsx         # Add new sections
└── components/
    ├── AgentActivityFeed.tsx   # New: Agent actions
    ├── PipelineSnapshot.tsx    # New: Quick stats
    └── SignalDetailModal.tsx   # New: Full signal view
```

**Implementation Steps:**
1. Add "Agent Activity" section showing recent agent actions
2. Fetch agent runs: `GET /api/v1/agents/recent-activity`
3. Create AgentActivityFeed component with action cards
4. Add "Pipeline Snapshot" widget with quick stats
5. Fetch pipeline data: `GET /api/v1/opportunities/pipeline-stats`
6. Create PipelineSnapshot component with stage totals
7. Add "View All Signals" button
8. Create SignalDetailModal for full signal drill-down
9. Add signal detail API: `GET /api/v1/intent/signals/:id`
10. Update layout to accommodate new sections

---

## PRIORITY 2: Enhance Engagement Modules

**Timeline:** 3-4 weeks
**Goal:** Complete Emails, Calendar, Sequences modules

### 2.1 Email Compose UI ⭐ HIGH PRIORITY
**Status:** List exists, compose missing
**Estimated Time:** 5 days

**Requirements:**
- Compose modal/page with:
  - To, Cc, Bcc fields
  - Subject line
  - Rich text editor (bold, italic, lists, links)
  - AI-powered subject line suggestions
  - Email template picker
  - Personalization variables ({{firstName}}, {{companyName}})
  - Schedule send option
  - Track opens/clicks checkbox
- Template library
- Template preview
- Save as draft

**Files to Create:**
```
frontend/src/app/(app)/emails/
├── components/
│   ├── EmailComposer.tsx       # Main compose component
│   ├── EmailEditor.tsx         # Rich text editor
│   ├── TemplatePicker.tsx      # Template selector
│   ├── AISuggestions.tsx       # AI subject/body suggestions
│   └── PersonalizationMenu.tsx # Variable picker
```

**Implementation Steps:**
1. Create EmailComposer modal component
2. Integrate rich text editor (use `@tiptap/react` or Quill)
3. Add recipient autocomplete from contacts
4. Build TemplatePicker with template list
5. Fetch templates: `GET /api/v1/emails/templates`
6. Add AI suggestion panel
7. Call OpenAI API: `POST /api/v1/emails/suggest`
8. Add personalization variable menu ({{firstName}}, etc.)
9. Add schedule send datetime picker
10. Implement send: `POST /api/v1/emails/send`
11. Add save as draft: `POST /api/v1/emails/draft`
12. Add email tracking toggle
13. Test with real email providers (Gmail, Outlook)

**Libraries Needed:**
- `@tiptap/react` - Modern rich text editor
- `@tiptap/starter-kit` - Basic formatting
- `react-datepicker` - Schedule send

---

### 2.2 Email Templates Management
**Status:** Not implemented
**Estimated Time:** 3 days

**Requirements:**
- Templates list page
- Create/edit template modal
- Template categories (prospecting, follow-up, nurture)
- Template preview
- Template variables
- Template analytics (usage count, reply rate)

**Files to Create:**
```
frontend/src/app/(app)/emails/templates/
├── page.tsx                    # Templates list
├── TemplatesContent.tsx        # Main component
└── components/
    ├── TemplateCard.tsx        # Template preview card
    ├── TemplateEditor.tsx      # Template form
    └── TemplatePreview.tsx     # Full preview modal
```

**Implementation Steps:**
1. Create emails/templates route
2. Fetch templates: `GET /api/v1/emails/templates`
3. Build templates grid with cards
4. Add template categories filter
5. Create TemplateEditor modal
6. Add rich text editor for template body
7. Add variable picker (merge tags)
8. Implement create: `POST /api/v1/emails/templates`
9. Implement update: `PUT /api/v1/emails/templates/:id`
10. Add delete with confirmation
11. Add template preview modal
12. Show usage analytics per template

---

### 2.3 Email Tracking Visualization
**Status:** Not implemented
**Estimated Time:** 2 days

**Requirements:**
- Email detail page showing:
  - Open tracking (timestamps, location, device)
  - Click tracking (link URLs, timestamps)
  - Reply status
  - Bounce status
- Heatmap of email activity
- Geographic distribution (if available)

**Files to Create:**
```
frontend/src/app/(app)/emails/[id]/
├── page.tsx                    # Email detail route
├── EmailDetailContent.tsx      # Main component
└── components/
    ├── EmailTrackingTimeline.tsx  # Activity timeline
    ├── LinkClicksTable.tsx        # Link analytics
    └── EmailActivityMap.tsx       # Geographic map
```

**Implementation Steps:**
1. Create emails/[id] route
2. Fetch email data: `GET /api/v1/emails/:id`
3. Fetch tracking data: `GET /api/v1/emails/:id/tracking`
4. Build email preview (HTML rendering)
5. Add tracking timeline with events
6. Add link clicks table
7. Add geographic map (optional, if location data available)
8. Add email thread view (replies)
9. Add resend button
10. Add forward button

---

### 2.4 Calendar Grid View
**Status:** List exists, grid view missing
**Estimated Time:** 4 days

**Requirements:**
- Monthly calendar grid
- Day/week/month view toggle
- Meeting blocks on calendar
- Drag-and-drop to reschedule
- Create meeting by clicking date/time
- Meeting detail popover on hover
- Calendar sync status indicator
- Multiple calendars overlay (if synced)

**Files to Create:**
```
frontend/src/app/(app)/calendar/
├── CalendarContent.tsx         # Update with grid view
└── components/
    ├── CalendarGrid.tsx        # Month grid
    ├── CalendarWeekView.tsx    # Week view
    ├── CalendarDayView.tsx     # Day view
    ├── MeetingBlock.tsx        # Meeting on calendar
    └── MeetingPopover.tsx      # Quick view
```

**Implementation Steps:**
1. Update calendar/page.tsx to support grid view
2. Add view toggle: List | Day | Week | Month
3. Build CalendarGrid component (month view)
4. Fetch meetings for date range: `GET /api/v1/calendar/meetings?start=X&end=Y`
5. Render meetings as blocks on grid
6. Add drag-and-drop to reschedule
7. Call reschedule API: `PATCH /api/v1/calendar/meetings/:id`
8. Add click-to-create meeting
9. Build MeetingPopover for quick details
10. Add calendar sync status badge
11. Build CalendarWeekView and CalendarDayView
12. Add today button to jump to current date

**Libraries Needed:**
- `@fullcalendar/react` - Calendar component library
- Or build custom with `date-fns` for date logic

---

### 2.5 Calendar Sync & Scheduling Links
**Status:** Not implemented
**Estimated Time:** 3 days

**Requirements:**
- Calendar sync UI (connect Google Calendar, Outlook Calendar)
- Sync status indicator
- Manual sync button
- Scheduling links (personal booking page)
- Meeting types configuration
- Availability rules

**Files to Create:**
```
frontend/src/app/(app)/calendar/
├── sync/page.tsx               # Sync settings
├── scheduling-links/page.tsx   # Booking pages
└── components/
    ├── CalendarSyncCard.tsx    # Sync status widget
    ├── SchedulingLinkCard.tsx  # Booking link config
    └── AvailabilityEditor.tsx  # Availability rules
```

**Implementation Steps:**
1. Create calendar/sync route
2. Show connected calendars
3. Add "Connect Calendar" button (OAuth flow)
4. Call: `POST /api/v1/calendar/connect`
5. Add manual sync button
6. Create calendar/scheduling-links route
7. Show list of scheduling links
8. Add create scheduling link modal
9. Configure meeting type (duration, location)
10. Set availability rules (hours, buffer time)
11. Generate shareable link
12. Add booking page preview

---

### 2.6 Sequences Visual Builder ⭐ HIGH PRIORITY
**Status:** List exists, builder missing
**Estimated Time:** 5 days

**Requirements:**
- Visual sequence builder with steps
- Drag-and-drop step ordering
- Step types: Email, Call, LinkedIn Message, Wait
- Email step: Template selector, subject/body editor
- Wait step: Delay configuration (hours, days, business days)
- Call step: Script editor, outcome tracking
- LinkedIn step: Message editor
- Branch logic: If/then conditions (replied, opened, clicked)
- Sequence settings: Name, description, goal
- Test sequence flow
- Enrollment rules

**Files to Create:**
```
frontend/src/app/(app)/sequences/[id]/
├── page.tsx                    # Sequence detail/builder
├── SequenceBuilderContent.tsx # Main builder component
└── components/
    ├── SequenceCanvas.tsx      # Visual builder canvas
    ├── StepCard.tsx            # Individual step
    ├── StepEditor.tsx          # Step configuration
    ├── StepTypePicker.tsx      # Add step modal
    ├── BranchingEditor.tsx     # Conditional logic
    └── EnrollmentRules.tsx     # Auto-enrollment config
```

**Implementation Steps:**
1. Create sequences/[id] route for builder
2. Fetch sequence: `GET /api/v1/sequences/:id`
3. Build SequenceCanvas with step flow
4. Add step cards with drag-and-drop
5. Use `@dnd-kit` for reordering
6. Create StepTypePicker modal (Email, Call, LinkedIn, Wait)
7. Build StepEditor for each step type
8. Add email step: template picker + editor
9. Add wait step: delay input (X days)
10. Add call step: script editor
11. Add branching logic editor
12. Add save sequence: `PUT /api/v1/sequences/:id`
13. Add test mode (dry run)
14. Add enrollment rules configuration
15. Add publish/activate button

**Libraries Needed:**
- `@dnd-kit/core` - Drag-and-drop
- `reactflow` or `react-diagrams` - Visual flow editor (optional)

---

### 2.7 Sequence Performance Metrics
**Status:** Not implemented
**Estimated Time:** 2 days

**Requirements:**
- Sequence detail page showing:
  - Enrollment stats (active, completed, paused)
  - Step performance (delivery rate, open rate, reply rate)
  - Overall metrics (reply rate, meeting booked rate, opt-out rate)
  - Time-based charts (enrollments over time)
- Step-level analytics
- A/B test results (if applicable)

**Files to Update/Create:**
```
frontend/src/app/(app)/sequences/[id]/
├── SequenceAnalyticsTab.tsx   # New: Analytics view
└── components/
    ├── SequenceMetrics.tsx     # KPI cards
    ├── StepPerformance.tsx     # Per-step table
    └── EnrollmentChart.tsx     # Enrollments over time
```

**Implementation Steps:**
1. Add "Analytics" tab to sequence detail page
2. Fetch metrics: `GET /api/v1/sequences/:id/metrics`
3. Display KPI cards (total enrolled, reply rate, etc.)
4. Build step performance table
5. Add per-step stats (sent, opened, clicked, replied)
6. Add enrollments chart (line chart over time)
7. Add filters (date range, cohort)
8. Add A/B test comparison (if applicable)

---

## PRIORITY 3: Build Agent Infrastructure UI

**Timeline:** 2-3 weeks
**Goal:** Launch Agents Console and Approval Queue for Phase 2

### 3.1 Agents Console Page ⭐ CRITICAL FOR PHASE 2
**Status:** Not implemented
**Estimated Time:** 5 days

**Requirements:**
- Agents list with status (active, paused, disabled)
- Agent cards showing:
  - Agent type (Lead Source, Enrichment, Contact Finder, etc.)
  - Status badge
  - Last run timestamp
  - Success rate
  - Throughput (actions/day)
- Create new agent button
- Agent detail page with:
  - Configuration settings
  - Run history
  - Logs
  - Performance metrics

**Files to Create:**
```
frontend/src/app/(app)/agents/
├── page.tsx                    # Agents list
├── AgentsContent.tsx           # Main component
├── [id]/
│   ├── page.tsx                # Agent detail
│   ├── AgentDetailContent.tsx # Detail view
│   └── AgentConfigTab.tsx     # Configuration
└── components/
    ├── AgentCard.tsx           # Agent preview card
    ├── AgentConfigForm.tsx     # Config editor
    ├── AgentRunHistory.tsx     # Run logs
    └── AgentMetrics.tsx        # Performance stats
```

**Implementation Steps:**
1. Create agents/ route
2. Fetch agents: `GET /api/v1/agents`
3. Build agents grid with agent cards
4. Add status filter (all, active, paused)
5. Add "Create Agent" modal
6. Agent types: Lead Source, Enrichment, Contact Finder, Scoring, Email Drafter, etc.
7. Create agents/[id] route for detail
8. Fetch agent config: `GET /api/v1/agents/:id`
9. Build configuration form (ICP settings, templates, etc.)
10. Add run history table
11. Fetch runs: `GET /api/v1/agents/:id/runs`
12. Add run logs viewer
13. Add performance metrics cards
14. Add pause/resume/delete actions
15. Add manual run trigger button

**Backend API Endpoints Needed (Phase 2):**
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent
- `GET /api/v1/agents/:id` - Get agent config
- `PUT /api/v1/agents/:id` - Update agent config
- `PATCH /api/v1/agents/:id/status` - Pause/resume agent
- `DELETE /api/v1/agents/:id` - Delete agent
- `GET /api/v1/agents/:id/runs` - Get run history
- `GET /api/v1/agents/:id/runs/:runId/logs` - Get run logs
- `POST /api/v1/agents/:id/run` - Trigger manual run

---

### 3.2 Approval Queue Page ⭐ CRITICAL FOR PHASE 2
**Status:** Not implemented
**Estimated Time:** 4 days

**Requirements:**
- Pending approvals list
- Batch review interface
- Approval cards showing:
  - Agent that generated action
  - Action type (email draft, lead score, etc.)
  - Entity context (contact/account info)
  - AI-generated content
  - Confidence score
- Approve/Reject/Edit actions
- Bulk approve selected
- Reject with feedback
- Context sidebar with entity details

**Files to Create:**
```
frontend/src/app/(app)/approvals/
├── page.tsx                    # Approvals queue
├── ApprovalsContent.tsx        # Main component
└── components/
    ├── ApprovalCard.tsx        # Approval preview
    ├── ApprovalDetailModal.tsx # Full view with edit
    ├── BulkApprovalBar.tsx     # Batch actions
    └── ContextSidebar.tsx      # Entity context
```

**Implementation Steps:**
1. Create approvals/ route
2. Fetch pending approvals: `GET /api/v1/approvals?status=pending`
3. Build approvals list with cards
4. Add filters (agent type, entity type, date)
5. Create ApprovalCard component
6. Show AI-generated content (email draft, score, etc.)
7. Add "Approve" button: `POST /api/v1/approvals/:id/approve`
8. Add "Reject" button: `POST /api/v1/approvals/:id/reject`
9. Add "Edit" button that opens detail modal
10. Create ApprovalDetailModal with editable content
11. Add bulk selection checkboxes
12. Add bulk approve bar at bottom
13. Add context sidebar showing related entity
14. Add approval history tab
15. Add notifications for new approvals

**Backend API Endpoints Needed (Phase 2):**
- `GET /api/v1/approvals` - List pending approvals
- `GET /api/v1/approvals/:id` - Get approval details
- `POST /api/v1/approvals/:id/approve` - Approve action
- `POST /api/v1/approvals/:id/reject` - Reject action with reason
- `PUT /api/v1/approvals/:id` - Edit and approve
- `POST /api/v1/approvals/bulk-approve` - Approve multiple

---

### 3.3 Agent Configuration Forms
**Status:** Not implemented
**Estimated Time:** 3 days

**Requirements:**
- Per-agent configuration UI
- Lead Source Agent:
  - Apollo.io filters (industry, company size, job titles)
  - Search criteria
  - Daily limit
- Enrichment Agent:
  - Data points to enrich
  - Confidence threshold
- Contact Finder Agent:
  - Email pattern preferences
  - Verification settings
- Scoring Agent:
  - ICP criteria (industry, revenue, employee count)
  - Weights per criterion
  - Thresholds for scores
- Email Drafter Agent:
  - Email templates
  - Tone/style preferences
  - Personalization rules

**Files to Create:**
```
frontend/src/app/(app)/agents/[id]/config/
└── forms/
    ├── LeadSourceConfigForm.tsx
    ├── EnrichmentConfigForm.tsx
    ├── ContactFinderConfigForm.tsx
    ├── ScoringConfigForm.tsx
    └── EmailDrafterConfigForm.tsx
```

**Implementation Steps:**
1. Create config forms for each agent type
2. Add form validation with Zod schemas
3. Fetch agent-specific config: `GET /api/v1/agents/:id/config`
4. Build form fields per agent type
5. Add Apollo.io filter builder for Lead Source
6. Add ICP criteria editor for Scoring Agent
7. Add template selector for Email Drafter
8. Implement save: `PUT /api/v1/agents/:id/config`
9. Add test configuration button
10. Add config history/versioning

---

## PRIORITY 4: Business Features

**Timeline:** 3-4 weeks
**Goal:** Launch Onboarding, Billing, Compliance

### 4.1 Onboarding Wizard
**Status:** Not implemented
**Estimated Time:** 4 days

**Requirements:**
- Multi-step wizard (5-7 steps)
- Steps:
  1. Welcome & company info
  2. Connect email (Gmail/Outlook OAuth)
  3. Define ICP (industry, company size, role)
  4. Import existing leads (CSV or integrations)
  5. Configure first agent (Lead Source Agent)
  6. Set up first sequence (template selector)
  7. Review & launch
- Progress indicator
- Skip option for each step
- Save progress and resume later

**Files to Create:**
```
frontend/src/app/(app)/onboarding/
├── page.tsx                    # Onboarding route
├── OnboardingWizard.tsx        # Main wizard component
└── steps/
    ├── WelcomeStep.tsx
    ├── EmailConnectStep.tsx
    ├── ICPDefinitionStep.tsx
    ├── LeadsImportStep.tsx
    ├── AgentConfigStep.tsx
    ├── SequenceSetupStep.tsx
    └── ReviewStep.tsx
```

**Implementation Steps:**
1. Create onboarding/ route (only show if not completed)
2. Build wizard container with step navigation
3. Add progress indicator (1/7, 2/7, etc.)
4. Create WelcomeStep with company info form
5. Create EmailConnectStep with OAuth buttons
6. Create ICPDefinitionStep with criteria inputs
7. Create LeadsImportStep with CSV upload or Apollo connection
8. Create AgentConfigStep with Lead Source Agent form
9. Create SequenceSetupStep with template picker
10. Create ReviewStep showing summary
11. Add "Skip" button for optional steps
12. Save progress: `POST /api/v1/onboarding/progress`
13. Mark complete: `POST /api/v1/onboarding/complete`
14. Redirect to briefing page on finish

---

### 4.2 Billing Portal
**Status:** Not implemented
**Estimated Time:** 5 days

**Requirements:**
- Current plan display (Starter, Growth, Enterprise)
- Usage meters:
  - Leads generated this month
  - Emails sent this month
  - Agent runs this month
  - Percentage of plan limits
- Upgrade/downgrade buttons
- Plan comparison table
- Payment method management
- Invoice history table
- Billing cycle info
- Stripe integration

**Files to Create:**
```
frontend/src/app/(app)/billing/
├── page.tsx                    # Billing overview
├── BillingContent.tsx          # Main component
├── upgrade/page.tsx            # Plan selection
└── components/
    ├── CurrentPlanCard.tsx     # Plan info
    ├── UsageMeters.tsx         # Usage stats
    ├── PlanComparisonTable.tsx # Upgrade options
    ├── PaymentMethod.tsx       # Card management
    └── InvoiceHistory.tsx      # Past invoices
```

**Implementation Steps:**
1. Create billing/ route
2. Fetch billing info: `GET /api/v1/billing`
3. Display current plan with features
4. Add usage meters with progress bars
5. Fetch usage: `GET /api/v1/billing/usage`
6. Add "Upgrade" button linking to plan selection
7. Create billing/upgrade route
8. Build plan comparison table (3 tiers)
9. Integrate Stripe Checkout
10. Call: `POST /api/v1/billing/create-checkout-session`
11. Handle Stripe redirect back
12. Add payment method section (Stripe Elements)
13. Add invoice history table
14. Fetch invoices: `GET /api/v1/billing/invoices`
15. Add download invoice PDF links

**Backend Integration:**
- Stripe SDK for payments
- Webhooks for subscription events
- Usage tracking and metering

---

### 4.3 Compliance Dashboard
**Status:** Not implemented
**Estimated Time:** 3 days

**Requirements:**
- Opt-out management:
  - List of opted-out contacts
  - Reason for opt-out
  - Date opted out
- Consent tracking:
  - Contacts with explicit consent
  - Consent date and source
- Data retention settings:
  - Auto-delete inactive leads (30/60/90 days)
  - Data export policy
- Data export:
  - Export all data (CSV/JSON)
  - GDPR data request form
- Data deletion:
  - Delete account and all data
  - Confirmation flow
- Audit log viewer:
  - All data access events
  - Filter by user, entity, action

**Files to Create:**
```
frontend/src/app/(app)/compliance/
├── page.tsx                    # Compliance overview
├── ComplianceContent.tsx       # Main component
├── opt-outs/page.tsx           # Opt-out management
├── consent/page.tsx            # Consent tracking
├── data-retention/page.tsx     # Retention settings
├── data-export/page.tsx        # Export requests
└── audit-log/page.tsx          # Audit log viewer
```

**Implementation Steps:**
1. Create compliance/ route
2. Add opt-out management page
3. Fetch opt-outs: `GET /api/v1/compliance/opt-outs`
4. Add manually add opt-out form
5. Add consent tracking page
6. Fetch consent records: `GET /api/v1/compliance/consent`
7. Add data retention settings page
8. Configure auto-delete rules
9. Add data export page
10. Trigger export: `POST /api/v1/compliance/export`
11. Email download link when ready
12. Add data deletion page with confirmation
13. Add audit log viewer
14. Fetch logs: `GET /api/v1/compliance/audit-log`
15. Add filters (date range, user, entity type)

---

## Technical Implementation Guidelines

### Component Structure Pattern
```tsx
// Page component (Server Component)
export default async function Page({ params }) {
  const data = await fetchData(params.id);
  return <ContentComponent data={data} />;
}

// Content component (Client Component)
'use client';
export function ContentComponent({ data }) {
  const [state, setState] = useState(data);
  // Handle interactions
  return <UI />;
}

// Loading state
export default function Loading() {
  return <Skeleton />;
}
```

### Form Handling Pattern
```tsx
'use client';
import { useState } from 'react';
import { toast } from '@/components/ui/Toast';

export function FormComponent() {
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed');

      toast.success('Success!');
      // Revalidate or redirect
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### API Client Pattern
```tsx
// lib/api/client.ts
export async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}
```

### State Management
- Use React hooks for local state
- Use Next.js server components for data fetching
- Use context for global state (theme, user, etc.)
- Consider Zustand for complex client state (optional)

### Styling Guidelines
- Use Tailwind CSS utility classes
- Follow existing design system in `/docs/DESIGN-SYSTEM.md`
- Use CSS variables for theming (light/dark mode)
- Ensure responsive design (mobile-first)

### Accessibility
- Use semantic HTML (`<button>`, `<nav>`, `<main>`)
- Add ARIA labels where needed
- Ensure keyboard navigation works
- Test with screen readers
- Add focus states to interactive elements

### Performance Optimization
- Use React.memo() for expensive components
- Implement virtualization for long lists (react-window)
- Lazy load heavy components with React.lazy()
- Use skeleton loaders for better perceived performance
- Optimize images with Next.js Image component

---

## Testing Strategy

### Unit Tests
- Test individual components with Vitest + React Testing Library
- Test utility functions and hooks
- Test form validation logic

### Integration Tests
- Test complete user flows (create lead, convert to opportunity)
- Test API integration with mock server (MSW)

### E2E Tests
- Use Playwright for critical user journeys
- Test: Login → Create Lead → Convert → Close Deal
- Test: Agent configuration → Run agent → Approve action

### Test Coverage Goals
- 80%+ for utility functions
- 70%+ for component logic
- 100% for critical business logic (billing, agents, approvals)

---

## Implementation Milestones

### Milestone 1: Complete Core (Week 1-3)
- ✅ Contacts detail page - DONE (Jan 21)
- ✅ Opportunities Kanban board - DONE (Jan 21)
- ✅ Accounts enhancements - DONE (Jan 21)
- ⏳ Settings module (5 pages) - IN PROGRESS
- ⏳ Briefing enhancements - PENDING

### Milestone 2: Enhance Engagement (Week 4-7)
- ✅ Email compose UI
- ✅ Email templates
- ✅ Email tracking
- ✅ Calendar grid view
- ✅ Calendar sync
- ✅ Sequences builder
- ✅ Sequence analytics

### Milestone 3: Agent Infrastructure (Week 8-10)
- ✅ Agents console
- ✅ Agent detail pages
- ✅ Agent configuration forms
- ✅ Approval queue
- ✅ Bulk approval actions

### Milestone 4: Business Features (Week 11-14)
- ✅ Onboarding wizard
- ✅ Billing portal
- ✅ Compliance dashboard

---

## Success Criteria

### Phase Completion Checklist
- [ ] All routes respond with UI (no 404s)
- [ ] All CRUD operations functional
- [ ] All forms validate input
- [ ] All API calls handle errors gracefully
- [ ] All pages have loading states
- [ ] All pages are responsive (mobile/tablet/desktop)
- [ ] All interactions have user feedback (toasts/loading)
- [ ] Theme switching works across all pages
- [ ] Navigation works correctly
- [ ] User permissions respected (admin/manager/rep/viewer)

### Quality Metrics
- [ ] Lighthouse score 90+ (Performance, Accessibility, Best Practices)
- [ ] No console errors in production
- [ ] Page load time < 2s on 4G
- [ ] Time to Interactive < 3s
- [ ] Test coverage 70%+

---

## Resources & References

### Documentation
- `/docs/FEATURES.md` - Feature specifications
- `/docs/DESIGN-SYSTEM.md` - Design tokens and component API
- `/docs/ARCHITECTURE.md` - System architecture
- `/docs/API.md` - Backend API reference
- `/docs/AGENTS.md` - Agent specifications

### Existing Code
- `/frontend/src/components/ui/` - UI component library
- `/frontend/src/app/(app)/leads/` - Reference implementation
- `/frontend/src/lib/api/` - API client utilities

### Libraries to Use
- **Next.js 15** - React framework
- **Tailwind CSS** - Styling
- **@tiptap/react** - Rich text editor
- **@dnd-kit** - Drag-and-drop
- **@fullcalendar/react** - Calendar (optional)
- **recharts** - Charts (already using)
- **date-fns** - Date utilities
- **zod** - Schema validation
- **react-hook-form** - Form handling (consider adding)

---

## Next Steps

1. **Review this plan** with team
2. **Prioritize features** based on business needs
3. **Assign tasks** to developers
4. **Set up project tracking** (GitHub Issues, Linear, etc.)
5. **Create feature branches** per milestone
6. **Begin with Priority 1** (Contacts detail page)
7. **Establish review process** for PRs
8. **Set up CI/CD** for automated testing

---

**Plan Version:** 1.0
**Last Updated:** January 21, 2026
**Owner:** Engineering Team
**Estimated Completion:** 10-14 weeks (with 2-3 developers)
