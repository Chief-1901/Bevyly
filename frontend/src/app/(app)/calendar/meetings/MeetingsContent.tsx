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
import { Badge } from '@/components/ui/Badge';
import { Menu, MenuItem } from '@/components/ui/Menu';
import {
  CalendarIcon,
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { Meeting } from '@/lib/api/server';

interface MeetingsContentProps {
  meetings: Meeting[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  currentStatus: string;
}

type MeetingStatus = '' | 'proposed' | 'confirmed' | 'cancelled' | 'completed';

const statusOptions = [
  { value: '' as MeetingStatus, label: 'All' },
  { value: 'proposed' as MeetingStatus, label: 'Proposed' },
  { value: 'confirmed' as MeetingStatus, label: 'Confirmed' },
  { value: 'completed' as MeetingStatus, label: 'Completed' },
  { value: 'cancelled' as MeetingStatus, label: 'Cancelled' },
];

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'success';
    case 'completed':
      return 'info';
    case 'proposed':
      return 'warning';
    case 'cancelled':
    case 'no_show':
      return 'danger';
    default:
      return 'neutral';
  }
};

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  if (durationMinutes < 60) return `${durationMinutes}m`;
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function MeetingsContent({
  meetings,
  pagination,
  currentStatus,
}: MeetingsContentProps) {
  const router = useRouter();
  const [status, setStatus] = useState<MeetingStatus>(currentStatus as MeetingStatus);
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [isProposing, setIsProposing] = useState(false);
  const [proposeForm, setProposeForm] = useState({
    title: '',
    type: 'video_call',
    date: '',
    startTime: '',
    duration: '30',
  });

  const handleStatusChange = (newStatus: MeetingStatus) => {
    setStatus(newStatus);
    const params = new URLSearchParams();
    if (newStatus) params.set('status', newStatus);
    router.push(`/calendar/meetings?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (currentStatus) params.set('status', currentStatus);
    router.push(`/calendar/meetings?${params.toString()}`);
  };

  const handlePropose = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProposing(true);

    try {
      const startTime = new Date(`${proposeForm.date}T${proposeForm.startTime}`);
      const endTime = new Date(startTime.getTime() + parseInt(proposeForm.duration) * 60000);

      const response = await fetch('/api/v1/calendar/meetings/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposeForm.title,
          type: proposeForm.type,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
        }),
      });

      if (response.ok) {
        setShowProposeModal(false);
        setProposeForm({ title: '', type: 'video_call', date: '', startTime: '', duration: '30' });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to propose meeting:', error);
    } finally {
      setIsProposing(false);
    }
  };

  const handleAction = async (id: string, action: 'confirm' | 'cancel' | 'complete' | 'no-show') => {
    try {
      await fetch(`/api/v1/calendar/meetings/${id}/${action}`, { method: 'POST' });
      router.refresh();
    } catch (error) {
      console.error(`Failed to ${action} meeting:`, error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Meetings</h1>
          <p className="text-sm text-text-muted mt-1">Manage your calendar meetings</p>
        </div>
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowProposeModal(true)}
        >
          Propose Meeting
        </Button>
      </div>

      {/* Status Filter */}
      <SegmentedControl
        options={statusOptions}
        value={status}
        onChange={handleStatusChange}
      />

      {/* Meetings List */}
      <Card padding="none">
        {meetings.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon className="h-12 w-12" />}
            title="No meetings yet"
            description="Propose a meeting to get started"
            action={
              <Button onClick={() => setShowProposeModal(true)}>Propose Meeting</Button>
            }
          />
        ) : (
          <>
            <ul className="divide-y divide-border">
              {meetings.map((meeting) => (
                <li
                  key={meeting.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors"
                >
                  <div className="h-12 w-12 rounded-md bg-secondary-500/20 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-secondary-700 dark:text-secondary-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/calendar/meetings/${meeting.id}`}
                        className="font-medium text-text-primary hover:text-primary-700 dark:hover:text-primary-500 truncate"
                      >
                        {meeting.title}
                      </Link>
                      <Badge variant={statusBadgeVariant(meeting.status)} size="sm">
                        {meeting.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted mt-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{formatDateTime(meeting.startTime)}</span>
                      <span>·</span>
                      <span>{formatDuration(meeting.startTime, meeting.endTime)}</span>
                      <span>·</span>
                      <span className="capitalize">{meeting.type.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <Menu align="right">
                    {meeting.status === 'proposed' && (
                      <MenuItem
                        icon={<CheckCircleIcon className="h-4 w-4" />}
                        onClick={() => handleAction(meeting.id, 'confirm')}
                      >
                        Confirm
                      </MenuItem>
                    )}
                    {meeting.status === 'confirmed' && (
                      <>
                        <MenuItem
                          icon={<CheckCircleIcon className="h-4 w-4" />}
                          onClick={() => handleAction(meeting.id, 'complete')}
                        >
                          Complete
                        </MenuItem>
                        <MenuItem
                          icon={<XCircleIcon className="h-4 w-4" />}
                          onClick={() => handleAction(meeting.id, 'no-show')}
                        >
                          No Show
                        </MenuItem>
                      </>
                    )}
                    {(meeting.status === 'proposed' || meeting.status === 'confirmed') && (
                      <MenuItem
                        icon={<XCircleIcon className="h-4 w-4" />}
                        danger
                        onClick={() => handleAction(meeting.id, 'cancel')}
                      >
                        Cancel
                      </MenuItem>
                    )}
                  </Menu>
                </li>
              ))}
            </ul>
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

      {/* Propose Modal */}
      <Modal
        open={showProposeModal}
        onClose={() => setShowProposeModal(false)}
        title="Propose Meeting"
        size="md"
      >
        <form onSubmit={handlePropose} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Meeting Title *
            </label>
            <Input
              placeholder="Q1 Review"
              value={proposeForm.title}
              onChange={(e) => setProposeForm({ ...proposeForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Type
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={proposeForm.type}
              onChange={(e) => setProposeForm({ ...proposeForm, type: e.target.value })}
            >
              <option value="video_call">Video Call</option>
              <option value="phone_call">Phone Call</option>
              <option value="in_person">In Person</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Date *
              </label>
              <Input
                type="date"
                value={proposeForm.date}
                onChange={(e) => setProposeForm({ ...proposeForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Time *
              </label>
              <Input
                type="time"
                value={proposeForm.startTime}
                onChange={(e) => setProposeForm({ ...proposeForm, startTime: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Duration
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={proposeForm.duration}
              onChange={(e) => setProposeForm({ ...proposeForm, duration: e.target.value })}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">1 hour</option>
              <option value="90">1.5 hours</option>
              <option value="120">2 hours</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowProposeModal(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isProposing}>
              Propose
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

