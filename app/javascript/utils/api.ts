/**
 * Shared API Utilities
 *
 * This module provides common patterns for API requests and React Query hooks.
 * Use these utilities to ensure consistent error handling across the application.
 *
 * ## Key Patterns:
 *
 * 1. **Auth Error Handling**: 401/403 errors are handled gracefully
 *    - Queries return null/empty array instead of throwing
 *    - Mutations throw AuthError with user-friendly message
 *
 * 2. **Stable Query Keys**: Always use primitive values, not objects
 *    - GOOD: ['clients', page, search, activeOnly]
 *    - BAD:  ['clients', { page, search, activeOnly }]
 *
 * 3. **Query Options**: Use SAFE_QUERY_OPTIONS to prevent infinite loops
 *    - retry: false (don't retry on auth errors)
 *    - refetchOnMount: false
 *    - refetchOnWindowFocus: false
 *
 * ## Usage Examples:
 *
 * ```typescript
 * // For queries that should return null on auth error:
 * return useQuery({
 *   queryKey: ['resource', id],
 *   queryFn: createSafeQueryFn(
 *     () => ResourceService.get({ id }),
 *     null // fallback value on auth error
 *   ),
 *   ...SAFE_QUERY_OPTIONS,
 * });
 *
 * // For mutations (auth errors will throw AuthError):
 * return useMutation({
 *   mutationFn: (data) => ResourceService.create({ requestBody: data }),
 *   // AuthError will be thrown with user-friendly message
 * });
 * ```
 */

import { OpenAPI } from '../types/generated/core/OpenAPI';
import type { UseQueryOptions } from '@tanstack/react-query';

// ============================================
// Custom Error Classes
// ============================================

/**
 * Custom error class for authentication errors.
 * Thrown when user is not logged in or session has expired.
 */
export class AuthError extends Error {
  status: number;

