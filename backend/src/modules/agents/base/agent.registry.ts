/**
 * Agent registry for managing agent implementations
 */

import { logger } from '../../../shared/logger/index.js';
import type { AgentType } from '../types.js';
import type { BaseAgent, AgentFactory } from './agent.interface.js';

const log = logger.child({ module: 'agent-registry' });

/**
 * Registry of available agents
 */
class AgentRegistry {
  private agents: Map<AgentType, AgentFactory> = new Map();

  /**
   * Register an agent factory
   */
  register(type: AgentType, factory: AgentFactory): void {
    if (this.agents.has(type)) {
      log.warn({ agentType: type }, 'Overwriting existing agent registration');
    }
    this.agents.set(type, factory);
    log.info({ agentType: type }, 'Agent registered');
  }

  /**
   * Get an agent instance by type
   */
  get(type: AgentType): BaseAgent | undefined {
    const factory = this.agents.get(type);
    if (!factory) {
      log.warn({ agentType: type }, 'Agent type not found');
      return undefined;
    }
    return factory();
  }

  /**
   * Check if an agent type is registered
   */
  has(type: AgentType): boolean {
    return this.agents.has(type);
  }

  /**
   * Get all registered agent types
   */
  getTypes(): AgentType[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get info about all registered agents
   */
  getAgentInfo(): Array<{
    type: AgentType;
    name: string;
    description: string;
    version: string;
    requiresApproval: boolean;
  }> {
    return Array.from(this.agents.entries()).map(([type, factory]) => {
      const agent = factory();
      return {
        type,
        name: agent.name,
        description: agent.description,
        version: agent.version,
        requiresApproval: agent.requiresApproval,
      };
    });
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry();
