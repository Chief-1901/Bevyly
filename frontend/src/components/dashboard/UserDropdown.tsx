'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { useToast } from '@/components/ui/Toast';

interface UserDropdownProps {
  user?: {
    name?: string;
    email?: string;
    initials?: string;
  };
}

export function UserDropdown({ user }: UserDropdownProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials from name or email
  const initials = user?.initials || 
    (user?.name 
      ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : user?.email?.[0]?.toUpperCase() || 'U');

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast.success('Signed out', 'You have been signed out successfully.');
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push('/login');
          router.refresh();
        }, 500);
      } else {
        toast.error('Sign out failed', 'There was a problem signing you out. Please try again.');
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Sign out failed', 'Could not connect to the server.');
    } finally {
      setIsLoggingOut(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 ml-2 rounded-full transition-all duration-120 hover:ring-2 hover:ring-focus focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="h-10 w-10 rounded-full bg-secondary-500 flex items-center justify-center text-white font-medium">
          {initials}
        </div>
        <ChevronDownIcon 
          className={`h-4 w-4 text-text-muted transition-transform duration-160 hidden sm:block ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 origin-top-right rounded-lg bg-surface border border-border shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fade-in"
          role="menu"
          aria-orientation="vertical"
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-medium text-text-primary truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {user?.email || 'No email'}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-1" role="none">
            <Link
              href="/settings/profile"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <UserCircleIcon className="h-5 w-5 text-text-muted" aria-hidden="true" />
              Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              role="menuitem"
              onClick={() => setIsOpen(false)}
            >
              <Cog6ToothIcon className="h-5 w-5 text-text-muted" aria-hidden="true" />
              Settings
            </Link>
          </div>

          {/* Sign Out */}
          <div className="border-t border-border py-1" role="none">
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors disabled:opacity-50"
              role="menuitem"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" aria-hidden="true" />
              {isLoggingOut ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserDropdown;
