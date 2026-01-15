'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import clsx from 'clsx';

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg">
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
      />

      {/* Main Content */}
      <main
        className={clsx(
          'pt-header min-h-screen',
          'transition-all duration-160',
          // Responsive page padding: mobile 12px, tablet 16px, desktop 24px
          'px-3 sm:px-4 lg:px-6 py-6',
          sidebarCollapsed ? 'sm:pl-sidebar-collapsed' : 'sm:pl-sidebar'
        )}
      >
        <div
          className={clsx(
            'transition-all duration-160',
            sidebarCollapsed
              ? 'sm:ml-sidebar-collapsed'
              : 'sm:ml-sidebar'
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

export default DashboardShell;
