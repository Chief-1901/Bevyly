import type { ReactNode } from 'react';
import Link from 'next/link';
import { KeyIcon, UserIcon, CogIcon } from '@heroicons/react/24/outline';

const settingsNav = [
  { name: 'API Keys', href: '/settings/api-keys', icon: KeyIcon },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Settings Navigation */}
      <nav className="lg:w-56 flex-shrink-0">
        <ul className="space-y-1">
          {settingsNav.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-300 transition-colors"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Settings Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

