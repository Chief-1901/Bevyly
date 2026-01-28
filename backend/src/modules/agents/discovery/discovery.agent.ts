/**
 * Lead Discovery Agent
 *
 * Discovers leads from free sources using Crawl4AI and public APIs.
 * Stores discovered leads in the leads table with source='discovery'.
 * Creates approval queue items for enrichment review.
 */

import { config } from '../../../shared/config/index.js';
import { logger } from '../../../shared/logger/index.js';
import type { AgentRunId } from '../../../shared/types/index.js';
import type { BaseAgent } from '../base/agent.interface.js';
import type {
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentProgress,
  ICPCriteria,
  DiscoveredLeadData,
  FitScoreBucket,
} from '../types.js';
import { crawl4aiClient, Crawl4AIClient } from '../providers/crawl4ai.client.js';
import { bulkCreateLeads } from '../../leads/service.js';
import { createApprovalItem } from '../approval/approval.service.js';
import { generateBatchId } from '../../../shared/utils/id.js';

const log = logger.child({ module: 'discovery-agent' });

// Track running discoveries for progress reporting
const runningDiscoveries = new Map<
  string,
  {
    status: string;
    progress: number;
    itemsProcessed: number;
    itemsTotal: number;
    startedAt: Date;
    cancelled: boolean;
  }
>();

/**
 * Lead Discovery Agent implementation
 */
export class DiscoveryAgent implements BaseAgent {
  readonly type = 'discovery' as const;
  readonly name = 'Lead Discovery Agent';
  readonly description = 'Discover leads from free sources based on ICP criteria';
  readonly version = '1.0.0';
  readonly requiresApproval = false; // Discovery itself doesn't need approval

  private crawl4ai: Crawl4AIClient;

  constructor() {
    this.crawl4ai = crawl4aiClient;
  }

  async validate(
    context: AgentContext,
    input: AgentInput
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Need either a prompt or criteria
    if (!input.prompt && !input.criteria) {
      errors.push('Either prompt or criteria is required');
    }

    // Check if Crawl4AI service is available
    const isHealthy = await this.crawl4ai.checkHealth();
    if (!isHealthy) {
      errors.push('Crawl4AI service is not available');
    }

    return { valid: errors.length === 0, errors };
  }

