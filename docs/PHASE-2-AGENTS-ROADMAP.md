# Phase 2: AI Agents + Agent Console UI Roadmap

**Start Date:** TBD  
**Duration:** 4–6 weeks (MVP), then expand in Phase 3  
**Goal:** Implement Prospecting Agents + an Agent Console UI to configure, monitor, and approve agent actions.

---

## What’s already implemented (foundation)

- **Microservices (APIs):** Auth/CRM/Email/Calendar/Sequences/Activities + Gateway
- **Event bus:** Redpanda/Kafka topics + publisher/consumer workers
- **Data model:** Multi-tenant schema in Postgres/Supabase

These components are prerequisites for agents; agents will run *on top* of them.

---

## Agent List (from PRD) and where it lands

### Phase 2 (Prospecting Agents)
- **Lead Source Agent**: discovers companies/leads from providers
- **Enrichment Agent**: enriches accounts/contacts with firmographics + signals
- **Contact Finder Agent**: finds decision makers + verifies contactability
- **Scoring Agent**: fit/intent scoring, tiering, and sequence selection

### Phase 3 (Outreach/Engagement/Closing Agents)
- **Email Agent / Campaign + Follow-up**: autonomous cold email + follow-ups (built on Sequences + Email providers)
- **LinkedIn Agent**
- **Voice Agent**
- **SMS Agent**
- **Engagement Agent**: reacts to opens/clicks/replies; triggers next actions
- **Calendar Agent**: scheduling automation and reminders
- **CRM Agent**: hygiene + bi-directional sync automation
- **Discovery Agent**
- **Proposal Agent**
- **Closing Agent**
- **Forecasting Agent**
- **Coaching Agent**

---

## MVP Scope (Phase 2)

### Sprint 1: Agent Console UI (MVP)
**Goal:** One place to configure and monitor agents.

**Pages/Features:**
- Agents list + per-agent enable/disable per tenant
- Agent runs history (timestamp, status, duration, inputs/outputs)
- Error queue (failed runs with retry)
- Integrations status (connected providers, API keys, quotas)
- Approvals queue (human-in-the-loop for risky actions)
- Agent health (last heartbeat, lag, throughput)

**Deliverable:** Ops/Admin can see what agents are doing and control them.

---

### Sprint 2: Lead Source Agent (MVP)
**Goal:** Populate candidate leads into the CRM pipeline.

**Inputs:** ICP configuration + provider connectors  
**Outputs:** Create Accounts/Contacts + publish `lead.sourced`

**Deliverable:** System can source leads into the tenant workspace.

---

### Sprint 3: Enrichment Agent (MVP)
**Goal:** Enrich accounts/contacts and attach signals.

**Inputs:** `lead.sourced` events  
**Outputs:** Update CRM fields + publish `lead.enriched`

**Deliverable:** Leads have usable context for personalization/scoring.

---

### Sprint 4: Contact Finder Agent (MVP)
**Goal:** Find the right persona + verified email(s).

**Inputs:** enriched accounts  
**Outputs:** Verified contacts + publish `contact.verified`

**Deliverable:** Leads become contactable prospects.

---

### Sprint 5: Scoring Agent (MVP) + “Pipeline Insights”
**Goal:** Rank prospects and decide what to do next.

**Inputs:** `contact.verified`, engagement signals, CRM context  
**Outputs:**
- Fit/intent score + tier assignment
- Recommended sequence/cadence
- Publish `lead.scored`

**Deliverable:** Reps/ops see prioritized pipeline and recommendations.

---

## Notes on “Campaign / Follow-up Agents”

“Campaign” and “follow-up” behavior is expected to be implemented as:
- **Sequences Service (engine)**: definition + execution of multi-step cadences
- **Email Provider integration**: actual sending (Gmail/Outlook)
- **Agent orchestration**: an agent decides *who enters which sequence, when to follow up, and how to personalize*

In other words, we already have the **engine and sending plumbing**, but the **autonomous orchestration** is Phase 3 unless you choose to pull a minimal version earlier.

---

## Documentation links

- Single source of truth: `docs/Project-Status-Bible.md`
- UI completion roadmap: `docs/PHASE-2-FRONTEND-ROADMAP.md` (Phase 1.5)


