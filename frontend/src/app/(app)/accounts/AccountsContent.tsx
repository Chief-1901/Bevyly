'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
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
  BuildingOfficeIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { Account } from '@/lib/api/server';

interface AccountsContentProps {
  accounts: Account[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentSearch: string;
  currentStatus: string;
}

export function AccountsContent({
  accounts,
  pagination,
  currentSearch,
  currentStatus,
}: AccountsContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [search, setSearch] = useState(currentSearch);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    domain: '',
    industry: '',
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set('search', value);
    if (currentStatus) params.set('status', currentStatus);
    router.push(`/accounts?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentSearch) params.set('search', currentSearch);
    if (currentStatus) params.set('status', currentStatus);
    router.push(`/accounts?${params.toString()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Account created',
          message: `${createForm.name} has been added.`,
        });
        setShowCreateModal(false);
        setCreateForm({ name: '', domain: '', industry: '' });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create account',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      addToast({
        type: 'error',
        title: 'Failed to create account',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      const response = await fetch(`/api/v1/accounts/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Account deleted',
          message: 'The account has been removed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to delete account',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete account',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Accounts</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your company accounts
          </p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Account
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput
          placeholder="Search accounts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => handleSearch('')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(search)}
        />
      </div>

      {/* Table */}
      <Card padding="none">
        {accounts.length === 0 ? (
          <EmptyState
            icon={<BuildingOfficeIcon className="h-12 w-12" />}
            title="No accounts yet"
            description="Get started by adding your first account"
            action={
              <Button onClick={() => setShowCreateModal(true)}>
                Add Account
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableCaption>List of accounts</TableCaption>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Domain</TableHead>
                  <TableHead className="hidden md:table-cell">Industry</TableHead>
                  <TableHead className="hidden lg:table-cell">Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <Link
                        href={`/accounts/${account.id}`}
                        className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                      >
                        {account.name}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" muted>
                      {account.domain || '-'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" muted>
                      {account.industry || '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell" muted>
                      {account.employeeCount?.toLocaleString() || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          account.status === 'active'
                            ? 'success'
                            : account.status === 'prospect'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {account.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Menu align="right">
                        <MenuItem
                          icon={<EyeIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/accounts/${account.id}`)}
                        >
                          View
                        </MenuItem>
                        <MenuItem
                          icon={<PencilIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/accounts/${account.id}/edit`)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon={<TrashIcon className="h-4 w-4" />}
                          danger
                          onClick={() => handleDelete(account.id)}
                        >
                          Delete
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
        title="Add Account"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Company Name *
            </label>
            <Input
              placeholder="Acme Corporation"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Domain
            </label>
            <Input
              placeholder="acme.com"
              value={createForm.domain}
              onChange={(e) =>
                setCreateForm({ ...createForm, domain: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Industry
            </label>
            <Input
              placeholder="Technology"
              value={createForm.industry}
              onChange={(e) =>
                setCreateForm({ ...createForm, industry: e.target.value })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Account
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

