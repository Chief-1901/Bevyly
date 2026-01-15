/**
 * Common types used across modules
 */

/**
 * Branded type helper for type-safe IDs
 */
export type Brand<T, B> = T & { readonly __brand: B };

// Entity ID types (branded strings for type safety)
export type CustomerId = Brand<string, 'CustomerId'>;
export type UserId = Brand<string, 'UserId'>;
export type AccountId = Brand<string, 'AccountId'>;
export type ContactId = Brand<string, 'ContactId'>;
export type OpportunityId = Brand<string, 'OpportunityId'>;
export type EmailId = Brand<string, 'EmailId'>;
export type MeetingId = Brand<string, 'MeetingId'>;
export type SequenceId = Brand<string, 'SequenceId'>;
export type ApiKeyId = Brand<string, 'ApiKeyId'>;

/**
 * Tenant context - attached to every request
 */
export interface TenantContext {
  customerId: CustomerId;
  userId: UserId;
  userEmail: string;
  roles: string[];
}

/**
 * Request context - includes tenant + request metadata
 */
export interface RequestContext extends TenantContext {
  requestId: string;
  idempotencyKey?: string;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Cursor-paginated response wrapper
 */
export interface CursorPaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Error response envelope
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
  };
}

/**
 * Activity types for unified timeline
 */
export type ActivityType = 'email' | 'meeting' | 'call' | 'note' | 'task' | 'sequence_step';

/**
 * Email status
 */
export type EmailStatus = 'draft' | 'queued' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'replied' | 'bounced' | 'failed';

/**
 * Meeting status
 */
export type MeetingStatus = 'proposed' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

/**
 * Sequence enrollment status
 */
export type SequenceEnrollmentStatus = 'active' | 'paused' | 'completed' | 'replied' | 'bounced' | 'unsubscribed';

/**
 * Opportunity stage
 */
export type OpportunityStage = 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';

