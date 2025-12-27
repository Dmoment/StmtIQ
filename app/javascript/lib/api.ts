import createClient from "openapi-fetch";
import type { paths } from "../types/generated/api";

// Create the API client with proper typing
export const api = createClient<paths>({
  baseUrl: "/api",
});

// Helper to get auth token
export const getAuthToken = (): string | null => {
  return localStorage.getItem("stmtiq_session_token");
};

// Helper to add auth headers
export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Re-export types for convenience
export type { paths } from "../types/generated/api";
export * from "../types/api";
