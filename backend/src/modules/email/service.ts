import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { emails, emailClicks } from '../../shared/db/schema/emails.js';
import { generateEmailId, generateTrackingPixelId, generateId } from '../../shared/utils/id.js';
import { getEmailProviderForTenant } from './providers/index.js';
import { addTrackingToEmail } from './tracking.js';
import { writeToOutbox, createEvent } from '../events/outbox.js';
import { EventTypes, AggregateTypes } from '../events/types.js';
import { NotFoundError, BadRequestError } from '../../shared/errors/index.js';
import { logger } from '../../shared/logger/index.js';
import type { CustomerId, UserId, EmailId, ContactId, PaginatedResponse, EmailStatus } from '../../shared/types/index.js';
import type { Email } from '../../shared/db/schema/emails.js';

const emailLogger = logger.child({ module: 'email-service' });

// Base URL for tracking - should be configurable
const TRACKING_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

export interface SendEmailInput {
  toEmail: string;
  toName?: string;
  contactId?: string;
  accountId?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  ccEmails?: string[];
  bccEmails?: string[];
  scheduledAt?: Date;
  sequenceId?: string;
  sequenceStepNumber?: number;
  idempotencyKey?: string;
}

export interface DraftEmailInput {
  toEmail: string;
  toName?: string;
  contactId?: string;
  accountId?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface ListEmailsOptions {
  page?: number;
  limit?: number;
  contactId?: string;
  accountId?: string;
  status?: EmailStatus;
  sequenceId?: string;
}

/**
 * Create a draft email
 */
export async function createDraft(
  customerId: CustomerId,
  senderId: UserId,
  senderEmail: string,
  senderName: string | undefined,
  input: DraftEmailInput
): Promise<Email> {
  const db = getDb();
  const id = generateEmailId();

  const [email] = await db
    .insert(emails)
    .values({
      id,
      customerId,
      senderId,
      fromEmail: senderEmail,
      fromName: senderName || null,
      toEmail: input.toEmail,
      toName: input.toName || null,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      subject: input.subject,
      bodyHtml: input.bodyHtml || null,
      bodyText: input.bodyText || null,
      status: 'draft',
    })
    .returning();

  emailLogger.debug({ emailId: id }, 'Email draft created');

  return email;
}

/**
 * Send an email
 */
export async function sendEmail(
  customerId: CustomerId,
  senderId: UserId,
  senderEmail: string,
  senderName: string | undefined,
  input: SendEmailInput
): Promise<Email> {
  const db = getDb();
  const id = generateEmailId();
  const trackingPixelId = generateTrackingPixelId();

  // If scheduled for later, just queue it
  if (input.scheduledAt && input.scheduledAt > new Date()) {
    const [email] = await db
      .insert(emails)
      .values({
        id,
        customerId,
        senderId,
        fromEmail: senderEmail,
        fromName: senderName || null,
        toEmail: input.toEmail,
        toName: input.toName || null,
        contactId: input.contactId || null,
        accountId: input.accountId || null,
        subject: input.subject,
        bodyHtml: input.bodyHtml || null,
        bodyText: input.bodyText || null,
        status: 'queued',
        scheduledAt: input.scheduledAt,
        trackingPixelId,
        sequenceId: input.sequenceId || null,
        sequenceStepNumber: input.sequenceStepNumber || null,
        idempotencyKey: input.idempotencyKey || null,
      })
      .returning();

    emailLogger.debug({ emailId: id, scheduledAt: input.scheduledAt }, 'Email scheduled');

    return email;
  }

  // Process HTML to add tracking
  let processedHtml = input.bodyHtml;
  let trackedLinks: Array<{ trackingId: string; originalUrl: string }> = [];

  if (input.bodyHtml) {
    const trackingResult = addTrackingToEmail(
      input.bodyHtml,
      id,
      trackingPixelId,
      TRACKING_BASE_URL
    );
    processedHtml = trackingResult.html;
    trackedLinks = trackingResult.trackedLinks;
  }

  // Create email record
  const [email] = await db
    .insert(emails)
    .values({
      id,
      customerId,
      senderId,
      fromEmail: senderEmail,
      fromName: senderName || null,
      toEmail: input.toEmail,
      toName: input.toName || null,
      contactId: input.contactId || null,
      accountId: input.accountId || null,
      subject: input.subject,
      bodyHtml: processedHtml || null,
      bodyText: input.bodyText || null,
      ccEmails: input.ccEmails || [],
      bccEmails: input.bccEmails || [],
      status: 'sending',
      trackingPixelId,
      sequenceId: input.sequenceId || null,
      sequenceStepNumber: input.sequenceStepNumber || null,
      idempotencyKey: input.idempotencyKey || null,
    })
    .returning();

  // Store tracked link records for click tracking
  if (trackedLinks.length > 0) {
    await db.insert(emailClicks).values(
      trackedLinks.map((link) => ({
        id: generateId(),
        emailId: id,
        trackingId: link.trackingId,
        originalUrl: link.originalUrl,
        clickedAt: new Date(), // Will be updated on actual click
      }))
    );
  }

  // Send via provider (tenant-specific)
  const provider = await getEmailProviderForTenant(customerId);
  
  try {
    const result = await provider.send({
      from: { email: senderEmail, name: senderName },
      to: { email: input.toEmail, name: input.toName },
      subject: input.subject,
      html: processedHtml,
      text: input.bodyText,
    });

    if (result.success) {
      // Update email as sent
      await db
        .update(emails)
        .set({
          status: 'sent',
          sentAt: new Date(),
          provider: provider.name,
          providerMessageId: result.providerMessageId || null,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, id));

      // Emit event
      await writeToOutbox(
        createEvent(
          EventTypes.EMAIL_SENT,
          AggregateTypes.EMAIL,
          id,
          customerId,
          {
            emailId: id,
            contactId: input.contactId,
            accountId: input.accountId,
            toEmail: input.toEmail,
            subject: input.subject,
            sequenceId: input.sequenceId,
            sequenceStepNumber: input.sequenceStepNumber,
          },
          { userId: senderId }
        )
      );

      emailLogger.info({ emailId: id, to: input.toEmail }, 'Email sent successfully');
    } else {
      // Update email as failed
      await db
        .update(emails)
        .set({
          status: 'failed',
          errorMessage: result.error,
          updatedAt: new Date(),
        })
        .where(eq(emails.id, id));

      // Emit failure event
      await writeToOutbox(
        createEvent(
          EventTypes.EMAIL_FAILED,
          AggregateTypes.EMAIL,
          id,
          customerId,
          {
            emailId: id,
            contactId: input.contactId,
            accountId: input.accountId,
            error: result.error,
          },
          { userId: senderId }
        )
      );

      emailLogger.error({ emailId: id, error: result.error }, 'Email send failed');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await db
      .update(emails)
      .set({
        status: 'failed',
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(emails.id, id));

    emailLogger.error({ emailId: id, error }, 'Email send threw exception');
    throw error;
  }

  // Return updated email
  const [updatedEmail] = await db
    .select()
    .from(emails)
    .where(eq(emails.id, id))
    .limit(1);

  return updatedEmail;
}

/**
 * Get an email by ID
 */
export async function getEmail(
  customerId: CustomerId,
  emailId: EmailId
): Promise<Email> {
  const db = getDb();

  const [email] = await db
    .select()
    .from(emails)
    .where(
      and(
        eq(emails.id, emailId),
        eq(emails.customerId, customerId)
      )
    )
    .limit(1);

  if (!email) {
    throw new NotFoundError('Email', emailId);
  }

  return email;
}

/**
 * List emails with pagination
 */
export async function listEmails(
  customerId: CustomerId,
  options: ListEmailsOptions = {}
): Promise<PaginatedResponse<Email>> {
  const db = getDb();
  const { page = 1, limit = 20, contactId, accountId, status, sequenceId } = options;
  const offset = (page - 1) * limit;

  const conditions = [eq(emails.customerId, customerId)];

  if (contactId) {
    conditions.push(eq(emails.contactId, contactId));
  }
  if (accountId) {
    conditions.push(eq(emails.accountId, accountId));
  }
  if (status) {
    conditions.push(eq(emails.status, status));
  }
  if (sequenceId) {
    conditions.push(eq(emails.sequenceId, sequenceId));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emails)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results
  const data = await db
    .select()
    .from(emails)
    .where(whereClause)
    .orderBy(desc(emails.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Get email statistics for a contact
 */
export async function getContactEmailStats(
  customerId: CustomerId,
  contactId: ContactId
): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}> {
  const db = getDb();

  const [stats] = await db
    .select({
      totalSent: sql<number>`count(*)`,
      totalOpened: sql<number>`count(*) filter (where ${emails.openCount} > 0)`,
      totalClicked: sql<number>`count(*) filter (where ${emails.clickCount} > 0)`,
    })
    .from(emails)
    .where(
      and(
        eq(emails.customerId, customerId),
        eq(emails.contactId, contactId),
        eq(emails.status, 'sent')
      )
    );

  const totalSent = Number(stats.totalSent) || 0;
  const totalOpened = Number(stats.totalOpened) || 0;
  const totalClicked = Number(stats.totalClicked) || 0;

  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
  };
}

