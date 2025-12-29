import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AccountsService } from "../types/generated/services.gen";
import type { Account, AccountSummary } from "../types/api";
import type { PostV1AccountsData, PatchV1AccountsIdData } from "../types/generated/types.gen";
import { accountKeys } from "./keys";

// ============================================
// Queries
// ============================================

/**
 * List all accounts
 * Uses auto-generated AccountsService
 */
export const useAccounts = () => {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: async () => {
      const response = await AccountsService.getV1Accounts();
      return response as unknown as Account[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single account
 * Uses auto-generated AccountsService
 */
export const useAccount = (id: number, enabled = true) => {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const response = await AccountsService.getV1AccountsId({ id });
      return response as unknown as Account;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get account summary with transaction stats
 * Uses auto-generated AccountsService
 */
export const useAccountSummary = (
  id: number,
  filters?: { start_date?: string; end_date?: string },
  enabled = true
) => {
  return useQuery({
    queryKey: accountKeys.summary(id, filters),
    queryFn: async () => {
      const response = await AccountsService.getV1AccountsIdSummary({
        id,
        startDate: filters?.start_date,
        endDate: filters?.end_date,
      });
      return response as unknown as AccountSummary;
    },
    enabled: enabled && id > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Create a new account
 * Uses auto-generated AccountsService
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, PostV1AccountsData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await AccountsService.postV1Accounts({
        requestBody: data,
      });
      return response as unknown as Account;
    },
    onSuccess: (newAccount) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.setQueryData(accountKeys.detail(newAccount.id), newAccount);
    },
  });
};

/**
 * Update an account
 * Uses auto-generated AccountsService
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, { id: number; data: PatchV1AccountsIdData["requestBody"] }>({
    mutationFn: async ({ id, data }) => {
      const response = await AccountsService.patchV1AccountsId({
        id,
        requestBody: data,
      });
      return response as unknown as Account;
    },
    onSuccess: (updatedAccount) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.setQueryData(
        accountKeys.detail(updatedAccount.id),
        updatedAccount
      );
    },
  });
};

/**
 * Delete an account
 * Uses auto-generated AccountsService
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await AccountsService.deleteV1AccountsId({ id });
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.removeQueries({ queryKey: accountKeys.detail(deletedId) });
    },
  });
};
