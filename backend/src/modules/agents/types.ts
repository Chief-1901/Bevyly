/**
 * Agent module types and interfaces
 */

import type {
  CustomerId,
  UserId,
  AgentConfigId,
  AgentRunId,
  LeadId,
} from '../../shared/types/index.js';

// Agent types
export type AgentType = 'discovery' | 'enrichment';

// Agent run statuses
export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

// Approval statuses
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

// Fit score buckets
export type FitScoreBucket = 'high' | 'medium' | 'low';

// Integration providers
export type IntegrationProvider = 'apify' | 'google_search' | 'google_maps' | 'github' | 'news_api' | 'openai';

/**
 * ICP (Ideal Customer Profile) criteria parsed from user prompt
 */
export interface ICPCriteria {
  industries?: string[];
  locations?: Array<{
    city?: string;
    state?: string;
    country?: string;
  }>;
  employeeRange?: {
    min?: number;
    max?: number;
  };
  revenueRange?: {
    min?: number;
    max?: number;
  };
  keywords?: string[];
  technologies?: string[];
  signals?: string[]; // 'hiring', 'funding', 'expanding'
  excludeKeywords?: string[];
  searchQueries?: string[];
}

/**
 * Agent execution context
 */
export interface AgentContext {
  customerId: CustomerId;
  userId: UserId;
  runId: AgentRunId;
  configId?: AgentConfigId;
  credentials: Map<string, IntegrationCredentialData>;
}

/**
 * Integration credential data (decrypted)
 */
export interface IntegrationCredentialData {
  provider: IntegrationProvider;
  apiKey: string;
  apiSecret?: string;
  config?: Record<string, unknown>;
}

/**
 * Agent input parameters
 */
export interface AgentInput {
  prompt?: string;
  criteria?: ICPCriteria;
  params?: Record<string, unknown>;
}

/**
 * Agent output result
 */
export interface AgentOutput {
  status: AgentRunStatus;
  summary: Record<string, unknown>;
  leadsDiscovered?: number;
  leadsEnriched?: number;
  creditsUsed?: number;
  approvalItemIds?: string[];
  error?: string;
}

/**
 * Agent progress tracking
 */
export interface AgentProgress {
  runId: AgentRunId;
  status: AgentRunStatus;
  progress: number; // 0-100
  currentStep: string;
  itemsProcessed: number;
  itemsTotal: number;
  startedAt: Date;
  estimatedCompletion?: Date;
}

/**
 * Discovered lead data from free sources
 */
export interface DiscoveredLeadData {
  companyName: string;
  domain?: string;
  url?: string;
  industry?: string;
  description?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  employeeCountEstimate?: number;
  technologies?: string[];
  signals?: Array<{
    type: string;
    description: string;
    source: string;
  }>;
  contacts?: Array<{
    name?: string;
    title?: string;
    email?: string;
    linkedin?: string;
  }>;
  source: string;
  sourceUrl?: string;
  fitScore: number;
  matchReasons?: string[];
  rawData?: Record<string, unknown>;
}

/**
 * Apollo/Apify enrichment data
 */
export interface EnrichmentData {
  // Company data
  employeeCount?: number;
  employeeGrowth?: number;
  revenue?: string;
  revenueGrowth?: number;
  founded?: number;
  industry?: string;
  subIndustry?: string;
  technologies?: Array<{
    name: string;
    category?: string;
  }>;

  // Funding info
  funding?: {
    totalRaised?: number;
    lastRoundAmount?: number;
    lastRoundDate?: string;
    lastRoundType?: string;
    investors?: string[];
  };

  // Contacts found
  contacts?: Array<{
    id: string;
    name: string;
    title: string;
    email?: string;
    emailVerified?: boolean;
    phone?: string;
    linkedin?: string;
  }>;

  // Metadata
  enrichedAt: string;
  source: string;
  creditsUsed: number;
}

/**
 * Create approval item input
 */
export interface CreateApprovalItemInput {
  customerId: CustomerId;
  agentRunId?: AgentRunId;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  estimatedCredits?: number;
  batchId?: string;
  fitScoreBucket?: FitScoreBucket;
  expiresAt?: Date;
}

/**
 * Command routing result
 */
export interface CommandRoutingResult {
  agentType: AgentType;
  confidence: number;
  input: AgentInput;
}

/**
 * Crawl4AI service response types
 */
export interface Crawl4AIParsePromptResponse {
  criteria: ICPCriteria;
  confidence: number;
  reasoning: string;
}

export interface Crawl4AISearchResult {
  source: string;
  company_name: string;
  domain?: string;
  url?: string;
  snippet?: string;
  industry?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  employee_count_estimate?: string;
  confidence: number;
  raw_data?: Record<string, unknown>;
}

export interface Crawl4AISearchResponse {
  results: Crawl4AISearchResult[];
  total: number;
  sources_used: string[];
  search_queries_used: string[];
}

export interface Crawl4AICrawlResponse {
  company: {
    name?: string;
    domain: string;
    description?: string;
    industry?: string;
    employee_count_estimate?: number;
    location?: {
      city?: string;
      state?: string;
      country?: string;
    };
    technologies: string[];
    social_links?: {
      linkedin?: string;
      twitter?: string;
      github?: string;
    };
    has_careers_page: boolean;
    is_hiring: boolean;
  };
  contacts: Array<{
    name?: string;
    title?: string;
    email?: string;
    linkedin_url?: string;
  }>;
  pages_crawled: number;
  fit_score_estimate: number;
  crawl_time_seconds: number;
}

export interface Crawl4AIScoreResponse {
  scored_leads: Array<{
    lead_id?: string;
    company_name: string;
    domain?: string;
    fit_score: number;
    score_breakdown: {
      industry_match: number;
      size_match: number;
      location_match: number;
      keyword_match: number;
      signal_match: number;
    };
    match_reasons: string[];
    confidence: number;
  }>;
  total_scored: number;
  avg_fit_score: number;
}
