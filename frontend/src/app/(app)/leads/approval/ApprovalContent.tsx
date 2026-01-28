'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  FunnelIcon,
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

interface ApprovalItem {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  metadata?: {
    companyName?: string;
    domain?: string;
    industry?: string;
    location?: string;
    fitScore?: number;
    source?: string;
  };
  estimatedCredits: number;
  fitScoreBucket: 'high' | 'medium' | 'low';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: string;
}

interface ApprovalSummary {
  totalPending: number;
  byBucket: {
    high: number;
    medium: number;
    low: number;
  };
  estimatedTotalCredits: number;
}

interface ApprovalContentProps {
  searchParams: Promise<{
    status?: string;
    bucket?: string;
    batchId?: string;
    page?: string;
    action?: string;
  }>;
}

export function ApprovalContent({ searchParams }: ApprovalContentProps) {
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [summary, setSummary] = useState<ApprovalSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Fetch approval queue data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = await searchParams;
      const bucket = params.bucket || (filter !== 'all' ? filter : '');

      const [summaryRes, itemsRes] = await Promise.all([
        fetch('/api/v1/agents/approval/summary'),
        fetch(`/api/v1/agents/approval?status=pending${bucket ? `&bucket=${bucket}` : ''}`),
      ]);

      const [summaryData, itemsData] = await Promise.all([
        summaryRes.json(),
        itemsRes.json(),
      ]);

      if (summaryData.success) {
        setSummary(summaryData.data);
      }

      if (itemsData.success) {
        setItems(itemsData.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch approval data:', error);
      addToast({
        type: 'error',
        title: 'Failed to load',
        message: 'Could not load approval queue data',
      });
    } finally {
      setIsLoading(false);
    }
  }, [searchParams, filter, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle selection
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all visible
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map((item) => item.id)));
  }, [items]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Approve selected
  const approveSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/v1/agents/approval/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Leads approved',
          message: `${data.data.approved} leads approved for enrichment`,
        });
        setSelectedIds(new Set());
        fetchData();
      } else {
        addToast({
          type: 'error',
          title: 'Approval failed',
          message: data.error?.message || 'Failed to approve leads',
        });
      }
    } catch (error) {
      console.error('Approval error:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to connect to the server',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, fetchData, addToast]);

  // Reject selected
  const rejectSelected = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/v1/agents/approval/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Leads rejected',
          message: `${data.data.rejected} leads removed from queue`,
        });
        setSelectedIds(new Set());
        fetchData();
      } else {
        addToast({
          type: 'error',
          title: 'Rejection failed',
          message: data.error?.message || 'Failed to reject leads',
        });
      }
    } catch (error) {
      console.error('Rejection error:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to connect to the server',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedIds, fetchData, addToast]);

  // Approve all in bucket
  const approveAllInBucket = useCallback(
    async (bucket: 'high' | 'medium' | 'low') => {
      setIsProcessing(true);
      try {
        const response = await fetch('/api/v1/agents/approval/approve-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bucket }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          addToast({
            type: 'success',
            title: `All ${bucket}-fit leads approved`,
            message: `${data.data.approved} leads approved for enrichment`,
          });
          fetchData();
        } else {
          addToast({
            type: 'error',
            title: 'Bulk approval failed',
            message: data.error?.message || 'Failed to approve leads',
          });
        }
      } catch (error) {
        console.error('Bulk approval error:', error);
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to connect to the server',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [fetchData, addToast]
  );

  // Start enrichment
  const startEnrichment = useCallback(async () => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/v1/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType: 'enrichment' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Enrichment started',
          message: 'Lead enrichment is running. You will be notified when complete.',
        });
        router.push('/briefing');
      } else {
        addToast({
          type: 'error',
          title: 'Failed to start enrichment',
          message: data.error?.message || 'Failed to start enrichment',
        });
      }
    } catch (error) {
      console.error('Enrichment error:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to connect to the server',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [router, addToast]);

  const getBucketColor = (bucket: 'high' | 'medium' | 'low') => {
    switch (bucket) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
    }
  };

  const filteredItems =
    filter === 'all' ? items : items.filter((item) => item.fitScoreBucket === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/leads" className="text-text-muted hover:text-text-primary transition-colors">
              <ChevronLeftIcon className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-text-primary">Approval Queue</h1>
          </div>
          <p className="text-sm text-text-muted">
            Review discovered leads and approve them for enrichment
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />}
            onClick={fetchData}
            disabled={isLoading || isProcessing}
          >
            Refresh
          </Button>
          {summary && summary.totalPending > 0 && (
            <Button
              leftIcon={<SparklesIcon className="h-4 w-4" />}
              onClick={startEnrichment}
              disabled={isProcessing}
            >
              Start Enrichment
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card
            className="border-l-4 border-l-primary-500 cursor-pointer hover:shadow-card transition-shadow"
            onClick={() => setFilter('all')}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <ClipboardDocumentCheckIcon className="h-5 w-5 text-primary-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{summary.totalPending}</p>
                <p className="text-sm text-text-muted">Total Pending</p>
              </div>
            </div>
          </Card>

          <Card
            className={`border-l-4 border-l-success cursor-pointer hover:shadow-card transition-shadow ${
              filter === 'high' ? 'ring-2 ring-success/50' : ''
            }`}
            onClick={() => setFilter('high')}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{summary.byBucket.high}</p>
                <p className="text-sm text-text-muted">High Fit</p>
              </div>
            </div>
          </Card>

          <Card
            className={`border-l-4 border-l-warning cursor-pointer hover:shadow-card transition-shadow ${
              filter === 'medium' ? 'ring-2 ring-warning/50' : ''
            }`}
            onClick={() => setFilter('medium')}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{summary.byBucket.medium}</p>
                <p className="text-sm text-text-muted">Medium Fit</p>
              </div>
            </div>
          </Card>

          <Card
            className={`border-l-4 border-l-info cursor-pointer hover:shadow-card transition-shadow ${
              filter === 'low' ? 'ring-2 ring-info/50' : ''
            }`}
            onClick={() => setFilter('low')}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <FunnelIcon className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{summary.byBucket.low}</p>
                <p className="text-sm text-text-muted">Low Fit</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="bg-primary-500/5 border-primary-500/20">
          <div className="flex items-center justify-between">
            <p className="text-sm text-text-primary">
              <span className="font-medium">{selectedIds.size}</span> leads selected
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={clearSelection} disabled={isProcessing}>
                Clear
              </Button>
              <Button
                size="sm"
                variant="secondary"
                leftIcon={<XCircleIcon className="h-4 w-4" />}
                onClick={rejectSelected}
                disabled={isProcessing}
              >
                Reject
              </Button>
              <Button
                size="sm"
                leftIcon={<CheckCircleIcon className="h-4 w-4" />}
                onClick={approveSelected}
                disabled={isProcessing}
              >
                Approve
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      {summary && filter !== 'all' && summary.byBucket[filter] > 0 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => approveAllInBucket(filter)}
            disabled={isProcessing}
          >
            Approve all {summary.byBucket[filter]} {filter}-fit leads
          </Button>
        </div>
      )}

      {/* Items List */}
      {isLoading ? (
        <Card>
          <div className="text-center py-12">
            <ArrowPathIcon className="h-8 w-8 text-text-muted mx-auto animate-spin" />
            <p className="text-sm text-text-muted mt-2">Loading...</p>
          </div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ClipboardDocumentCheckIcon className="h-12 w-12 text-text-muted mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">No pending approvals</h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              {filter !== 'all'
                ? `No ${filter}-fit leads pending. Try a different filter or discover new leads.`
                : 'All leads have been reviewed. Use the command box on the briefing page to discover new leads.'}
            </p>
            <Link href="/briefing" className="inline-block mt-4">
              <Button variant="secondary">Go to Briefing</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          {/* Select All Header */}
          <div className="flex items-center gap-4 p-4 border-b border-border bg-surface-primary-a06">
            <input
              type="checkbox"
              checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
              onChange={selectedIds.size === filteredItems.length ? clearSelection : selectAll}
              className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-text-muted">
              {selectedIds.size === filteredItems.length ? 'Deselect all' : 'Select all'}
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-4 p-4 hover:bg-surface-primary-a06 transition-colors ${
                  selectedIds.has(item.id) ? 'bg-primary-500/5' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleSelection(item.id)}
                  className="h-4 w-4 rounded border-border text-primary-500 focus:ring-primary-500"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-text-primary truncate">
                      {item.metadata?.companyName || item.title}
                    </h4>
                    <Badge variant={getBucketColor(item.fitScoreBucket)} size="sm">
                      {item.fitScoreBucket} fit
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-text-muted">
                    {item.metadata?.industry && <span>{item.metadata.industry}</span>}
                    {item.metadata?.location && (
                      <>
                        <span>•</span>
                        <span>{item.metadata.location}</span>
                      </>
                    )}
                    {item.metadata?.domain && (
                      <>
                        <span>•</span>
                        <span>{item.metadata.domain}</span>
                      </>
                    )}
                  </div>
                </div>

                {item.metadata?.fitScore !== undefined && (
                  <div className="text-right">
                    <p className="text-lg font-semibold text-text-primary">{item.metadata.fitScore}%</p>
                    <p className="text-xs text-text-muted">Fit Score</p>
                  </div>
                )}

                <div className="text-right">
                  <p className="text-sm font-medium text-primary-500">{item.estimatedCredits}</p>
                  <p className="text-xs text-text-muted">credits</p>
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setSelectedIds(new Set([item.id]));
                      approveSelected();
                    }}
                    disabled={isProcessing}
                    className="p-2 text-success hover:bg-success/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Approve"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedIds(new Set([item.id]));
                      rejectSelected();
                    }}
                    disabled={isProcessing}
                    className="p-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Reject"
                  >
                    <XCircleIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Credits Summary */}
      {summary && summary.estimatedTotalCredits > 0 && (
        <Card className="bg-gradient-to-r from-primary-500/5 to-primary-600/5 border-primary-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-muted">Estimated total credits for all pending leads</p>
              <p className="text-2xl font-bold text-primary-500">{summary.estimatedTotalCredits} credits</p>
            </div>
            <SparklesIcon className="h-10 w-10 text-primary-500/30" />
          </div>
        </Card>
      )}
    </div>
  );
}
