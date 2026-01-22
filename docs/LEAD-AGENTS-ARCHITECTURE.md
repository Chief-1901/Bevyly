# Lead Discovery & Enrichment System Architecture

> Two-agent system with cost-optimized lead generation

**Version:** 1.0
**Created:** January 22, 2026
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

A sophisticated two-agent lead generation system that:
1. **Discovery Agent** - Finds leads using FREE/cheap sources (Google, LinkedIn, etc.)
2. **Enrichment Agent** - Enriches approved leads using Apollo.io via Apify (PAID)

**Key Principle:** Never waste paid credits on unqualified leads.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER PROMPT (Briefing Page)                          │
│  "Find me SaaS companies in Austin with 50-200 employees hiring engineers"  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LEAD DISCOVERY AGENT (FREE)                             │
│                                                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Google   │ │ Google   │ │ LinkedIn │ │ GitHub   │ │ Job      │          │
│  │ Search   │ │ Maps     │ │ Public   │ │ Orgs     │ │ Boards   │          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └────────────┴────────────┴────────────┴────────────┘                 │
│                                   │                                          │
│                                   ▼                                          │
│                    ┌─────────────────────────────┐                           │
│                    │   DEDUPLICATION & SCORING   │                           │
│                    │   Basic ICP Match Check     │                           │
│                    └─────────────────────────────┘                           │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPROVAL QUEUE                                       │
│  "Found 47 companies. 23 match your criteria. Approve enrichment?"          │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │ [✓] Acme Corp - SaaS, Austin, ~100 emp (from job posts)            │    │
│  │ [✓] TechStart Inc - SaaS, Austin, ~75 emp (from LinkedIn)          │    │
│  │ [ ] RandomCo - Doesn't match (auto-unchecked)                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  [Approve Selected (23)] [Reject All] [Edit Selection]                      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ User approves
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LEAD ENRICHMENT AGENT (PAID)                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              APIFY + APOLLO.IO INTEGRATION                          │    │
│  │                                                                      │    │
│  │  For each approved lead:                                            │    │
│  │  1. Company enrichment (firmographics, tech stack, funding)         │    │
│  │  2. Contact finder (decision makers based on user criteria)         │    │
│  │  3. Email verification                                              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LEADS MODULE                                         │
│  Enriched leads appear with full data, ready for outreach                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Industry Standards & Limits

### Typical Lead Generation Volumes

| Metric | Small Team | Mid-Market | Enterprise |
|--------|------------|------------|------------|
| Discovery/day | 50-100 | 200-500 | 1000+ |
| Enrichment/day | 20-50 | 100-200 | 500+ |
| Enrichment rate | 30-50% | 30-40% | 20-30% |

### Apollo.io Credit Costs (via Apify)

| Operation | Credits | Notes |
|-----------|---------|-------|
| Company search | 1 | Per search query |
| Company enrich | 1 | Per company |
| Person search | 1 | Per search |
| Person enrich | 1 | Per contact |
| Email verify | 1 | Per email |

**Recommended Default Limits:**
- Discovery: 100 leads/run (free, no limit needed)
- Enrichment: 50 leads/run (paid, conservative default)
- Daily enrichment cap: 200 leads/day (prevents runaway costs)

### Free Source Rate Limits

| Source | Rate Limit | Notes |
|--------|------------|-------|
| Google Search | 100/day free | Via Custom Search API |
| Google Maps | 1000/day | Places API (free tier) |
| LinkedIn | Scraping TOS risk | Use carefully, public only |
| GitHub | 5000/hour | With API token |
| Indeed/Job Boards | Scraping | Rate limit yourself |
| Product Hunt | 500/day | API access |
| News APIs | 100-1000/day | Varies by provider |

---

## Agent 1: Lead Discovery Agent

### Purpose
Find potential leads from free sources based on user's natural language prompt.

### Trigger Mechanisms

