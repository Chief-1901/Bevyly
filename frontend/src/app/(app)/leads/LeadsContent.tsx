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
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  ArrowPathIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { Lead, LeadCounts } from '@/lib/api/server';

interface LeadsContentProps {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  counts: LeadCounts | null;
  currentStatus: string;
  currentSource: string;
}

type LeadStatus = '' | 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted' | 'rejected';

const statusOptions = [
  { value: '' as LeadStatus, label: 'All' },
  { value: 'new' as LeadStatus, label: 'New' },
  { value: 'contacted' as LeadStatus, label: 'Contacted' },
  { value: 'qualified' as LeadStatus, label: 'Qualified' },
  { value: 'converted' as LeadStatus, label: 'Converted' },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'converted':
      return 'success';
    case 'qualified':
      return 'info';
    case 'contacted':
      return 'warning';
    case 'rejected':
    case 'unqualified':
      return 'danger';
    default:
      return 'neutral';
  }
};

function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function LeadsContent({
  leads,
  pagination,
  counts,
  currentStatus,
  currentSource,
}: LeadsContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [status, setStatus] = useState<LeadStatus>(currentStatus as LeadStatus);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    companyName: '',
    contactEmail: '',
    contactFirstName: '',
    contactLastName: '',
    contactTitle: '',
    source: 'manual',
  });

  const handleStatusChange = (newStatus: LeadStatus) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    if (currentSource) params.set('source', currentSource);
    router.push(`/leads?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentStatus) params.set('status', currentStatus);
    if (currentSource) params.set('source', currentSource);
    router.push(`/leads?${params.toString()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Lead created',
          message: `${createForm.companyName} has been added to your leads.`,
        });
        setShowCreateModal(false);
        setCreateForm({
          companyName: '',
          contactEmail: '',
          contactFirstName: '',
          contactLastName: '',
          contactTitle: '',
          source: 'manual',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create lead',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
      addToast({
        type: 'error',
        title: 'Failed to create lead',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const response = await fetch(`/api/v1/leads/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Lead deleted',
          message: 'The lead has been removed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to delete lead',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to delete lead:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete lead',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  const handleConvert = async (id: string) => {
    if (!confirm('Convert this lead to an Account and Contact?')) return;

    try {
      const response = await fetch(`/api/v1/leads/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Lead converted',
          message: 'The lead has been converted to an Account and Contact.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to convert lead',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to convert lead:', error);
      addToast({
        type: 'error',
        title: 'Failed to convert lead',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Reason for rejection (optional):');

    try {
      const response = await fetch(`/api/v1/leads/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Lead rejected',
          message: 'The lead has been marked as rejected.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to reject lead',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to reject lead:', error);
      addToast({
        type: 'error',
        title: 'Failed to reject lead',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leads</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage and qualify your leads
            {counts && ` • ${counts.new} new, ${counts.qualified} qualified`}
          </p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Lead
        </Button>
      </div>

      {/* Status Filter */}
      <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
        <SegmentedControl
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
          size="md"
        />
      </div>

      {/* Table */}
      <Card padding="none" className="overflow-visible">
        {leads.length === 0 ? (
          <EmptyState
            icon={<UserGroupIcon className="h-12 w-12" />}
            title="No leads yet"
            description="Get started by adding your first lead or importing from a file"
            action={
              <Button onClick={() => setShowCreateModal(true)}>Add Lead</Button>
            }
          />
        ) : (
          <div className="flex flex-col">
            <div className="overflow-x-auto">
              <Table>
                <TableCaption>List of leads</TableCaption>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden sm:table-cell">Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Source</TableHead>
                    <TableHead className="hidden lg:table-cell">Fit Score</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="w-16 text-right pr-4">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                        >
                          {lead.companyName}
                        </Link>
                        {lead.domain && (
                          <p className="text-xs text-text-muted">{lead.domain}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" muted>
                        {lead.contactFirstName || lead.contactLastName ? (
                          <div>
                            <span>
                              {[lead.contactFirstName, lead.contactLastName]
                                .filter(Boolean)
                                .join(' ')}
                            </span>
                            {lead.contactTitle && (
                              <p className="text-xs text-text-muted">{lead.contactTitle}</p>
                            )}
                          </div>
                        ) : lead.contactEmail ? (
                          lead.contactEmail
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(lead.status)}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell" muted>
                        {lead.source}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.fitScore !== null && lead.fitScore !== undefined ? (
                          <span
                            className={
                              lead.fitScore >= 70
                                ? 'text-success'
                                : lead.fitScore >= 40
                                ? 'text-warning'
                                : 'text-text-muted'
                            }
                          >
                            {lead.fitScore}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell" muted>
                        {formatDate(lead.createdAt)}
                      </TableCell>
                      <TableCell align="right">
                        <Menu align="right">
                          <MenuItem
                            icon={<EyeIcon className="h-4 w-4" />}
                            onClick={() => router.push(`/leads/${lead.id}`)}
                          >
                            View
                          </MenuItem>
                          {lead.status !== 'converted' && lead.status !== 'rejected' && (
                            <>
                              <MenuItem
                                icon={<ArrowPathIcon className="h-4 w-4" />}
                                onClick={() => handleConvert(lead.id)}
                              >
                                Convert
                              </MenuItem>
                              <MenuItem
                                icon={<XMarkIcon className="h-4 w-4" />}
                                onClick={() => handleReject(lead.id)}
                              >
                                Reject
                              </MenuItem>
                            </>
                          )}
                          <MenuItem
                            icon={<TrashIcon className="h-4 w-4" />}
                            danger
                            onClick={() => handleDelete(lead.id)}
                          >
                            Delete
                          </MenuItem>
                        </Menu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pagination && (
              <div className="border-t border-gridline">
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Add Lead"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Company Name *
            </label>
            <Input
              placeholder="Acme Corp"
              value={createForm.companyName}
              onChange={(e) => setCreateForm({ ...createForm, companyName: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                First Name
              </label>
              <Input
                placeholder="John"
                value={createForm.contactFirstName}
                onChange={(e) => setCreateForm({ ...createForm, contactFirstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Last Name
              </label>
              <Input
                placeholder="Doe"
                value={createForm.contactLastName}
                onChange={(e) => setCreateForm({ ...createForm, contactLastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email
            </label>
            <Input
              type="email"
              placeholder="john@acme.com"
              value={createForm.contactEmail}
              onChange={(e) => setCreateForm({ ...createForm, contactEmail: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Title
            </label>
            <Input
              placeholder="VP of Sales"
              value={createForm.contactTitle}
              onChange={(e) => setCreateForm({ ...createForm, contactTitle: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Lead
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
