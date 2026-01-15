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
import {
  EnvelopeIcon,
  PencilSquareIcon,
  EyeOpenIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline';
import type { Email } from '@/lib/api/server';

interface EmailsContentProps {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentStatus: string;
}

type EmailStatus = '' | 'draft' | 'scheduled' | 'sending' | 'sent' | 'delivered' | 'bounced';

const statusOptions = [
  { value: '' as EmailStatus, label: 'All' },
  { value: 'draft' as EmailStatus, label: 'Draft' },
  { value: 'sent' as EmailStatus, label: 'Sent' },
  { value: 'delivered' as EmailStatus, label: 'Delivered' },
  { value: 'bounced' as EmailStatus, label: 'Bounced' },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'success';
    case 'sent':
    case 'sending':
      return 'info';
    case 'draft':
    case 'scheduled':
      return 'warning';
    case 'bounced':
    case 'failed':
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
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function EmailsContent({
  emails,
  pagination,
  currentStatus,
}: EmailsContentProps) {
  const router = useRouter();
  const [status, setStatus] = useState<EmailStatus>(currentStatus as EmailStatus);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [composeForm, setComposeForm] = useState({
    toEmail: '',
    toName: '',
    subject: '',
    bodyText: '',
  });

  const handleStatusChange = (newStatus: EmailStatus) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    router.push(`/emails?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentStatus) params.set('status', currentStatus);
    router.push(`/emails?${params.toString()}`);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const response = await fetch('/api/v1/emails/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeForm),
      });

      if (response.ok) {
        setShowComposeModal(false);
        setComposeForm({ toEmail: '', toName: '', subject: '', bodyText: '' });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    setIsSending(true);

    try {
      const response = await fetch('/api/v1/emails/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(composeForm),
      });

      if (response.ok) {
        setShowComposeModal(false);
        setComposeForm({ toEmail: '', toName: '', subject: '', bodyText: '' });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Emails</h1>
          <p className="text-sm text-text-muted mt-1">Manage your email communications</p>
        </div>
        <Button
          leftIcon={<PencilSquareIcon className="h-4 w-4" />}
          onClick={() => setShowComposeModal(true)}
        >
          Compose
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
        {emails.length === 0 ? (
          <EmptyState
            icon={<EnvelopeIcon className="h-12 w-12" />}
            title="No emails yet"
            description="Compose your first email to get started"
            action={
              <Button onClick={() => setShowComposeModal(true)}>Compose Email</Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableCaption>List of emails</TableCaption>
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>Subject</TableHead>
                  <TableHead className="hidden sm:table-cell">To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Opens</TableHead>
                  <TableHead className="hidden md:table-cell">Clicks</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emails.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell>
                      <Link
                        href={`/emails/${email.id}`}
                        className="font-medium hover:text-primary-700 dark:hover:text-primary-500"
                      >
                        {email.subject || '(No subject)'}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" muted>
                      {email.toEmail}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(email.status)}>
                        {email.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1 text-text-muted">
                        <span className="text-sm">{email.openCount}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-1 text-text-muted">
                        <span className="text-sm">{email.clickCount}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell" muted>
                      {formatDate(email.sentAt)}
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

      {/* Compose Modal */}
      <Modal
        open={showComposeModal}
        onClose={() => setShowComposeModal(false)}
        title="Compose Email"
        size="lg"
      >
        <form onSubmit={handleSend} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                To Email *
              </label>
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={composeForm.toEmail}
                onChange={(e) => setComposeForm({ ...composeForm, toEmail: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                To Name
              </label>
              <Input
                placeholder="John Doe"
                value={composeForm.toName}
                onChange={(e) => setComposeForm({ ...composeForm, toName: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Subject *
            </label>
            <Input
              placeholder="Email subject..."
              value={composeForm.subject}
              onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Message *
            </label>
            <textarea
              className="w-full min-h-[200px] px-4 py-3 rounded-md border border-border bg-surface text-text-primary resize-none"
              placeholder="Write your message..."
              value={composeForm.bodyText}
              onChange={(e) => setComposeForm({ ...composeForm, bodyText: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowComposeModal(false)}>
              Cancel
            </Button>
            <Button type="button" variant="ghost" onClick={handleSaveDraft} disabled={isSending}>
              Save Draft
            </Button>
            <Button type="submit" isLoading={isSending}>
              Send Email
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

