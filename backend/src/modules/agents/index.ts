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

// Re-export commonly used items
export { agentRegistry } from './base/agent.registry.js';
export { startAgentRun, getAgentRun, listAgentRuns, cancelAgentRun } from './base/agent-run.service.js';
export { crawl4aiClient } from './providers/crawl4ai.client.js';
