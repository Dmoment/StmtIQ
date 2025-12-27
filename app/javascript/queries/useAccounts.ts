import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { Account, AccountSummary } from "../types/api";
import type { components } from "../types/generated/api";
import { accountKeys } from "./keys";

// ============================================
// Types
// ============================================
type CreateAccountData = components["schemas"]["postV1Accounts"];
type UpdateAccountData = components["schemas"]["patchV1AccountsId"];

// ============================================
// Queries
// ============================================

/**
 * List all accounts
 */
export const useAccounts = () => {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/accounts", {
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch accounts");
      return data as unknown as Account[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get a single account
 */
export const useAccount = (id: number, enabled = true) => {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/accounts/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch account");
      return data as unknown as Account;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get account summary with transaction stats
 */
export const useAccountSummary = (
  id: number,
  filters?: { start_date?: string; end_date?: string },
  enabled = true
) => {
  return useQuery({
    queryKey: accountKeys.summary(id, filters),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/accounts/{id}/summary", {
        params: {
          path: { id },
          query: filters,
        },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch account summary");
      return data as unknown as AccountSummary;
    },
    enabled: enabled && id > 0,
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Create a new account
 */
export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, CreateAccountData>({
    mutationFn: async (data) => {
      const { data: response, error } = await api.POST("/v1/accounts", {
        body: data,
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to create account");
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
 */
export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<Account, Error, { id: number; data: UpdateAccountData }>({
    mutationFn: async ({ id, data }) => {
      const { data: response, error } = await api.PATCH("/v1/accounts/{id}", {
        params: { path: { id } },
        body: data,
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to update account");
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
 */
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      const { error } = await api.DELETE("/v1/accounts/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to delete account");
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: accountKeys.all });
      queryClient.removeQueries({ queryKey: accountKeys.detail(deletedId) });
    },
  });
};

