import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { Statement, StatementSummary } from "../types/api";
import { statementKeys, transactionKeys } from "./keys";

// ============================================
// Types
// ============================================
interface StatementFilters {
  page?: number;
  per_page?: number;
  status?: "pending" | "processing" | "parsed" | "failed";
}

interface UploadStatementData {
  file: File;
  template_id: number;
  account_id?: number;
}

// ============================================
// Queries
// ============================================

/**
 * List all statements
 */
export const useStatements = (filters?: StatementFilters) => {
  return useQuery({
    queryKey: statementKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/statements", {
        params: { query: filters },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch statements");
      return data as unknown as Statement[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single statement
 */
export const useStatement = (id: number, enabled = true) => {
  return useQuery({
    queryKey: statementKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/statements/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch statement");
      return data as unknown as Statement;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get statement summary
 */
export const useStatementSummary = (id: number, enabled = true) => {
  return useQuery({
    queryKey: statementKeys.summary(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/statements/{id}/summary", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch statement summary");
      return data as unknown as StatementSummary;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Poll statement status until parsed or failed
 */
export const useStatementPolling = (
  id: number,
  enabled = true,
  onStatusChange?: (status: Statement["status"]) => void
) => {
  return useQuery({
    queryKey: [...statementKeys.detail(id), "polling"],
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/statements/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch statement");
      const statement = data as unknown as Statement;
      onStatusChange?.(statement.status);
      return statement;
    },
    enabled: enabled && id > 0,
    refetchInterval: (query) => {
      const data = query.state.data as Statement | undefined;
      if (!data) return 2000;
      // Stop polling when status is terminal
      if (data.status === "parsed" || data.status === "failed") {
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Upload a new statement
 * Note: This uses FormData for file upload, not the openapi-fetch client
 */
export const useUploadStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<Statement, Error, UploadStatementData>({
    mutationFn: async ({ file, template_id, account_id }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("template_id", template_id.toString());
      if (account_id) {
        formData.append("account_id", account_id.toString());
      }

      const response = await fetch("/api/v1/statements", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload statement");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: statementKeys.all });
    },
  });
};

/**
 * Delete a statement
 */
export const useDeleteStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const { error } = await api.DELETE("/v1/statements/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to delete statement");
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: statementKeys.all });
      queryClient.removeQueries({ queryKey: statementKeys.detail(deletedId) });
      // Also invalidate transactions as they may have been deleted
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

/**
 * Re-parse a failed statement
 */
export const useReparseStatement = () => {
  const queryClient = useQueryClient();

  return useMutation<Statement, Error, { id: number; template_id?: number }>({
    mutationFn: async ({ id, template_id }) => {
      const { data, error } = await api.POST("/v1/statements/{id}/reparse", {
        params: { path: { id } },
        body: { template_id },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to re-parse statement");
      return data as unknown as Statement;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: statementKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: statementKeys.lists() });
    },
  });
};

