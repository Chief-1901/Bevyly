'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  renderCard,
  CardType,
  ALLOWED_CARD_TYPES,
  BriefingStream,
  UniversalCommand,
} from '@/components/intent';
import {
  ArrowPathIcon,
  BoltIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import type { Recommendation, Signal, PipelineSummary } from '@/lib/api/server';
import { PipelineSnapshot } from './components/PipelineSnapshot';
import { SignalDetailModal } from './components/SignalDetailModal';
import { AgentActivityFeed } from './components/AgentActivityFeed';

interface BriefingContentProps {
  recommendations: Recommendation[];
  signals: Signal[];
  summary: {
    totalSignals: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
  pipelineStages: PipelineSummary[];
  error?: string;
}

export function BriefingContent({
  recommendations,
  signals,
  summary,
  pipelineStages,
  error,
}: BriefingContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [useAIOrdering, setUseAIOrdering] = useState(true);
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [showSignalModal, setShowSignalModal] = useState(false);

  const handleViewSignal = (signalId: string) => {
    setSelectedSignalId(signalId);
    setShowSignalModal(true);
  };

  const handleSignalDismissed = () => {
    // Refresh the page to update signals list
    router.refresh();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/v1/intent/briefing/refresh', { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Briefing refreshed',
          message: 'Your briefing has been updated with the latest signals.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to refresh briefing',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to refresh briefing:', error);
      addToast({
        type: 'error',
        title: 'Failed to refresh briefing',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFeedback = async (recommendationId: string, action: 'accepted' | 'declined') => {
    try {
      const response = await fetch(`/api/v1/intent/recommendations/${recommendationId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: action === 'accepted' ? 'Action accepted' : 'Action dismissed',
          message: action === 'accepted' ? 'Great choice!' : 'The recommendation has been dismissed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to record feedback',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to record feedback:', error);
      addToast({
        type: 'error',
        title: 'Failed to record feedback',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  // Get current time greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{greeting}</h1>
          <p className="text-sm text-text-muted mt-1">
            Here's what needs your attention today
          </p>
        </div>
        <Button
          variant="secondary"
          leftIcon={<ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          Refresh
        </Button>
      </div>

      {/* Universal Command Interface */}
      <UniversalCommand />

      {/* Error State */}
      {error && (
        <Card className="border-warning bg-warning/10">
          <div className="flex items-center gap-3 p-4">
            <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
            <p className="text-sm text-warning">{error}</p>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-danger">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-danger/10 flex items-center justify-center">
              <BoltIcon className="h-5 w-5 text-danger" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{summary.highPriority}</p>
              <p className="text-sm text-text-muted">High Priority</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{summary.mediumPriority}</p>
              <p className="text-sm text-text-muted">Medium Priority</p>
            </div>
          </div>
        </Card>

        <Card className="border-l-4 border-l-info">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <InformationCircleIcon className="h-5 w-5 text-info" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{summary.lowPriority}</p>
              <p className="text-sm text-text-muted">Low Priority</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pipeline Snapshot */}
      <PipelineSnapshot stages={pipelineStages} />

      {/* Agent Activity Feed */}
      <AgentActivityFeed />

      {/* Action Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-text-primary">Recommended Actions</h2>
            <Badge variant="neutral" size="sm">{recommendations.length}</Badge>
          </div>
          <button
            onClick={() => setUseAIOrdering(!useAIOrdering)}
            aria-pressed={useAIOrdering}
            aria-label={`AI Ordering ${useAIOrdering ? 'enabled' : 'disabled'}`}
            className={`
              flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
              transition-colors border
              ${useAIOrdering
                ? 'bg-primary-500/10 border-primary-500/30 text-primary-500'
                : 'bg-surface border-border text-text-muted hover:text-text-primary'}
            `}
          >
            <CpuChipIcon className="h-4 w-4" />
            <span className="hidden sm:inline">AI Ordering</span>
            <span className="sm:hidden">AI</span>
          </button>
        </div>

        {recommendations.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <SparklesIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">All caught up!</h3>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                No urgent actions right now. Check back later or click refresh to detect new signals.
              </p>
            </div>
          </Card>
        ) : useAIOrdering ? (
          <BriefingStream
            recommendations={recommendations}
            signals={signals}
          />
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              // Check if the card type is in our registry
              if (!ALLOWED_CARD_TYPES.includes(rec.cardType as CardType)) {
                // Fallback: render a generic card
                return (
                  <Card key={rec.id} className="border-l-4 border-l-primary-700 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-text-primary">{rec.title}</h3>
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
                        <p className="text-sm text-text-muted mt-2">{rec.rationale}</p>
                        <div className="flex items-center gap-2 mt-4">
                          {rec.ctaRoute && (
                            <Link href={rec.ctaRoute}>
                              <Button size="sm">
                                {rec.ctaLabel || 'View'}
                              </Button>
                            </Link>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleFeedback(rec.id, 'declined')}
                          >
                            Dismiss
                          </Button>
                        </div>                      </div>
                    </div>
                  </Card>
                );
              }

              // Render card from registry
              return (
                <div key={rec.id}>
                  {renderCard(rec.cardType as CardType, rec.cardProps)}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Signals Section */}
      {signals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text-primary">Active Signals</h2>
            <Badge variant="neutral" size="sm">{signals.length}</Badge>
          </div>

          <Card padding="none">
            <div className="divide-y divide-border">
              {signals.slice(0, 5).map((signal) => (
                <div key={signal.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      signal.severity === 'high' ? 'bg-danger-500' :
                      signal.severity === 'medium' ? 'bg-warning-500' : 'bg-info-500'
                    }`}
                    role="img"
                    aria-label={`${signal.severity} severity`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">{signal.title}</p>
                    <p className="text-sm text-text-muted">
                      {signal.entityType} • {new Date(signal.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant={
                      signal.severity === 'high' ? 'danger' :
                      signal.severity === 'medium' ? 'warning' : 'info'
                    }
                    size="sm"
                  >
                    {signal.severity}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleViewSignal(signal.id)}
                  >
                    View Details
                  </Button>
                </div>
              ))}
            </div>
            {signals.length > 5 && (
              <div className="p-4 border-t border-border">
                <Button variant="secondary" size="sm" className="w-full">
                  View all {signals.length} signals
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Signal Detail Modal */}
      <SignalDetailModal
        signalId={selectedSignalId}
        open={showSignalModal}
        onClose={() => setShowSignalModal(false)}
        onDismissed={handleSignalDismissed}
      />
    </div>
  );
}
