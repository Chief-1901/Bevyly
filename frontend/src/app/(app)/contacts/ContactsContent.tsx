'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SearchInput, Input } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
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
  UserIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import type { Contact } from '@/lib/api/server';

interface ContactsContentProps {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentSearch: string;
}

export function ContactsContent({
  contacts,
  pagination,
  currentSearch,
}: ContactsContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [search, setSearch] = useState(currentSearch);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    title: '',
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams();
    if (value) params.set('search', value);
    router.push(`/contacts?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentSearch) params.set('search', currentSearch);
    router.push(`/contacts?${params.toString()}`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Contact created',
          message: `${createForm.firstName || createForm.email} has been added.`,
        });
        setShowCreateModal(false);
        setCreateForm({ email: '', firstName: '', lastName: '', title: '' });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create contact',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to create contact:', error);
      addToast({
        type: 'error',
        title: 'Failed to create contact',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch(`/api/v1/contacts/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'Contact deleted',
          message: 'The contact has been removed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to delete contact',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      addToast({
        type: 'error',
        title: 'Failed to delete contact',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  const getContactName = (contact: Contact): string => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName} ${contact.lastName}`;
    }
    return contact.email;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Contacts</h1>
          <p className="text-sm text-text-muted mt-1">Manage your contacts</p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Add Contact
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <SearchInput
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => handleSearch('')}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(search)}
        />
      </div>

      {/* Table */}
      <Card padding="none">
        {contacts.length === 0 ? (
          <EmptyState
            icon={<UserIcon className="h-12 w-12" />}
            title="No contacts yet"
            description="Get started by adding your first contact"
            action={
              <Button onClick={() => setShowCreateModal(true)}>Add Contact</Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableCaption>List of contacts</TableCaption>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary-500/20 flex items-center justify-center text-sm font-medium text-secondary-700 dark:text-secondary-500">
                          {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                        </div>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                        >
                          {getContactName(contact)}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" muted>
                      {contact.email}
                    </TableCell>
                    <TableCell className="hidden md:table-cell" muted>
                      {contact.title || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          contact.status === 'active'
                            ? 'success'
                            : contact.status === 'new'
                            ? 'info'
                            : 'neutral'
                        }
                      >
                        {contact.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Menu align="right">
                        <MenuItem
                          icon={<EyeIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/contacts/${contact.id}`)}
                        >
                          View
                        </MenuItem>
                        <MenuItem
                          icon={<PencilIcon className="h-4 w-4" />}
                          onClick={() => router.push(`/contacts/${contact.id}/edit`)}
                        >
                          Edit
                        </MenuItem>
                        <MenuItem
                          icon={<TrashIcon className="h-4 w-4" />}
                          danger
                          onClick={() => handleDelete(contact.id)}
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
        title="Add Contact"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email *
            </label>
            <Input
              type="email"
              placeholder="john@example.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
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
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Last Name
              </label>
              <Input
                placeholder="Doe"
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Title
            </label>
            <Input
              placeholder="VP of Sales"
              value={createForm.title}
              onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Contact
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

