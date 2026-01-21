'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  CalendarIcon,
  QueueListIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Squares2X2Icon,
  SparklesIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    items: [
      { name: 'Briefing', href: '/briefing', icon: SparklesIcon },
    ],
  },
  {
    title: 'CRM',
    items: [
      { name: 'Leads', href: '/leads', icon: UserGroupIcon },
      { name: 'Accounts', href: '/accounts', icon: BuildingOfficeIcon },
      { name: 'Contacts', href: '/contacts', icon: UserIcon },
      { name: 'Opportunities', href: '/opportunities', icon: CurrencyDollarIcon },
    ],
  },
  {
    title: 'Engagement',
    items: [
      { name: 'Emails', href: '/emails', icon: EnvelopeIcon },
      { name: 'Calendar', href: '/calendar/meetings', icon: CalendarIcon },
      { name: 'Sequences', href: '/sequences', icon: QueueListIcon },
    ],
  },
  {
    title: 'Activity',
    items: [
      { name: 'Activities', href: '/activities', icon: ClipboardDocumentListIcon },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
      { name: 'Reports', href: '/analytics', icon: ChartBarIcon },
    ],
  },
  {
    title: 'Management',
    items: [
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        'fixed inset-y-0 left-0 z-40',
        'flex flex-col',
        'bg-surface border-r border-border',
        'transition-all duration-160',
        collapsed ? 'w-sidebar-collapsed' : 'w-sidebar'
      )}
    >
      {/* Logo / Org Selector */}
      <div className="flex h-header items-center justify-between px-5 border-b border-border">
        {!collapsed && (
          <Link href="/briefing" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-secondary-500 flex items-center justify-center">
              <Squares2X2Icon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
            </div>
            <span className="font-semibold text-text-primary">Bevyly</span>
          </Link>
        )}
        {collapsed && (
          <div className="mx-auto h-8 w-8 rounded-md bg-secondary-500 flex items-center justify-center">
            <Squares2X2Icon className="h-[18px] w-[18px] text-white" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4" aria-label="Sidebar navigation">
        {navigation.map((group, groupIdx) => (
          <div key={groupIdx} className="mb-4">
            {group.title && !collapsed && (
              <div className="px-5 mb-3 text-xs font-medium uppercase tracking-widest text-text-muted">
                {group.title}
              </div>
            )}
            <ul role="list" className="space-y-1 px-3">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'relative flex items-center gap-3 rounded-md h-12 text-sm font-medium',
                        'transition-colors duration-120',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus',
                        collapsed ? 'justify-center px-0' : 'pl-5 pr-3',
                        isActive
                          ? 'bg-surface-primary-a06 text-primary-700'
                          : 'text-text-muted hover:text-text-primary hover:bg-surface-primary-a06'
                      )}
                      title={collapsed ? item.name : undefined}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {/* Left highlight bar for active state */}
                      {isActive && !collapsed && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-700"
                          aria-hidden="true"
                        />
                      )}
                      <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle */}
      <div className="border-t border-border p-3">
        <button
          onClick={() => onCollapse(!collapsed)}
          className={clsx(
            'flex items-center justify-center w-full h-10 rounded-md',
            'text-text-muted hover:text-text-primary hover:bg-surface-primary-a06',
            'transition-colors duration-120',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <ChevronLeftIcon className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