```typescript
enum DiscoveryTrigger {
  PROMPT = 'prompt',           // User types in briefing page
  SCHEDULED = 'scheduled',     // Cron schedule set by user
  LOW_LEADS = 'low_leads',     // Auto-trigger when pipeline is thin
  MANUAL = 'manual',           // Button click in Leads module
}
```

### Input Schema

```typescript
interface DiscoveryAgentInput {
  // Natural language prompt from user
  prompt: string;

  // Parsed criteria (extracted from prompt by LLM)
  criteria?: {
    industries?: string[];
    locations?: string[];
    companySizeMin?: number;
    companySizeMax?: number;
    keywords?: string[];
    technologies?: string[];
    signals?: string[];  // "hiring", "funding", "expanding"
    excludeKeywords?: string[];
  };

  // Source preferences
  sources?: {
    googleSearch?: boolean;
    googleMaps?: boolean;
    linkedIn?: boolean;
    github?: boolean;
    jobBoards?: boolean;
    productHunt?: boolean;
    newsApis?: boolean;
    companyWebsites?: boolean;
  };

  // Limits
  maxResults?: number;  // Default: 100
}
```

### Data Sources Implementation

#### 1. Google Custom Search API (FREE tier: 100/day)

```typescript
// What we search for:
// - "[industry] companies in [location]"
// - "[keyword] startups [location]"
// - "site:linkedin.com/company [industry] [location]"

interface GoogleSearchResult {
  title: string;
  link: string;        // Company website
  snippet: string;     // Description
  domain: string;      // Extracted domain
}

// Extract from results:
// - Company name (from title)
// - Website domain
// - Basic description
// - Location hints (from snippet)
```

#### 2. Google Maps Places API (FREE tier: generous)

```typescript
// Search for businesses by:
// - Category + location
// - Keywords + location

interface PlacesResult {
  name: string;
  address: string;
  website?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;  // Size indicator
  types: string[];       // Business categories
}
```

#### 3. LinkedIn Public Scraping (Careful - TOS)

```typescript
// Only scrape publicly visible data:
// - Company pages (name, industry, size range, description)
// - Public employee counts
// - Recent posts (activity signals)

// Use Apify's LinkedIn Scraper actor for this
// Much safer than direct scraping

interface LinkedInCompanyPublic {
  name: string;
  linkedinUrl: string;
  industry: string;
  employeeCountRange: string;  // "51-200 employees"
  description: string;
  website?: string;
  headquarters?: string;
}
```

#### 4. GitHub Organizations API (FREE: 5000/hour)

```typescript
// Great for tech companies
// Search by: location, language, repos

interface GitHubOrg {
  login: string;
  name: string;
  description: string;
  location: string;
  blog: string;         // Often company website
  publicRepos: number;  // Activity indicator
  followers: number;    // Popularity indicator
}
```

#### 5. Job Boards Scraping (Indeed, Glassdoor, LinkedIn Jobs)

```typescript
// Hiring signals are GOLD
// Companies actively hiring = growing = good prospects

interface JobSignal {
  companyName: string;
  jobTitle: string;
  location: string;
  postedDate: Date;
  jobCount: number;     // How many open roles
}

// Extract:
// - Company is hiring (growth signal)
// - What roles (tech stack hints)
// - Location confirmed
// - Size estimates (many jobs = bigger company)
```

#### 6. Product Hunt API

```typescript
// Great for startups and tech products
// Recently launched = might need services

interface ProductHuntCompany {
  name: string;
  tagline: string;
  website: string;
  topics: string[];
  votesCount: number;
  launchDate: Date;
}
```

#### 7. News APIs (NewsAPI, Google News)

```typescript
// Funding announcements, expansions, new products
// Great intent signals

interface NewsSignal {
  companyMentioned: string;
  headline: string;
  signalType: 'funding' | 'expansion' | 'product_launch' | 'hiring' | 'other';
  date: Date;
  source: string;
}
```

