/**
 * Base agent interface that all agents must implement
 */

import type { AgentRunId } from '../../../shared/types/index.js';
import type {
  AgentType,
  AgentContext,
  AgentInput,
  AgentOutput,
  AgentProgress,
} from '../types.js';

/**
 * Base interface for all agents
 */
export interface BaseAgent {
  /**
   * Unique identifier for this agent type
   */
  readonly type: AgentType;

  /**
   * Human-readable name
   */
  readonly name: string;

  /**
   * Description of what this agent does
   */
  readonly description: string;

  /**
   * Version of the agent implementation
   */
  readonly version: string;

  /**
   * Whether this agent requires approval before taking action
   */
  readonly requiresApproval: boolean;

  /**
   * Validate that the agent can run with given context and input
   * @returns Validation result with any errors
   */
  validate(
    context: AgentContext,
    input: AgentInput
  ): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Execute the agent
   * @returns Execution result
   */
  execute(context: AgentContext, input: AgentInput): Promise<AgentOutput>;

  /**
   * Cancel a running execution
   */
  cancel(runId: AgentRunId): Promise<void>;

  /**
   * Get progress/status of a run
   */
  getProgress(runId: AgentRunId): Promise<AgentProgress | null>;
}

/**
 * Agent factory function type
 */
export type AgentFactory = () => BaseAgent;
