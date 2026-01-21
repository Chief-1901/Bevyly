'use client';

import { useState, useEffect } from 'react';

export interface CurrentUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
  customerId: string;
}

interface UseCurrentUserReturn {
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useCurrentUser(): UseCurrentUserReturn {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (response.ok && data.success) {
        setUser(data.data);
      } else {
        // Don't show error for 401 - user just isn't logged in
        if (response.status !== 401) {
          setError(data.error?.message || 'Failed to fetch user');
        }
        setUser(null);
      }
    } catch (err) {
      console.error('Error fetching current user:', err);
      setError('Could not connect to server');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    isLoading,
    error,
    refetch: fetchUser,
  };
}

// Helper to get user display info
export function getUserDisplayInfo(user: CurrentUser | null) {
  if (!user) {
    return {
      name: undefined,
      email: undefined,
      initials: 'U',
    };
  }

  const firstName = user.firstName || '';
  const lastName = user.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || undefined;
  
  // Generate initials
  let initials: string;
  if (firstName && lastName) {
    initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
  } else if (firstName) {
    initials = firstName.slice(0, 2).toUpperCase();
  } else if (user.email) {
    initials = user.email[0].toUpperCase();
  } else {
    initials = 'U';
  }

  return {
    name: fullName,
    email: user.email,
    initials,
  };
}
