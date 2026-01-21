import 'server-only';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Server-side API client with auth token handling
 * - Reads access_token from cookies
 * - Forwards Authorization header to backend
 * - Handles 401 by attempting token refresh
 */

interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Attempt to refresh the access token
 */
async function refreshAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;

  if (!refreshToken) {
    return null;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data.success || !data.data?.accessToken) {
      return null;
    }

    // Note: We can't set cookies from a server component directly
    // The cookie update will happen on the next route handler call
    // For now, we return the new token to use in the current request
    return data.data.accessToken;
  } catch {
    return null;
  }
}

/**
 * Server-side authenticated fetch
 */
async function serverFetch<T>(
  endpoint: string,
  options: FetchOptions = {},
  retryOnUnauth = true
): Promise<ApiResponse<T>> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  
  // Debug logging
  console.log('[ServerFetch] Request:', endpoint, {
    hasAccessToken: !!accessToken,
    tokenPrefix: accessToken?.substring(0, 20),
  });

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${BACKEND_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.log('[ServerFetch] WARNING: No access token found in cookies');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    // Return error response for network failures (backend down)
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: 'Could not connect to backend server',
      },
    };
  }

  // Handle 401 with token refresh
  if (response.status === 401 && retryOnUnauth && accessToken) {
    const newToken = await refreshAccessToken();

    if (newToken) {
      // Retry with new token
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`;

      const retryResponse = await fetch(url, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      const retryData = await retryResponse.json();

      if (!retryResponse.ok) {
        return {
          success: false,
          error: retryData.error || {
            code: 'REQUEST_FAILED',
            message: 'Request failed after token refresh',
          },
        };
      }

      return retryData;
    }

    // No refresh token or refresh failed
    throw new AuthError('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    return {
      success: false,
      error: errorData.error || {
        code: 'REQUEST_FAILED',
        message: `Request failed with status ${response.status}`,
      },
    };
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────
// API methods
// ─────────────────────────────────────────────────────────────

export const api = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: 'GET' }),

  /**
   * POST request
   */
  post: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: 'POST', body }),

  /**
   * PATCH request
   */
  patch: <T>(endpoint: string, body?: unknown, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: 'PATCH', body }),

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, options?: FetchOptions) =>
    serverFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};

// ─────────────────────────────────────────────────────────────
// Typed API endpoints
// ─────────────────────────────────────────────────────────────

// Types
export interface Account {
  id: string;
  customerId: string;
  name: string;
  domain?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  city?: string;
  state?: string;
  country?: string;
  status: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  customerId: string;
  accountId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  title?: string;
  department?: string;
  phone?: string;
  status: string;
  timezone?: string;
  engagementScore?: number;
  engagementTier?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: string;
  customerId: string;
  accountId: string;
  name: string;
  description?: string;
  stage: string;
  probability: number;
  amount?: number;
  currency: string;
  closeDate?: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineSummary {
  stage: string;
  count: number;
  totalAmount: number;
}

export interface Meeting {
  id: string;
  customerId: string;
  title: string;
  type: string;
  status: string;
  startTime: string;
  endTime: string;
  organizerId: string;
  createdAt: string;
}

export interface Email {
  id: string;
  customerId: string;
  subject: string;
  status: string;
  toEmail: string;
  sentAt?: string;
  openCount: number;
  clickCount: number;
  createdAt: string;
}

export interface Activity {
  id: string;
  customerId: string;
  type: string;
  description?: string;
  accountId?: string;
  contactId?: string;
  opportunityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
}

export interface Sequence {
  id: string;
  customerId: string;
  name: string;
  description?: string;
  status: string;
  ownerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes?: string[];
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

// Note: The backend returns pagination at the top level of ApiResponse, not nested in data
// ApiResponse structure: { success: true, data: T[], pagination: {...}, meta: {...} }
// So we access result.data for the array and result.pagination for pagination info
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ─────────────────────────────────────────────────────────────
// Domain-specific API functions
// ─────────────────────────────────────────────────────────────

export const accountsApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    // Backend returns { success, data: Account[], pagination: {...} } at top level
    return api.get<Account[]>(`/api/v1/accounts${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Account>(`/api/v1/accounts/${id}`),
  create: (data: Partial<Account>) => api.post<Account>('/api/v1/accounts', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/api/v1/accounts/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/accounts/${id}`),
  getContacts: (id: string) => api.get<Contact[]>(`/api/v1/accounts/${id}/contacts`),
  getOpportunities: (id: string) => api.get<Opportunity[]>(`/api/v1/accounts/${id}/opportunities`),
};

export const contactsApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    // Backend returns { success, data: Contact[], pagination: {...} } at top level
    return api.get<Contact[]>(`/api/v1/contacts${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Contact>(`/api/v1/contacts/${id}`),
  create: (data: Partial<Contact>) => api.post<Contact>('/api/v1/contacts', data),
  update: (id: string, data: Partial<Contact>) => api.patch<Contact>(`/api/v1/contacts/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/contacts/${id}`),
};

export const opportunitiesApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    // Backend returns { success, data: Opportunity[], pagination: {...} } at top level
    return api.get<Opportunity[]>(`/api/v1/opportunities${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Opportunity>(`/api/v1/opportunities/${id}`),
  create: (data: Partial<Opportunity>) => api.post<Opportunity>('/api/v1/opportunities', data),
  update: (id: string, data: Partial<Opportunity>) => api.patch<Opportunity>(`/api/v1/opportunities/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/opportunities/${id}`),
  getPipeline: (ownerId?: string) => {
    const query = ownerId ? `?ownerId=${ownerId}` : '';
    return api.get<PipelineSummary[]>(`/api/v1/opportunities/pipeline${query}`);
  },
  addContact: (id: string, contactId: string, role?: string) =>
    api.post<void>(`/api/v1/opportunities/${id}/contacts`, { contactId, role }),
};

export const emailsApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<PaginatedResponse<Email>>(`/api/v1/emails${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Email>(`/api/v1/emails/${id}`),
  send: (data: {
    toEmail: string;
    toName?: string;
    contactId?: string;
    accountId?: string;
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
  }) => api.post<Email>('/api/v1/emails/send', data),
  draft: (data: {
    toEmail: string;
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
  }) => api.post<Email>('/api/v1/emails/draft', data),
};

export const meetingsApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<PaginatedResponse<Meeting>>(`/api/v1/calendar/meetings${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Meeting>(`/api/v1/calendar/meetings/${id}`),
  upcoming: (limit = 5) => api.get<Meeting[]>(`/api/v1/calendar/meetings/upcoming?limit=${limit}`),
  propose: (data: {
    title: string;
    type: string;
    startTime: string;
    endTime: string;
    contactId?: string;
    accountId?: string;
  }) => api.post<Meeting>('/api/v1/calendar/meetings/propose', data),
  confirm: (id: string) => api.post<Meeting>(`/api/v1/calendar/meetings/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.post<Meeting>(`/api/v1/calendar/meetings/${id}/cancel`, { reason }),
  complete: (id: string, outcome?: string, notes?: string) =>
    api.post<Meeting>(`/api/v1/calendar/meetings/${id}/complete`, { outcome, notes }),
  noShow: (id: string) => api.post<Meeting>(`/api/v1/calendar/meetings/${id}/no-show`),
};

export const sequencesApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<PaginatedResponse<Sequence>>(`/api/v1/sequences${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Sequence>(`/api/v1/sequences/${id}`),
  create: (data: Partial<Sequence> & { steps?: unknown[] }) => api.post<Sequence>('/api/v1/sequences', data),
  update: (id: string, data: Partial<Sequence>) => api.patch<Sequence>(`/api/v1/sequences/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/sequences/${id}`),
  enroll: (id: string, contactId: string) => api.post<void>(`/api/v1/sequences/${id}/enroll`, { contactId }),
  pauseEnrollment: (enrollmentId: string) => api.post<void>(`/api/v1/sequences/enrollments/${enrollmentId}/pause`),
  resumeEnrollment: (enrollmentId: string) => api.post<void>(`/api/v1/sequences/enrollments/${enrollmentId}/resume`),
};

export const activitiesApi = {
  list: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<{ data: Activity[]; nextCursor?: string }>(`/api/v1/activities${query ? `?${query}` : ''}`);
  },
  getAccountTimeline: (accountId: string, cursor?: string) => {
    const query = cursor ? `?cursor=${cursor}` : '';
    return api.get<{ data: Activity[]; nextCursor?: string }>(`/api/v1/activities/account/${accountId}${query}`);
  },
  getContactTimeline: (contactId: string, cursor?: string) => {
    const query = cursor ? `?cursor=${cursor}` : '';
    return api.get<{ data: Activity[]; nextCursor?: string }>(`/api/v1/activities/contact/${contactId}${query}`);
  },
  getContactSummary: (contactId: string) =>
    api.get<Record<string, number>>(`/api/v1/activities/contact/${contactId}/summary`),
  createNote: (data: { content: string; contactId?: string; accountId?: string; opportunityId?: string }) =>
    api.post<Activity>('/api/v1/activities/notes', data),
  logCall: (data: {
    direction: string;
    status: string;
    startedAt: string;
    contactId?: string;
    accountId?: string;
    notes?: string;
  }) => api.post<Activity>('/api/v1/activities/calls', data),
};

export const apiKeysApi = {
  list: () => api.get<ApiKey[]>('/api/v1/auth/api-keys'),
  create: (data: { name: string; scopes?: string[]; expiresInDays?: number }) =>
    api.post<ApiKey & { key: string }>('/api/v1/auth/api-keys', data),
  delete: (id: string) => api.delete<void>(`/api/v1/auth/api-keys/${id}`),
};

// ─────────────────────────────────────────────────────────────
// Leads API
// ─────────────────────────────────────────────────────────────

export interface Lead {
  id: string;
  customerId: string;
  companyName: string;
  domain?: string;
  industry?: string;
  employeeCount?: number;
  revenue?: number;
  contactFirstName?: string;
  contactLastName?: string;
  contactEmail?: string;
  contactTitle?: string;
  contactPhone?: string;
  city?: string;
  state?: string;
  country?: string;
  source: string;
  campaignId?: string;
  generationJobId?: string;
  fitScore?: number;
  intentScore?: number;
  status: string;
  ownerId?: string;
  convertedAccountId?: string;
  convertedContactId?: string;
  convertedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadCounts {
  new: number;
  contacted: number;
  qualified: number;
  unqualified: number;
  converted: number;
  rejected: number;
}

export const leadsApi = {
  list: (params?: Record<string, string | number | string[]>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => searchParams.append(key, String(v)));
          } else {
            searchParams.set(key, String(value));
          }
        }
      });
    }
    const query = searchParams.toString();
    return api.get<Lead[]>(`/api/v1/leads${query ? `?${query}` : ''}`);
  },
  get: (id: string) => api.get<Lead>(`/api/v1/leads/${id}`),
  getCounts: () => api.get<LeadCounts>('/api/v1/leads/counts'),
  create: (data: Partial<Lead>) => api.post<Lead>('/api/v1/leads', data),
  update: (id: string, data: Partial<Lead>) => api.patch<Lead>(`/api/v1/leads/${id}`, data),
  delete: (id: string) => api.delete<void>(`/api/v1/leads/${id}`),
  convert: (id: string, data?: { accountName?: string; contactEmail?: string; ownerId?: string }) =>
    api.post<{ lead: Lead; account: Account; contact: Contact }>(`/api/v1/leads/${id}/convert`, data),
  reject: (id: string, reason?: string) =>
    api.post<Lead>(`/api/v1/leads/${id}/reject`, { reason }),
  bulkCreate: (leads: Partial<Lead>[]) =>
    api.post<{ created: Lead[]; errors: { index: number; error: string }[] }>('/api/v1/leads/bulk', { leads }),
};

// ─────────────────────────────────────────────────────────────
// Intent API (Signals, Recommendations, Briefing)
// ─────────────────────────────────────────────────────────────

export interface Signal {
  id: string;
  customerId: string;
  entityType: string;
  entityId: string;
  signalType: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description?: string;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

export interface Recommendation {
  id: string;
  customerId: string;
  userId?: string;
  patternId?: string;
  signalId?: string;
  actionType: string;
  priority: 'high' | 'medium' | 'low';
  score: number;
  title: string;
  rationale?: string;
  ctaLabel?: string;
  ctaRoute?: string;
  ctaParams?: Record<string, string>;
  secondaryCtaLabel?: string;
  secondaryCtaRoute?: string;
  cardType: string;
  cardProps: Record<string, unknown>;
  data: Record<string, unknown>;
  status: string;
  createdAt: string;
  expiresAt?: string;
}

export interface BriefingResponse {
  recommendations: Recommendation[];
  signals: Signal[];
  summary: {
    totalSignals: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
  };
}

export interface ContextualResponse {
  recommendations: Recommendation[];
  signals: Signal[];
}

export const intentApi = {
  // Briefing
  getBriefing: (limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api.get<BriefingResponse>(`/api/v1/intent/briefing${query}`);
  },
  refreshBriefing: () =>
    api.post<{ newSignals: number; newRecommendations: number }>('/api/v1/intent/briefing/refresh'),

  // Contextual (for sidebars)
  getContextual: (entityType: string, entityId: string, limit?: number) => {
    const params = new URLSearchParams({ entityType, entityId });
    if (limit) params.set('limit', String(limit));
    return api.get<ContextualResponse>(`/api/v1/intent/context?${params.toString()}`);
  },

  // Signals
  listSignals: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<Signal[]>(`/api/v1/intent/signals${query ? `?${query}` : ''}`);
  },
  getSignal: (id: string) => api.get<Signal>(`/api/v1/intent/signals/${id}`),
  resolveSignal: (id: string, status?: 'resolved' | 'dismissed') =>
    api.post<Signal>(`/api/v1/intent/signals/${id}/resolve`, { status }),

  // Recommendations
  listRecommendations: (params?: Record<string, string | number>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value));
      });
    }
    const query = searchParams.toString();
    return api.get<Recommendation[]>(`/api/v1/intent/recommendations${query ? `?${query}` : ''}`);
  },
  getRecommendation: (id: string) => api.get<Recommendation>(`/api/v1/intent/recommendations/${id}`),
  updateRecommendation: (id: string, status: 'acted' | 'dismissed' | 'snoozed', snoozedUntil?: string) =>
    api.patch<Recommendation>(`/api/v1/intent/recommendations/${id}`, { status, snoozedUntil }),
  recordFeedback: (id: string, action: 'accepted' | 'declined' | 'snoozed', feedbackData?: Record<string, unknown>) =>
    api.post<void>(`/api/v1/intent/recommendations/${id}/feedback`, { action, feedbackData }),
};

export { AuthError };

