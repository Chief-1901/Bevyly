/**
 * Apify client for Apollo.io enrichment and other actors
 */

import { logger } from '../../../shared/logger/index.js';
import type { EnrichmentData } from '../types.js';

const log = logger.child({ module: 'apify-client' });

const APIFY_BASE_URL = 'https://api.apify.com/v2';

// Apollo actor IDs on Apify
const APOLLO_ACTORS = {
  companyEnrich: 'curious_coder/apollo-io-company-enrichment',
  peopleSearch: 'curious_coder/apollo-io-people-search',
  linkedinCompany: 'apify/linkedin-company-scraper',
};

/**
 * Apify run status
 */
interface ApifyRunStatus {
  id: string;
  status: 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'ABORTING' | 'ABORTED' | 'TIMED-OUT';
  startedAt?: string;
  finishedAt?: string;
}

/**
 * Apollo company enrichment result
 */
interface ApolloCompanyResult {
  name?: string;
  domain?: string;
  founded_year?: number;
  industry?: string;
  sub_industry?: string;
  employee_count?: number;
  employee_count_range?: string;
  annual_revenue?: number;
  annual_revenue_range?: string;
  total_funding?: number;
  latest_funding_round_type?: string;
  latest_funding_round_amount?: number;
  latest_funding_round_date?: string;
  technologies?: Array<{ name: string; category?: string }>;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  keywords?: string[];
}

/**
 * Apollo person/contact result
 */
interface ApolloPersonResult {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: string;
  phone?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  departments?: string[];
  seniority?: string;
}

/**
 * Client for Apify API
 */
export class ApifyClient {
  private apiToken: string;
  private timeout: number;

  constructor(apiToken: string, timeout: number = 120000) {
    this.apiToken = apiToken;
    this.timeout = timeout;
  }

  /**
   * Enrich a company via Apollo.io actor
   */
  async enrichCompany(options: {
    domain?: string;
    companyName?: string;
  }): Promise<EnrichmentData> {
    const { domain, companyName } = options;
    log.info({ domain, companyName }, 'Enriching company via Apollo');

    if (!domain && !companyName) {
      throw new Error('Either domain or companyName is required');
    }

    // Run the Apollo company enrichment actor
    const result = await this.runActor<ApolloCompanyResult[]>(
      APOLLO_ACTORS.companyEnrich,
      {
        queries: domain ? [{ domain }] : [{ name: companyName }],
      }
    );

    if (!result || result.length === 0) {
      log.warn({ domain, companyName }, 'No enrichment data found');
      return {
        enrichedAt: new Date().toISOString(),
        source: 'apollo',
        creditsUsed: 1,
      };
    }

    const company = result[0];

    // Convert to our EnrichmentData format
    const enrichmentData: EnrichmentData = {
      employeeCount: company.employee_count,
      revenue: company.annual_revenue_range,
      founded: company.founded_year,
      industry: company.industry,
      subIndustry: company.sub_industry,
      technologies: company.technologies?.map((t) => ({
        name: t.name,
        category: t.category,
      })),
      funding: company.total_funding
        ? {
            totalRaised: company.total_funding,
            lastRoundAmount: company.latest_funding_round_amount,
            lastRoundDate: company.latest_funding_round_date,
            lastRoundType: company.latest_funding_round_type,
          }
        : undefined,
      enrichedAt: new Date().toISOString(),
      source: 'apollo',
      creditsUsed: 1,
    };

    log.info(
      { domain, employeeCount: enrichmentData.employeeCount },
      'Company enrichment completed'
    );

    return enrichmentData;
  }

  /**
   * Search for people/contacts at a company via Apollo.io
   */
  async searchPeople(options: {
    domain?: string;
    companyName?: string;
    titles?: string[];
    seniorities?: string[];
    departments?: string[];
    limit?: number;
  }): Promise<ApolloPersonResult[]> {
    const { domain, companyName, titles, seniorities, departments, limit = 5 } = options;
    log.info({ domain, titles, limit }, 'Searching people via Apollo');

    const result = await this.runActor<ApolloPersonResult[]>(
      APOLLO_ACTORS.peopleSearch,
      {
        organization_domains: domain ? [domain] : undefined,
        organization_names: companyName ? [companyName] : undefined,
        person_titles: titles,
        person_seniorities: seniorities,
        person_departments: departments,
        per_page: limit,
      }
    );

    log.info({ contactsFound: result?.length || 0 }, 'People search completed');
    return result || [];
  }

  /**
   * Enrich company and find contacts in one call
   */
  async enrichCompanyWithContacts(options: {
    domain?: string;
    companyName?: string;
    contactTitles?: string[];
    contactLimit?: number;
  }): Promise<EnrichmentData> {
    const { domain, companyName, contactTitles, contactLimit = 3 } = options;

    // Enrich company first
    const enrichmentData = await this.enrichCompany({ domain, companyName });

    // Then find contacts
    if (contactTitles && contactTitles.length > 0) {
      const people = await this.searchPeople({
        domain,
        companyName,
        titles: contactTitles,
        limit: contactLimit,
      });

      enrichmentData.contacts = people.map((p) => ({
        id: p.id,
        name: p.name || `${p.first_name || ''} ${p.last_name || ''}`.trim(),
        title: p.title || '',
        email: p.email,
        emailVerified: p.email_status === 'verified',
        phone: p.phone,
        linkedin: p.linkedin_url,
      }));

      // Update credits used
      enrichmentData.creditsUsed += people.length;
    }

    return enrichmentData;
  }

  /**
   * Run an Apify actor and wait for results
   */
  private async runActor<T>(actorId: string, input: Record<string, unknown>): Promise<T> {
    // Start the actor run
    const runResponse = await this.request<{ data: ApifyRunStatus }>(
      `/acts/${encodeURIComponent(actorId)}/runs`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );

    const runId = runResponse.data.id;
    log.info({ actorId, runId }, 'Actor run started');

    // Wait for completion
    const finalStatus = await this.waitForRun(runId);

    if (finalStatus.status !== 'SUCCEEDED') {
      throw new Error(`Actor run failed with status: ${finalStatus.status}`);
    }

    // Get results from default dataset
    const datasetResponse = await this.request<{ items: T }>(
      `/actor-runs/${runId}/dataset/items`,
      { method: 'GET' }
    );

    return datasetResponse.items;
  }

  /**
   * Wait for an actor run to complete
   */
  private async waitForRun(runId: string, maxWaitMs: number = 120000): Promise<ApifyRunStatus> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      const response = await this.request<{ data: ApifyRunStatus }>(
        `/actor-runs/${runId}`,
        { method: 'GET' }
      );

      const status = response.data.status;
      if (['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'].includes(status)) {
        return response.data;
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error('Actor run timed out');
  }

  /**
   * Make a request to Apify API
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${APIFY_BASE_URL}${endpoint}?token=${this.apiToken}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(this.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error({ endpoint, status: response.status, error: errorText }, 'Apify request failed');
      throw new Error(`Apify error: ${response.status} - ${errorText}`);
    }

    return response.json();
  }
}
