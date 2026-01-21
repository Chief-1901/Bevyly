/**
 * Card Registry
 * 
 * Whitelist of allowed Action Cards for the Generative UI layer.
 * Only cards in this registry can be rendered by the AI.
 */

import React from 'react';
import { z } from 'zod';
import { DealStalledCard, type DealStalledCardProps } from './DealStalledCard';
import { SequenceUnderperformingCard, type SequenceUnderperformingCardProps } from './SequenceUnderperformingCard';
import { LeadsReadyCard, type LeadsReadyCardProps } from './LeadsReadyCard';
import { FollowUpCard, type FollowUpCardProps } from './FollowUpCard';

// Priority schema
const prioritySchema = z.enum(['high', 'medium', 'low']);

// Type map linking card types to their prop interfaces
type CardPropsMap = {
  DealStalledCard: DealStalledCardProps;
  SequenceUnderperformingCard: SequenceUnderperformingCardProps;
  LeadsReadyCard: LeadsReadyCardProps;
  FollowUpCard: FollowUpCardProps;
};

// Type-safe registry structure
type CardRegistryConfig = {
  [K in keyof CardPropsMap]: {
    component: React.ComponentType<CardPropsMap[K]>;
    propsSchema: z.ZodObject<any>;
    description: string;
  };
};

// Card configurations with Zod schemas for validation
export const CardRegistry: CardRegistryConfig = {
  DealStalledCard: {
    component: DealStalledCard,
    propsSchema: z.object({
      opportunityId: z.string(),
      opportunityName: z.string(),
      accountName: z.string(),
      daysSinceActivity: z.number(),
      amount: z.number().optional(),
      stage: z.string().optional(),
      priority: prioritySchema.optional(),
    }),
    description: 'Shows a deal that has stalled with no recent activity',
  },

  SequenceUnderperformingCard: {
    component: SequenceUnderperformingCard,
    propsSchema: z.object({
      sequenceId: z.string(),
      sequenceName: z.string(),
      replyRate: z.number(),
      replyRateChange: z.number().optional(),
      activeContacts: z.number().optional(),
      segment: z.string().optional(),
      priority: prioritySchema.optional(),
    }),
    description: 'Shows a sequence with declining engagement',
  },

  LeadsReadyCard: {
    component: LeadsReadyCard,
    propsSchema: z.object({
      count: z.number(),
      source: z.string(),
      campaignId: z.string().nullish(),
      campaignName: z.string().nullish(),
      avgFitScore: z.number().nullish(),
      priority: prioritySchema.optional(),
    }),
    description: 'Shows new leads ready for review',
  },

  FollowUpCard: {
    component: FollowUpCard,
    propsSchema: z.object({
      contactId: z.string(),
      contactName: z.string(),
      contactTitle: z.string().optional(),
      accountName: z.string(),
      meetingTitle: z.string(),
      meetingDate: z.string(),
      daysSinceMeeting: z.number(),
      priority: prioritySchema.optional(),
    }),
    description: 'Shows a contact needing follow-up after a meeting',
  },
} as const;

// Type helpers
export type CardType = keyof CardPropsMap;
export type CardConfig<T extends CardType> = CardRegistryConfig[T];

// Get list of allowed card types
export const ALLOWED_CARD_TYPES = Object.keys(CardRegistry) as CardType[];

// Route whitelist for CTAs
export const ALLOWED_ROUTES = [
  '/opportunities/:id',
  '/sequences/:id',
  '/leads',
  '/leads/:id',
  '/contacts/:id',
  '/accounts/:id',
  '/sequences/new',
] as const;

/**
 * Validate that a route is in the whitelist
 */
export function isAllowedRoute(route: string): boolean {
  return ALLOWED_ROUTES.some((pattern) => {
    const regex = new RegExp('^' + pattern.replace(/:id/g, '[^/]+') + '$');
    return regex.test(route);
  });
}

/**
 * Render a card from the registry
 * Validates props against the schema before rendering
 */
export function renderCard<T extends CardType>(
  cardType: T,
  props: unknown
): React.ReactElement | null {
  if (!(cardType in CardRegistry)) {
    console.error(`Unknown card type: ${cardType}`);
    return null;
  }

  const config = CardRegistry[cardType];

  try {
    const validatedProps = config.propsSchema.parse(props) as unknown as CardPropsMap[T];
    // Use React.createElement to avoid JSX prop spreading type issues
    return React.createElement(config.component, validatedProps);
  } catch (error) {
    console.error(`Invalid props for ${cardType}:`, error);
    return null;
  }
}

/**
 * Type-safe card rendering helper
 */
export function createCardElement<T extends CardType>(
  cardType: T,
  props: CardPropsMap[T]
): React.ReactElement {
  const config = CardRegistry[cardType];
  // Use React.createElement to avoid JSX prop spreading type issues
  return React.createElement(config.component, props);
}
