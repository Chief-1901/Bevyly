'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Menu, MenuItem } from '@/components/ui/Menu';
import {
  PlusIcon,
  UsersIcon,
  EnvelopeIcon,
  TrashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface TeamMember {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

const ROLES = [
  { value: 'ADMIN', label: 'Admin', description: 'Full access to all features' },
  { value: 'MANAGER', label: 'Manager', description: 'Manage team and view reports' },
  { value: 'SALES_REP', label: 'Sales Rep', description: 'Standard sales access' },
  { value: 'VIEWER', label: 'Viewer', description: 'Read-only access' },
];

function getRoleBadgeVariant(role: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (role) {
    case 'ADMIN':
      return 'danger';
    case 'MANAGER':
      return 'warning';
    case 'SALES_REP':
      return 'success';
    case 'VIEWER':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function getStatusBadgeVariant(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
  switch (status) {
    case 'active':
      return 'success';
    case 'pending':
      return 'warning';
    case 'inactive':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function TeamContent() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'SALES_REP',
  });
  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    fetchTeamMembers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/v1/users/me');
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setCurrentUserRole(data.data.roles?.[0] || '');
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/v1/users');
      const data = await response.json();

      if (response.ok && data.success) {
        setMembers(data.data || []);
      } else {
        toast.error('Failed to load team', data.error?.message || 'Could not fetch team members');
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
      toast.error('Failed to load team', 'Could not connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);

    try {
      const response = await fetch('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Invitation sent', `Invite sent to ${inviteForm.email}`);
        setShowInviteModal(false);
        setInviteForm({ email: '', role: 'SALES_REP' });
        fetchTeamMembers();
      } else {
        toast.error('Invitation failed', data.error?.message || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Failed to invite user:', error);
      toast.error('Invitation failed', 'Could not connect to server');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Role updated', 'Team member role has been changed');
        fetchTeamMembers();
      } else {
        toast.error('Update failed', data.error?.message || 'Failed to update role');
      }
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Update failed', 'Could not connect to server');
    }
  };

  const handleDeactivate = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'inactive' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Member deactivated', 'Team member has been deactivated');
        fetchTeamMembers();
      } else {
        toast.error('Deactivation failed', data.error?.message || 'Failed to deactivate member');
      }
    } catch (error) {
      console.error('Failed to deactivate member:', error);
      toast.error('Deactivation failed', 'Could not connect to server');
    }
  };

  const handleReactivate = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active' }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Member reactivated', 'Team member has been reactivated');
        fetchTeamMembers();
      } else {
        toast.error('Reactivation failed', data.error?.message || 'Failed to reactivate member');
      }
    } catch (error) {
      console.error('Failed to reactivate member:', error);
      toast.error('Reactivation failed', 'Could not connect to server');
    }
  };

  const handleResendInvite = async (userId: string, email: string) => {
    try {
      const response = await fetch(`/api/v1/users/${userId}/resend-invite`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Invitation resent', `New invite sent to ${email}`);
      } else {
        toast.error('Resend failed', data.error?.message || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Failed to resend invite:', error);
      toast.error('Resend failed', 'Could not connect to server');
    }
  };

  const isAdmin = currentUserRole === 'ADMIN';

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Team</h1>
            <p className="text-sm text-text-muted mt-1">Manage your team members</p>
          </div>
        </div>
        <Card padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="text-sm text-text-muted mt-1">
            Manage your team members and permissions
          </p>
        </div>
        {isAdmin && (
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowInviteModal(true)}
          >
            Invite Member
          </Button>
        )}
      </div>

      {/* Team Members Table */}
      <Card padding="none">
        {members.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className="h-12 w-12" />}
            title="No team members"
            description="Invite your first team member to get started"
            action={
              isAdmin ? (
                <Button onClick={() => setShowInviteModal(true)}>Invite Member</Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow hover={false}>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                {isAdmin && (
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-text-primary">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.email}
                      </p>
                      <p className="text-xs text-text-muted">{member.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {ROLES.find((r) => r.value === member.role)?.label || member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell" muted>
                    {formatDate(member.createdAt)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Menu align="right">
                        {ROLES.filter((r) => r.value !== member.role).map((role) => (
                          <MenuItem
                            key={role.value}
                            onClick={() => handleRoleChange(member.id, role.value)}
                          >
                            Change to {role.label}
                          </MenuItem>
                        ))}
                        {member.status === 'pending' && (
                          <MenuItem
                            icon={<EnvelopeIcon className="h-4 w-4" />}
                            onClick={() => handleResendInvite(member.id, member.email)}
                          >
                            Resend Invite
                          </MenuItem>
                        )}
                        {member.status === 'active' && (
                          <MenuItem
                            icon={<TrashIcon className="h-4 w-4" />}
                            danger
                            onClick={() => handleDeactivate(member.id)}
                          >
                            Deactivate
                          </MenuItem>
                        )}
                        {member.status === 'inactive' && (
                          <MenuItem
                            icon={<ArrowPathIcon className="h-4 w-4" />}
                            onClick={() => handleReactivate(member.id)}
                          >
                            Reactivate
                          </MenuItem>
                        )}
                      </Menu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Role Legend */}
      <Card padding="md">
        <h3 className="text-sm font-medium text-text-primary mb-3">Role Permissions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLES.map((role) => (
            <div key={role.value} className="flex items-start gap-2">
              <Badge variant={getRoleBadgeVariant(role.value)} className="flex-shrink-0">
                {role.label}
              </Badge>
              <span className="text-xs text-text-muted">{role.description}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Modal */}
      <Modal
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Team Member"
        size="md"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email Address *
            </label>
            <Input
              type="email"
              placeholder="colleague@company.com"
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Role
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            >
              {ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-text-muted">
            The invited member will receive an email with instructions to set up their account.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowInviteModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isInviting}>
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
