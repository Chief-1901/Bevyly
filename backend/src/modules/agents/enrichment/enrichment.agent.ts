/**
 * Lead Enrichment Agent
 *
 * Enriches approved leads using Apollo.io via Apify.
 * Updates lead data with firmographics, contacts, and verified emails.
 * Tracks credit usage for billing.
 */

import { eq, and } from 'drizzle-orm';
import { getDb } from '../../../shared/db/client.js';
import { leads, creditUsage } from '../../../shared/db/schema/index.js';
import { config } from '../../../shared/config/index.js';
import { logger } from '../../../shared/logger/index.js';
import {
  generateCreditUsageId,
  type AgentRunId,
  type LeadId,
} from '../../../shared/types/index.js';
import type { BaseAgent } from '../base/agent.interface.js';
import type {
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentProgress,
  EnrichmentData,
} from '../types.js';
import { ApifyClient } from '../providers/apify.client.js';
import { writeToOutbox, createEvent } from '../../events/outbox.js';

const log = logger.child({ module: 'enrichment-agent' });

// Track running enrichments for progress reporting
const runningEnrichments = new Map<
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
 * Lead Enrichment Agent implementation
 */
export class EnrichmentAgent implements BaseAgent {
  readonly type = 'enrichment' as const;
  readonly name = 'Lead Enrichment Agent';
  readonly description = 'Enrich leads with firmographics and contacts via Apollo.io';
  readonly version = '1.0.0';
  readonly requiresApproval = true; // Enrichment requires prior approval

  async validate(
    context: AgentContext,
    input: AgentInput
  ): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Need lead IDs
    const leadIds = input.params?.leadIds as string[];
    if (!leadIds || leadIds.length === 0) {
      errors.push('Lead IDs are required');
    }

    // Check Apify credentials
    const apifyCred = context.credentials.get('apify');
    if (!apifyCred) {
      errors.push('Apify credentials not configured');
    }

