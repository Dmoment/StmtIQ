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
  // Show only uncategorized transactions
  uncategorized?: boolean;
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
    staleTime: 10 * 1000, // 10 seconds - shorter cache for faster updates
    refetchInterval: 5 * 1000, // Auto-refetch every 5 seconds to catch categorization updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
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
export const useTransactionStats = (detailed = false, statementId?: number) => {
  return useQuery({
    queryKey: transactionKeys.stats({ detailed, statement_id: statementId }),
    queryFn: async () => {
      const response = await TransactionsService.getV1TransactionsStats({
        detailed: detailed || undefined,
        statementId: statementId,
      });
      return response as unknown as TransactionStats;
    },
    staleTime: detailed ? 5 * 60 * 1000 : 1 * 60 * 1000, // Cache detailed stats longer
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
 * Categorize uncategorized transactions with ML
 * Uses auto-generated TransactionsService
 */
export const useCategorizeTransactions = () => {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string; queued: number },
    Error,
    { limit?: number } | void
  >({
    mutationFn: async (params) => {
      // Use manual fetch since generated service might not have this endpoint yet
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const limit = params && typeof params === 'object' && 'limit' in params ? params.limit : undefined;
      const url = limit ? `/api/v1/transactions/categorize?limit=${limit}` : '/api/v1/transactions/categorize';
      
      const response = await fetch(url, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to categorize transactions');
      }

      return response.json();
    },
    onSuccess: () => {
      // Immediately invalidate all transaction queries to force refetch
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      
      // Also refetch after a delay to catch results as they come in
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      }, 3000);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      }, 6000);
    },
  });
};

function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}

// ============================================
// Feedback (for learning user corrections)
// ============================================

export interface FeedbackResult {
  success: boolean;
  message: string;
  transaction: Transaction;
  similar_updated?: number;
  similar_ids?: number[];
}

/**
 * Provide feedback on a transaction category (teaches the system)
 * This creates UserRules and LabeledExamples for future categorization
 *
 * USE THIS instead of useUpdateTransaction when user manually corrects a category!
 */
export const useTransactionFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation<
    FeedbackResult,
    Error,
    { transactionId: number; categoryId: number; subcategoryId?: number; applyToSimilar?: boolean }
  >({
    mutationFn: async ({ transactionId, categoryId, subcategoryId, applyToSimilar = false }) => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-CSRF-Token': getCsrfToken(),
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/v1/transactions/${transactionId}/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          category_id: categoryId,
          subcategory_id: subcategoryId,
          apply_to_similar: applyToSimilar,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      return response.json();
    },
    onSuccess: (result) => {
      // Invalidate all transaction queries to refresh the list
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.stats() });

      // Update the specific transaction in cache
      if (result.transaction) {
        queryClient.setQueryData(
          transactionKeys.detail(result.transaction.id),
          result.transaction
        );
      }

      // If similar transactions were updated, invalidate those too
      if (result.similar_ids && result.similar_ids.length > 0) {
        result.similar_ids.forEach((id) => {
          queryClient.invalidateQueries({ queryKey: transactionKeys.detail(id) });
        });
      }
    },
  });
};

// ============================================
// Categorization Progress
// ============================================

export interface CategorizationProgress {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  categorized: number;
  in_progress: boolean;
  progress_percent: number;
}

/**
 * Get categorization progress for real-time updates
 */
export const useCategorizationProgress = (enabled = true) => {
  return useQuery({
    queryKey: ['categorization', 'progress'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/v1/transactions/categorization/progress', {
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch categorization progress');
      }

      return response.json() as Promise<CategorizationProgress>;
    },
    enabled,
    staleTime: 2 * 1000, // 2 seconds - fresh data for progress
    refetchInterval: (query) => {
      // Poll every 2 seconds while categorization is in progress
      const data = query.state.data as CategorizationProgress | undefined;
      if (data?.in_progress || (data?.pending && data.pending > 0)) {
        return 2000;
      }
      return false; // Stop polling when done
    },
  });
};
