import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BusinessProfileService } from '../types/generated';

export function useBusinessProfile() {
  return useQuery({
    queryKey: ['businessProfile'],
    queryFn: async () => {
      try {
        const response = await BusinessProfileService.getV1BusinessProfile();
        return response;
      } catch (error: any) {
        if (error?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });
}

export function useCreateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return BusinessProfileService.postV1BusinessProfile({ requestBody: data as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}

export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      return BusinessProfileService.patchV1BusinessProfile({ requestBody: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return BusinessProfileService.postV1BusinessProfileLogo({ requestBody: formData as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}

export function useUploadSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return BusinessProfileService.postV1BusinessProfileSignature({ requestBody: formData as any });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}
