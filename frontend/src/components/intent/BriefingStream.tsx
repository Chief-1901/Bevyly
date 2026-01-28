'use client';

import { useState, useEffect, useCallback } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { renderCard, ALLOWED_CARD_TYPES, type CardType } from './CardRegistry';
import type { Recommendation, Signal } from '@/lib/api/server';
import {
  SparklesIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Schema matching the API response
const cardSelectionSchema = z.object({
  cards: z.array(
    z.object({
      cardType: z.string(),
      props: z.record(z.string(), z.any()),
      reasoning: z.string(),
    })
  ),
  summary: z.string(),
});

type CardSelection = z.infer<typeof cardSelectionSchema>;

interface BriefingStreamProps {
  recommendations: Recommendation[];
  signals?: Signal[];
  onCardClick?: (cardType: string, props: Record<string, unknown>) => void;
  className?: string;
}

// Priority order for deterministic fallback
const priorityOrder = { high: 1, medium: 2, low: 3 };

/**
 * Deterministic fallback rendering
 * Used when AI streaming is unavailable or fails
 */
function DeterministicCards({
  recommendations,
  onFeedback,
}: {
  recommendations: Recommendation[];
  onFeedback: (id: string, action: 'accepted' | 'declined') => void;
}) {
  const sortedRecs = [...recommendations]
    .sort(
      (a, b) =>
        (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
        (priorityOrder[b.priority as keyof typeof priorityOrder] || 3)
    )
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {sortedRecs.map((rec) => {
        // If the card type is in the registry, render it
        if (ALLOWED_CARD_TYPES.includes(rec.cardType as CardType)) {
          return (
            <div key={rec.id} className="relative group">
              {renderCard(rec.cardType as CardType, rec.cardProps)}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onFeedback(rec.id, 'declined')}
                  className="text-xs text-text-muted hover:text-danger px-2 py-1 rounded bg-surface/80 backdrop-blur-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          );
        }

        // Fallback to generic card
        return (
          <Card
            key={rec.id}
            className={`
              border-l-4
              ${
                rec.priority === 'high'
                  ? 'border-l-danger'
                  : rec.priority === 'medium'
                  ? 'border-l-warning'
                  : 'border-l-info'
              }
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-text-primary">{rec.title}</p>
                  <Badge
                    variant={
                      rec.priority === 'high'
                        ? 'danger'
                        : rec.priority === 'medium'
                        ? 'warning'
                        : 'info'
                    }
                    size="sm"
                  >
                    {rec.priority}
                  </Badge>
                </div>
                {rec.rationale && (
                  <p className="text-sm text-text-muted">{rec.rationale}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {rec.ctaRoute && (
                    <Button size="sm" onClick={() => onFeedback(rec.id, 'accepted')}>
                      {rec.ctaLabel || 'View'}
                    </Button>
                  )}
                  <button
                    onClick={() => onFeedback(rec.id, 'declined')}
                    className="text-xs text-text-muted hover:text-text-primary"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * AI-Streamed Cards Component
 * Renders cards as they stream from the AI
 */
function StreamedCards({
  data,
  isLoading,
}: {
  data: any; // AI SDK's PartialObject type
  isLoading: boolean;
}) {
  if (!data?.cards || data.cards.length === 0) {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg" />
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div className="space-y-4">
      {data.summary && (
        <div className="flex items-center gap-2 text-sm text-text-muted pb-2 border-b border-border">
          <SparklesIcon className="h-4 w-4 text-primary-500" />
          <span>{data.summary}</span>
        </div>
      )}
      {data.cards.map((card: any, index: number) => {
        const cardType = card.cardType as CardType;
        if (ALLOWED_CARD_TYPES.includes(cardType)) {
          return (
            <div
              key={`${cardType}-${index}`}
              className="animate-slide-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {renderCard(cardType, card.props)}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

/**
 * BriefingStream
 *
 * Main component that handles AI streaming with graceful fallback
 * to deterministic rendering when AI is unavailable.
 */
export function BriefingStream({
  recommendations,
  signals = [],
  onCardClick,
  className = '',
}: BriefingStreamProps) {
  const { addToast } = useToast();
  const [useAI, setUseAI] = useState(true);
  const [hasAttemptedAI, setHasAttemptedAI] = useState(false);
  const [localRecommendations, setLocalRecommendations] = useState(recommendations);

  // Update local recommendations when prop changes
  useEffect(() => {
    setLocalRecommendations(recommendations);
  }, [recommendations]);

  // AI streaming hook
  const { object, isLoading, error, submit, stop } = useObject({
    api: '/api/intent/stream',
    schema: cardSelectionSchema,
  });

  // Trigger AI stream when recommendations change (if AI is enabled)
  useEffect(() => {
    if (useAI && localRecommendations.length > 0 && !hasAttemptedAI) {
      setHasAttemptedAI(true);
      submit({ recommendations: localRecommendations, signals });
    }
  }, [useAI, localRecommendations, signals, hasAttemptedAI, submit]);

  // Handle AI errors by falling back to deterministic
  useEffect(() => {
    if (error) {
      console.error('AI streaming error:', error);
      setUseAI(false);
      addToast({
        type: 'info',
        title: 'AI Unavailable',
        message: 'Showing recommendations in priority order.',
      });
    }
  }, [error, addToast]);

  // Handle feedback for deterministic cards
  const handleFeedback = useCallback(
    async (recommendationId: string, action: 'accepted' | 'declined') => {
      try {
        const response = await fetch(`/api/v1/intent/recommendations/${recommendationId}/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });

        if (response.ok) {
          addToast({
            type: action === 'accepted' ? 'success' : 'info',
            title: action === 'accepted' ? 'Action noted' : 'Dismissed',
          });
          // Remove from local state
          setLocalRecommendations((prev) => prev.filter((r) => r.id !== recommendationId));
        }
      } catch (err) {
        console.error('Failed to record feedback:', err);
      }
    },
    [addToast]
  );

  // Retry AI streaming
  const retryAI = useCallback(() => {
    setUseAI(true);
    setHasAttemptedAI(false);
  }, []);

  // Toggle between AI and deterministic
  const toggleMode = useCallback(() => {
    if (useAI && isLoading) {
      stop();
    }
    setUseAI(!useAI);
    setHasAttemptedAI(false);
  }, [useAI, isLoading, stop]);

  // Empty state
  if (localRecommendations.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <SparklesIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">
          All Caught Up!
        </h3>
        <p className="text-text-muted">
          No recommendations at the moment. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mode toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {useAI ? (
            <>
              <SparklesIcon className="h-4 w-4 text-primary-500" />
              <span className="text-sm text-text-muted">AI-powered ordering</span>
            </>
          ) : (
            <>
              <span className="text-sm text-text-muted">Priority ordering</span>
            </>
          )}
          {isLoading && (
            <ArrowPathIcon className="h-4 w-4 text-primary-500 animate-spin" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Button size="sm" variant="ghost" onClick={retryAI}>
              <ArrowPathIcon className="h-4 w-4 mr-1" />
              Retry AI
            </Button>
          )}
          <button
            onClick={toggleMode}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            {useAI ? 'Use standard order' : 'Use AI order'}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && !useAI && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-warning/10 border border-warning/20 rounded-lg">
          <ExclamationCircleIcon className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm text-text-secondary">
            AI ordering unavailable. Showing recommendations by priority.
          </p>
        </div>
      )}

      {/* Cards */}
      {useAI ? (
        <StreamedCards data={object} isLoading={isLoading} />
      ) : (
        <DeterministicCards
          recommendations={localRecommendations}
          onFeedback={handleFeedback}
        />
      )}
    </div>
  );
}
