'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Menu, MenuItem } from '@/components/ui/Menu';
import {
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { Opportunity, Account } from '@/lib/api/server';

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

const stageOptions = [
  { value: '' as Stage, label: 'All' },
  { value: 'prospecting' as Stage, label: 'Prospecting' },
  { value: 'qualification' as Stage, label: 'Qualification' },
  { value: 'proposal' as Stage, label: 'Proposal' },
  { value: 'negotiation' as Stage, label: 'Negotiation' },
  { value: 'closed_won' as Stage, label: 'Won' },
];

const stageBadgeVariant = (stage: string) => {
  switch (stage) {
    case 'closed_won':
      return 'success';
    case 'closed_lost':
      return 'danger';
    case 'negotiation':
    case 'proposal':
      return 'warning';
    default:
      return 'info';
  }
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OpportunitiesContent({
  opportunities,
  accounts,
  pagination,
  currentStage,
}: OpportunitiesContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [stage, setStage] = useState<Stage>(currentStage as Stage);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    accountId: '',
    amount: '',
    stage: 'prospecting',
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

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
        addToast({
          type: 'success',
          title: 'Opportunity created',
          message: `${createForm.name} has been added.`,
        });
        setShowCreateModal(false);
        setCreateForm({ name: '', accountId: '', amount: '', stage: 'prospecting' });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create opportunity',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to create opportunity:', error);
      addToast({
        type: 'error',
        title: 'Failed to create opportunity',
        message: 'Could not connect to the server. Please try again.',
      });
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
        addToast({
          type: 'success',
          title: 'Opportunity deleted',
          message: 'The opportunity has been removed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to delete opportunity',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to delete opportunity:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete opportunity',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Opportunities</h1>
          <p className="text-sm text-text-muted mt-1">Manage your sales pipeline</p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Opportunity
        </Button>
      </div>

      {/* Stage Filter */}
      <div className="overflow-x-auto">
        <SegmentedControl
          options={stageOptions}
          value={stage}
          onChange={handleStageChange}
          size="md"
        />
      </div>

      {/* Table */}
      <Card padding="none">
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
            <Table>
              <TableCaption>List of opportunities</TableCaption>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Account</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="hidden md:table-cell">Amount</TableHead>
                  <TableHead className="hidden lg:table-cell">Close Date</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opp) => {
                  const account = accountMap.get(opp.accountId);
                  return (
                    <TableRow key={opp.id}>
                      <TableCell>
                        <Link
                          href={`/opportunities/${opp.id}`}
                          className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                        >
                          {opp.name}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" muted>
                        {account ? (
                          <Link
                            href={`/accounts/${account.id}`}
                            className="hover:text-primary-700 dark:hover:text-primary-500"
                          >
                            {account.name}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={stageBadgeVariant(opp.stage)}>
                          {opp.stage.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {opp.amount ? formatCurrency(opp.amount) : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" muted>
                        {formatDate(opp.closeDate)}
                      </TableCell>
                      <TableCell>
                        <Menu align="right">
                          <MenuItem
                            icon={<EyeIcon className="h-4 w-4" />}
                            onClick={() => router.push(`/opportunities/${opp.id}`)}
                          >
                            View
                          </MenuItem>
                          <MenuItem
                            icon={<PencilIcon className="h-4 w-4" />}
                            onClick={() => router.push(`/opportunities/${opp.id}/edit`)}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem
                            icon={<TrashIcon className="h-4 w-4" />}
                            danger
                            onClick={() => handleDelete(opp.id)}
                          >
                            Delete
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {pagination && (
              <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                limit={pagination.limit}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </Card>

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

