# Bevyly Documentation

> **"Your AI Sales Team That Never Sleeps"**

Bevyly is an intent-driven autonomous sales operating system where AI agents handle the entire BDR workflow—from lead sourcing to meeting booking—with human approval checkpoints.

---

## Quick Links

| Document | Description |
|----------|-------------|
| [Product Vision](./PRODUCT-VISION.md) | Core philosophy and product direction |
| [Features](./FEATURES.md) | Module breakdown and capabilities |
| [Agents](./AGENTS.md) | AI agent specifications and workflows |
| [Pricing](./PRICING.md) | Tier structure and limits |
| [Architecture](./ARCHITECTURE.md) | Technical architecture and stack |
| [API](./API.md) | API reference and endpoints |
| [Integrations](./INTEGRATIONS.md) | Third-party service connections |
| [Compliance](./COMPLIANCE.md) | GDPR, CAN-SPAM, and data handling |
| [Design System](./DESIGN-SYSTEM.md) | UI components, colors, typography |
| [Implementation Status](./IMPLEMENTATION-STATUS.md) | Current build progress |
| [Changelog](./CHANGELOG.md) | Version history and releases |

---

## Core Principles

1. **Agents do the heavy lifting** — Sourcing, enriching, emailing, calling, responding
2. **Humans approve and close** — Review queue for AI-generated actions
3. **Action-queue first** — Not dashboard-first
4. **One platform** — No third-party sales tools needed

---

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (Supabase)
- Kafka (Redpanda)
- pnpm or npm

### Quick Start

```bash
# Backend
cd backend && npm install && npm run dev:services

# Frontend
cd frontend && npm install && npm run dev
```

**Frontend:** http://localhost:3010
**Backend API:** http://localhost:3020

---

## Project Structure

```
bevyly/
├── backend/           # Node.js + Hono API services
│   ├── src/
│   │   ├── gateway/   # API Gateway
│   │   ├── modules/   # Feature modules
│   │   ├── services/  # Business services
│   │   └── shared/    # Shared utilities
│   └── drizzle/       # Database migrations
├── frontend/          # Next.js 14 application
│   ├── src/
│   │   ├── app/       # App router pages
│   │   ├── components/# UI components
│   │   └── lib/       # Utilities and API clients
│   └── public/        # Static assets
└── docs/              # Documentation
```

---

## Support

For issues, feature requests, or questions, please open an issue in the repository.