#### 8. Company Website Scraping

```typescript
// For discovered domains, scrape:
// - About page (description, founding date)
// - Team/Careers page (size indicator, hiring)
// - Contact page (location, email patterns)
// - Technology (analyze scripts/meta for tech stack)

interface WebsiteData {
  domain: string;
  title: string;
  description: string;
  technologies: string[];  // From BuiltWith-style analysis
  hasCareerPage: boolean;
  socialLinks: {
    linkedin?: string;
    twitter?: string;
    github?: string;
  };
}
```

### Output Schema

```typescript
interface DiscoveredLead {
  // Identity
  id: string;  // temp_lead_*
  companyName: string;
  domain?: string;

  // Basic info (from free sources)
  description?: string;
  industry?: string;
  location?: string;
  estimatedSize?: string;  // "10-50", "50-200", etc.

  // Signals found
  signals: Array<{
    type: 'hiring' | 'funding' | 'growth' | 'tech_match' | 'news';
    description: string;
    source: string;
    date?: Date;
  }>;

  // Source tracking
  sources: Array<{
    name: string;
    url?: string;
    dataPoints: string[];  // What we got from this source
  }>;

  // ICP match score (0-100)
  matchScore: number;
  matchReasons: string[];

  // Discovered social/web presence
  linkedinUrl?: string;
  twitterUrl?: string;
  githubUrl?: string;

  // Metadata
  discoveredAt: Date;
  promptHash: string;  // Link back to original request
}

interface DiscoveryAgentOutput {
  success: boolean;

  // Results
  leads: DiscoveredLead[];

  // Stats
  stats: {
    totalFound: number;
    deduplicated: number;
    matchingCriteria: number;
    bySource: Record<string, number>;
  };

  // For approval queue
  recommendedForEnrichment: string[];  // IDs of high-match leads
  estimatedEnrichmentCost: number;     // Credits needed
}
```

### Prompt Parsing (LLM-powered)

```typescript
// User prompt: "Find me B2B SaaS companies in Texas with 50-200 employees
//               that are hiring engineers and use React"

// LLM extracts structured criteria:
{
  industries: ["B2B SaaS", "Software"],
  locations: ["Texas", "TX", "Austin", "Dallas", "Houston"],
  companySizeMin: 50,
  companySizeMax: 200,
  signals: ["hiring"],
  technologies: ["React"],
  keywords: ["engineers", "engineering"],
  searchQueries: [
    "B2B SaaS companies Texas",
    "SaaS startups Austin hiring",
    "software companies Dallas 50 employees",
    "React development company Texas"
  ]
}
```

---

## Agent 2: Lead Enrichment Agent

### Purpose
Enrich user-approved leads with detailed firmographic and contact data from Apollo.io.

### Trigger Mechanism
**ONLY** triggered after user approval from the approval queue.

### Input Schema

```typescript
interface EnrichmentAgentInput {
  // Leads to enrich (from approval)
  leadIds: string[];

  // What to enrich (user can customize)
  enrichmentOptions: {
    companyData: boolean;        // Firmographics, tech stack
    decisionMakers: boolean;     // Find contacts
    verifyEmails: boolean;       // Verify found emails
  };

  // Contact criteria (if finding decision makers)
  contactCriteria?: {
    titles?: string[];           // "CTO", "VP Engineering"
    departments?: string[];      // "Engineering", "IT"
    seniorities?: string[];      // "director", "vp", "c_suite"
    maxContactsPerCompany?: number;  // Default: 3
  };

  // Budget control
  maxCredits?: number;           // Stop if exceeded
}
```

### Apify + Apollo.io Integration

