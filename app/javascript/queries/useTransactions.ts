import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TransactionsService } from "../types/generated/services.gen";
import type { Transaction, TransactionStats } from "../types/api";
import type { PatchV1TransactionsIdData, PatchV1TransactionsBulkData } from "../types/generated/types.gen";
import { transactionKeys } from "./keys";

// ============================================
// Types
// ============================================
export interface TransactionFilters {
  page?: number;
  per_page?: number;
  // Ransack query params
  q?: Record<string, unknown>;
}

export interface StatsFilters {
  // Ransack query params
  q?: Record<string, unknown>;
}

// ============================================
// Queries
// ============================================

/**
 * List all transactions with Ransack filtering and Kaminari pagination
 * Uses auto-generated TransactionsService
 * 
 * Example filters:
 * - { q: { category_id_eq: 1 } }
 * - { q: { description_cont: 'amazon', transaction_type_eq: 'debit' } }
 * - { q: { transaction_date_gteq: '2025-01-01', s: 'amount desc' } }
 */
export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const response = await TransactionsService.getV1Transactions({
        page: filters?.page,
        perPage: filters?.per_page,
      });
      return response as unknown as Transaction[];
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

/**
 * Get a single transaction
 * Uses auto-generated TransactionsService
 */
export const useTransaction = (id: number, enabled = true) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: async () => {
      const response = await TransactionsService.getV1TransactionsId({ id });
      return response as unknown as Transaction;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get transaction statistics with Ransack filtering
 * Uses auto-generated TransactionsService
 */
export const useTransactionStats = () => {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: async () => {
      const response = await TransactionsService.getV1TransactionsStats();
      return response as unknown as TransactionStats;
    },
    staleTime: 1 * 60 * 1000,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Update a transaction
 * Uses auto-generated TransactionsService
 */
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Transaction,
    Error,
    { id: number; data: PatchV1TransactionsIdData["requestBody"] }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await TransactionsService.patchV1TransactionsId({
        id,
        requestBody: data,
      });
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
 * Uses auto-generated TransactionsService
 */
export const useBulkUpdateTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<{ updated_count: number }, Error, PatchV1TransactionsBulkData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await TransactionsService.patchV1TransactionsBulk({
        requestBody: data,
      });
      return response as unknown as { updated_count: number };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};

/**
 * Categorize uncategorized transactions with AI
 * Uses auto-generated TransactionsService
 */
export const useCategorizeTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; categorized_count: number; job_id?: string },
    Error,
    void
  >({
    mutationFn: async () => {
      const response = await TransactionsService.postV1TransactionsCategorize();
      return response as unknown as {
        message: string;
        categorized_count: number;
        job_id?: string;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};
