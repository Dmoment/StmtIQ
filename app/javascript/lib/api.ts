/**
 * API Client Exports
 * 
 * Re-exports generated services and types from @hey-api/openapi-ts
 * 
 * Usage:
 *   import { StatementsService, TransactionsService } from '../lib/api';
 *   import type { V1_Entities_StatementSummary } from '../lib/api';
 */

// Re-export all services
export {
  AuthService,
  UsersService,
  HealthService,
  BankTemplatesService,
  CategoriesService,
  AccountsService,
  StatementsService,
  TransactionsService,
} from "../types/generated/services.gen";

// Re-export all generated types
export * from "../types/generated/types.gen";

// Re-export OpenAPI config
export { OpenAPI } from "../types/generated/core/OpenAPI";

// Re-export manual types
export * from "../types/api";

// ============================================
// Helper Functions
// ============================================

// Re-export getClerkToken for use in components that need manual token access
export { getClerkToken as getAuthToken } from "../types/generated/core/OpenAPI";

/**
 * Get auth headers with Bearer token
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { getClerkToken } = await import("../types/generated/core/OpenAPI");
  const token = await getClerkToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Get current workspace ID from localStorage
 */
export function getCurrentWorkspaceId(): number | null {
  const id = localStorage.getItem('stmtiq_current_workspace_id');
  return id ? parseInt(id, 10) : null;
}

/**
 * Get headers with auth and workspace context
 */
export async function getApiHeaders(): Promise<Record<string, string>> {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders,
  };

  const workspaceId = getCurrentWorkspaceId();
  if (workspaceId) {
    headers['X-Workspace-Id'] = workspaceId.toString();
  }

  return headers;
}

/**
 * API fetch wrapper with auth and workspace headers
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const apiHeaders = await getApiHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...apiHeaders,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || 'Request failed');
  }

  return response.json();
}
