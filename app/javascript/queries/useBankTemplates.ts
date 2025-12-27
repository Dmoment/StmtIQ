import { useQuery } from "@tanstack/react-query";
import { api, getAuthHeaders } from "../lib/api";
import type { BankTemplate } from "../types/api";
import { bankTemplateKeys } from "./keys";

// ============================================
// Queries
// ============================================

/**
 * List all bank templates
 */
export const useBankTemplates = () => {
  return useQuery({
    queryKey: bankTemplateKeys.lists(),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/bank_templates", {
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch bank templates");
      return data as unknown as BankTemplate[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - templates rarely change
  });
};

/**
 * Get a specific bank template by ID
 */
export const useBankTemplate = (id: number, enabled = true) => {
  return useQuery({
    queryKey: bankTemplateKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await api.GET("/v1/bank_templates/{id}", {
        params: { path: { id } },
        headers: getAuthHeaders(),
      });
      if (error) throw new Error("Failed to fetch bank template");
      return data as unknown as BankTemplate;
    },
    enabled: enabled && id > 0,
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * Get templates for a specific bank
 */
export const useBankTemplatesByBank = (bankCode: string, enabled = true) => {
  return useQuery({
    queryKey: bankTemplateKeys.byBank(bankCode),
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/v1/bank_templates/bank/{bank_code}",
        {
          params: { path: { bank_code: bankCode } },
          headers: getAuthHeaders(),
        }
      );
      if (error) throw new Error("Failed to fetch bank templates");
      return data as unknown as BankTemplate[];
    },
    enabled: enabled && !!bankCode,
    staleTime: 30 * 60 * 1000,
  });
};

