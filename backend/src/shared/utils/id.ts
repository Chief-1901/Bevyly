import { nanoid } from 'nanoid';
import type {
  CustomerId,
  UserId,
  AccountId,
  ContactId,
  OpportunityId,
  EmailId,
  MeetingId,
  SequenceId,
  ApiKeyId,
  LeadId,
  SignalId,
  PatternId,
  RecommendationId,
  AgentConfigId,
  AgentRunId,
  ApprovalQueueItemId,
  IntegrationCredentialId,
  CreditUsageId,
  UserSettingsId,
} from '../types/index.js';

/**
 * Generate a unique ID with optional prefix
 * Default length is 21 characters (nanoid default, ~70 years of collision-free IDs at 1000 IDs/sec)
 */
export function generateId(prefix?: string, length = 21): string {
  const id = nanoid(length);
  return prefix ? `${prefix}_${id}` : id;
}

// Entity-specific ID generators with proper typing
export const generateCustomerId = (): CustomerId => generateId('cus') as CustomerId;
export const generateUserId = (): UserId => generateId('usr') as UserId;
export const generateAccountId = (): AccountId => generateId('acc') as AccountId;
export const generateContactId = (): ContactId => generateId('con') as ContactId;
export const generateOpportunityId = (): OpportunityId => generateId('opp') as OpportunityId;
export const generateEmailId = (): EmailId => generateId('eml') as EmailId;
export const generateMeetingId = (): MeetingId => generateId('mtg') as MeetingId;
export const generateSequenceId = (): SequenceId => generateId('seq') as SequenceId;
export const generateApiKeyId = (): ApiKeyId => generateId('key') as ApiKeyId;

// Intent-Driven Sales OS ID generators
export const generateLeadId = (): LeadId => generateId('lead') as LeadId;
export const generateSignalId = (): SignalId => generateId('sig') as SignalId;
export const generatePatternId = (): PatternId => generateId('pat') as PatternId;
export const generateRecommendationId = (): RecommendationId => generateId('rec') as RecommendationId;
export const generateFeedbackId = (): string => generateId('rfb');

// Agent Infrastructure ID generators
export const generateAgentConfigId = (): AgentConfigId => generateId('agcfg') as AgentConfigId;
export const generateAgentRunId = (): AgentRunId => generateId('run') as AgentRunId;
export const generateApprovalItemId = (): ApprovalQueueItemId => generateId('apq') as ApprovalQueueItemId;
export const generateIntegrationCredentialId = (): IntegrationCredentialId => generateId('icred') as IntegrationCredentialId;
export const generateCreditUsageId = (): CreditUsageId => generateId('cru') as CreditUsageId;
export const generateUserSettingsId = (): UserSettingsId => generateId('uset') as UserSettingsId;
export const generateBatchId = (): string => generateId('batch');

/**
 * Generate a request ID for tracing
 */
export function generateRequestId(): string {
  return generateId('req');
}

/**
 * Generate an idempotency key
 */
export function generateIdempotencyKey(): string {
  return generateId('idem');
}

/**
 * Generate a tracking pixel ID for email opens
 */
export function generateTrackingPixelId(): string {
  return generateId('px');
}

/**
 * Generate a click tracking ID
 */
export function generateClickTrackingId(): string {
  return generateId('clk');
}

/**
 * Generate an API key (longer for security)
 */
export function generateApiKeySecret(): string {
  return nanoid(32);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(): string {
  return nanoid(64);
}

