import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientsService } from '../types/generated';

interface UseClientsParams {
  page?: number;
  per_page?: number;
  search?: string;
  active_only?: boolean;
}

export function useClients(params: UseClientsParams = {}) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      const response = await ClientsService.getV1Clients({
        page: params.page || 1,
        perPage: params.per_page || 25,
        search: params.search,
        activeOnly: params.active_only ?? true,
      });
      return response;
    },
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      return ClientsService.getV1ClientsId({ id });
    },
    enabled: !!id,
  });
}

export function useClientInvoices(id: number, params: { page?: number; per_page?: number } = {}) {
  return useQuery({
    queryKey: ['clients', id, 'invoices', params],
    queryFn: async () => {
      return ClientsService.getV1ClientsIdInvoices({
        id,
        page: params.page || 1,
        perPage: params.per_page || 25,
      });
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { body: Record<string, any> }) => {
      return ClientsService.postV1Clients({ requestBody: data.body as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      return ClientsService.patchV1ClientsId({ id, requestBody: data });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return ClientsService.deleteV1ClientsId({ id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
