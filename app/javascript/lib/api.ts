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

/**
 * Get CSRF token from meta tag
 */
export function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

/**
 * Get auth token from localStorage
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("stmtiq_session_token");
}

/**
 * Get auth headers with Bearer token
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