```typescript
// We use Apify actors to access Apollo.io
// This is more reliable than direct API and handles rate limits

const APIFY_ACTORS = {
  // Apollo company enrichment
  companyEnrich: 'apollo/company-enrichment',

  // Apollo people search
  peopleSearch: 'apollo/people-search',

  // Apollo email finder
  emailFinder: 'apollo/email-finder',

  // LinkedIn company scraper (backup/supplement)
  linkedinCompany: 'apify/linkedin-company-scraper',
};

interface ApifyClient {
  runActor(actorId: string, input: unknown): Promise<ApifyRun>;
  getDataset(datasetId: string): Promise<unknown[]>;
}
```

### Enrichment Flow

```typescript
async function enrichLead(lead: DiscoveredLead, options: EnrichmentOptions) {
  const result: EnrichedLead = { ...lead };

  // Step 1: Company enrichment
  if (options.companyData && lead.domain) {
    const companyData = await apify.runActor('apollo/company-enrichment', {
      domain: lead.domain
    });

    result.firmographics = {
      employeeCount: companyData.employee_count,
      revenue: companyData.estimated_revenue,
      founded: companyData.founded_year,
      industry: companyData.industry,
      subIndustry: companyData.sub_industry,
      technologies: companyData.technologies,
      funding: companyData.funding_info,
    };
  }

  // Step 2: Find decision makers
  if (options.decisionMakers) {
    const people = await apify.runActor('apollo/people-search', {
      organizationDomains: [lead.domain],
      personTitles: options.contactCriteria?.titles,
      personSeniorities: options.contactCriteria?.seniorities,
      perPage: options.contactCriteria?.maxContactsPerCompany || 3,
    });

    result.contacts = people.map(p => ({
      name: p.name,
      title: p.title,
      email: p.email,
      phone: p.phone,
      linkedin: p.linkedin_url,
      verified: false,
    }));
  }

  // Step 3: Verify emails (optional, costs extra)
  if (options.verifyEmails && result.contacts) {
    for (const contact of result.contacts) {
      if (contact.email) {
        const verification = await apify.runActor('apollo/email-verify', {
          email: contact.email
        });
        contact.verified = verification.valid;
        contact.verificationStatus = verification.status;
      }
    }
  }

  return result;
}
```

### Output Schema

```typescript
interface EnrichedLead extends DiscoveredLead {
  // Enrichment status
  enrichmentStatus: 'pending' | 'enriched' | 'partial' | 'failed';
  enrichedAt?: Date;

  // Company firmographics (from Apollo)
  firmographics?: {
    employeeCount?: number;
    employeeGrowth?: number;      // % growth
    revenue?: string;             // "$10M-$50M"
    revenueGrowth?: number;
    founded?: number;
    industry?: string;
    subIndustry?: string;
    description?: string;
    keywords?: string[];
  };

  // Technology stack
  technologies?: Array<{
    name: string;
    category: string;  // "CRM", "Analytics", "Cloud"
  }>;

  // Funding info
  funding?: {
    totalRaised?: number;
    lastRoundAmount?: number;
    lastRoundDate?: Date;
    lastRoundType?: string;  // "Series A", "Seed"
    investors?: string[];
  };

  // Decision maker contacts
  contacts?: Array<{
    id: string;
    name: string;
    title: string;
    department?: string;
    seniority?: string;
    email?: string;
    emailVerified?: boolean;
    phone?: string;
    linkedin?: string;
  }>;

  // Credit usage
  creditsUsed: number;
}

interface EnrichmentAgentOutput {
  success: boolean;

  // Results
  enrichedLeads: EnrichedLead[];
  failedLeads: Array<{ id: string; error: string }>;

  // Stats
  stats: {
    totalProcessed: number;
    fullyEnriched: number;
    partiallyEnriched: number;
    failed: number;
    contactsFound: number;
    emailsVerified: number;
    creditsUsed: number;
  };
}
```

---

## Approval Queue Flow

### After Discovery

