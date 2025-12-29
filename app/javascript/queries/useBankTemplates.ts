import { useQuery } from "@tanstack/react-query";
import { BankTemplatesService } from "../types/generated/services.gen";
import type { BankTemplate } from "../types/api";
import { bankTemplateKeys } from "./keys";

// ============================================
// Queries
// ============================================

/**
 * List all bank templates
 * Uses auto-generated BankTemplatesService
 */
export const useBankTemplates = () => {
  return useQuery({
    queryKey: bankTemplateKeys.lists(),
    queryFn: async () => {
      const response = await BankTemplatesService.getV1BankTemplates();
      return response as unknown as BankTemplate[];
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - templates rarely change
  });
};

/**
 * Get a specific bank template by ID
 * Uses auto-generated BankTemplatesService
 */
export const useBankTemplate = (id: number, enabled = true) => {
  return useQuery({
    queryKey: bankTemplateKeys.detail(id),
    queryFn: async () => {
      const response = await BankTemplatesService.getV1BankTemplatesId({ id });
      return response as unknown as BankTemplate;
    },
    enabled: enabled && id > 0,
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * Get templates for a specific bank
 * Uses auto-generated BankTemplatesService
 */
export const useBankTemplatesByBank = (bankCode: string, enabled = true) => {
  return useQuery({
    queryKey: bankTemplateKeys.byBank(bankCode),
    queryFn: async () => {
      const response = await BankTemplatesService.getV1BankTemplatesBankBankCode({
        bankCode,
      });
      return response as unknown as BankTemplate[];
    },
    enabled: enabled && !!bankCode,
    staleTime: 30 * 60 * 1000,
  });
};
