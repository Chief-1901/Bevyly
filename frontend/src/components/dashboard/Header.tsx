'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { IconButton } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/Input';
import { UserDropdown } from './UserDropdown';
import clsx from 'clsx';

interface HeaderProps {
  onMenuClick: () => void;
  sidebarCollapsed: boolean;
  user?: {
    name?: string;
    email?: string;
    initials?: string;
  };
}

// Map routes to human-readable names
const routeNames: Record<string, string> = {
  briefing: 'Briefing',
  leads: 'Leads',
  accounts: 'Accounts',
  contacts: 'Contacts',
  opportunities: 'Opportunities',
  emails: 'Emails',
  calendar: 'Calendar',
  meetings: 'Meetings',
  sequences: 'Sequences',
  activities: 'Activities',
  dashboard: 'Dashboard',
  analytics: 'Analytics',
  settings: 'Settings',
  profile: 'Profile',
  'api-keys': 'API Keys',
  edit: 'Edit',
  new: 'New',
};

function generateBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    
    // Skip IDs (UUIDs or nanoids)
    if (segment.match(/^[a-zA-Z0-9_-]{10,}$/)) {
      continue;
    }
    
    const label = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, href: currentPath });
  }
  
  return breadcrumbs;
}

export function Header({ onMenuClick, sidebarCollapsed, user }: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const pathname = usePathname();
  const breadcrumbs = generateBreadcrumbs(pathname);

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
          <ol className="flex items-center text-sm">
            {breadcrumbs.length === 0 ? (
              <li>
                <span className="font-medium text-text-primary">Home</span>
              </li>
            ) : (
              breadcrumbs.map((crumb, index) => (
                <li key={crumb.href} className="flex items-center">
                  {index > 0 && (
                    <ChevronRightIcon 
                      className="h-4 w-4 mx-2 text-text-muted flex-shrink-0" 
                      aria-hidden="true" 
                    />
                  )}
                  {index === breadcrumbs.length - 1 ? (
                    <span className="font-medium text-text-primary">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      href={crumb.href}
                      className="text-text-muted hover:text-text-primary transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </li>
              ))
            )}
          </ol>
        </nav>
      </div>

      {/* Center: Search */}
      <div className="hidden md:block flex-1 max-w-xl mx-8">
        <SearchInput
          placeholder="Search..."
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

        {/* Theme switch */}
        <ThemeSwitch />

        {/* User Dropdown */}
        <UserDropdown user={user} />
      </div>
    </header>
  );
}

export default Header;