  async execute(context: AgentContext, input: AgentInput): Promise<AgentOutput> {
    const { customerId, userId, runId } = context;
    const maxResults = (input.params?.maxResults as number) || config.agentDiscoveryMaxResults;

    // Initialize progress tracking
    runningDiscoveries.set(runId, {
      status: 'parsing_prompt',
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: 0,
      startedAt: new Date(),
      cancelled: false,
    });

    try {
      // Step 1: Parse prompt into ICP criteria
      let criteria = input.criteria;
      if (input.prompt && !criteria) {
        log.info({ runId }, 'Parsing user prompt');
        this.updateProgress(runId, 'parsing_prompt', 5);

        const parsed = await this.crawl4ai.parsePrompt(input.prompt);
        criteria = parsed.criteria;

        log.info(
          { runId, industries: criteria.industries, locations: criteria.locations?.length },
          'Prompt parsed successfully'
        );
      }

      if (!criteria) {
        throw new Error('No criteria available for search');
      }

      // Check for cancellation
      if (this.isCancelled(runId)) {
        return this.cancelledOutput();
      }

      // Step 2: Search across sources
      log.info({ runId }, 'Searching for companies');
      this.updateProgress(runId, 'searching', 15);

      // Get Google API credentials if available
      const googleCreds = context.credentials.get('google_search');
      const searchCredentials = googleCreds
        ? {
            google_api_key: googleCreds.apiKey,
            google_cx: googleCreds.config?.searchEngineId as string,
            google_maps_api_key: context.credentials.get('google_maps')?.apiKey,
          }
        : undefined;

      const searchResponse = await this.crawl4ai.search(
        criteria,
        searchCredentials,
        maxResults,
        ['google_search', 'google_maps']
      );

      log.info(
        { runId, resultsFound: searchResponse.total },
        'Search completed'
      );

      // Check for cancellation
      if (this.isCancelled(runId)) {
        return this.cancelledOutput();
      }

      // Step 3: Convert search results to lead data
      this.updateProgress(runId, 'processing_results', 40);
      let discoveredLeads = Crawl4AIClient.convertSearchResults(
        searchResponse.results,
        criteria
      );

      // Step 4: Deep crawl top results for more data
      log.info({ runId }, 'Deep crawling top results');
      this.updateProgress(runId, 'deep_crawling', 50);

      const topResults = discoveredLeads.slice(0, 10).filter((l) => l.url);
      let crawlIndex = 0;

      for (const lead of topResults) {
        if (this.isCancelled(runId)) {
          return this.cancelledOutput();
        }

        if (lead.url) {
          try {
            const crawlResult = await this.crawl4ai.crawlWebsite(lead.url, {
              extractContacts: true,
              maxPages: 5,
            });

            // Merge crawl data into lead
            if (crawlResult.company.industry) {
              lead.industry = crawlResult.company.industry;
            }
            if (crawlResult.company.location) {
              lead.location = crawlResult.company.location;
            }
            if (crawlResult.company.technologies?.length) {
              lead.technologies = crawlResult.company.technologies;
            }
            if (crawlResult.contacts?.length) {
              lead.contacts = crawlResult.contacts.map((c) => ({
                name: c.name,
                title: c.title,
                email: c.email,
                linkedin: c.linkedin_url,
              }));
            }
            if (crawlResult.company.is_hiring) {
              lead.signals = lead.signals || [];
              lead.signals.push({
                type: 'hiring',
                description: 'Company is actively hiring',
                source: 'careers_page',
              });
            }

            // Update fit score from crawl
            lead.fitScore = Math.max(lead.fitScore, crawlResult.fit_score_estimate);
          } catch (error) {
            log.warn({ runId, url: lead.url, error }, 'Deep crawl failed for lead');
          }
        }

        crawlIndex++;
        this.updateProgress(
          runId,
          'deep_crawling',
          50 + Math.round((crawlIndex / topResults.length) * 20)
        );
      }

      // Check for cancellation
      if (this.isCancelled(runId)) {
        return this.cancelledOutput();
      }

      // Step 5: Score leads against ICP
      log.info({ runId }, 'Scoring leads');
      this.updateProgress(runId, 'scoring', 75);

      const leadsForScoring = discoveredLeads.map((l) => ({
        id: undefined,
        company_name: l.companyName,
        domain: l.domain,
        industry: l.industry,
        location: l.location,
        employee_count_estimate: l.employeeCountEstimate,
        description: l.description,
        technologies: l.technologies,
        signals: l.signals?.map((s) => s.type),
      }));

      const scoringResponse = await this.crawl4ai.scoreLeads(leadsForScoring, criteria);

      // Update lead fit scores from scoring response
      for (let i = 0; i < discoveredLeads.length; i++) {
        const scoredLead = scoringResponse.scored_leads.find(
          (s) => s.company_name === discoveredLeads[i].companyName
        );
        if (scoredLead) {
          discoveredLeads[i].fitScore = scoredLead.fit_score;
          discoveredLeads[i].matchReasons = scoredLead.match_reasons;
        }
      }

      // Filter by minimum fit score
      const minFitScore = (input.params?.minFitScore as number) || 40;
      discoveredLeads = discoveredLeads.filter((l) => l.fitScore >= minFitScore);

      // Deduplicate by domain
      const seenDomains = new Set<string>();
      discoveredLeads = discoveredLeads.filter((l) => {
        const key = l.domain || l.companyName.toLowerCase();
        if (seenDomains.has(key)) return false;
        seenDomains.add(key);
        return true;
      });

      log.info({ runId, qualifiedLeads: discoveredLeads.length }, 'Scoring completed');

      // Check for cancellation
      if (this.isCancelled(runId)) {
        return this.cancelledOutput();
      }

      // Step 6: Create leads in database
      log.info({ runId }, 'Creating leads');
      this.updateProgress(runId, 'creating_leads', 85);

      const leadInputs = discoveredLeads.map((lead) => ({
        companyName: lead.companyName,
        domain: lead.domain,
        industry: lead.industry,
        employeeCount: lead.employeeCountEstimate,
        city: lead.location?.city,
        state: lead.location?.state,
        country: lead.location?.country,
        contactFirstName: lead.contacts?.[0]?.name?.split(' ')[0],
        contactLastName: lead.contacts?.[0]?.name?.split(' ').slice(1).join(' '),
        contactEmail: lead.contacts?.[0]?.email,
        contactTitle: lead.contacts?.[0]?.title,
        source: 'discovery' as const,
        generationJobId: runId,
        sourceUrl: lead.sourceUrl,
        fitScore: lead.fitScore,
        customFields: {
          discoveryData: {
            technologies: lead.technologies,
            signals: lead.signals,
            matchReasons: lead.matchReasons,
            rawSource: lead.source,
          },
          criteria,
        },
      }));

      const { created, errors: createErrors } = await bulkCreateLeads(customerId, leadInputs);

      log.info(
        { runId, created: created.length, errors: createErrors.length },
        'Leads created'
      );

      // Step 7: Create approval queue items for enrichment
      log.info({ runId }, 'Creating approval queue items');
      this.updateProgress(runId, 'creating_approvals', 95);

      const batchId = generateBatchId();
      const approvalItemIds: string[] = [];

      // Group leads by fit score bucket
      const buckets: Record<FitScoreBucket, typeof created> = {
        high: created.filter((l) => (l.fitScore || 0) >= 70),
        medium: created.filter((l) => (l.fitScore || 0) >= 50 && (l.fitScore || 0) < 70),
        low: created.filter((l) => (l.fitScore || 0) < 50),
      };

      for (const [bucket, bucketLeads] of Object.entries(buckets)) {
        for (const lead of bucketLeads) {
          const itemId = await createApprovalItem({
            customerId,
            agentRunId: runId,
            entityType: 'lead',
            entityId: lead.id,
            title: `Enrich: ${lead.companyName}`,
            description: `${lead.industry || 'Unknown industry'} • ${lead.city || 'Unknown location'}`,
            metadata: {
              domain: lead.domain,
              fitScore: lead.fitScore,
              source: lead.sourceUrl,
            },
            estimatedCredits: 1,
            batchId,
            fitScoreBucket: bucket as FitScoreBucket,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          });
          approvalItemIds.push(itemId);
        }
      }

      // Done
      this.updateProgress(runId, 'completed', 100);
      runningDiscoveries.delete(runId);

      return {
        status: 'completed',
        summary: {
          searchResults: searchResponse.total,
          deepCrawled: topResults.length,
          qualified: discoveredLeads.length,
          created: created.length,
          createErrors: createErrors.length,
          byBucket: {
            high: buckets.high.length,
            medium: buckets.medium.length,
            low: buckets.low.length,
          },
          avgFitScore: scoringResponse.avg_fit_score,
          prompt: input.prompt,
          criteria,
        },
        leadsDiscovered: created.length,
        creditsUsed: 0, // Free sources
        approvalItemIds,
      };
    } catch (error) {
      runningDiscoveries.delete(runId);
      throw error;
    }
  }

