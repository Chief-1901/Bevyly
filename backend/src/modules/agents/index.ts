/**
 * Agents module - AI-powered lead discovery and enrichment
 *
 * This module provides:
 * - Discovery Agent: Find leads from free sources (Google, crawling, etc.)
 * - Enrichment Agent: Enrich leads with Apollo.io via Apify
 * - Approval Queue: Human-in-the-loop for enrichment decisions
 * - Agent orchestration and run management
 */

// Types
export * from './types.js';

// Base infrastructure
export * from './base/index.js';

// Providers
export * from './providers/index.js';

// Discovery Agent
export * from './discovery/index.js';

// Approval Queue
export * from './approval/index.js';

// Enrichment Agent
export * from './enrichment/index.js';

// Re-export commonly used items
export { agentRegistry } from './base/agent.registry.js';
export { startAgentRun, getAgentRun, listAgentRuns, cancelAgentRun } from './base/agent-run.service.js';
export { crawl4aiClient } from './providers/crawl4ai.client.js';

// Agent factories
export { createDiscoveryAgent } from './discovery/discovery.agent.js';
export { createEnrichmentAgent } from './enrichment/enrichment.agent.js';

// Routes
export { agentRoutes } from './routes.js';

// Credentials
export { getIntegrationCredentials, hasCredential, getCredential } from './credentials.service.js';

/**
 * Initialize agents module - registers all agents
 */
export function initializeAgents(): void {
  // Import and register agents
  const { DiscoveryAgent } = require('./discovery/discovery.agent.js');
  const { EnrichmentAgent } = require('./enrichment/enrichment.agent.js');

  agentRegistry.register('discovery', () => new DiscoveryAgent());
  agentRegistry.register('enrichment', () => new EnrichmentAgent());
}
