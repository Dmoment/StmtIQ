import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecurringInvoicesService, postV1RecurringInvoices } from '../types/generated';

interface UseRecurringInvoicesParams {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: number;
}

export function useRecurringInvoices(params: UseRecurringInvoicesParams = {}) {
  return useQuery({
    queryKey: ['recurringInvoices', params],
    queryFn: async () => {
      const response = await RecurringInvoicesService.getV1RecurringInvoices({
        page: params.page || 1,
        perPage: params.per_page || 25,
        status: params.status as 'active' | 'paused' | 'completed' | undefined,
        clientId: params.client_id,
      });
      return response;
    },
  });
}

export function useRecurringInvoice(id: number) {
  return useQuery({
    queryKey: ['recurringInvoices', id],
    queryFn: async () => {
      return RecurringInvoicesService.getV1RecurringInvoicesId({ id });
    },
    enabled: !!id,
  });
}

export function useRecurringInvoiceInvoices(id: number, params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['recurringInvoices', id, 'invoices', params],
    queryFn: async () => {
      return RecurringInvoicesService.getV1RecurringInvoicesIdInvoices({
        id,
        page: params.page || 1,
        perPage: params.per_page || 25,
      });
    },
    enabled: !!id,
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: postV1RecurringInvoices) => {
      return RecurringInvoicesService.postV1RecurringInvoices({ requestBody: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      return RecurringInvoicesService.patchV1RecurringInvoicesId({ id, requestBody: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices', variables.id] });
    },
  });
}

export function useDeleteRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return RecurringInvoicesService.deleteV1RecurringInvoicesId({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
    },
  });
}

export function usePauseRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return RecurringInvoicesService.postV1RecurringInvoicesIdPause({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices', id] });
    },
  });
}

export function useResumeRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return RecurringInvoicesService.postV1RecurringInvoicesIdResume({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices', id] });
    },
  });
}

export function useGenerateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return RecurringInvoicesService.postV1RecurringInvoicesIdGenerate({ id });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices', id] });
      queryClient.invalidateQueries({ queryKey: ['salesInvoices'] });
    },
  });
}
