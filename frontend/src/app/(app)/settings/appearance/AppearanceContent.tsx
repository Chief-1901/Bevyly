'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';

const THEMES = [
  {
    id: 'light',
    label: 'Light',
    description: 'Classic light appearance',
    icon: SunIcon,
  },
  {
    id: 'dark',
    label: 'Dark',
    description: 'Easy on the eyes',
    icon: MoonIcon,
  },
  {
    id: 'system',
    label: 'System',
    description: 'Follows your device settings',
    icon: ComputerDesktopIcon,
  },
];

const DENSITY_OPTIONS = [
  {
    id: 'comfortable',
    label: 'Comfortable',
    description: 'More spacing for easier reading',
  },
  {
    id: 'compact',
    label: 'Compact',
    description: 'Fit more content on screen',
  },
];

const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'MMM D, YYYY', label: 'Jan 1, 2026' },
  { value: 'D MMM YYYY', label: '1 Jan 2026' },
];

const NUMBER_FORMATS = [
  { value: 'en-US', label: '1,234.56 (US)' },
  { value: 'en-GB', label: '1,234.56 (UK)' },
  { value: 'de-DE', label: '1.234,56 (German)' },
  { value: 'fr-FR', label: '1 234,56 (French)' },
];

export function AppearanceContent() {
  const { toast } = useToast();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [preferences, setPreferences] = useState({
    density: 'comfortable',
    dateFormat: 'MMM D, YYYY',
    numberFormat: 'en-US',
  });

  useEffect(() => {
    setMounted(true);
    loadPreferences();
  }, []);

  const loadPreferences = () => {
    // Load from localStorage
    const stored = localStorage.getItem('bevyly-appearance');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPreferences((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Ignore parse errors
      }
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setHasChanges(true);
  };

  const handlePreferenceChange = (key: string, value: string) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      // Save to localStorage
      localStorage.setItem('bevyly-appearance', JSON.stringify(preferences));

      // Optionally save to backend for sync across devices
      try {
        await fetch('/api/v1/users/me/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appearance: {
              theme,
              ...preferences,
            },
          }),
        });
      } catch {
        // Backend save is optional, don't fail if it errors
      }

      toast.success('Preferences saved', 'Your appearance settings have been updated');
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Save failed', 'Could not save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Appearance</h1>
          <p className="text-sm text-text-muted mt-1">Customize your Bevyly experience</p>
        </div>
        <Card padding="lg">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="flex gap-4">
              <div className="h-24 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-24 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-24 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
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
          <h1 className="text-2xl font-bold text-text-primary">Appearance</h1>
          <p className="text-sm text-text-muted mt-1">
            Customize how Bevyly looks on your device
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} isLoading={isSaving}>
            Save Changes
          </Button>
        )}
      </div>

      {/* Theme Selection */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Theme</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                className={`
                  relative flex flex-col items-center p-4 rounded-lg border-2 transition-all
                  ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckIcon className="w-5 h-5 text-primary-500" />
                  </div>
                )}
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-3
                    ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-text-muted'}
                  `}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className="font-medium text-text-primary">{t.label}</span>
                <span className="text-xs text-text-muted mt-1">{t.description}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Density */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Display Density</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DENSITY_OPTIONS.map((option) => {
            const isActive = preferences.density === option.id;
            return (
              <button
                key={option.id}
                onClick={() => handlePreferenceChange('density', option.id)}
                className={`
                  relative flex items-center p-4 rounded-lg border-2 transition-all text-left
                  ${
                    isActive
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-950'
                      : 'border-border hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                {isActive && (
                  <div className="absolute top-2 right-2">
                    <CheckIcon className="w-5 h-5 text-primary-500" />
                  </div>
                )}
                <div className="mr-4">
                  {/* Density preview */}
                  <div
                    className={`
                      w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex flex-col justify-center
                      ${option.id === 'compact' ? 'gap-0.5 p-1' : 'gap-1 p-1.5'}
                    `}
                  >
                    <div className="h-1 bg-gray-400 dark:bg-gray-500 rounded"></div>
                    <div className="h-1 bg-gray-400 dark:bg-gray-500 rounded w-3/4"></div>
                    <div className="h-1 bg-gray-400 dark:bg-gray-500 rounded w-1/2"></div>
                  </div>
                </div>
                <div>
                  <span className="font-medium text-text-primary">{option.label}</span>
                  <p className="text-xs text-text-muted mt-0.5">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-text-muted mt-4">
          Note: Density settings will be fully implemented in a future update.
        </p>
      </Card>

      {/* Format Preferences */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Format Preferences</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Date Format
            </label>
            <select
              className="w-full sm:w-64 h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={preferences.dateFormat}
              onChange={(e) => handlePreferenceChange('dateFormat', e.target.value)}
            >
              {DATE_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Number Format
            </label>
            <select
              className="w-full sm:w-64 h-11 px-4 rounded-md border border-border bg-surface text-text-primary"
              value={preferences.numberFormat}
              onChange={(e) => handlePreferenceChange('numberFormat', e.target.value)}
            >
              {NUMBER_FORMATS.map((format) => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Preview */}
      <Card padding="lg" className="bg-gray-50 dark:bg-gray-900">
        <h3 className="text-sm font-medium text-text-primary mb-3">Preview</h3>
        <div className="space-y-2 text-sm">
          <p className="text-text-muted">
            Current theme:{' '}
            <span className="text-text-primary font-medium">
              {resolvedTheme === 'dark' ? 'Dark' : 'Light'}
              {theme === 'system' && ' (System)'}
            </span>
          </p>
          <p className="text-text-muted">
            Sample date:{' '}
            <span className="text-text-primary font-medium">
              {new Date().toLocaleDateString(
                preferences.numberFormat,
                preferences.dateFormat === 'YYYY-MM-DD'
                  ? { year: 'numeric', month: '2-digit', day: '2-digit' }
                  : { year: 'numeric', month: 'short', day: 'numeric' }
              )}
            </span>
          </p>
          <p className="text-text-muted">
            Sample number:{' '}
            <span className="text-text-primary font-medium">
              {new Intl.NumberFormat(preferences.numberFormat, {
                style: 'currency',
                currency: 'USD',
              }).format(12345.67)}
            </span>
          </p>
        </div>
      </Card>

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
