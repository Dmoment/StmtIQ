import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SalesInvoicesService, postV1SalesInvoices, patchV1SalesInvoicesId } from '../types/generated';
import { isAuthError, SAFE_QUERY_OPTIONS } from '../utils/api';

// Sales invoice status type
type SalesInvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

interface UseSalesInvoicesParams {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: number;
  from_date?: string;
  to_date?: string;
}

export function useSalesInvoices(params: UseSalesInvoicesParams = {}) {
  // Extract primitive values for stable query key
  const page = params.page || 1;
  const perPage = params.per_page || 25;
  const status = params.status || '';
  const clientId = params.client_id || 0;
  const fromDate = params.from_date || '';
  const toDate = params.to_date || '';

  return useQuery({
    queryKey: ['salesInvoices', page, perPage, status, clientId, fromDate, toDate],
    queryFn: async () => {
      try {
        const response = await SalesInvoicesService.getV1SalesInvoices({
          page,
          perPage,
          status: (status as SalesInvoiceStatus) || undefined,
          clientId: clientId || undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
        });
        return response;
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return [];
        }
        throw error;
      }
    },
    ...SAFE_QUERY_OPTIONS,
  });
}

export function useSalesInvoice(id: number) {
  return useQuery({
    queryKey: ['salesInvoices', id],
    queryFn: async () => {
      try {
        return await SalesInvoicesService.getV1SalesInvoicesId({ id });
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return null;
        }
        throw error;
      }
    },
    enabled: !!id,
    ...SAFE_QUERY_OPTIONS,
  });
}

export function useSalesInvoiceStats() {
  return useQuery({
    queryKey: ['salesInvoices', 'stats'],
    queryFn: async () => {
      try {
        return await SalesInvoicesService.getV1SalesInvoicesStats();
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return { total: 0, total_amount: 0, total_paid: 0, total_outstanding: 0, by_status: {} };
        }
        throw error;
      }
    },
    ...SAFE_QUERY_OPTIONS,
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: ['salesInvoices', 'nextNumber'],
    queryFn: async () => {
      try {
        return await SalesInvoicesService.getV1SalesInvoicesNextNumber();
      } catch (error: unknown) {
        // Return default if auth fails or no business profile exists (422)
        if (isAuthError(error)) {
          return { next_number: 'INV-00001' };
        }
        // Handle 422 - no business profile exists
        const err = error as { status?: number };
        if (err?.status === 422) {
          return { next_number: 'INV-00001' };
        }
        throw error;
      }
    },
    ...SAFE_QUERY_OPTIONS,
  });
}

// Line item type for invoice mutations (extends generated type with additional fields)
interface InvoiceLineItem {
  id?: number;
  description: string;
  hsn_sac_code?: string;
  quantity: number;
  unit: string;
  rate: number;
  gst_rate: number;
  _destroy?: boolean;
}

// Extended type that includes all possible fields for invoice creation
interface CreateSalesInvoiceData {
  client_id: number;
  invoice_date?: string;
  due_date?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  exchange_rate?: number;
  exchange_rate_date?: string;
  discount_amount?: number;
  discount_type?: 'fixed' | 'percentage';
  tax_type?: 'none' | 'cgst_sgst' | 'igst';
  place_of_supply?: string;
  is_reverse_charge?: boolean;
  cess_rate?: number;
  notes?: string;
  terms?: string;
  line_items?: InvoiceLineItem[];
  custom_fields?: Array<{ label: string; value: string }>;
}

// Extended type that includes all possible fields for invoice update
interface UpdateSalesInvoiceData {
  id: number;
  client_id?: number;
  invoice_date?: string;
  due_date?: string;
  currency?: 'INR' | 'USD' | 'EUR' | 'GBP';
  exchange_rate?: number;
  exchange_rate_date?: string;
  discount_amount?: number;
  discount_type?: 'fixed' | 'percentage';
  tax_type?: 'none' | 'cgst_sgst' | 'igst';
  place_of_supply?: string;
  is_reverse_charge?: boolean;
  cess_rate?: number;
  notes?: string;
  terms?: string;
  line_items?: InvoiceLineItem[];
  custom_fields?: Array<{ label: string; value: string }>;
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSalesInvoiceData) => {
      return SalesInvoicesService.postV1SalesInvoices({ requestBody: data as postV1SalesInvoices });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
    },
  });
}

export function useUpdateSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateSalesInvoiceData) => {
      return SalesInvoicesService.patchV1SalesInvoicesId({ id, requestBody: data as patchV1SalesInvoicesId });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices', variables.id] });
    },
  });
}

export function useDeleteSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return SalesInvoicesService.deleteV1SalesInvoicesId({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
    },
  });
}

export function useSendInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return SalesInvoicesService.postV1SalesInvoicesIdSend({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices', id] });
    },
  });
}

export function useDuplicateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return SalesInvoicesService.postV1SalesInvoicesIdDuplicate({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount: number }) => {
      return SalesInvoicesService.postV1SalesInvoicesIdRecordPayment({
        id,
        requestBody: { amount },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices', variables.id] });
    },
  });
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return SalesInvoicesService.postV1SalesInvoicesIdCancel({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices', id] });
    },
  });
}

export function useCalculateGst() {
  return useMutation({
    mutationFn: async (data: {
      subtotal: number;
      seller_state_code: string;
      buyer_state_code: string;
      tax_rate?: number;
    }) => {
      return SalesInvoicesService.postV1SalesInvoicesCalculateGst({ requestBody: data });
    },
  });
}
