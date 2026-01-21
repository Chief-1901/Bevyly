# Bevyly - Changelog

> Version history and releases

All notable changes to Bevyly are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- OpenAI integration for agent intelligence
- Apollo.io integration for lead sourcing
- Agent Console UI
- Approval Queue UI
- Gmail/Outlook email integration
- Google Calendar integration
- Voice Agent (Bland.ai)
- Fresh visual rebrand
- Billing integration (Stripe)
- Onboarding wizard
- Analytics dashboard

---

## [0.2.0] - 2026-01-21

### Added
- **Intent-Driven Architecture** - Complete implementation of intent-driven sales OS
- **Briefing Page** - New primary entry point with action cards and signals
- **Leads Module** - Full lead management with convert/reject workflows
- **Signals System** - Detect and surface important events
- **Recommendations Engine** - Generate actionable next steps
- **Action Card Registry** - Whitelisted components for briefing UI

### Changed
- Login now redirects to `/briefing` instead of `/dashboard`
- Dashboard becomes secondary analytics view
- Navigation sidebar updated with new module structure

### Fixed
- TLS verification re-enabled for database connections
- API key validation at gateway level
- Demo credentials removed from logs
- Duplicate middleware file in frontend
- Header/content overlap in DashboardShell
- Dropdown menu clipping (added floating-ui)
- Tailwind color classes in BriefingContent
- Table layout and action menu positioning

### Security
- Fixed critical TLS bypass vulnerability
- Fixed API key authentication bypass
- Removed sensitive credentials from seed data logs
- Added skip-link for accessibility

---

## [0.1.0] - 2026-01-10

### Added
- **Initial Release** - Bevyly full-stack application
- **Authentication System** - JWT-based auth with signup/login
- **RBAC** - Role-based access control with permissions
- **CRM: Accounts** - Company management with CRUD operations
- **CRM: Contacts** - Contact management linked to accounts
- **CRM: Opportunities** - Deal pipeline with stages
- **Email Module** - Basic email sequence infrastructure
- **Calendar Module** - Meeting management infrastructure
- **Sequences Module** - Outreach sequence infrastructure
- **Activities Module** - Activity tracking infrastructure
- **Event Bus** - Kafka-based event streaming with outbox pattern
- **Multi-tenancy** - Row-level tenant isolation
- **API Gateway** - Hono-based gateway with rate limiting
- **Database Schema** - Drizzle ORM with Supabase PostgreSQL
- **Frontend Shell** - Next.js 14 with App Router
- **UI Components** - Button, Input, Table, Menu, Card, etc.
- **Dark Mode** - System-preference-aware theming

### Technical
- TypeScript throughout
- Zod validation
- Branded types for IDs
- Defense-in-depth multi-tenancy

---

## Version Numbering

Bevyly uses [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes, significant new features
- **MINOR** (0.x.0): New features, backwards compatible
- **PATCH** (0.0.x): Bug fixes, minor improvements

---

## Upgrade Notes

### 0.1.x → 0.2.x

**Breaking Changes:**
- Default login redirect changed from `/dashboard` to `/briefing`
- New database tables required: `leads`, `signals`, `patterns`, `recommendations`, `recommendation_feedback`

**Migration Steps:**
1. Run database migrations: `npm run db:migrate`
2. Update any hardcoded redirects to `/dashboard`
3. Clear browser cache/local storage

---

## Future Releases

### 0.3.0 (Planned)
- Agent Infrastructure
- OpenAI integration
- Apollo.io integration
- Agent Console
- Approval Queue

### 0.4.0 (Planned)
- Core Agents (Lead Source, Enrichment, Contact Finder, Scoring)
- Email Drafter Agent

### 0.5.0 (Planned)
- Email integration (Gmail, Outlook)
- Email Responder Agent
- Follow-up Agent

### 0.6.0 (Planned)
- Voice Agent (Bland.ai)
- Meeting Agent
- Calendar integration

### 1.0.0 (Planned)
- Fresh rebrand
- Billing (Stripe)
- Onboarding wizard
- Production-ready release