  async cancel(runId: AgentRunId): Promise<void> {
    const progress = runningDiscoveries.get(runId);
    if (progress) {
      progress.cancelled = true;
    }
  }

  async getProgress(runId: AgentRunId): Promise<AgentProgress | null> {
    const progress = runningDiscoveries.get(runId);
    if (!progress) return null;

    return {
      runId,
      status: progress.cancelled ? 'cancelled' : 'running',
      progress: progress.progress,
      currentStep: progress.status,
      itemsProcessed: progress.itemsProcessed,
      itemsTotal: progress.itemsTotal,
      startedAt: progress.startedAt,
    };
  }

  private updateProgress(runId: AgentRunId, status: string, progress: number): void {
    const current = runningDiscoveries.get(runId);
    if (current) {
      current.status = status;
      current.progress = progress;
    }
  }

  private isCancelled(runId: AgentRunId): boolean {
    return runningDiscoveries.get(runId)?.cancelled || false;
  }

  private cancelledOutput(): AgentOutput {
    return {
      status: 'cancelled',
      summary: { reason: 'Cancelled by user' },
      leadsDiscovered: 0,
      creditsUsed: 0,
    };
  }
}

// Factory function for registry
export const createDiscoveryAgent = (): DiscoveryAgent => new DiscoveryAgent();
