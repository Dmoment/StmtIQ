import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { InvoicesService } from "../types/generated/services.gen";
import type { Invoice, InvoiceStats, InvoiceSuggestion, InvoiceStatus, InvoiceSource } from "../types/api";
import type {
  PostV1InvoicesData,
  PatchV1InvoicesIdData,
  PostV1InvoicesIdLinkData
} from "../types/generated/types.gen";
import { invoiceKeys, transactionKeys } from "./keys";

// ============================================
// Types
// ============================================
export interface InvoiceFilters {
  page?: number;
  per_page?: number;
  status?: InvoiceStatus;
  source?: InvoiceSource;
  from_date?: string;
  to_date?: string;
}

// ============================================
// Queries
// ============================================

/**
 * List all invoices with filtering and pagination
 * Uses auto-generated InvoicesService
 */
export const useInvoices = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: invoiceKeys.list(filters),
    queryFn: async () => {
      const response = await InvoicesService.getV1Invoices({
        page: filters?.page,
        perPage: filters?.per_page,
        status: filters?.status,
        source: filters?.source,
        fromDate: filters?.from_date,
        toDate: filters?.to_date,
      });
      return response as unknown as Invoice[];
    },
    staleTime: 30 * 1000, // 30 seconds
  });
};

/**
 * Get a single invoice
 * Uses auto-generated InvoicesService
 */
export const useInvoice = (id: number, enabled = true) => {
  return useQuery({
    queryKey: invoiceKeys.detail(id),
    queryFn: async () => {
      const response = await InvoicesService.getV1InvoicesId({ id });
      return response as unknown as Invoice;
    },
    enabled: enabled && id > 0,
  });
};

/**
 * Get invoice statistics
 * Uses auto-generated InvoicesService
 */
export const useInvoiceStats = () => {
  return useQuery({
    queryKey: invoiceKeys.stats(),
    queryFn: async () => {
      const response = await InvoicesService.getV1InvoicesStats();
      return response as unknown as InvoiceStats;
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

/**
 * Get match suggestions for an invoice
 * Uses auto-generated InvoicesService
 */
export const useInvoiceSuggestions = (id: number, enabled = true) => {
  return useQuery({
    queryKey: invoiceKeys.suggestions(id),
    queryFn: async () => {
      const response = await InvoicesService.getV1InvoicesIdSuggestions({ id });
      return response as unknown as InvoiceSuggestion[];
    },
    enabled: enabled && id > 0,
    staleTime: 60 * 1000, // 1 minute
  });
};

// ============================================
// Mutations
// ============================================

/**
 * Upload a new invoice via presigned URL
 * Uses auto-generated InvoicesService
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, PostV1InvoicesData["requestBody"]>({
    mutationFn: async (data) => {
      const response = await InvoicesService.postV1Invoices({
        requestBody: data,
      });
      return response as unknown as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
};

/**
 * Upload invoice directly (multipart form)
 * This handles the actual file upload
 */
export const useUploadInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, File>({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/v1/invoices/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload invoice');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
};

/**
 * Update an invoice (manual correction)
 * Uses auto-generated InvoicesService
 */
export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Invoice,
    Error,
    { id: number; data: PatchV1InvoicesIdData["requestBody"] }
  >({
    mutationFn: async ({ id, data }) => {
      const response = await InvoicesService.patchV1InvoicesId({
        id,
        requestBody: data,
      });
      return response as unknown as Invoice;
    },
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
    },
  });
};

/**
 * Delete an invoice
 * Uses auto-generated InvoicesService
 */
export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, number>({
    mutationFn: async (id) => {
      await InvoicesService.deleteV1InvoicesId({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
    },
  });
};

/**
 * Link an invoice to a transaction
 * Uses auto-generated InvoicesService
 */
export const useLinkInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<
    Invoice,
    Error,
    { invoiceId: number; transactionId: number }
  >({
    mutationFn: async ({ invoiceId, transactionId }) => {
      const response = await InvoicesService.postV1InvoicesIdLink({
        id: invoiceId,
        requestBody: { transaction_id: transactionId },
      });
      return response as unknown as Invoice;
    },
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
      // Also invalidate transactions since one got linked
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
};

/**
 * Unlink an invoice from its transaction
 * Uses auto-generated InvoicesService
 */
export const useUnlinkInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, number>({
    mutationFn: async (id) => {
      const response = await InvoicesService.postV1InvoicesIdUnlink({ id });
      return response as unknown as Invoice;
    },
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: invoiceKeys.stats() });
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
      // Also invalidate transactions since one got unlinked
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
};

/**
 * Retry extraction for a failed invoice
 * Uses auto-generated InvoicesService
 */
export const useRetryInvoiceExtraction = () => {
  const queryClient = useQueryClient();

  return useMutation<Invoice, Error, number>({
    mutationFn: async (id) => {
      const response = await InvoicesService.postV1InvoicesIdRetry({ id });
      return response as unknown as Invoice;
    },
    onSuccess: (updatedInvoice) => {
      queryClient.invalidateQueries({ queryKey: invoiceKeys.lists() });
      queryClient.setQueryData(
        invoiceKeys.detail(updatedInvoice.id),
        updatedInvoice
      );
    },
  });
};

// ============================================
// Helpers
// ============================================
function getCsrfToken(): string {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta?.getAttribute('content') || '';
}