    // Check credit limit
    const maxCredits = (input.params?.maxCredits as number) || config.agentEnrichmentMaxCreditsPerRun;
    if (leadIds && leadIds.length > maxCredits) {
      errors.push(`Too many leads (${leadIds.length}). Maximum per run: ${maxCredits}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async execute(context: AgentContext, input: AgentInput): Promise<AgentOutput> {
    const { customerId, userId, runId, credentials } = context;
    const leadIds = input.params?.leadIds as LeadId[];
    const contactTitles = (input.params?.contactTitles as string[]) || [
      'CEO',
      'CTO',
      'VP Engineering',
      'Head of Sales',
      'Director',
    ];
    const contactLimit = (input.params?.contactsPerCompany as number) || 3;

    // Initialize progress tracking
    runningEnrichments.set(runId, {
      status: 'starting',
      progress: 0,
      itemsProcessed: 0,
      itemsTotal: leadIds.length,
      startedAt: new Date(),
      cancelled: false,
    });

    const db = getDb();
    const apifyCred = credentials.get('apify')!;
    const apifyClient = new ApifyClient(apifyCred.apiKey);

    let enriched = 0;
    let failed = 0;
    let totalCreditsUsed = 0;
    const errors: Array<{ leadId: string; error: string }> = [];

    try {
      for (let i = 0; i < leadIds.length; i++) {
        const leadId = leadIds[i];

        // Check for cancellation
        if (this.isCancelled(runId)) {
          return this.cancelledOutput(enriched, totalCreditsUsed);
        }

        // Update progress
        this.updateProgress(runId, `enriching_lead_${i + 1}`, i, leadIds.length);

        try {
          // Get lead details
          const [lead] = await db
            .select()
            .from(leads)
            .where(and(eq(leads.id, leadId), eq(leads.customerId, customerId)))
            .limit(1);

          if (!lead) {
            errors.push({ leadId, error: 'Lead not found' });
            failed++;
            continue;
          }

          // Update lead status to enriching
          await db
            .update(leads)
            .set({ enrichmentStatus: 'enriching', updatedAt: new Date() })
            .where(eq(leads.id, leadId));

          // Enrich via Apollo/Apify
          log.info({ runId, leadId, domain: lead.domain }, 'Enriching lead');

          const enrichmentData = await apifyClient.enrichCompanyWithContacts({
            domain: lead.domain || undefined,
            companyName: lead.companyName,
            contactTitles,
            contactLimit,
          });

          // Calculate new fit score
          const newFitScore = this.calculateEnrichedFitScore(lead.fitScore || 50, enrichmentData);

          // Update lead with enrichment data
          await db
            .update(leads)
            .set({
              employeeCount: enrichmentData.employeeCount || lead.employeeCount,
              revenue: enrichmentData.revenue || lead.revenue,
              industry: enrichmentData.industry || lead.industry,
              // Update primary contact if found
              contactFirstName: enrichmentData.contacts?.[0]?.name?.split(' ')[0] || lead.contactFirstName,
              contactLastName:
                enrichmentData.contacts?.[0]?.name?.split(' ').slice(1).join(' ') ||
                lead.contactLastName,
              contactEmail: enrichmentData.contacts?.[0]?.email || lead.contactEmail,
              contactTitle: enrichmentData.contacts?.[0]?.title || lead.contactTitle,
              contactPhone: enrichmentData.contacts?.[0]?.phone || lead.contactPhone,
              fitScore: newFitScore,
              enrichmentStatus: 'enriched',
              enrichedAt: new Date(),
              enrichmentData: {
                ...enrichmentData,
                allContacts: enrichmentData.contacts,
              },
              updatedAt: new Date(),
            })
            .where(eq(leads.id, leadId));

          // Record credit usage
          await this.recordCreditUsage(
            customerId,
            runId,
            'apify',
            'enrichment',
            enrichmentData.creditsUsed,
            leadId,
            true
          );

          totalCreditsUsed += enrichmentData.creditsUsed;
          enriched++;

          log.info(
            {
              runId,
              leadId,
              newFitScore,
              contactsFound: enrichmentData.contacts?.length || 0,
              creditsUsed: enrichmentData.creditsUsed,
            },
            'Lead enriched successfully'
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({ leadId, error: errorMessage });
          failed++;

          // Update lead status to failed
          await db
            .update(leads)
            .set({ enrichmentStatus: 'failed', updatedAt: new Date() })
            .where(eq(leads.id, leadId));

          // Record failed credit usage (0 credits but log the attempt)
          await this.recordCreditUsage(
            customerId,
            runId,
            'apify',
            'enrichment',
            0,
            leadId,
            false,
            errorMessage
          );

          log.error({ runId, leadId, error: errorMessage }, 'Lead enrichment failed');
        }

        // Update progress
        runningEnrichments.get(runId)!.itemsProcessed = i + 1;
      }

      // Done
      this.updateProgress(runId, 'completed', leadIds.length, leadIds.length);
      runningEnrichments.delete(runId);

      // Publish completion event
      await writeToOutbox(
        createEvent('agent.enrichment.completed', 'agent_run', runId, customerId, {
          runId,
          leadsEnriched: enriched,
          leadsFailed: failed,
          creditsUsed: totalCreditsUsed,
          userId,
        })
      );

      return {
        status: failed === leadIds.length ? 'failed' : 'completed',
        summary: {
          requested: leadIds.length,
          enriched,
          failed,
          creditsUsed: totalCreditsUsed,
          errors: errors.length > 0 ? errors : undefined,
        },
        leadsEnriched: enriched,
        creditsUsed: totalCreditsUsed,
        error: failed > 0 ? `${failed} leads failed to enrich` : undefined,
      };
    } catch (error) {
      runningEnrichments.delete(runId);
      throw error;
    }
  }

  async cancel(runId: AgentRunId): Promise<void> {
    const progress = runningEnrichments.get(runId);
    if (progress) {
      progress.cancelled = true;
    }
  }

  async getProgress(runId: AgentRunId): Promise<AgentProgress | null> {
    const progress = runningEnrichments.get(runId);
    if (!progress) return null;

    return {
      runId,
      status: progress.cancelled ? 'cancelled' : 'running',
      progress: Math.round((progress.itemsProcessed / progress.itemsTotal) * 100),
      currentStep: progress.status,
      itemsProcessed: progress.itemsProcessed,
      itemsTotal: progress.itemsTotal,
      startedAt: progress.startedAt,
    };
  }

  private updateProgress(
    runId: AgentRunId,
    status: string,
    processed: number,
    total: number
  ): void {
    const current = runningEnrichments.get(runId);
    if (current) {
      current.status = status;
      current.progress = Math.round((processed / total) * 100);
      current.itemsProcessed = processed;
    }
  }

  private isCancelled(runId: AgentRunId): boolean {
    return runningEnrichments.get(runId)?.cancelled || false;
  }

  private cancelledOutput(enriched: number, creditsUsed: number): AgentOutput {
    return {
      status: 'cancelled',
      summary: { reason: 'Cancelled by user', enrichedBeforeCancel: enriched },
      leadsEnriched: enriched,
      creditsUsed,
    };
  }

  private calculateEnrichedFitScore(baseFitScore: number, enrichmentData: EnrichmentData): number {
    let bonus = 0;

    // Verified contact email
    if (enrichmentData.contacts?.some((c) => c.emailVerified)) {
      bonus += 10;
    } else if (enrichmentData.contacts?.some((c) => c.email)) {
      bonus += 5;
    }

    // Direct dial phone
    if (enrichmentData.contacts?.some((c) => c.phone)) {
      bonus += 5;
    }

    // Recent funding
    if (enrichmentData.funding?.lastRoundDate) {
      const fundingDate = new Date(enrichmentData.funding.lastRoundDate);
      const monthsAgo = (Date.now() - fundingDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      if (monthsAgo < 12) {
        bonus += 10;
      } else if (monthsAgo < 24) {
        bonus += 5;
      }
    }

    // Technology stack data
    if (enrichmentData.technologies && enrichmentData.technologies.length > 3) {
      bonus += 5;
    }

    // Employee count data
    if (enrichmentData.employeeCount) {
      bonus += 5;
    }

    return Math.min(95, baseFitScore + bonus);
  }

  private async recordCreditUsage(
    customerId: string,
    agentRunId: string,
    provider: string,
    operation: string,
    creditsUsed: number,
    entityId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    const db = getDb();

    await db.insert(creditUsage).values({
      id: generateCreditUsageId(),
      customerId,
      agentRunId,
      provider,
      operation,
      creditsUsed,
      entityId,
      success,
      errorMessage,
      createdAt: new Date(),
    });
  }
}

// Factory function for registry
export const createEnrichmentAgent = (): EnrichmentAgent => new EnrichmentAgent();
