'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface UserProfile {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  title?: string;
  timezone?: string;
  avatarUrl?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time' },
  { value: 'Asia/Shanghai', label: 'China Standard Time' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
  { value: 'UTC', label: 'UTC' },
];

export function ProfileContent() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    timezone: 'America/New_York',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/users/me');
      const data = await response.json();

      if (response.ok && data.success && data.data) {
        const user = data.data;
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          phone: user.phone || '',
          title: user.title || '',
          timezone: user.timezone || 'America/New_York',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile', 'Could not connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordForm((prev) => ({ ...prev, [field]: value }));
    setPasswordError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.firstName || undefined,
          lastName: formData.lastName || undefined,
          phone: formData.phone || undefined,
          title: formData.title || undefined,
          timezone: formData.timezone || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Profile updated', 'Your changes have been saved');
      } else {
        toast.error('Update failed', data.error?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Update failed', 'Could not connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/v1/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Password changed', 'Your password has been updated');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error('Password change failed', data.error?.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Password change failed', 'Could not connect to server');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
          <p className="text-sm text-text-muted mt-1">Manage your personal information</p>
        </div>
        <Card padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
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
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Profile</h1>
        <p className="text-sm text-text-muted mt-1">Manage your personal information</p>
      </div>

      {/* Profile Form */}
      <Card padding="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <UserCircleIcon className="w-16 h-16 text-text-muted" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-text-primary">Profile Photo</h3>
              <p className="text-xs text-text-muted mt-1">Avatar upload coming soon</p>
            </div>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                First Name
              </label>
              <Input
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Last Name
              </label>
              <Input
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          {/* Email (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Email Address
            </label>
            <Input
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50 dark:bg-gray-800 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-text-muted">
              Contact support to change your email address
            </p>
          </div>

          {/* Phone & Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Job Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Sales Representative"
              />
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Timezone
            </label>
            <select
              className="w-full h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Change Password Section */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Current Password
            </label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              placeholder="Enter current password"
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                New Password
              </label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
                placeholder="Enter new password"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Confirm New Password
              </label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                required
                error={passwordError}
              />
            </div>
          </div>
          <p className="text-xs text-text-muted">
            Password must be at least 8 characters long
          </p>
          <div className="flex justify-end pt-4 border-t border-border">
            <Button type="submit" variant="secondary" isLoading={isChangingPassword}>
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
