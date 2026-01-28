'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import type { Signal } from '@/lib/api/server';

interface SignalDetailModalProps {
  signalId: string | null;
  open: boolean;
  onClose: () => void;
  onDismissed: () => void;
}

interface SignalDetail extends Signal {
  context?: {
    opportunity?: {
      id: string;
      name: string;
      amount?: number;
      stage?: string;
    };
    account?: {
      id: string;
      name: string;
    };
    contact?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email: string;
      title?: string;
    };
  };
  recommendedActions?: string[];
}

type BadgeVariant = 'danger' | 'warning' | 'success' | 'info' | 'neutral';

const SIGNAL_TYPE_CONFIG: Record<string, { icon: string; color: BadgeVariant }> = {
  opportunity_stalled: { icon: '🔴', color: 'danger' },
  contact_unresponsive: { icon: '🟡', color: 'warning' },
  high_value_lead: { icon: '🟢', color: 'success' },
  engagement_spike: { icon: '📈', color: 'info' },
  deal_at_risk: { icon: '⚠️', color: 'danger' },
  positive_signal: { icon: '✨', color: 'success' },
};

export function SignalDetailModal({
  signalId,
  open,
  onClose,
  onDismissed,
}: SignalDetailModalProps) {
  const { addToast } = useToast();
  const [signal, setSignal] = useState<SignalDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch signal details with AbortController for request cancellation
  const fetchSignalDetails = useCallback(async (abortSignal: AbortSignal) => {
    if (!signalId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/intent/signals/${signalId}`, {
        signal: abortSignal,
      });

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('Invalid response from server');
      }

      if (response.ok && data.success && data.data) {
        setSignal(data.data);
      } else {
        setError(data.error?.message || 'Failed to load signal details');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, don't update state
        return;
      }
      console.error('Failed to fetch signal details:', err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [signalId]);

  useEffect(() => {
    if (open && signalId) {
      const controller = new AbortController();
      fetchSignalDetails(controller.signal);

      return () => controller.abort();
    } else {
      // Reset state when modal closes
      setSignal(null);
      setError(null);
    }
  }, [open, signalId, fetchSignalDetails]);

  const handleDismiss = async () => {
    if (!signalId) return;

    setIsDismissing(true);

    try {
      const response = await fetch(`/api/v1/intent/signals/${signalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'dismissed' }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Signal dismissed',
          message: 'This signal has been marked as resolved.',
        });
        onDismissed();
        onClose();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to dismiss signal',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (err) {
      console.error('Failed to dismiss signal:', err);
      addToast({
        type: 'error',
        title: 'Failed to dismiss signal',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsDismissing(false);
    }
  };

  const config = signal ? SIGNAL_TYPE_CONFIG[signal.signalType] || { icon: '🔔', color: 'neutral' as BadgeVariant } : { icon: '🔔', color: 'neutral' as BadgeVariant };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Signal Details"
      size="lg"
    >
      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="text-sm text-text-muted">Loading signal details...</p>
            </div>
          </div>
        ) : error ? (
          <div className="py-8">
            <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger rounded-lg">
              <ExclamationTriangleIcon className="h-5 w-5 text-danger flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-danger">Error Loading Signal</p>
                <p className="text-sm text-text-muted mt-1">{error}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const controller = new AbortController();
                  fetchSignalDetails(controller.signal);
                }}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : signal ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start gap-3 mb-2">
                <span className="text-2xl" aria-hidden="true">{config.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-text-primary">{signal.title}</h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant={config.color} size="sm">
                      {signal.severity}
                    </Badge>
                    <span className="text-xs text-text-muted">
                      Detected {new Date(signal.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {signal.description && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2">Context</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{signal.description}</p>
              </div>
            )}

            {/* Related Entities */}
            {signal.context && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Related Entities</h3>
                <div className="space-y-2">
                  {signal.context.opportunity && (
                    <Link
                      href={`/opportunities/${signal.context.opportunity.id}`}
                      className="flex items-center justify-between p-3 bg-surface hover:bg-gray-100 dark:hover:bg-gray-800 border border-border rounded-lg transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">
                          Opportunity: {signal.context.opportunity.name}
                        </p>
                        {signal.context.opportunity.amount && (
                          <p className="text-xs text-text-muted mt-1">
                            ${(signal.context.opportunity.amount / 100).toLocaleString()} • {signal.context.opportunity.stage}
                          </p>
                        )}
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-text-muted group-hover:text-primary-600" />
                    </Link>
                  )}

                  {signal.context.account && (
                    <Link
                      href={`/accounts/${signal.context.account.id}`}
                      className="flex items-center justify-between p-3 bg-surface hover:bg-gray-100 dark:hover:bg-gray-800 border border-border rounded-lg transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">
                          Account: {signal.context.account.name}
                        </p>
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-text-muted group-hover:text-primary-600" />
                    </Link>
                  )}

                  {signal.context.contact && (
                    <Link
                      href={`/contacts/${signal.context.contact.id}`}
                      className="flex items-center justify-between p-3 bg-surface hover:bg-gray-100 dark:hover:bg-gray-800 border border-border rounded-lg transition-colors group"
                    >
                      <div>
                        <p className="text-sm font-medium text-text-primary group-hover:text-primary-600">
                          Contact: {signal.context.contact.firstName && signal.context.contact.lastName
                            ? `${signal.context.contact.firstName} ${signal.context.contact.lastName}`
                            : signal.context.contact.email}
                        </p>
                        {signal.context.contact.title && (
                          <p className="text-xs text-text-muted mt-1">{signal.context.contact.title}</p>
                        )}
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-text-muted group-hover:text-primary-600" />
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {signal.recommendedActions && signal.recommendedActions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-3">Recommended Actions</h3>
                <ol className="space-y-2">
                  {signal.recommendedActions.map((action, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="text-primary-600 font-semibold mt-0.5">{index + 1}.</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isDismissing}
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                {signal.entityType === 'opportunity' && signal.entityId && (
                  <Link href={`/opportunities/${signal.entityId}`}>
                    <Button variant="secondary" size="sm">
                      View Opportunity
                    </Button>
                  </Link>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                >
                  {isDismissing ? 'Dismissing...' : 'Dismiss Signal'}
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
