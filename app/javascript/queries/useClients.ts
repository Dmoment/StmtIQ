import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClientsService } from '../types/generated';
import { getClerkToken } from '../types/generated/core/OpenAPI';
import { isAuthError, SAFE_QUERY_OPTIONS, getCsrfToken } from '../utils/api';

interface UseClientsParams {
  page?: number;
  per_page?: number;
  search?: string;
  active_only?: boolean;
}

export function useClients(params: UseClientsParams = {}) {
  // Extract primitive values for stable query key (avoids infinite re-renders)
  const page = params.page || 1;
  const perPage = params.per_page || 25;
  const search = params.search || '';
  const activeOnly = params.active_only ?? true;

  return useQuery({
    queryKey: ['clients', page, perPage, search, activeOnly],
    queryFn: async () => {
      try {
        const response = await ClientsService.getV1Clients({
          page,
          perPage,
          search: search || undefined,
          activeOnly,
        });
        return response;
      } catch (error: unknown) {
        // Handle auth errors gracefully - return empty array instead of throwing
        if (isAuthError(error)) {
          return [];
        }
        throw error;
      }
    },
    ...SAFE_QUERY_OPTIONS,
  });
}

export function useClient(id: number) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      try {
        return await ClientsService.getV1ClientsId({ id });
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

export function useClientInvoices(id: number, params: { page?: number; per_page?: number } = {}) {
  const page = params.page || 1;
  const perPage = params.per_page || 25;

  return useQuery({
    queryKey: ['clients', id, 'invoices', page, perPage],
    queryFn: async () => {
      try {
        return await ClientsService.getV1ClientsIdInvoices({
          id,
          page,
          perPage,
        });
      } catch (error: unknown) {
        if (isAuthError(error)) {
          return [];
        }
        throw error;
      }
    },
    enabled: !!id,
    ...SAFE_QUERY_OPTIONS,
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

export function useUploadClientLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const token = await getClerkToken();

      const headers: Record<string, string> = {
        'X-CSRF-Token': getCsrfToken(),
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/v1/clients/${id}/logo`, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
    },
  });
}
