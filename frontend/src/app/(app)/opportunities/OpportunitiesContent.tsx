'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import {
  CurrencyDollarIcon,
  PlusIcon,
  Bars3Icon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import type { Opportunity, Account } from '@/lib/api/server';
import { TableView } from './components/TableView';
import { KanbanBoard } from './components/KanbanBoard';

interface OpportunitiesContentProps {
  opportunities: Opportunity[];
  accounts: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentStage: string;
}

type Stage = '' | 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
type ViewMode = 'table' | 'board';

const stageOptions = [
  { value: '' as Stage, label: 'All' },
  { value: 'prospecting' as Stage, label: 'Prospecting' },
  { value: 'qualification' as Stage, label: 'Qualification' },
  { value: 'proposal' as Stage, label: 'Proposal' },
  { value: 'negotiation' as Stage, label: 'Negotiation' },
  { value: 'closed_won' as Stage, label: 'Won' },
];

export function OpportunitiesContent({
  opportunities,
  accounts,
  pagination,
  currentStage,
}: OpportunitiesContentProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [stage, setStage] = useState<Stage>(currentStage as Stage);
  const [view, setView] = useState<ViewMode>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    accountId: '',
    amount: '',
    stage: 'prospecting',
  });

  // Load view preference from localStorage
  useEffect(() => {
    try {
      const savedView = localStorage.getItem('opportunities_view');
      if (savedView === 'table' || savedView === 'board') {
        setView(savedView);
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
  }, []);

  // Save view preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('opportunities_view', view);
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }, [view]);

  const handleStageChange = (newStage: Stage) => {
    setStage(newStage);
    const params = new URLSearchParams();
    if (newStage) params.set('stage', newStage);
    router.push(`/opportunities?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentStage) params.set('stage', currentStage);
    router.push(`/opportunities?${params.toString()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          amount: createForm.amount ? parseInt(createForm.amount) * 100 : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Opportunity created', `${createForm.name} has been added.`);
        setShowCreateModal(false);
        setCreateForm({ name: '', accountId: '', amount: '', stage: 'prospecting' });
        router.refresh();
      } else {
        toast.error('Failed to create opportunity', data.error?.message || 'An unexpected error occurred');
      }
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      toast.error('Failed to create opportunity', 'Could not connect to the server. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this opportunity?')) return;

    try {
      const response = await fetch(`/api/v1/opportunities/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Opportunity deleted', 'The opportunity has been removed.');
        router.refresh();
      } else {
        toast.error('Failed to delete opportunity', data.error?.message || 'An unexpected error occurred');
      }
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      toast.error('Failed to delete opportunity', 'Could not connect to the server. Please try again.');
    }
  };

  const handleStageUpdate = async (oppId: string, newStage: string) => {
    const response = await fetch(`/api/v1/opportunities/${oppId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      const error = data.error?.message || 'Failed to update stage';
      toast.error('Update failed', error);
      throw new Error(error);
    }

    toast.success('Stage updated', `Moved to ${newStage.replace('_', ' ')}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Opportunities</h1>
          <p className="text-sm text-text-muted mt-1">Manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-surface-secondary rounded-lg">
            <Button
              variant={view === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('table')}
              aria-label="Table view"
            >
              <Bars3Icon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'board' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setView('board')}
              aria-label="Board view"
            >
              <Squares2X2Icon className="h-4 w-4" />
            </Button>
          </div>
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Stage Filter - Only show for table view */}
      {view === 'table' && (
        <div className="overflow-x-auto">
          <SegmentedControl
            options={stageOptions}
            value={stage}
            onChange={handleStageChange}
            size="md"
          />
        </div>
      )}

      {/* Empty State */}
      {opportunities.length === 0 ? (
        <EmptyState
          icon={<CurrencyDollarIcon className="h-12 w-12" />}
          title="No opportunities yet"
          description="Get started by adding your first opportunity"
          action={
            <Button onClick={() => setShowCreateModal(true)}>Add Opportunity</Button>
          }
        />
      ) : (
        <>
          {/* Table View */}
          {view === 'table' && (
            <TableView
              opportunities={opportunities}
              accounts={accounts}
              pagination={pagination}
              onPageChange={handlePageChange}
              onDelete={handleDelete}
            />
          )}

          {/* Board View */}
          {view === 'board' && (
            <KanbanBoard
              opportunities={opportunities}
              accounts={accounts}
              onStageChange={handleStageUpdate}
            />
          )}
        </>
      )}

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Opportunity"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Opportunity Name *
            </label>
            <Input
              placeholder="Q1 Enterprise Deal"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Account *
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={createForm.accountId}
              onChange={(e) => setCreateForm({ ...createForm, accountId: e.target.value })}
              required
            >
              <option value="">Select an account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Amount (USD)
            </label>
            <Input
              type="number"
              placeholder="25000"
              value={createForm.amount}
              onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Opportunity
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
