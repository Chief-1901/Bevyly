'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useCurrentUser, getUserDisplayInfo } from '@/hooks/useCurrentUser';
import clsx from 'clsx';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useCurrentUser();
  const userDisplayInfo = getUserDisplayInfo(user);

  return (
    <div className="min-h-screen bg-bg">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-700 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-focus"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar */}
      <div className="hidden sm:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileNav
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Header */}
      <Header
        onMenuClick={() => setMobileMenuOpen(true)}
        sidebarCollapsed={sidebarCollapsed}
        user={userDisplayInfo}
      />

      {/* Main Content */}
      <main
        id="main-content"
        className={clsx(
          'min-h-screen',
          'transition-all duration-160',
          // Left margin to account for sidebar (margin, not padding, so background fills properly)
          sidebarCollapsed ? 'sm:ml-sidebar-collapsed' : 'sm:ml-sidebar'
        )}
      >
        {/* Content wrapper with proper padding */}
        <div
          className={clsx(
            // Top padding: header height + breathing room
            'pt-[calc(var(--header-height)+1.5rem)]',
            // Responsive horizontal padding
            'px-3 sm:px-4 lg:px-6',
            // Bottom padding
            'pb-6'
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardShell;