```typescript
interface DiscoveryApprovalItem {
  id: string;
  type: 'lead_enrichment_batch';
  agentType: 'lead_discovery';

  title: string;  // "47 leads found - 23 recommended for enrichment"

  content: {
    // Summary
    totalDiscovered: number;
    recommendedCount: number;
    estimatedCredits: number;

    // Original request
    originalPrompt: string;
    parsedCriteria: object;

    // Leads grouped by match quality
    highMatch: DiscoveredLead[];    // 80-100 score
    mediumMatch: DiscoveredLead[];  // 50-79 score
    lowMatch: DiscoveredLead[];     // Below 50
  };

  context: {
    sources: string[];
    searchDuration: number;
    timestamp: Date;
  };
}
```

### UI for Approval

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ APPROVAL: Lead Enrichment Request                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Original Request:                                                           │
│ "Find B2B SaaS companies in Texas with 50-200 employees hiring engineers"  │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Discovery Results:                                                          │
│ • Total found: 47 companies                                                 │
│ • High match (80%+): 12 companies                                          │
│ • Medium match (50-79%): 11 companies                                       │
│ • Low match (<50%): 24 companies                                           │
│                                                                             │
│ Estimated enrichment cost: ~46 credits                                      │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ HIGH MATCH (12)                                                    [Select All] │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ [✓] TechFlow Inc          SaaS    Austin     ~80 emp    Score: 94      ││
│ │     Signals: Hiring 5 engineers, React in stack, Series A funded       ││
│ │     Sources: LinkedIn, Indeed, Google                                   ││
│ ├─────────────────────────────────────────────────────────────────────────┤│
│ │ [✓] DataPipe Solutions    SaaS    Dallas     ~120 emp   Score: 91      ││
│ │     Signals: Hiring 3 roles, Recently funded                           ││
│ │     Sources: Google, Crunchbase, LinkedIn                              ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ MEDIUM MATCH (11)                                               [Select All] │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ [ ] CloudApp Systems      SaaS    Houston    ~200 emp   Score: 72      ││
│ │     Signals: Hiring, but no tech stack match                           ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ LOW MATCH (24)                                          [Show] [Select All] │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Enrichment Options:                                                         │
│ [✓] Company firmographics (revenue, size, tech stack)                      │
│ [✓] Find decision makers                                                    │
│     Titles: [CTO, VP Engineering, Engineering Manager]                      │
│     Max per company: [3]                                                    │
│ [ ] Verify emails (+1 credit each)                                         │
│                                                                             │
│ ─────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Selected: 23 leads | Estimated cost: 46 credits                            │
│                                                                             │
│ [Approve & Enrich]  [Save for Later]  [Reject All]                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema Additions

