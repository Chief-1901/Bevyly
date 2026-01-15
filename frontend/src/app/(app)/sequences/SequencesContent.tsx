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
  QueueListIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import type { Sequence } from '@/lib/api/server';

interface SequencesContentProps {
  sequences: Sequence[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentStatus: string;
}

type SequenceStatus = '' | 'draft' | 'active' | 'paused' | 'archived';

const statusOptions = [
  { value: '' as SequenceStatus, label: 'All' },
  { value: 'draft' as SequenceStatus, label: 'Draft' },
  { value: 'active' as SequenceStatus, label: 'Active' },
  { value: 'paused' as SequenceStatus, label: 'Paused' },
  { value: 'archived' as SequenceStatus, label: 'Archived' },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'active':
      return 'success';
    case 'draft':
      return 'warning';
    case 'paused':
      return 'info';
    case 'archived':
      return 'neutral';
    default:
      return 'neutral';
  }
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SequencesContent({
  sequences,
  pagination,
  currentStatus,
}: SequencesContentProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SequenceStatus>(currentStatus as SequenceStatus);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  });

  const handleStatusChange = (newStatus: SequenceStatus) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    router.push(`/sequences?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentStatus) params.set('status', currentStatus);
    router.push(`/sequences?${params.toString()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createForm,
          steps: [], // Empty sequence to start
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShowCreateModal(false);
        setCreateForm({ name: '', description: '' });
        // Navigate to sequence builder
        if (data.data?.id) {
          router.push(`/sequences/${data.data.id}`);
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('Failed to create sequence:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this sequence?')) return;

    try {
      await fetch(`/api/v1/sequences/${id}`, { method: 'DELETE' });
      router.refresh();
    } catch (error) {
      console.error('Failed to archive sequence:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sequences</h1>
          <p className="text-sm text-text-muted mt-1">Automate your outreach campaigns</p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Sequence
        </Button>
      </div>

      {/* Status Filter */}
      <SegmentedControl
        options={statusOptions}
        value={status}
        onChange={handleStatusChange}
      />

      {/* Table */}
      <Card padding="none">
        {sequences.length === 0 ? (
          <EmptyState
            icon={<QueueListIcon className="h-12 w-12" />}
            title="No sequences yet"
            description="Create your first automated sequence"
            action={
              <Button onClick={() => setShowCreateModal(true)}>New Sequence</Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableCaption>List of sequences</TableCaption>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Created</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((sequence) => (
                  <TableRow key={sequence.id}>
                    <TableCell>
                      <Link
                        href={`/sequences/${sequence.id}`}
                        className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                      >
                        {sequence.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" muted>
                      {sequence.description || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(sequence.status)}>
                        {sequence.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell" muted>
                      {formatDate(sequence.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Menu align="right">
                        <MenuItem
                          icon={<EyeIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/sequences/${sequence.id}`)}
                        >
                          View
                        </MenuItem>
                        <MenuItem
                          icon={<PencilIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/sequences/${sequence.id}/edit`)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon={<ArchiveBoxIcon className="h-4 w-4" />}
                          danger
                          onClick={() => handleArchive(sequence.id)}
                        >
                          Archive
                        </MenuItem>
                      </Menu>
                    </TableCell>
                  </TableRow>
                ))}
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
        title="New Sequence"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Sequence Name *
            </label>
            <Input
              placeholder="Welcome Sequence"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Description
            </label>
            <textarea
              className="w-full min-h-[80px] px-4 py-3 rounded-md border border-border bg-surface text-text-primary resize-none"
              placeholder="Describe the purpose of this sequence..."
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Sequence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

