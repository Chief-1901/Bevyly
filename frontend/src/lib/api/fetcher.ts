/**
 * Type-safe API fetcher with error handling
 */

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class FetchError extends Error {
  status: number;
  code: string;
  
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
    this.code = code;
  }
}

interface FetchOptions extends RequestInit {
  token?: string;
}

const BASE_URL = '/api/v1';

/**
 * Base fetcher function
 */
export async function fetcher<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { token, headers: customHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  const data = await response.json() as ApiResponse<T>;

  if (!response.ok || !data.success) {
    throw new FetchError(
      data.error?.message || 'An error occurred',
      response.status,
      data.error?.code || 'UNKNOWN_ERROR'
    );
  }

  return data.data as T;
}

/**
 * GET request helper
 */
export function get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
  return fetcher<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export function post<T>(
  endpoint: string,
  body?: unknown,
  options?: FetchOptions
): Promise<T> {
  return fetcher<T>(endpoint, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Fetch with pagination support
 */
export async function fetchPaginated<T>(
  endpoint: string,
  options?: FetchOptions
): Promise<{ data: T[]; pagination: ApiResponse<T>['pagination'] }> {
  const { token, headers: customHeaders, ...fetchOptions } = options || {};

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('/') ? `${BASE_URL}${endpoint}` : `${BASE_URL}/${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    method: 'GET',
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new FetchError(
      result.error?.message || 'An error occurred',
      response.status,
      result.error?.code || 'UNKNOWN_ERROR'
    );
  }

  return {
    data: result.data || [],
    pagination: result.pagination,
  };
}

