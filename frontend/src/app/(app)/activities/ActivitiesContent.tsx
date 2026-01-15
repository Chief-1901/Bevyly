'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  ClipboardDocumentListIcon,
  PlusIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { Activity } from '@/lib/api/server';

interface ActivitiesContentProps {
  activities: Activity[];
  nextCursor: string | null;
  currentType: string;
}

type ActivityType = '' | 'email' | 'call' | 'meeting' | 'note';

const typeOptions = [
  { value: '' as ActivityType, label: 'All' },
  { value: 'email' as ActivityType, label: 'Emails' },
  { value: 'call' as ActivityType, label: 'Calls' },
  { value: 'meeting' as ActivityType, label: 'Meetings' },
  { value: 'note' as ActivityType, label: 'Notes' },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getActivityIcon(type: string) {
  switch (type) {
    case 'email':
      return <EnvelopeIcon className="h-5 w-5" />;
    case 'call':
      return <PhoneIcon className="h-5 w-5" />;
    case 'meeting':
      return <CalendarIcon className="h-5 w-5" />;
    case 'note':
      return <DocumentTextIcon className="h-5 w-5" />;
    default:
      return <ClipboardDocumentListIcon className="h-5 w-5" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'email':
      return 'bg-info/20 text-info';
    case 'call':
      return 'bg-success/20 text-success';
    case 'meeting':
      return 'bg-secondary-500/20 text-secondary-700 dark:text-secondary-500';
    case 'note':
      return 'bg-warning/20 text-warning';
    default:
      return 'bg-gray-100 dark:bg-gray-300 text-text-muted';
  }
}

export function ActivitiesContent({
  activities,
  nextCursor,
  currentType,
}: ActivitiesContentProps) {
  const router = useRouter();
  const [type, setType] = useState<ActivityType>(currentType as ActivityType);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [noteForm, setNoteForm] = useState({ content: '' });
  const [callForm, setCallForm] = useState({
    direction: 'outbound',
    status: 'completed',
    notes: '',
  });

  const handleTypeChange = (newType: ActivityType) => {
    setType(newType);
    const params = new URLSearchParams();
    if (newType) params.set('type', newType);
    router.push(`/activities?${params.toString()}`);
  };

  const handleLoadMore = () => {
    if (!nextCursor) return;
    const params = new URLSearchParams();
    if (currentType) params.set('type', currentType);
    params.set('cursor', nextCursor);
    router.push(`/activities?${params.toString()}`);
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/activities/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
      });

      if (response.ok) {
        setShowNoteModal(false);
        setNoteForm({ content: '' });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const response = await fetch('/api/v1/activities/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...callForm,
          startedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setShowCallModal(false);
        setCallForm({ direction: 'outbound', status: 'completed', notes: '' });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to log call:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Activities</h1>
          <p className="text-sm text-text-muted mt-1">Track all your activities</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            leftIcon={<DocumentTextIcon className="h-4 w-4" />}
            onClick={() => setShowNoteModal(true)}
          >
            Add Note
          </Button>
          <Button
            leftIcon={<PhoneIcon className="h-4 w-4" />}
            onClick={() => setShowCallModal(true)}
          >
            Log Call
          </Button>
        </div>
      </div>

      {/* Type Filter */}
      <SegmentedControl
        options={typeOptions}
        value={type}
        onChange={handleTypeChange}
      />

      {/* Activity Feed */}
      <Card padding="none">
        {activities.length === 0 ? (
          <EmptyState
            icon={<ClipboardDocumentListIcon className="h-12 w-12" />}
            title="No activities yet"
            description="Activities will appear here as you work"
          />
        ) : (
          <ul className="divide-y divide-border">
            {activities.map((activity) => (
              <li
                key={activity.id}
                className="flex items-start gap-4 p-4 hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors"
              >
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${getActivityColor(
                    activity.type
                  )}`}
                >
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-primary">
                        {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                      </p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {activity.description || 'No description'}
                      </p>
                    </div>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatDate(activity.occurredAt)}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon className="h-5 w-5 text-text-muted flex-shrink-0" />
              </li>
            ))}
          </ul>
        )}

        {nextCursor && (
          <div className="p-4 border-t border-border">
            <Button variant="secondary" className="w-full" onClick={handleLoadMore}>
              Load More
            </Button>
          </div>
        )}
      </Card>

      {/* Add Note Modal */}
      <Modal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title="Add Note"
        size="md"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Note *
            </label>
            <textarea
              className="w-full min-h-[120px] px-4 py-3 rounded-md border border-border bg-surface text-text-primary resize-none"
              placeholder="Write your note..."
              value={noteForm.content}
              onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowNoteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Add Note
            </Button>
          </div>
        </form>
      </Modal>

      {/* Log Call Modal */}
      <Modal
        open={showCallModal}
        onClose={() => setShowCallModal(false)}
        title="Log Call"
        size="md"
      >
        <form onSubmit={handleLogCall} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Direction
              </label>
              <select
                className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
                value={callForm.direction}
                onChange={(e) => setCallForm({ ...callForm, direction: e.target.value })}
              >
                <option value="outbound">Outbound</option>
                <option value="inbound">Inbound</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Status
              </label>
              <select
                className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
                value={callForm.status}
                onChange={(e) => setCallForm({ ...callForm, status: e.target.value })}
              >
                <option value="completed">Completed</option>
                <option value="no_answer">No Answer</option>
                <option value="voicemail">Voicemail</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Notes
            </label>
            <textarea
              className="w-full min-h-[80px] px-4 py-3 rounded-md border border-border bg-surface text-text-primary resize-none"
              placeholder="Call notes..."
              value={callForm.notes}
              onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowCallModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Log Call
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

