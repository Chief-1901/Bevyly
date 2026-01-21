'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  renderCard,
  CardType,
  ALLOWED_CARD_TYPES,
} from '@/components/intent';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  BoltIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { Recommendation, Signal } from '@/lib/api/server';

interface ContextualSidebarProps {
  entityType: 'opportunity' | 'account' | 'contact' | 'lead';
  entityId: string;
  entityName?: string;
  className?: string;
}

interface ContextualData {
  recommendations: Recommendation[];
  signals: Signal[];
}

export function ContextualSidebar({
  entityType,
  entityId,
  entityName,
  className = '',
}: ContextualSidebarProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<ContextualData | null>(null);

  useEffect(() => {
    async function fetchContextual() {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/v1/intent/contextual/${entityType}/${entityId}?limit=5`
        );
        const result = await response.json();
        
        if (response.ok && result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch contextual recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchContextual();
  }, [entityType, entityId]);

  const handleFeedback = async (recommendationId: string, action: 'accepted' | 'declined') => {
    try {
      const response = await fetch(`/api/v1/intent/recommendations/${recommendationId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        addToast({
          type: 'success',
          title: action === 'accepted' ? 'Action taken' : 'Dismissed',
        });
        // Remove from local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                recommendations: prev.recommendations.filter((r) => r.id !== recommendationId),
              }
            : null
        );
      } else {
        addToast({
          type: 'error',
          title: 'Failed to record feedback',
          message: result.error?.message || 'An error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to record feedback:', error);
      addToast({
        type: 'error',
        title: 'Failed to record feedback',
        message: 'Could not connect to the server.',
      });
    }
  };

  // Collapsed state - show mini indicator
  if (!isExpanded) {
    const totalItems = (data?.recommendations.length || 0) + (data?.signals.length || 0);
    
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`
          fixed right-0 top-1/2 -translate-y-1/2 z-40
          flex items-center gap-2 px-3 py-4 
          bg-surface border border-border border-r-0
          rounded-l-lg shadow-lg
          hover:bg-gray-100 dark:hover:bg-gray-300
          transition-colors
          ${className}
        `}
      >
        <ChevronLeftIcon className="h-4 w-4 text-text-muted" />
        {totalItems > 0 && (
          <div className="flex items-center gap-1">
            <SparklesIcon className="h-4 w-4 text-primary-500" />
            <span className="text-sm font-medium text-text-primary">{totalItems}</span>
          </div>
        )}
      </button>
    );
  }

  const hasContent = data && (data.recommendations.length > 0 || data.signals.length > 0);

  return (
    <div
      className={`
        w-80 flex-shrink-0 border-l border-border bg-bg
        overflow-y-auto sticky top-0 h-[calc(100vh-4rem)] max-h-screen
        ${className}
      `}
    >
      {/* Header */}
      <div className="sticky top-0 bg-bg border-b border-border px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary-500" />
            <h3 className="font-semibold text-text-primary">Insights</h3>
            {hasContent && (
              <Badge variant="neutral" size="sm">
                {(data?.recommendations.length || 0) + (data?.signals.length || 0)}
              </Badge>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-300 text-text-muted"
            aria-label="Collapse sidebar"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
        {entityName && (
          <p className="text-xs text-text-muted mt-1 truncate">
            For: {entityName}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-100 dark:bg-gray-300 rounded-lg" />
              </div>
            ))}
          </div>
        ) : !hasContent ? (
          <div className="text-center py-8">
            <SparklesIcon className="h-10 w-10 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              No recommendations for this {entityType}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Insights will appear when there are actions to take
            </p>
          </div>
        ) : (
          <>
            {/* Recommendations */}
            {data?.recommendations && data.recommendations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="h-4 w-4 text-primary-500" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Recommended Actions
                  </span>
                </div>
                {data.recommendations.map((rec) => {
                  // Check if we can render from registry
                  if (ALLOWED_CARD_TYPES.includes(rec.cardType as CardType)) {
                    return (
                      <div key={rec.id} className="scale-95 origin-top-left">
                        {renderCard(rec.cardType as CardType, rec.cardProps)}
                      </div>
                    );
                  }

                  // Fallback to simple card
                  return (
                    <Card
                      key={rec.id}
                      className={`
                        border-l-4
                        ${rec.priority === 'high' ? 'border-l-danger' : 
                          rec.priority === 'medium' ? 'border-l-warning' : 'border-l-info'}
                      `}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-text-primary truncate">
                              {rec.title}
                            </p>
                          </div>
                          {rec.rationale && (
                            <p className="text-xs text-text-muted line-clamp-2">
                              {rec.rationale}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {rec.ctaRoute && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  handleFeedback(rec.id, 'accepted');
                                  router.push(rec.ctaRoute!);
                                }}
                              >
                                {rec.ctaLabel || 'View'}
                              </Button>
                            )}
                            <button
                              onClick={() => handleFeedback(rec.id, 'declined')}
                              className="text-xs text-text-muted hover:text-text-primary"
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                        <Badge
                          variant={
                            rec.priority === 'high' ? 'danger' :
                            rec.priority === 'medium' ? 'warning' : 'info'
                          }
                          size="sm"
                        >
                          {rec.priority}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Signals */}
            {data?.signals && data.signals.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <BoltIcon className="h-4 w-4 text-text-muted" />
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Active Signals
                  </span>
                </div>
                {data.signals.map((signal) => (
                  <Card key={signal.id} padding="sm">
                    <div className="flex items-center gap-3">
                      <div
                        className={`
                          h-2 w-2 rounded-full flex-shrink-0
                          ${signal.severity === 'high' ? 'bg-danger' :
                            signal.severity === 'medium' ? 'bg-warning' : 'bg-info'}
                        `}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {signal.title}
                        </p>
                        <p className="text-xs text-text-muted">
                          {new Date(signal.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
