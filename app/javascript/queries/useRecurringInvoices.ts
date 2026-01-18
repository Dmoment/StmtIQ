import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RecurringInvoicesService } from '../types/generated/services.gen';
import type {
  GetV1RecurringInvoicesData,
  PostV1RecurringInvoicesData,
} from '../types/generated/types.gen';

interface UseRecurringInvoicesParams {
  page?: number;
  per_page?: number;
  status?: string;
  client_id?: number;
}

export function useRecurringInvoices(params: UseRecurringInvoicesParams = {}) {
  const page = params.page || 1;
  const perPage = params.per_page || 25;
  const status = params.status || '';
  const clientId = params.client_id || 0;

  return useQuery({
    queryKey: ['recurringInvoices', page, perPage, status, clientId],
    queryFn: async () => {
      const response = await RecurringInvoicesService.getV1RecurringInvoices({
        page,
        per_page: perPage,
        status: (status as 'active' | 'paused' | 'completed') || undefined,
        client_id: clientId || undefined,
      } as GetV1RecurringInvoicesData);
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
  const page = params.page || 1;
  const perPage = params.per_page || 25;

  return useQuery({
    queryKey: ['recurringInvoices', id, 'invoices', page, perPage],
    queryFn: async () => {
      return RecurringInvoicesService.getV1RecurringInvoicesIdInvoices({
        id,
        page,
        per_page: perPage,
      });
    },
    enabled: !!id,
  });
}

export function useCreateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PostV1RecurringInvoicesData) => {
      console.log('Sending recurring invoice request:', data);
      const result = await RecurringInvoicesService.postV1RecurringInvoices(data);
      console.log('Recurring invoice created:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringInvoices'] });
    },
    onError: (error) => {
      console.error('Error creating recurring invoice:', error);
    },
  });
}

export function useUpdateRecurringInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; [key: string]: unknown }) => {
      return RecurringInvoicesService.patchV1RecurringInvoicesId({
        id,
        requestBody: {
          name: data.name as string | undefined,
          client_id: data.client_id as number | undefined,
          frequency: data.frequency as 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly' | undefined,
          start_date: data.start_date as string | undefined,
          end_date: data.end_date as string | undefined,
          currency: data.currency as 'INR' | 'USD' | 'EUR' | 'GBP' | undefined,
          payment_terms_days: data.payment_terms_days as number | undefined,
          tax_rate: data.tax_rate as number | undefined,
          auto_send: data.auto_send as boolean | undefined,
          send_days_before_due: data.send_days_before_due as number | undefined,
          send_to_email: data.send_to_email as string | undefined,
          send_cc_emails: data.send_cc_emails as string | undefined,
          send_email_subject: data.send_email_subject as string | undefined,
          send_email_body: data.send_email_body as string | undefined,
          template_data: data.template_data as { notes?: string; terms?: string; line_items?: Array<{ description: string; hsn_sac_code?: string; quantity?: number; unit?: string; rate: number }> } | undefined,
        },
      });
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
