'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { BellIcon, EnvelopeIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';

interface NotificationPreference {
  id: string;
  label: string;
  description: string;
  email: boolean;
  inApp: boolean;
  push: boolean;
}

interface NotificationCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  preferences: NotificationPreference[];
}

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  {
    id: 'leads',
    label: 'Leads',
    icon: BellIcon,
    preferences: [
      {
        id: 'lead_assigned',
        label: 'Lead assigned to me',
        description: 'When a new lead is assigned to you',
        email: true,
        inApp: true,
        push: false,
      },
      {
        id: 'lead_converted',
        label: 'Lead converted',
        description: 'When a lead you own is converted',
        email: true,
        inApp: true,
        push: false,
      },
      {
        id: 'lead_score_change',
        label: 'Lead score changes',
        description: 'When a lead score significantly changes',
        email: false,
        inApp: true,
        push: false,
      },
    ],
  },
  {
    id: 'deals',
    label: 'Deals & Opportunities',
    icon: BellIcon,
    preferences: [
      {
        id: 'deal_stage_change',
        label: 'Deal stage changed',
        description: 'When a deal moves to a new stage',
        email: true,
        inApp: true,
        push: false,
      },
      {
        id: 'deal_closing_soon',
        label: 'Deal closing soon',
        description: 'Reminder before expected close date',
        email: true,
        inApp: true,
        push: false,
      },
      {
        id: 'deal_won',
        label: 'Deal won',
        description: 'When a deal is marked as won',
        email: true,
        inApp: true,
        push: true,
      },
      {
        id: 'deal_lost',
        label: 'Deal lost',
        description: 'When a deal is marked as lost',
        email: true,
        inApp: true,
        push: false,
      },
    ],
  },
  {
    id: 'emails',
    label: 'Email & Communication',
    icon: EnvelopeIcon,
    preferences: [
      {
        id: 'email_reply',
        label: 'Email reply received',
        description: 'When someone replies to your email',
        email: true,
        inApp: true,
        push: true,
      },
      {
        id: 'email_opened',
        label: 'Email opened',
        description: 'When a tracked email is opened',
        email: false,
        inApp: true,
        push: false,
      },
      {
        id: 'email_clicked',
        label: 'Link clicked',
        description: 'When a link in your email is clicked',
        email: false,
        inApp: true,
        push: false,
      },
    ],
  },
  {
    id: 'meetings',
    label: 'Meetings & Calendar',
    icon: BellIcon,
    preferences: [
      {
        id: 'meeting_reminder',
        label: 'Meeting reminders',
        description: 'Reminder before scheduled meetings',
        email: true,
        inApp: true,
        push: true,
      },
      {
        id: 'meeting_booked',
        label: 'Meeting booked',
        description: 'When someone books a meeting with you',
        email: true,
        inApp: true,
        push: true,
      },
      {
        id: 'meeting_cancelled',
        label: 'Meeting cancelled',
        description: 'When a meeting is cancelled',
        email: true,
        inApp: true,
        push: false,
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports & Summaries',
    icon: BellIcon,
    preferences: [
      {
        id: 'daily_briefing',
        label: 'Daily briefing',
        description: 'Morning summary of your priorities',
        email: true,
        inApp: false,
        push: false,
      },
      {
        id: 'weekly_summary',
        label: 'Weekly summary',
        description: 'End of week performance report',
        email: true,
        inApp: false,
        push: false,
      },
    ],
  },
];

function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        ${enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
          transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export function NotificationsContent() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [categories, setCategories] = useState<NotificationCategory[]>(DEFAULT_CATEGORIES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/v1/users/me/preferences');
      const data = await response.json();

      if (response.ok && data.success && data.data?.notifications) {
        // Merge server data with default preferences
        const serverPrefs = data.data.notifications;
        const updatedCategories = DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          preferences: category.preferences.map((pref) => ({
            ...pref,
            email: serverPrefs[pref.id]?.email ?? pref.email,
            inApp: serverPrefs[pref.id]?.inApp ?? pref.inApp,
            push: serverPrefs[pref.id]?.push ?? pref.push,
          })),
        }));
        setCategories(updatedCategories);
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      // Keep default preferences if API fails
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (categoryId: string, prefId: string, channel: 'email' | 'inApp' | 'push') => {
    setCategories((prev) =>
      prev.map((category) => {
        if (category.id !== categoryId) return category;
        return {
          ...category,
          preferences: category.preferences.map((pref) => {
            if (pref.id !== prefId) return pref;
            return {
              ...pref,
              [channel]: !pref[channel],
            };
          }),
        };
      })
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Flatten preferences for API
      const notifications: Record<string, { email: boolean; inApp: boolean; push: boolean }> = {};
      categories.forEach((category) => {
        category.preferences.forEach((pref) => {
          notifications[pref.id] = {
            email: pref.email,
            inApp: pref.inApp,
            push: pref.push,
          };
        });
      });

      const response = await fetch('/api/v1/users/me/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Preferences saved', 'Your notification preferences have been updated');
        setHasChanges(false);
      } else {
        toast.error('Save failed', data.error?.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Save failed', 'Could not connect to server');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">Manage your notification preferences</p>
        </div>
        <Card padding="lg">
          <div className="animate-pulse space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
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
          <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
          <p className="text-sm text-text-muted mt-1">
            Choose how and when you want to be notified
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        )}
      </div>

      {/* Channel Legend */}
      <Card padding="md" className="bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-5 h-5 text-text-muted" />
            <span className="text-sm text-text-muted">Email</span>
          </div>
          <div className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-text-muted" />
            <span className="text-sm text-text-muted">In-App</span>
          </div>
          <div className="flex items-center gap-2">
            <DevicePhoneMobileIcon className="w-5 h-5 text-text-muted" />
            <span className="text-sm text-text-muted">Push (coming soon)</span>
          </div>
        </div>
      </Card>

      {/* Notification Categories */}
      {categories.map((category) => (
        <Card key={category.id} padding="lg">
          <h2 className="text-lg font-semibold text-text-primary mb-4">{category.label}</h2>
          <div className="space-y-4">
            {category.preferences.map((pref) => (
              <div
                key={pref.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-border last:border-b-0"
              >
                <div>
                  <p className="font-medium text-text-primary">{pref.label}</p>
                  <p className="text-sm text-text-muted">{pref.description}</p>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted sm:hidden">Email</span>
                    <Toggle
                      enabled={pref.email}
                      onChange={() => handleToggle(category.id, pref.id, 'email')}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted sm:hidden">In-App</span>
                    <Toggle
                      enabled={pref.inApp}
                      onChange={() => handleToggle(category.id, pref.id, 'inApp')}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted sm:hidden">Push</span>
                    <Toggle
                      enabled={pref.push}
                      onChange={() => handleToggle(category.id, pref.id, 'push')}
                      disabled
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Save Button (sticky on mobile) */}
      {hasChanges && (
        <div className="sm:hidden fixed bottom-4 left-4 right-4">
          <Button className="w-full" onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
