/**
 * Audit Logging Service
 * 
 * Records significant actions for compliance, security, and debugging.
 */

import { getDb } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';
import { generateId } from '../utils/id.js';
import { createLogger } from '../logger/index.js';
import type { Request } from 'express';
import type { CustomerId, UserId } from '../types/index.js';

const logger = createLogger({ module: 'audit' });

/**
 * Audit action types
 */
export const AUDIT_ACTIONS = {
  // Auth
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  USER_SIGNUP: 'user.signup',
  TOKEN_REFRESH: 'token.refresh',
  
  // API Keys
  API_KEY_CREATE: 'api_key.create',
  API_KEY_DELETE: 'api_key.delete',
  
  // CRM - Accounts
  ACCOUNT_CREATE: 'account.create',
  ACCOUNT_UPDATE: 'account.update',
  ACCOUNT_DELETE: 'account.delete',
  
  // CRM - Contacts
  CONTACT_CREATE: 'contact.create',
  CONTACT_UPDATE: 'contact.update',
  CONTACT_DELETE: 'contact.delete',
  
  // CRM - Opportunities
  OPPORTUNITY_CREATE: 'opportunity.create',
  OPPORTUNITY_UPDATE: 'opportunity.update',
  OPPORTUNITY_DELETE: 'opportunity.delete',
  
  // Email
  EMAIL_SEND: 'email.send',
  EMAIL_OPEN: 'email.open',
  EMAIL_CLICK: 'email.click',
  
  // Meetings
  MEETING_CREATE: 'meeting.create',
  MEETING_CONFIRM: 'meeting.confirm',
  MEETING_CANCEL: 'meeting.cancel',
  MEETING_COMPLETE: 'meeting.complete',
  
  // Sequences
  SEQUENCE_CREATE: 'sequence.create',
  SEQUENCE_ENROLL: 'sequence.enroll',
  
  // Settings
  SETTINGS_UPDATE: 'settings.update',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Parameters for logging an audit event
 */
export interface AuditLogParams {
  customerId: CustomerId;
  userId?: UserId;
  userEmail?: string;
  apiKeyId?: string;
  action: AuditAction | string;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  previousValue?: unknown;
  newValue?: unknown;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  status?: 'success' | 'failure';
  errorMessage?: string;
}

/**
 * Log an audit event
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const db = getDb();
    
    await db.insert(auditLog).values({
      id: generateId('aud'),
      customerId: params.customerId,
      userId: params.userId,
      userEmail: params.userEmail,
      apiKeyId: params.apiKeyId,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      description: params.description,
      previousValue: params.previousValue,
      newValue: params.newValue,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      status: params.status || 'success',
      errorMessage: params.errorMessage,
    });

    logger.debug({
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      customerId: params.customerId,
    }, 'Audit event logged');
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    logger.error({ error, action: params.action }, 'Failed to log audit event');
  }
}

/**
 * Helper to extract common fields from Express request
 */
export function getAuditContext(req: Request): Partial<AuditLogParams> {
  const tenantContext = req.tenantContext;
  
  return {
    customerId: tenantContext?.customerId as CustomerId,
    userId: tenantContext?.userId as UserId,
    userEmail: tenantContext?.userEmail,
    requestId: req.headers['x-request-id'] as string,
    ipAddress: (req.ip || req.headers['x-forwarded-for'] as string)?.split(',')[0],
    userAgent: req.headers['user-agent'],
  };
}

/**
 * Log a CRM mutation with before/after values
 */
export async function logCrmMutation(
  req: Request,
  action: AuditAction,
  resourceType: string,
  resourceId: string,
  previousValue?: unknown,
  newValue?: unknown
): Promise<void> {
  await logAuditEvent({
    ...getAuditContext(req),
    action,
    resourceType,
    resourceId,
    previousValue,
    newValue,
  });
}

/**
 * Log an auth event
 */
export async function logAuthEvent(
  customerId: CustomerId,
  action: AuditAction,
  userId?: UserId,
  userEmail?: string,
  details?: { ipAddress?: string; userAgent?: string; status?: 'success' | 'failure'; errorMessage?: string }
): Promise<void> {
  await logAuditEvent({
    customerId,
    userId,
    userEmail,
    action,
    resourceType: 'user',
    resourceId: userId,
    ...details,
  });
}

