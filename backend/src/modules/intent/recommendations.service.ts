import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { getDb } from '../../shared/db/client.js';
import { 
  recommendations, 
  recommendationFeedback,
  signals,
  CARD_TYPES,
  ACTION_TYPES,
  SEVERITIES,
} from '../../shared/db/schema/signals.js';
import { generateRecommendationId, generateFeedbackId } from '../../shared/utils/id.js';
import { NotFoundError } from '../../shared/errors/index.js';
import type { CustomerId, UserId, RecommendationId, SignalId, PaginatedResponse } from '../../shared/types/index.js';
import type { 
  Recommendation, 
  NewRecommendation,
  RecommendationFeedback,
  Signal,
  CardType,
  ActionType,
  Severity,
} from '../../shared/db/schema/signals.js';

// ─────────────────────────────────────────────────────────────
// Input Types
// ─────────────────────────────────────────────────────────────

export interface CreateRecommendationInput {
  userId?: string;
  patternId?: string;
  signalId?: string;
  actionType: ActionType;
  priority: Severity;
  score?: number;
  title: string;
  rationale?: string;
  ctaLabel?: string;
  ctaRoute?: string;
  ctaParams?: Record<string, string>;
  secondaryCtaLabel?: string;
  secondaryCtaRoute?: string;
  cardType: CardType;
  cardProps?: Record<string, unknown>;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface ListRecommendationsOptions {
  page?: number;
  limit?: number;
  userId?: string;
  actionType?: ActionType | ActionType[];
  priority?: Severity | Severity[];
  status?: string;
  cardType?: CardType | CardType[];
  sortBy?: 'createdAt' | 'priority' | 'score';
  sortOrder?: 'asc' | 'desc';
}

export interface BriefingResponse {
  recommendations: Recommendation[];
  signals: Signal[];
  summary: {
    totalSignals: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Recommendation CRUD
// ─────────────────────────────────────────────────────────────

/**
 * Create a new recommendation
 */
export async function createRecommendation(
  customerId: CustomerId,
  input: CreateRecommendationInput
): Promise<Recommendation> {
  const db = getDb();
  const id = generateRecommendationId();

  const [recommendation] = await db
    .insert(recommendations)
    .values({
      id,
      customerId,
      userId: input.userId || null,
      patternId: input.patternId || null,
      signalId: input.signalId || null,
      actionType: input.actionType,
      priority: input.priority,
      score: input.score || 0,
      title: input.title,
      rationale: input.rationale || null,
      ctaLabel: input.ctaLabel || null,
      ctaRoute: input.ctaRoute || null,
      ctaParams: input.ctaParams || {},
      secondaryCtaLabel: input.secondaryCtaLabel || null,
      secondaryCtaRoute: input.secondaryCtaRoute || null,
      cardType: input.cardType,
      cardProps: input.cardProps || {},
      data: input.data || {},
      status: 'pending',
      expiresAt: input.expiresAt || null,
    })
    .returning();

  return recommendation;
}

/**
 * Get a recommendation by ID
 */
export async function getRecommendation(
  customerId: CustomerId,
  recommendationId: RecommendationId
): Promise<Recommendation> {
  const db = getDb();

  const [recommendation] = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.id, recommendationId),
        eq(recommendations.customerId, customerId)
      )
    )
    .limit(1);

  if (!recommendation) {
    throw new NotFoundError('Recommendation', recommendationId);
  }

  return recommendation;
}

/**
 * List recommendations with filtering
 */
