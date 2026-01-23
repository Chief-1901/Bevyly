/**
 * Client for communicating with the Crawl4AI Python microservice
 */

import { config } from '../../../shared/config/index.js';
import { logger } from '../../../shared/logger/index.js';
import type {
  ICPCriteria,
  Crawl4AIParsePromptResponse,
  Crawl4AISearchResponse,
  Crawl4AICrawlResponse,
  Crawl4AIScoreResponse,
  DiscoveredLeadData,
} from '../types.js';

const log = logger.child({ module: 'crawl4ai-client' });

// Default URL for Crawl4AI service
const CRAWL4AI_URL = config.crawl4aiUrl || 'http://localhost:8001';

/**
 * Search credentials for Crawl4AI
 */
export interface SearchCredentials {
  google_api_key?: string;
  google_cx?: string;
  google_maps_api_key?: string;
}

/**
 * Crawl4AI client for the Python microservice
 */
export class Crawl4AIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string = CRAWL4AI_URL, timeout: number = 60000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Parse a natural language prompt into ICP criteria
   */
  async parsePrompt(
    prompt: string,
    context?: Record<string, unknown>
  ): Promise<Crawl4AIParsePromptResponse> {
    log.info({ promptLength: prompt.length }, 'Parsing prompt via Crawl4AI');

    const response = await this.request<Crawl4AIParsePromptResponse>(
      '/api/v1/discover/parse-prompt',
      {
        method: 'POST',
        body: JSON.stringify({ prompt, context }),
      }
    );

    log.info(
      { industries: response.criteria.industries?.length || 0 },
      'Prompt parsed successfully'
    );

    return response;
  }

  /**
   * Search for companies across multiple sources
   */
  async search(
    criteria: ICPCriteria,
    credentials?: SearchCredentials,
    maxResults: number = 50,
    sources: string[] = ['google_search', 'google_maps']
  ): Promise<Crawl4AISearchResponse> {
    log.info({ sources, maxResults }, 'Searching via Crawl4AI');

    const response = await this.request<Crawl4AISearchResponse>(
      '/api/v1/discover/search',
      {
        method: 'POST',
        body: JSON.stringify({
          criteria,
          sources,
          credentials,
          max_results: maxResults,
        }),
      }
    );

    log.info(
      { resultsFound: response.total, sourcesUsed: response.sources_used },
      'Search completed'
    );

    return response;
  }

  /**
   * Deep crawl a website
   */
  async crawlWebsite(
    url: string,
    options?: {
      extractContacts?: boolean;
      maxPages?: number;
      includeAbout?: boolean;
      includeCareers?: boolean;
    }
  ): Promise<Crawl4AICrawlResponse> {
    log.info({ url, maxPages: options?.maxPages }, 'Crawling website via Crawl4AI');

    const response = await this.request<Crawl4AICrawlResponse>(
      '/api/v1/discover/crawl',
      {
        method: 'POST',
        body: JSON.stringify({
          url,
          extract_contacts: options?.extractContacts ?? true,
          max_pages: options?.maxPages ?? 10,
          include_about: options?.includeAbout ?? true,
          include_careers: options?.includeCareers ?? true,
        }),
      }
    );

    log.info(
      {
        pagesCrawled: response.pages_crawled,
        contactsFound: response.contacts.length,
        fitScore: response.fit_score_estimate,
      },
      'Crawl completed'
    );

    return response;
  }

  /**
   * Score leads against ICP criteria
   */
  async scoreLeads(
    leads: Array<{
      id?: string;
      company_name: string;
      domain?: string;
      industry?: string;
      location?: { city?: string; state?: string; country?: string };
      employee_count_estimate?: number;
      description?: string;
      technologies?: string[];
      signals?: string[];
    }>,
    criteria: ICPCriteria
  ): Promise<Crawl4AIScoreResponse> {
    log.info({ numLeads: leads.length }, 'Scoring leads via Crawl4AI');

    const response = await this.request<Crawl4AIScoreResponse>(
      '/api/v1/discover/score',
      {
        method: 'POST',
        body: JSON.stringify({ leads, criteria }),
      }
    );

    log.info(
      { avgFitScore: response.avg_fit_score },
      'Scoring completed'
    );

    return response;
  }

  /**
   * Check health of Crawl4AI service
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      log.warn({ error }, 'Crawl4AI health check failed');
      return false;
    }
  }

  /**
   * Convert search results to DiscoveredLeadData format
   */
  static convertSearchResults(
    results: Crawl4AISearchResponse['results'],
    criteria: ICPCriteria
  ): DiscoveredLeadData[] {
    return results.map((result) => ({
      companyName: result.company_name,
      domain: result.domain,
      url: result.url,
      industry: result.industry,
      description: result.snippet,
      location: result.location,
      employeeCountEstimate: result.employee_count_estimate
        ? parseInt(result.employee_count_estimate.split('-')[0], 10)
        : undefined,
      source: result.source,
      sourceUrl: result.url,
      fitScore: Math.round(result.confidence * 60) + 30, // Convert 0-1 to 30-90 range
      rawData: result.raw_data,
    }));
  }

  /**
   * Convert crawl result to DiscoveredLeadData format
   */
  static convertCrawlResult(
    crawl: Crawl4AICrawlResponse,
    sourceUrl: string
  ): DiscoveredLeadData {
    const signals: DiscoveredLeadData['signals'] = [];
    if (crawl.company.is_hiring) {
      signals.push({ type: 'hiring', description: 'Company is hiring', source: 'careers_page' });
    }

    return {
      companyName: crawl.company.name || crawl.company.domain,
      domain: crawl.company.domain,
      url: sourceUrl,
      industry: crawl.company.industry,
      description: crawl.company.description,
      location: crawl.company.location,
      employeeCountEstimate: crawl.company.employee_count_estimate,
      technologies: crawl.company.technologies,
      signals,
      contacts: crawl.contacts.map((c) => ({
        name: c.name,
        title: c.title,
        email: c.email,
        linkedin: c.linkedin_url,
      })),
      source: 'website_crawl',
      sourceUrl,
      fitScore: crawl.fit_score_estimate,
    };
  }

  /**
   * Make a request to the Crawl4AI service
   */
  private async request<T>(endpoint: string, options: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
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
        log.error(
          { endpoint, status: response.status, error: errorText },
          'Crawl4AI request failed'
        );
        throw new Error(`Crawl4AI error: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        log.error({ endpoint }, 'Crawl4AI request timed out');
        throw new Error('Crawl4AI request timed out');
      }
      throw error;
    }
  }
}

// Singleton instance
export const crawl4aiClient = new Crawl4AIClient();
