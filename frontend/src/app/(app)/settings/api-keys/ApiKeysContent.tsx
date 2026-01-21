'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
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
import { Menu, MenuItem } from '@/components/ui/Menu';
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { ApiKey } from '@/lib/api/server';

interface ApiKeysContentProps {
  apiKeys: ApiKey[];
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ApiKeysContent({ apiKeys }: ApiKeysContentProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    expiresInDays: '90',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/auth/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          expiresInDays: parseInt(createForm.expiresInDays) || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.data?.key) {
        setNewKey(data.data.key);
        setShowCreateModal(false);
        setShowKeyModal(true);
        setCreateForm({ name: '', expiresInDays: '90' });
        addToast({
          type: 'success',
          title: 'API key created',
          message: 'Your new API key is ready to use.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to create API key',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to create API key:', error);
      addToast({
        type: 'error',
        title: 'Failed to create API key',
        message: 'Could not connect to the server. Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/auth/api-keys/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (response.ok && data.success) {
        addToast({
          type: 'success',
          title: 'API key revoked',
          message: 'The API key has been permanently removed.',
        });
        router.refresh();
      } else {
        addToast({
          type: 'error',
          title: 'Failed to revoke API key',
          message: data.error?.message || 'An unexpected error occurred',
        });
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      addToast({
        type: 'error',
        title: 'Failed to revoke API key',
        message: 'Could not connect to the server. Please try again.',
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      addToast({
        type: 'success',
        title: 'Copied to clipboard',
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      addToast({
        type: 'error',
        title: 'Failed to copy',
        message: 'Could not copy to clipboard.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">API Keys</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your API keys for external integrations
          </p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create API Key
        </Button>
      </div>

      {/* Info Card */}
      <Card padding="md" className="bg-info/10 border-info/20">
        <div className="flex gap-3">
          <KeyIcon className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-text-primary font-medium">Keep your API keys secure</p>
            <p className="text-sm text-text-muted mt-1">
              API keys provide full access to your account. Never share them publicly or commit
              them to version control.
            </p>
          </div>
        </div>
      </Card>

      {/* Keys Table */}
      <Card padding="none">
        {apiKeys.length === 0 ? (
          <EmptyState
            icon={<KeyIcon className="h-12 w-12" />}
            title="No API keys yet"
            description="Create an API key to integrate with external services"
            action={
              <Button onClick={() => setShowCreateModal(true)}>Create API Key</Button>
            }
          />
        ) : (
          <Table>
            <TableCaption>Your API keys</TableCaption>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead className="hidden sm:table-cell">Last Used</TableHead>
                <TableHead className="hidden md:table-cell">Expires</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>
                    <span className="font-medium">{key.name}</span>
                  </TableCell>
                  <TableCell muted>
                    <code className="text-xs bg-gray-100 dark:bg-gray-300 px-2 py-1 rounded">
                      {key.keyPrefix}...
                    </code>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell" muted>
                    {formatDate(key.lastUsedAt)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell" muted>
                    {key.expiresAt ? formatDate(key.expiresAt) : 'Never'}
                  </TableCell>
                  <TableCell>
                    <Menu align="right">
                      <MenuItem
                        icon={<TrashIcon className="h-4 w-4" />}
                        danger
                        onClick={() => handleDelete(key.id)}
                      >
                        Revoke
                      </MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create API Key"
        size="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Key Name *
            </label>
            <Input
              placeholder="My Integration"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              required
            />
            <p className="mt-1 text-xs text-text-muted">
              A descriptive name to identify this key
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Expiration
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={createForm.expiresInDays}
              onChange={(e) => setCreateForm({ ...createForm, expiresInDays: e.target.value })}
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="">Never</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Key
            </Button>
          </div>
        </form>
      </Modal>

      {/* Key Display Modal */}
      <Modal
        open={showKeyModal}
        onClose={() => {
          setShowKeyModal(false);
          setNewKey('');
        }}
        title="API Key Created"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-warning/10 border border-warning/20 rounded-md">
            <p className="text-sm text-text-primary font-medium">
              Make sure to copy your API key now
            </p>
            <p className="text-sm text-text-muted mt-1">
              You won't be able to see it again after closing this dialog.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-gray-100 dark:bg-gray-300 rounded-md text-sm break-all">
              {newKey}
            </code>
            <Button
              variant="secondary"
              size="md"
              onClick={handleCopy}
              leftIcon={
                copied ? (
                  <CheckIcon className="h-4 w-4 text-success" />
                ) : (
                  <ClipboardDocumentIcon className="h-4 w-4" />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => {
                setShowKeyModal(false);
                setNewKey('');
              }}
            >
              Done
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