  constructor(message: string = 'Please log in to use this feature', status: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

/**
 * Custom error class for API errors with status code.
 */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ============================================
// Auth Error Detection
// ============================================

/**
 * Check if an error is an authentication error (401 or 403).
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // Check for status property (common in API errors)
  const err = error as { status?: number; response?: { status?: number } };

  if (err.status === 401 || err.status === 403) return true;
  if (err.response?.status === 401 || err.response?.status === 403) return true;

  return false;
}

/**
 * Check if an error is a "not found" error (404).
 */
export function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as { status?: number; response?: { status?: number } };

  if (err.status === 404) return true;
  if (err.response?.status === 404) return true;

  return false;
}

// ============================================
// Safe Query Function Wrapper
// ============================================

/**
 * Creates a safe query function that handles auth errors gracefully.
 *
 * For queries, we don't want to throw on 401/403 because:
 * 1. It triggers React Query's error state and retry logic
 * 2. It can cause infinite loops if not handled properly
 *
 * Instead, we return a fallback value (null, [], etc.) and let
 * the component handle the "not logged in" state.
 *
 * @param queryFn The original query function
 * @param fallbackValue Value to return on auth error
 * @param options Additional options
 * @returns Wrapped query function
 *
 * @example
 * ```typescript
 * export function useClients() {
 *   return useQuery({
 *     queryKey: ['clients'],
 *     queryFn: createSafeQueryFn(
 *       () => ClientsService.getV1Clients(),
 *       [] // Return empty array if not authenticated
 *     ),
 *     ...SAFE_QUERY_OPTIONS,
 *   });
 * }
 * ```
 */
export function createSafeQueryFn<T, F = T | null>(
  queryFn: () => Promise<T>,
  fallbackValue: F,
  options?: {
    /** Also handle 404 as non-error, returning fallback */
    handle404?: boolean;
  }
): () => Promise<T | F> {
  return async () => {
    try {
      return await queryFn();
    } catch (error) {
      // Handle auth errors gracefully
      if (isAuthError(error)) {
        return fallbackValue;
      }

      // Optionally handle 404 as non-error
      if (options?.handle404 && isNotFoundError(error)) {
        return fallbackValue;
      }

      // Re-throw other errors
      throw error;
    }
  };
}

// ============================================
// Safe Query Options
// ============================================

/**
 * Common query options that prevent infinite loops and excessive refetching.
 *
 * Apply these to all queries that:
 * - May fail with 401/403 when user is not logged in
 * - Don't need to refetch on window focus or mount
 * - Should not retry on failure
 *
 * @example
 * ```typescript
 * return useQuery({
 *   queryKey: ['resource'],
 *   queryFn: createSafeQueryFn(...),
 *   ...SAFE_QUERY_OPTIONS,
 * });
 * ```
 */
export const SAFE_QUERY_OPTIONS = {
  retry: false,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  staleTime: 1000 * 60 * 5, // 5 minutes
} as const satisfies Partial<UseQueryOptions>;

/**
 * Query options for data that never changes (e.g., enum lists, static config).
 */
export const STATIC_QUERY_OPTIONS = {
  ...SAFE_QUERY_OPTIONS,
  staleTime: Infinity,
} as const satisfies Partial<UseQueryOptions>;

// ============================================
// API Interceptors
// ============================================

let interceptorsInitialized = false;

/**
 * Initialize API response interceptors.
 * Call this once when the application starts.
 *
 * The interceptor adds status code to error responses so that
 * error handling code can properly detect auth errors.
 */
export function initializeApiInterceptors(): void {
  if (interceptorsInitialized) {
    return;
  }

  // Response interceptor: Attach status code to response for error detection
  OpenAPI.interceptors.response.use(async (response) => {
    // Clone response since we might need to read body
    const clonedResponse = response.clone();

    // If response is not ok, try to enhance error info
    if (!response.ok) {
      try {
        const body = await clonedResponse.json();
        // Attach status and body to response for error handlers
        Object.defineProperty(response, '_errorBody', {
          value: body,
          writable: false,
        });
      } catch {
        // JSON parse failed, ignore
      }
    }

    return response;
  });

  interceptorsInitialized = true;
}

// ============================================
// CSRF Token Helper
// ============================================

/**
 * Get CSRF token from meta tag.
 * Used for non-GET requests to Rails backend.
 */
export function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

// ============================================
// Custom Fetch Helper for Non-Generated APIs
// ============================================

/**
 * Helper for making authenticated API requests for endpoints
 * that are not in the generated OpenAPI client (e.g., GST API).
 *
 * Features:
 * - Automatic CSRF token
 * - Automatic auth token from Clerk
 * - Consistent error handling
 * - Status code preserved in errors
 *
 * @example
 * ```typescript
 * const data = await apiRequest<GstLookupResponse>('/gst/lookup', {
 *   query: { gstin: '09BYTPC0935J1Z3' }
 * });
 * ```
 */
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: unknown;
    query?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const { method = 'GET', body, query, headers: customHeaders = {} } = options;

  // Build URL with query params
  let url = `/api/v1${endpoint}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken(),
    ...customHeaders,
  };

  // Add auth token if available
  try {
    const { getClerkToken } = await import('../types/generated/core/OpenAPI');
    const token = await getClerkToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch {
    // Clerk not available, continue without token
  }

  // Make request
  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Handle errors
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new AuthError('Please log in to use this feature', response.status);
    }

    // Try to get error message from response
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody.error || errorBody.message || errorMessage;
    } catch {
      // JSON parse failed, use default message
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json();
}

// ============================================
// Query Key Helpers
// ============================================

/**
 * Create a stable query key from parameters.
 * Ensures primitive values only (no object references).
 *
 * @example
 * ```typescript
 * // Instead of:
 * queryKey: ['clients', params] // Bad - object reference changes
 *
 * // Use:
 * queryKey: createQueryKey('clients', {
 *   page: params.page || 1,
 *   search: params.search || '',
 * })
 * // Results in: ['clients', 1, '']
 * ```
 */
export function createQueryKey(
  prefix: string,
  params: Record<string, string | number | boolean | undefined | null>
): (string | number | boolean)[] {
  const key: (string | number | boolean)[] = [prefix];

  Object.values(params).forEach((value) => {
    if (value === undefined || value === null) {
      key.push('');
    } else {
      key.push(value);
    }
  });

  return key;
}
