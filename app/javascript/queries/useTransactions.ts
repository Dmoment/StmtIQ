import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { Transaction, TransactionStats } from "../types/api";
import type { components } from "../types/generated/api";
import { transactionKeys } from "./keys";

// ============================================
// Types
// ============================================
interface TransactionFilters {
  page?: number;
  per_page?: number;
  category_id?: number;
  account_id?: number;
  statement_id?: number;
  transaction_type?: "debit" | "credit";
  start_date?: string;
  end_date?: string;
  search?: string;
  uncategorized?: boolean;
}

interface StatsFilters {
  start_date?: string;
  end_date?: string;
  account_id?: number;
}

type UpdateTransactionData = components["schemas"]["patchV1TransactionsId"];
type BulkUpdateData = components["schemas"]["patchV1TransactionsBulk"];

// ============================================
// Queries
// ============================================

/**
 * List all transactions
 */
export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/transactions", {
        params: { query: filters },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch transactions");
      return data as unknown as Transaction[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single transaction
 */
export const useTransaction = (id: number, enabled = true) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/transactions/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch transaction");
      return data as unknown as Transaction;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get transaction statistics
 */
export const useTransactionStats = (filters?: StatsFilters) => {
  return useQuery({
    queryKey: transactionKeys.stats(filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/transactions/stats", {
        params: { query: filters },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch transaction stats");
      return data as unknown as TransactionStats;
    },
    staleTime: 1 * 60 * 1000,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Update a transaction
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Transaction,
    Error,
    { id: number; data: UpdateTransactionData }
  >({
    mutationFn: async ({ id, data }) => {
      const { data: response, error } = await api.PATCH(
        "/v1/transactions/{id}",
        {
          params: { path: { id } },
          body: data,
          headers: getAuthHeaders(),
        }
      );
      if (error) throw new Error("Failed to update transaction");
      return response as unknown as Transaction;
    },
    onSuccess: (updatedTransaction) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });
      queryClient.setQueryData(
        transactionKeys.detail(updatedTransaction.id),
        updatedTransaction
      );
    },
  });
};

/**
 * Bulk update transactions
 */
export const useBulkUpdateTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<{ updated_count: number }, Error, BulkUpdateData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.PATCH(
        "/v1/transactions/bulk",
        {
          body: data,
          headers: getAuthHeaders(),
        }
      );
      if (error) throw new Error("Failed to bulk update transactions");
      return response as unknown as { updated_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

/**
 * Categorize uncategorized transactions with AI
 */
export const useCategorizeTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; categorized_count: number; job_id?: string },
    Error,
    void
  >({
    mutationFn: async () => {
      const { data, error } = await api.POST("/v1/transactions/categorize", {
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to start categorization");
      return data as unknown as {
        message: string;
        categorized_count: number;
        job_id?: string;
      };
    },
    onSuccess: () => {
      // Invalidate transactions after categorization starts
      // The actual updates will happen asynchronously
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