export async function listRecommendations(
  customerId: CustomerId,
  options: ListRecommendationsOptions = {}
): Promise<PaginatedResponse<Recommendation>> {
  const db = getDb();
  const {
    page = 1,
    limit = 20,
    userId,
    actionType,
    priority,
    status = 'pending',
    cardType,
    sortBy = 'score',
    sortOrder = 'desc',
  } = options;

  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions: ReturnType<typeof eq>[] = [
    eq(recommendations.customerId, customerId),
  ];

  if (status) {
    conditions.push(eq(recommendations.status, status));
  }

  if (userId) {
    // Show recommendations for this user OR for all users (null userId)
    conditions.push(
      sql`(${recommendations.userId} = ${userId} OR ${recommendations.userId} IS NULL)`
    );
  }

  if (actionType) {
    const actionTypeArray = Array.isArray(actionType) ? actionType : [actionType];
    conditions.push(inArray(recommendations.actionType, actionTypeArray));
  }

  if (priority) {
    const priorityArray = Array.isArray(priority) ? priority : [priority];
    conditions.push(inArray(recommendations.priority, priorityArray));
  }

  if (cardType) {
    const cardTypeArray = Array.isArray(cardType) ? cardType : [cardType];
    conditions.push(inArray(recommendations.cardType, cardTypeArray));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recommendations)
    .where(whereClause);

  const total = Number(countResult.count);

  // Get paginated results with priority sorting
  // Priority order: high > medium > low, then by score within priority
  const data = await db
    .select()
    .from(recommendations)
    .where(whereClause)
    .orderBy(
      sql`CASE ${recommendations.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
      desc(recommendations.score),
      desc(recommendations.createdAt)
    )
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
 * Update recommendation status
 */
export async function updateRecommendationStatus(
  customerId: CustomerId,
  recommendationId: RecommendationId,
  status: 'acted' | 'dismissed' | 'snoozed',
  snoozedUntil?: Date
): Promise<Recommendation> {
  const db = getDb();

  await getRecommendation(customerId, recommendationId);

  const updateData: Partial<Recommendation> = { status };
  
  if (status === 'acted') {
    updateData.actedAt = new Date();
  } else if (status === 'dismissed') {
    updateData.dismissedAt = new Date();
  } else if (status === 'snoozed' && snoozedUntil) {
    updateData.snoozedUntil = snoozedUntil;
  }

  const [updated] = await db
    .update(recommendations)
    .set(updateData)
    .where(
      and(
        eq(recommendations.id, recommendationId),
        eq(recommendations.customerId, customerId)
      )
    )
    .returning();

  return updated;
}

/**
 * Record feedback on a recommendation
 */
export async function recordFeedback(
  customerId: CustomerId,
  recommendationId: RecommendationId,
  userId: UserId,
  action: 'accepted' | 'declined' | 'snoozed',
  feedbackData?: Record<string, unknown>
): Promise<RecommendationFeedback> {
  const db = getDb();

  // Verify recommendation exists
  await getRecommendation(customerId, recommendationId);

  const id = generateFeedbackId();

  const [feedback] = await db
    .insert(recommendationFeedback)
    .values({
      id,
      recommendationId,
      userId,
      action,
      feedbackData: feedbackData || {},
    })
    .returning();

  // Update recommendation status based on feedback
  if (action === 'accepted') {
    await updateRecommendationStatus(customerId, recommendationId as RecommendationId, 'acted');
  } else if (action === 'declined') {
    await updateRecommendationStatus(customerId, recommendationId as RecommendationId, 'dismissed');
  }

  return feedback;
}

// ─────────────────────────────────────────────────────────────
// Recommendation Generation
// ─────────────────────────────────────────────────────────────

/**
 * Generate recommendations from active signals
 */
export async function generateRecommendationsFromSignals(
  customerId: CustomerId
): Promise<Recommendation[]> {
  const db = getDb();
  
  // Get active signals that don't already have recommendations
  const activeSignals = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.customerId, customerId),
        eq(signals.status, 'active')
      )
    );

  const createdRecommendations: Recommendation[] = [];

  for (const signal of activeSignals) {
    // Check if recommendation already exists for this signal
    const [existingRec] = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          eq(recommendations.signalId, signal.id),
          eq(recommendations.status, 'pending')
        )
      )
      .limit(1);

    if (existingRec) continue;

    // Generate recommendation based on signal type
    const recInput = mapSignalToRecommendation(signal);
    if (recInput) {
      const rec = await createRecommendation(customerId, {
        ...recInput,
        signalId: signal.id,
      });
      createdRecommendations.push(rec);
    }
  }

  return createdRecommendations;
}

/**
 * Map a signal to a recommendation input
 */
function mapSignalToRecommendation(signal: Signal): Omit<CreateRecommendationInput, 'signalId'> | null {
  const signalData = signal.data as Record<string, unknown>;

  switch (signal.signalType) {
    case 'deal_stalled':
      return {
        actionType: 'view_deal',
        priority: signal.severity as Severity,
        score: signal.severity === 'high' ? 100 : signal.severity === 'medium' ? 50 : 25,
        title: signal.title,
        rationale: signal.description || `This deal has been inactive and may need attention.`,
        ctaLabel: 'View Deal',
        ctaRoute: `/opportunities/${signalData.opportunityId}`,
        secondaryCtaLabel: 'Log Activity',
        secondaryCtaRoute: `/opportunities/${signalData.opportunityId}/activities/new`,
        cardType: 'DealStalledCard',
        cardProps: {
          opportunityId: signalData.opportunityId,
          opportunityName: signalData.opportunityName,
          accountName: signalData.accountName || 'Unknown Account',
          daysSinceActivity: signalData.daysSinceActivity || 14,
          amount: signalData.amount,
          stage: signalData.stage,
        },
      };

    case 'leads_ready':
      return {
        actionType: 'review_leads',
        priority: signal.severity as Severity,
        score: signal.severity === 'high' ? 100 : signal.severity === 'medium' ? 50 : 25,
        title: signal.title,
        rationale: signal.description || `New leads are ready for review and qualification.`,
        ctaLabel: 'Review Leads',
        ctaRoute: signalData.campaignId 
          ? `/leads?campaignId=${signalData.campaignId}&status=new`
          : `/leads?source=${signalData.source}&status=new`,
        secondaryCtaLabel: 'Start Campaign',
        secondaryCtaRoute: '/sequences/new',
        cardType: 'LeadsReadyCard',
        cardProps: {
          count: signalData.count,
          source: signalData.source,
          campaignId: signalData.campaignId,
          campaignName: signalData.campaignName,
        },
      };

    case 'reply_rate_drop':
      return {
        actionType: 'pause_sequence',
        priority: signal.severity as Severity,
        score: signal.severity === 'high' ? 100 : signal.severity === 'medium' ? 50 : 25,
        title: signal.title,
        rationale: signal.description || `This sequence may need optimization.`,
        ctaLabel: 'View Sequence',
        ctaRoute: `/sequences/${signalData.sequenceId}`,
        secondaryCtaLabel: 'Pause Sequence',
        secondaryCtaRoute: `/sequences/${signalData.sequenceId}/pause`,
        cardType: 'SequenceUnderperformingCard',
        cardProps: {
          sequenceId: signalData.sequenceId,
          sequenceName: signalData.sequenceName,
          replyRate: signalData.replyRate,
          replyRateChange: signalData.replyRateChange,
          activeContacts: signalData.activeContacts,
        },
      };

    case 'followup_needed':
      return {
        actionType: 'send_followup',
        priority: signal.severity as Severity,
        score: signal.severity === 'high' ? 100 : signal.severity === 'medium' ? 50 : 25,
        title: signal.title,
        rationale: signal.description || `A follow-up may be needed after the recent meeting.`,
        ctaLabel: 'Send Follow-up',
        ctaRoute: `/contacts/${signalData.contactId}/email/new`,
        secondaryCtaLabel: 'View Contact',
        secondaryCtaRoute: `/contacts/${signalData.contactId}`,
        cardType: 'FollowUpCard',
        cardProps: {
          contactId: signalData.contactId,
          contactName: signalData.contactName,
          contactTitle: signalData.contactTitle,
          accountName: signalData.accountName,
          meetingTitle: signalData.meetingTitle,
          meetingDate: signalData.meetingDate,
          daysSinceMeeting: signalData.daysSinceMeeting,
        },
      };

    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Briefing API
// ─────────────────────────────────────────────────────────────

/**
 * Get the briefing for a user (main Intent API endpoint)
 */
export async function getBriefing(
  customerId: CustomerId,
  userId?: UserId,
  options: { limit?: number } = {}
): Promise<BriefingResponse> {
  const db = getDb();
  const { limit = 10 } = options;

  // Get active signals
  const activeSignals = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.customerId, customerId),
        eq(signals.status, 'active')
      )
    )
    .orderBy(
      sql`CASE ${signals.severity} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
      desc(signals.createdAt)
    )
    .limit(20);

  // Get pending recommendations
  const pendingRecommendations = await listRecommendations(customerId, {
    userId: userId as string | undefined,
    status: 'pending',
    limit,
    sortBy: 'score',
    sortOrder: 'desc',
  });

  // Calculate summary
  const highPriority = pendingRecommendations.data.filter(r => r.priority === 'high').length;
  const mediumPriority = pendingRecommendations.data.filter(r => r.priority === 'medium').length;
  const lowPriority = pendingRecommendations.data.filter(r => r.priority === 'low').length;

  return {
    recommendations: pendingRecommendations.data,
    signals: activeSignals,
    summary: {
      totalSignals: activeSignals.length,
      highPriority,
      mediumPriority,
      lowPriority,
    },
  };
}