```typescript
// Discovered leads (before enrichment)
export const discoveredLeads = pgTable('discovered_leads', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),

  // Discovery metadata
  discoveryRunId: varchar('discovery_run_id', { length: 36 }),
  promptHash: varchar('prompt_hash', { length: 64 }),

  // Basic company info (from free sources)
  companyName: varchar('company_name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  description: text('description'),
  industry: varchar('industry', { length: 100 }),
  location: varchar('location', { length: 255 }),
  estimatedSize: varchar('estimated_size', { length: 50 }),

  // Collected signals
  signals: jsonb('signals').$type<Signal[]>(),

  // Source tracking
  sources: jsonb('sources').$type<Source[]>(),

  // Scoring
  matchScore: integer('match_score'),
  matchReasons: jsonb('match_reasons').$type<string[]>(),

  // Social/web presence
  linkedinUrl: varchar('linkedin_url', { length: 500 }),
  twitterUrl: varchar('twitter_url', { length: 500 }),
  githubUrl: varchar('github_url', { length: 500 }),
  websiteData: jsonb('website_data'),

  // Status
  status: varchar('status', { length: 20 }).default('discovered'),
  // discovered -> approved -> enriching -> enriched -> converted/rejected

  // Timestamps
  discoveredAt: timestamp('discovered_at').defaultNow(),
  approvedAt: timestamp('approved_at'),
  enrichedAt: timestamp('enriched_at'),

}, (table) => ({
  customerIdx: index('discovered_leads_customer_idx').on(table.customerId),
  statusIdx: index('discovered_leads_status_idx').on(table.status),
  domainIdx: index('discovered_leads_domain_idx').on(table.domain),
  scoreIdx: index('discovered_leads_score_idx').on(table.matchScore),
}));

// Enrichment data (separate to keep discovered leads lightweight)
export const leadEnrichments = pgTable('lead_enrichments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),
  discoveredLeadId: varchar('discovered_lead_id', { length: 36 }).notNull(),
  enrichmentRunId: varchar('enrichment_run_id', { length: 36 }),

  // Company firmographics
  employeeCount: integer('employee_count'),
  employeeGrowth: decimal('employee_growth'),
  revenue: varchar('revenue', { length: 50 }),
  revenueGrowth: decimal('revenue_growth'),
  founded: integer('founded'),
  industryDetail: varchar('industry_detail', { length: 255 }),
  subIndustry: varchar('sub_industry', { length: 255 }),

  // Technology stack
  technologies: jsonb('technologies').$type<Technology[]>(),

  // Funding
  funding: jsonb('funding').$type<FundingInfo>(),

  // Contacts found
  contacts: jsonb('contacts').$type<Contact[]>(),

  // Metadata
  creditsUsed: integer('credits_used').default(0),
  enrichedAt: timestamp('enriched_at').defaultNow(),
  dataSource: varchar('data_source', { length: 50 }).default('apollo'),

}, (table) => ({
  customerIdx: index('lead_enrichments_customer_idx').on(table.customerId),
  leadIdx: index('lead_enrichments_lead_idx').on(table.discoveredLeadId),
}));

// Credit usage tracking
export const creditUsage = pgTable('credit_usage', {
  id: varchar('id', { length: 36 }).primaryKey(),
  customerId: varchar('customer_id', { length: 36 }).notNull(),

  // What used the credits
  agentType: varchar('agent_type', { length: 50 }).notNull(),
  agentRunId: varchar('agent_run_id', { length: 36 }),
  operation: varchar('operation', { length: 50 }).notNull(),
  // company_enrich, contact_search, email_verify

  // Credit details
  provider: varchar('provider', { length: 50 }).notNull(), // apollo, apify
  creditsUsed: integer('credits_used').notNull(),

  // Reference
  entityType: varchar('entity_type', { length: 50 }),
  entityId: varchar('entity_id', { length: 36 }),

  // Timestamp
  usedAt: timestamp('used_at').defaultNow(),

}, (table) => ({
  customerIdx: index('credit_usage_customer_idx').on(table.customerId),
  dateIdx: index('credit_usage_date_idx').on(table.usedAt),
}));
```

---

## Implementation Plan

### Phase 2.1: Free Data Source Integrations (Week 1)

| Day | Task | Files |
|-----|------|-------|
| 1 | Database schema for discovered leads | `schema/discovered-leads.ts` |
| 1 | Branded types for new entities | `types/index.ts` |
| 2 | Google Search API client | `integrations/google/search.ts` |
| 2 | Google Maps Places API client | `integrations/google/places.ts` |
| 3 | GitHub Organizations API client | `integrations/github/orgs.ts` |
| 3 | News API client | `integrations/news/client.ts` |
| 4 | Job board scraper (via Apify) | `integrations/apify/job-scraper.ts` |
| 4 | LinkedIn public scraper (via Apify) | `integrations/apify/linkedin.ts` |
| 5 | Website analyzer | `integrations/website/analyzer.ts` |
| 5 | Product Hunt API client | `integrations/producthunt/client.ts` |

### Phase 2.2: Discovery Agent (Week 2)

