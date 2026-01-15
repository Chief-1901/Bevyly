import { eq } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { emails, emailClicks } from '../../shared/db/schema/emails.js';
import { generateClickTrackingId, generateId } from '../../shared/utils/id.js';
import { writeToOutbox, createEvent } from '../events/outbox.js';
import { EventTypes, AggregateTypes } from '../events/types.js';
import { logger } from '../../shared/logger/index.js';
import type { CustomerId, EmailId } from '../../shared/types/index.js';

const trackingLogger = logger.child({ module: 'email-tracking' });

/**
 * 1x1 transparent GIF pixel for open tracking
 */
export const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Generate tracking pixel URL
 */
export function generateTrackingPixelUrl(baseUrl: string, trackingId: string): string {
  return `${baseUrl}/api/v1/emails/track/open/${trackingId}`;
}

/**
 * Generate click tracking URL
 */
export function generateClickTrackingUrl(baseUrl: string, trackingId: string): string {
  return `${baseUrl}/api/v1/emails/track/click/${trackingId}`;
}

/**
 * Process email HTML to add tracking
 */
export function addTrackingToEmail(
  html: string,
  emailId: string,
  trackingPixelId: string,
  baseUrl: string
): { html: string; trackedLinks: Array<{ trackingId: string; originalUrl: string }> } {
  const trackedLinks: Array<{ trackingId: string; originalUrl: string }> = [];

  // Add tracking pixel before closing body tag
  const pixelUrl = generateTrackingPixelUrl(baseUrl, trackingPixelId);
  const pixelImg = `<img src="${pixelUrl}" width="1" height="1" style="display:none" alt="" />`;
  
  let processedHtml = html;
  if (html.includes('</body>')) {
    processedHtml = html.replace('</body>', `${pixelImg}</body>`);
  } else {
    processedHtml = html + pixelImg;
  }

  // Replace links with tracked versions
  const linkRegex = /<a\s+([^>]*href=["'])(https?:\/\/[^"']+)(["'][^>]*)>/gi;
  
  processedHtml = processedHtml.replace(linkRegex, (_match, before, url, after) => {
    // Skip tracking for unsubscribe and mailto links
    if (url.includes('unsubscribe') || url.startsWith('mailto:')) {
      return `<a ${before}${url}${after}>`;
    }

    const trackingId = generateClickTrackingId();
    const trackedUrl = generateClickTrackingUrl(baseUrl, trackingId);
    
    trackedLinks.push({
      trackingId,
      originalUrl: url,
    });

    return `<a ${before}${trackedUrl}${after}>`;
  });

  return { html: processedHtml, trackedLinks };
}

/**
 * Record an email open event
 */
export async function recordEmailOpen(
  trackingPixelId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ emailId: string | null; firstOpen: boolean }> {
  const db = getDb();

  // Find the email by tracking pixel ID
  const [email] = await db
    .select()
    .from(emails)
    .where(eq(emails.trackingPixelId, trackingPixelId))
    .limit(1);

  if (!email) {
    trackingLogger.warn({ trackingPixelId }, 'Email not found for tracking pixel');
    return { emailId: null, firstOpen: false };
  }

  const firstOpen = email.openCount === 0;
  const now = new Date();

  // Update email open stats
  await db
    .update(emails)
    .set({
      openCount: (email.openCount || 0) + 1,
      firstOpenedAt: email.firstOpenedAt || now,
      lastOpenedAt: now,
      status: email.status === 'sent' || email.status === 'delivered' ? 'opened' : email.status,
      updatedAt: now,
    })
    .where(eq(emails.id, email.id));

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.EMAIL_OPENED,
      AggregateTypes.EMAIL,
      email.id,
      email.customerId as CustomerId,
      {
        emailId: email.id,
        contactId: email.contactId,
        accountId: email.accountId,
        openCount: (email.openCount || 0) + 1,
        firstOpen,
      },
      { userId: email.senderId }
    )
  );

  trackingLogger.debug({ emailId: email.id, firstOpen }, 'Email open recorded');

  return { emailId: email.id, firstOpen };
}

/**
 * Record an email click event
 */
export async function recordEmailClick(
  clickTrackingId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ originalUrl: string | null; emailId: string | null }> {
  const db = getDb();

  // Find the click record
  const [clickRecord] = await db
    .select()
    .from(emailClicks)
    .where(eq(emailClicks.trackingId, clickTrackingId))
    .limit(1);

  if (!clickRecord) {
    trackingLogger.warn({ clickTrackingId }, 'Click tracking record not found');
    return { originalUrl: null, emailId: null };
  }

  const now = new Date();

  // Get the email
  const [email] = await db
    .select()
    .from(emails)
    .where(eq(emails.id, clickRecord.emailId))
    .limit(1);

  if (!email) {
    return { originalUrl: clickRecord.originalUrl, emailId: null };
  }

  const firstClick = email.clickCount === 0;

  // Update email click stats
  await db
    .update(emails)
    .set({
      clickCount: (email.clickCount || 0) + 1,
      firstClickedAt: email.firstClickedAt || now,
      status: email.status === 'sent' || email.status === 'delivered' || email.status === 'opened' ? 'clicked' : email.status,
      updatedAt: now,
    })
    .where(eq(emails.id, email.id));

  // Record individual click
  await db.insert(emailClicks).values({
    id: generateId(),
    emailId: email.id,
    trackingId: clickTrackingId,
    originalUrl: clickRecord.originalUrl,
    clickedAt: now,
    userAgent: userAgent || null,
    ipAddress: ipAddress || null,
  });

  // Emit event
  await writeToOutbox(
    createEvent(
      EventTypes.EMAIL_CLICKED,
      AggregateTypes.EMAIL,
      email.id,
      email.customerId as CustomerId,
      {
        emailId: email.id,
        contactId: email.contactId,
        accountId: email.accountId,
        url: clickRecord.originalUrl,
        clickCount: (email.clickCount || 0) + 1,
        firstClick,
      },
      { userId: email.senderId }
    )
  );

  trackingLogger.debug({ emailId: email.id, url: clickRecord.originalUrl }, 'Email click recorded');

  return { originalUrl: clickRecord.originalUrl, emailId: email.id };
}

