import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  GmailConnection,
  GmailAuthResponse,
  GmailStatusResponse,
} from "../types/api";
import { gmailKeys, invoiceKeys } from "./keys";

// ============================================
// API Helper
// ============================================
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute("content") || "";
}

async function gmailFetch<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`/api/v1/gmail${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": getCsrfToken(),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Request failed");
  }

  return response.json();
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
 * Trigger manual sync for a Gmail connection
 */
export const useSyncGmail = () => {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean; message: string }, Error, number>({
    mutationFn: (id) =>
      gmailFetch<{ success: boolean; message: string }>(
        `/connections/${id}/sync`,
        { method: "POST" }
      ),
    onSuccess: (_, connectionId) => {
      queryClient.invalidateQueries({
        queryKey: gmailKeys.connection(connectionId),
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