| Day | Task | Files |
|-----|------|-------|
| 1 | Prompt parser (LLM-powered) | `agents/discovery/prompt-parser.ts` |
| 1 | ICP criteria schema | `agents/discovery/types.ts` |
| 2 | Source orchestrator | `agents/discovery/orchestrator.ts` |
| 2 | Deduplication logic | `agents/discovery/deduplication.ts` |
| 3 | Scoring algorithm | `agents/discovery/scoring.ts` |
| 3 | Discovery agent implementation | `agents/discovery/agent.ts` |
| 4 | Discovery agent routes | `agents/discovery/routes.ts` |
| 4 | Approval queue integration | `agents/discovery/approval.ts` |
| 5 | Testing & refinement | Tests |

### Phase 2.3: Apify + Apollo Integration (Week 3, Days 1-2)

| Day | Task | Files |
|-----|------|-------|
| 1 | Apify client wrapper | `integrations/apify/client.ts` |
| 1 | Apollo enrichment actor | `integrations/apify/apollo-enrich.ts` |
| 2 | Apollo people search actor | `integrations/apify/apollo-people.ts` |
| 2 | Credit tracking service | `services/credit-tracking.ts` |

### Phase 2.4: Enrichment Agent (Week 3, Days 3-5)

| Day | Task | Files |
|-----|------|-------|
| 3 | Enrichment agent implementation | `agents/enrichment/agent.ts` |
| 3 | Enrichment options schema | `agents/enrichment/types.ts` |
| 4 | Approval handler (post-approval) | `agents/enrichment/approval-handler.ts` |
| 4 | Lead conversion (to main leads table) | `agents/enrichment/converter.ts` |
| 5 | Testing & integration | Tests |

### Phase 2.5: Frontend (Week 4)

| Day | Task | Files |
|-----|------|-------|
| 1-2 | Discovery prompt UI (briefing page) | `app/(app)/briefing/components/` |
| 2-3 | Approval queue enhancements | `app/(app)/approvals/` |
| 4 | Discovered leads view | `app/(app)/leads/discovered/` |
| 5 | Credit usage dashboard | `app/(app)/settings/credits/` |

---

## Configuration

```typescript
// Add to config schema
const configSchema = z.object({
  // ... existing

  // Google APIs (free tier)
  google: z.object({
    searchApiKey: z.string().optional(),
    searchEngineId: z.string().optional(),
    mapsApiKey: z.string().optional(),
  }).optional(),

  // GitHub API
  github: z.object({
    token: z.string().optional(),
  }).optional(),

  // News APIs
  news: z.object({
    newsApiKey: z.string().optional(),  // newsapi.org
  }).optional(),

  // Apify (for Apollo, LinkedIn, Job boards)
  apify: z.object({
    token: z.string(),  // Required for enrichment
  }),

  // Agent limits
  agents: z.object({
    discovery: z.object({
      maxResultsPerRun: z.number().default(100),
      dailyLimit: z.number().default(500),
      enabledSources: z.array(z.string()).default([
        'google_search', 'google_maps', 'github',
        'job_boards', 'linkedin_public', 'news'
      ]),
    }).default({}),

    enrichment: z.object({
      maxLeadsPerRun: z.number().default(50),
      dailyLimit: z.number().default(200),
      defaultContactsPerCompany: z.number().default(3),
      autoApproveThreshold: z.number().optional(), // Score above which to auto-approve
    }).default({}),
  }).default({}),
});
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Discovery accuracy | >70% leads match ICP |
| Enrichment success rate | >90% |
| Cost per qualified lead | <$0.50 |
| Time to first leads | <5 minutes |
| User approval rate | >60% of discovered leads |

---

## Summary

This architecture creates a sophisticated, cost-effective lead generation system:

1. **Discovery Agent** uses 8 free/cheap sources to find potential leads
2. **Scoring & Deduplication** ensures quality before asking for approval
3. **Approval Queue** gives users full control over what gets enriched
4. **Enrichment Agent** uses Apollo via Apify only on approved leads
5. **Credit Tracking** ensures cost visibility and control

The user never wastes paid credits on unqualified leads.
