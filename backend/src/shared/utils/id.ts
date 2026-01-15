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

