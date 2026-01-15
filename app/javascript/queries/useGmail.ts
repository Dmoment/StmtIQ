import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GmailConnection,
  GmailAuthResponse,
  GmailStatusResponse,
} from "../types/api";
import { gmailKeys, invoiceKeys } from "./keys";
import { apiFetch } from "../lib/api";

// ============================================
// API Helper
// ============================================
function gmailFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return apiFetch<T>(`/api/v1/gmail${endpoint}`, options);
}

// ============================================
// Queries
// ============================================

/**
 * Check if Gmail integration is configured
 */
export const useGmailStatus = () => {
  return useQuery({
    queryKey: gmailKeys.status(),
    queryFn: () => gmailFetch<GmailStatusResponse>("/status"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * List all Gmail connections for current user
 */
export const useGmailConnections = () => {
  return useQuery({
    queryKey: gmailKeys.connections(),
    queryFn: () => gmailFetch<GmailConnection[]>("/connections"),
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Get a specific Gmail connection
 */
export const useGmailConnection = (id: number, enabled = true) => {
  return useQuery({
    queryKey: gmailKeys.connection(id),
    queryFn: () => gmailFetch<GmailConnection>(`/connections/${id}`),
    enabled: enabled && id > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Get Gmail OAuth authorization URL
 */
export const useGmailAuth = () => {
  return useMutation<GmailAuthResponse, Error, void>({
    mutationFn: () => gmailFetch<GmailAuthResponse>("/auth"),
  });
};

/**
 * Complete Gmail OAuth callback
 */
export const useGmailCallback = () => {
  const queryClient = useQueryClient();

  return useMutation<GmailConnection, Error, { code: string; state: string }>({
    mutationFn: ({ code, state }) =>
      gmailFetch<GmailConnection>(`/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.connections() });
    },
  });
};

/**
 * Toggle sync enabled for a Gmail connection
 */
export const useUpdateGmailConnection = () => {
  const queryClient = useQueryClient();

  return useMutation<
    GmailConnection,
    Error,
    { id: number; sync_enabled: boolean }
  >({
    mutationFn: ({ id, sync_enabled }) =>
      gmailFetch<GmailConnection>(`/connections/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ sync_enabled }),
      }),
    onSuccess: (updatedConnection) => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.connections() });
      queryClient.setQueryData(
        gmailKeys.connection(updatedConnection.id),
        updatedConnection
      );
    },
  });
};

/**
 * Sync suggestions based on user transactions
 */
export interface GmailSyncSuggestions {
  has_transactions: boolean;
  date_range: {
    start_date: string | null;
    end_date: string | null;
  } | null;
  suggested_keywords: string[];
  default_keywords: string[];
  transaction_count: number;
}

export const useGmailSyncSuggestions = () => {
  return useQuery({
    queryKey: [...gmailKeys.all, "sync_suggestions"],
    queryFn: () => gmailFetch<GmailSyncSuggestions>("/sync_suggestions"),
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Sync filters for Gmail
 */
export interface GmailSyncFilters {
  date_from?: string;
  date_to?: string;
  keywords?: string[];
  include_attachments_only?: boolean;
}

export interface GmailSyncResponse {
  success: boolean;
  message: string;
  filters_applied: {
    date_range: string | null;
    keywords: string[] | null;
    attachments_only: boolean;
  };
}

/**
 * Trigger manual sync for a Gmail connection with filters
 */
export const useSyncGmail = () => {
  const queryClient = useQueryClient();

  return useMutation<GmailSyncResponse, Error, { id: number; filters?: GmailSyncFilters }>({
    mutationFn: ({ id, filters }) =>
      gmailFetch<GmailSyncResponse>(
        `/connections/${id}/sync`,
        {
          method: "POST",
          body: JSON.stringify(filters || {}),
        }
      ),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: gmailKeys.connection(id),
      });
      queryClient.invalidateQueries({ queryKey: gmailKeys.connections() });
      // Invoices may be updated after sync
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
};

/**
 * Disconnect Gmail account
 */
export const useDisconnectGmail = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, number>({
    mutationFn: (id) =>
      gmailFetch<{ success: boolean; message: string }>(`/connections/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gmailKeys.connections() });
    },
  });
};