/**
 * Refresh recommendations by detecting signals and generating new recommendations
 */
export async function refreshBriefing(customerId: CustomerId): Promise<{
  newSignals: number;
  newRecommendations: number;
}> {
  // Import signal detection
  const { detectAllSignals } = await import('./signals.service.js');
  
  // Detect new signals
  const detectedSignals = await detectAllSignals(customerId);
  const newSignals = detectedSignals.stalledDeals.length + detectedSignals.leadsReady.length;

  // Generate recommendations from signals
  const newRecs = await generateRecommendationsFromSignals(customerId);

  return {
    newSignals,
    newRecommendations: newRecs.length,
  };
}

// ─────────────────────────────────────────────────────────────
// Contextual Recommendations
// ─────────────────────────────────────────────────────────────

export interface ContextualRecommendationsOptions {
  entityType: string;
  entityId: string;
  limit?: number;
}

export interface ContextualRecommendationsResponse {
  recommendations: Recommendation[];
  signals: Signal[];
}

/**
 * Get recommendations and signals relevant to a specific entity (e.g., opportunity, account)
 * This is used for contextual sidebars on detail pages.
 */
export async function getContextualRecommendations(
  customerId: CustomerId,
  options: ContextualRecommendationsOptions
): Promise<ContextualRecommendationsResponse> {
  const db = getDb();
  const { entityType, entityId, limit = 5 } = options;

  // Get signals for this entity
  const entitySignals = await db
    .select()
    .from(signals)
    .where(
      and(
        eq(signals.customerId, customerId),
        eq(signals.entityType, entityType),
        eq(signals.entityId, entityId),
        eq(signals.status, 'active')
      )
    )
    .orderBy(
      sql`CASE ${signals.severity} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
      desc(signals.createdAt)
    )
    .limit(limit);

  // Get signal IDs
  const signalIds = entitySignals.map(s => s.id);

  // Get recommendations that reference these signals
  let entityRecommendations: Recommendation[] = [];
  
  if (signalIds.length > 0) {
    entityRecommendations = await db
      .select()
      .from(recommendations)
      .where(
        and(
          eq(recommendations.customerId, customerId),
          eq(recommendations.status, 'pending'),
          inArray(recommendations.signalId, signalIds)
        )
      )
      .orderBy(
        sql`CASE ${recommendations.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
        desc(recommendations.score)
      )
      .limit(limit);
  }

  // Also look for recommendations that might reference this entity in their data/cardProps
  // This catches recommendations that may have been created for related entities
  const additionalRecs = await db
    .select()
    .from(recommendations)
    .where(
      and(
        eq(recommendations.customerId, customerId),
        eq(recommendations.status, 'pending'),
        sql`(
          ${recommendations.data}->>'opportunityId' = ${entityId} OR
          ${recommendations.data}->>'accountId' = ${entityId} OR
          ${recommendations.data}->>'contactId' = ${entityId} OR
          ${recommendations.cardProps}->>'opportunityId' = ${entityId} OR
          ${recommendations.cardProps}->>'accountId' = ${entityId} OR
          ${recommendations.cardProps}->>'contactId' = ${entityId}
        )`
      )
    )
    .limit(limit);

  // Combine and deduplicate recommendations
  const allRecs = [...entityRecommendations, ...additionalRecs];
  const uniqueRecs = Array.from(
    new Map(allRecs.map(r => [r.id, r])).values()
  ).slice(0, limit);

  return {
    recommendations: uniqueRecs,
    signals: entitySignals,
  };
}