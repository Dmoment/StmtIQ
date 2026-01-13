import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SalesInvoicesService } from '../types/generated';

interface UseSalesInvoicesParams {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: number;
  from_date?: string;
  to_date?: string;
}

export function useSalesInvoices(params: UseSalesInvoicesParams = {}) {
  return useQuery({
    queryKey: ['salesInvoices', params],
    queryFn: async () => {
      const response = await SalesInvoicesService.getV1SalesInvoices({
        page: params.page || 1,
        perPage: params.per_page || 25,
        status: params.status as any,
        clientId: params.client_id,
        fromDate: params.from_date,
        toDate: params.to_date,
      });
      return response;
    },
  });
}

export function useSalesInvoice(id: number) {
  return useQuery({
    queryKey: ['salesInvoices', id],
    queryFn: async () => {
      return SalesInvoicesService.getV1SalesInvoicesId({ id });
    },
    enabled: !!id,
  });
}

export function useSalesInvoiceStats() {
  return useQuery({
    queryKey: ['salesInvoices', 'stats'],
    queryFn: async () => {
      return SalesInvoicesService.getV1SalesInvoicesStats();
    },
  });
}

export function useNextInvoiceNumber() {
  return useQuery({
    queryKey: ['salesInvoices', 'nextNumber'],
    queryFn: async () => {
      return SalesInvoicesService.getV1SalesInvoicesNextNumber();
    },
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return SalesInvoicesService.postV1SalesInvoices({ requestBody: data as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
    },
  });
}

export function useUpdateSalesInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      return SalesInvoicesService.patchV1SalesInvoicesId({ id, requestBody: data });
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
