'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const themes = [
  { id: 'light', label: 'Light', icon: SunIcon },
  { id: 'dark', label: 'Dark', icon: MoonIcon },
  { id: 'system', label: 'System', icon: ComputerDesktopIcon },
] as const;

interface ThemeSwitchProps {
  variant?: 'dropdown' | 'toggle';
  className?: string;
}

export function ThemeSwitch({ variant = 'toggle', className }: ThemeSwitchProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={clsx('h-9 w-9 rounded-md bg-surface-primary-a06', className)} />
    );
  }

  if (variant === 'toggle') {
    const isDark = resolvedTheme === 'dark';
    return (
      <button
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={clsx(
          'flex h-9 w-9 items-center justify-center rounded-md',
          'bg-surface border border-border',
          'hover:bg-surface-primary-a06',
          'transition-all duration-120',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
          className
        )}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <SunIcon className="h-[18px] w-[18px] text-text-primary" aria-hidden="true" />
        ) : (
          <MoonIcon className="h-[18px] w-[18px] text-text-primary" aria-hidden="true" />
        )}
      </button>
    );
  }

  // Dropdown variant with all three options
  return (
    <div className={clsx('relative inline-flex rounded-md bg-surface border border-border', className)}>
      {themes.map((t) => {
        const Icon = t.icon;
        const isActive = theme === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={clsx(
              'flex h-9 w-9 items-center justify-center',
              'first:rounded-l-md last:rounded-r-md',
              'transition-all duration-120',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:z-10',
              isActive
                ? 'bg-primary-700 text-white'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-primary-a06'
            )}
            aria-label={`Use ${t.label} theme`}
            aria-pressed={isActive}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitch;
