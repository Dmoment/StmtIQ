import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TransactionsService } from "../types/generated/services.gen";
import type { Transaction, TransactionStats } from "../types/api";
import type { PatchV1TransactionsIdData, PatchV1TransactionsBulkData } from "../types/generated/types.gen";
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

// ============================================
// Queries
// ============================================

/**
 * List all transactions
 * Uses auto-generated TransactionsService
 */
export const useTransactions = (filters?: TransactionFilters) => {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: async () => {
      const response = await TransactionsService.getV1Transactions({
        page: filters?.page,
        perPage: filters?.per_page,
        categoryId: filters?.category_id,
        accountId: filters?.account_id,
        statementId: filters?.statement_id,
        transactionType: filters?.transaction_type,
        startDate: filters?.start_date,
        endDate: filters?.end_date,
        search: filters?.search,
        uncategorized: filters?.uncategorized,
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
 * Get transaction statistics
 * Uses auto-generated TransactionsService
 */
export const useTransactionStats = (filters?: StatsFilters) => {
  return useQuery({
    queryKey: transactionKeys.stats(filters),
    queryFn: async () => {
      const response = await TransactionsService.getV1TransactionsStats({
        startDate: filters?.start_date,
        endDate: filters?.end_date,
        accountId: filters?.account_id,
      });
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
      // Invalidate transactions after categorization starts
      // The actual updates will happen asynchronously
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    },
  });
};
