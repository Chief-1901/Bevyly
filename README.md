# Bevyly

**Intent-Driven Sales Operating System**

> Meaning over Data. Every screen answers "What should I do next?" before "What are the numbers?"

## What is Bevyly?

Bevyly is a modern sales operating system that shifts from traditional dashboard-centric CRM patterns to a **proactive, recommendation-first approach**. Instead of presenting data exploration surfaces that require users to find insights, Bevyly surfaces **contextual next-best-actions** that guide users toward outcomes.

## Core Philosophy

Traditional CRMs present data and expect users to:
1. Navigate to dashboards
2. Analyze charts and tables
3. Identify what needs attention
4. Figure out the right action
5. Navigate to the right place to act

**Bevyly inverts this:**
1. Open the app → See what needs attention
2. Understand why → Take action immediately
3. Drill into data only when needed

## Key Features

### Briefing Page
Your personalized daily briefing showing:
- **Top Signals**: What you need to know right now
- **Recommended Actions**: Your next steps with clear rationale
- **Evidence**: Why we're suggesting each action

### Action Cards
Contextual cards that surface:
- Stalled deals needing attention
- Underperforming sequences
- New leads ready for review
- Follow-ups after meetings

### Dual-Layer Architecture
- **Generative UI**: Intent-driven briefings and recommendations
- **Deterministic UI**: Tables, forms, and detail pages for data truth

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GENERATIVE UI LAYER (Intent)                     │
│   Briefing page + Action Cards + future command bar                 │
│   - "What do I need to know?" + "What's my next step?"              │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ CTAs route to data
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  DETERMINISTIC UI LAYER (Data Truth)                │
│   /leads, /opportunities, /sequences, /accounts, /contacts          │
│   - Tables, detail pages, forms, filters, search, export            │
└─────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **Event Streaming**: Kafka for async processing
- **Caching**: Redis

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with design tokens
- **AI Integration**: Vercel AI SDK for Generative UI

## Project Structure

```
bevyly/
├── backend/
│   └── src/
│       ├── modules/          # Feature modules
│       │   ├── intent/       # Signals, patterns, recommendations
│       │   ├── leads/        # Lead management
│       │   ├── crm/          # Accounts, contacts, opportunities
│       │   ├── sequences/    # Email sequences
│       │   └── ...
│       └── shared/           # Shared utilities, DB, config
├── frontend/
│   └── src/
│       ├── app/(app)/        # App routes
│       │   ├── briefing/     # Primary entry point
│       │   ├── leads/        # Leads module
│       │   ├── opportunities/
│       │   └── ...
│       └── components/
│           ├── intent/       # Action Card registry
│           └── ui/           # Design system
└── docs/                     # Architecture documentation
```

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture.md) | Intent-Driven Sales OS architecture, dual-layer UI model |
| [Generative UI](docs/generative-ui.md) | Vercel AI SDK integration, component registry |
| [Status Report](docs/intent-driven-status-report.md) | Implementation progress and compliance tracking |

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Kafka (optional, for event streaming)

### Backend Setup

```bash
cd backend
cp env.example .env
npm install
npm run db:migrate        # Apply database migrations
npm run dev:services      # Start all services (gateway + microservices)
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev               # Start Next.js dev server
```

### Access the App

- Frontend: http://localhost:3010
- Backend Gateway: http://localhost:3020
- CRM Service: http://localhost:3001

### Test Credentials

After setting up, you can log in with:
- Email: Create a new account via `/signup`
- Or use the demo user if seeded

## Development Roadmap

### Phase 1: Foundation ✅ Complete
- [x] Documentation: Architecture, Generative UI, Status Report
- [x] Backend: Leads module, Intent module, new schemas
- [x] Frontend: Briefing page, Action Cards, Leads pages
- [x] Database: 5 new tables applied to Supabase
- [x] API: 16 new endpoints for leads and intent

### Phase 2: Expansion (Next)
- [ ] Wire Kafka consumer to signals for real-time detection
- [ ] Add contextual Action Card sidebars to deterministic pages
- [ ] AI-powered card selection via Vercel AI SDK
- [ ] Add analytics/explore section for charts
- [ ] Command bar for intent-based navigation

## Contributing

1. Read the [Architecture](docs/architecture.md) document
2. Check the [Status Report](docs/intent-driven-status-report.md) for current tasks
3. Follow existing code patterns in the respective `backend/` or `frontend/` directories

## License

Proprietary - All rights reserved
