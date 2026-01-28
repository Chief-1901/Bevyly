/**
 * Intent Components
 * 
 * Action Card registry and components for the Intent-Driven Sales OS.
 * These components power the Briefing page and contextual recommendations.
 */

// Base card
export { ActionCard } from './ActionCard';
export type { ActionCardProps, ActionCardAction, Priority } from './ActionCard';

// Specific cards
export { DealStalledCard } from './DealStalledCard';
export type { DealStalledCardProps } from './DealStalledCard';

export { SequenceUnderperformingCard } from './SequenceUnderperformingCard';
export type { SequenceUnderperformingCardProps } from './SequenceUnderperformingCard';

export { LeadsReadyCard } from './LeadsReadyCard';
export type { LeadsReadyCardProps } from './LeadsReadyCard';

export { FollowUpCard } from './FollowUpCard';
export type { FollowUpCardProps } from './FollowUpCard';

export { LeadsDiscoveredCard } from './LeadsDiscoveredCard';
export type { LeadsDiscoveredCardProps } from './LeadsDiscoveredCard';

export { EnrichmentPendingCard } from './EnrichmentPendingCard';
export type { EnrichmentPendingCardProps } from './EnrichmentPendingCard';

export { ApprovalQueueCard } from './ApprovalQueueCard';
export type { ApprovalQueueCardProps } from './ApprovalQueueCard';

export { UniversalCommand } from './UniversalCommand';

// Registry
export {
  CardRegistry,
  ALLOWED_CARD_TYPES,
  ALLOWED_ROUTES,
  isAllowedRoute,
  renderCard,
  createCardElement,
} from './CardRegistry';
export type { CardType, CardConfig } from './CardRegistry';

// Contextual sidebar
export { ContextualSidebar } from './ContextualSidebar';

// AI streaming
export { BriefingStream } from './BriefingStream';