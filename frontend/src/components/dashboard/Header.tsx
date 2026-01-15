'use client';

import { useState } from 'react';
import {
  Bars3Icon,
  BellIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { Button, IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import clsx from 'clsx';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
}

export function Header({ onMenuClick, sidebarCollapsed }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');

  return (
    <header
      className={clsx(
        'fixed top-0 right-0 z-30',
        'h-header bg-surface border-b border-border',
        'flex items-center justify-between px-4 lg:px-6',
        'transition-all duration-160',
        sidebarCollapsed ? 'left-sidebar-collapsed' : 'left-0 sm:left-sidebar'
      )}
    >
      {/* Left: Mobile menu + Breadcrumb */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="sm:hidden p-2 -ml-2 text-text-muted hover:text-text-primary transition-colors duration-120"
          aria-label="Open menu"
        >
          <Bars3Icon className="h-6 w-6" aria-hidden="true" />
        </button>
        <nav aria-label="Breadcrumb" className="hidden sm:block">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <span className="text-text-muted">Dashboard</span>
            </li>
            <li aria-hidden="true">
              <span className="text-text-muted">/</span>
            </li>
            <li>
              <span className="font-medium text-text-primary">Overview</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="hidden md:block flex-1 max-w-xl mx-8">
        <SearchInput
          placeholder="Search transactions..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onClear={() => setSearchValue('')}
        />
      </div>

      {/* Right: Utilities */}
      <div className="flex items-center gap-2">
        {/* Mobile search toggle */}
        <IconButton
          aria-label="Search"
          className="md:hidden"
        >
          <MagnifyingGlassIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </IconButton>

        {/* Notifications */}
        <IconButton aria-label="View notifications">
          <BellIcon className="h-[18px] w-[18px]" aria-hidden="true" />
        </IconButton>

        {/* Date picker chip */}
        <button
          className={clsx(
            'hidden lg:flex items-center gap-2 h-9 px-3 rounded-md',
            'bg-surface-primary-a06 text-sm text-text-primary',
            'hover:bg-gray-300',
            'transition-colors duration-120',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          )}
        >
          <CalendarIcon className="h-4 w-4" aria-hidden="true" />
          <span>Jan 1 - Jan 31, 2026</span>
        </button>

        {/* Export CSV */}
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<ArrowDownTrayIcon className="h-4 w-4" aria-hidden="true" />}
          className="hidden sm:flex"
        >
          Export CSV
        </Button>

        {/* Theme switch */}
        <ThemeSwitch />

        {/* Avatar */}
        <button
          className="ml-2 h-10 w-10 rounded-full bg-secondary-500 flex items-center justify-center text-white font-medium transition-all duration-120 hover:ring-2 hover:ring-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          aria-label="User menu"
        >
          JD
        </button>
      </div>
    </header>
  );
}

export default Header;
