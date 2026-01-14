import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Document, Folder, Bucket, DocumentShare, BucketShare, DocumentType } from '../types/documents';
import { getApiHeaders } from '../lib/api';

// Fetch wrapper with auth and workspace headers
async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = await getApiHeaders();

  const response = await fetch(`/api${url}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.detail || 'Request failed');
  }

  return response.json();
}

// For file uploads (multipart form data)
async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const headers = await getApiHeaders();
  // Remove Content-Type for FormData - browser sets it automatically with boundary
  delete headers['Content-Type'];

  const response = await fetch(`/api${url}`, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || error.detail || 'Upload failed');
  }

  return response.json();
}

// ========== FOLDERS ==========

interface UseFoldersParams {
  parent_id?: number | null;
  include_children?: boolean;
}

export function useFolders(params: UseFoldersParams = {}) {
  const queryString = new URLSearchParams();
  if (params.parent_id !== undefined) {
    queryString.set('parent_id', params.parent_id === null ? '' : String(params.parent_id));
  }
  if (params.include_children) {
    queryString.set('include_children', 'true');
  }

  return useQuery({
    queryKey: ['folders', params],
    queryFn: () => apiFetch<Folder[]>(`/v1/folders?${queryString.toString()}`),
  });
}

export function useFolderTree() {
  return useQuery({
    queryKey: ['folders', 'tree'],
    queryFn: () => apiFetch<Folder[]>('/v1/folders/tree'),
  });
}

export function useFolder(id: number) {
  return useQuery({
    queryKey: ['folders', id],
    queryFn: () => apiFetch<Folder>(`/v1/folders/${id}`),
    enabled: !!id,
  });
}

interface CreateFolderData {
  name: string;
  parent_id?: number | null;
  description?: string;
  color?: string;
  icon?: string;
}

export function useCreateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFolderData) =>
      apiFetch<Folder>('/v1/folders', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<CreateFolderData>) =>
      apiFetch<Folder>(`/v1/folders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/v1/folders/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

// ========== DOCUMENTS ==========

interface UseDocumentsParams {
  page?: number;
  per_page?: number;
  folder_id?: number | null;
  document_type?: DocumentType;
  financial_year?: string;
  tag?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
}

interface DocumentsResponse {
  data: Document[];
  total_count: number;
  total_pages: number;
  current_page: number;
}

export function useDocuments(params: UseDocumentsParams = {}) {
  const queryString = new URLSearchParams();

  if (params.page) queryString.set('page', String(params.page));
  if (params.per_page) queryString.set('per_page', String(params.per_page));
  // Only pass folder_id if it's a specific folder (number > 0)
  // null or undefined means "All Documents" - don't filter by folder
  if (params.folder_id && params.folder_id > 0) {
    queryString.set('folder_id', String(params.folder_id));
  }
  if (params.document_type) queryString.set('document_type', params.document_type);
  if (params.financial_year) queryString.set('financial_year', params.financial_year);
  if (params.tag) queryString.set('tag', params.tag);
  if (params.search) queryString.set('search', params.search);
  if (params.start_date) queryString.set('start_date', params.start_date);
  if (params.end_date) queryString.set('end_date', params.end_date);

  return useQuery({
    queryKey: ['documents', params],
    queryFn: () => apiFetch<Document[]>(`/v1/documents?${queryString.toString()}`),
  });
}

export function useDocument(id: number) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => apiFetch<Document>(`/v1/documents/${id}`),
    enabled: !!id,
  });
}

interface UploadDocumentData {
  file: File;
  name?: string;
  folder_id?: number | null;
  document_type?: DocumentType;
  description?: string;
  document_date?: string;
  tags?: string[];
  amount?: number;
  currency?: string;
  reference_number?: string;
}

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, ...data }: UploadDocumentData) => {
      const formData = new FormData();
      formData.append('file', file);
      if (data.name) formData.append('name', data.name);
      if (data.folder_id) formData.append('folder_id', String(data.folder_id));
      if (data.document_type) formData.append('document_type', data.document_type);
      if (data.description) formData.append('description', data.description);
      if (data.document_date) formData.append('document_date', data.document_date);
      if (data.tags) data.tags.forEach((tag) => formData.append('tags[]', tag));
      if (data.amount) formData.append('amount', String(data.amount));
      if (data.currency) formData.append('currency', data.currency);
      if (data.reference_number) formData.append('reference_number', data.reference_number);

      return apiUpload<Document>('/v1/documents', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useUpdateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: { id: number } & Partial<Omit<UploadDocumentData, 'file'>>) =>
      apiFetch<Document>(`/v1/documents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', variables.id] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<{ success: boolean }>(`/v1/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

export function useMoveDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, folder_id }: { id: number; folder_id: number | null }) =>
      apiFetch<Document>(`/v1/documents/${id}/move`, {
        method: 'POST',
        body: JSON.stringify({ folder_id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    },
  });
}

interface ShareDocumentData {
  id: number;
  email: string;
  name?: string;
  permission?: 'view' | 'download';
  message?: string;
  expires_in_days?: number;
}

export function useShareDocument() {
  return useMutation({
    mutationFn: ({ id, ...data }: ShareDocumentData) =>
      apiFetch<DocumentShare>(`/v1/documents/${id}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  });
}

// ========== BUCKETS ==========

interface UseBucketsParams {
  page?: number;
  per_page?: number;
  financial_year?: string;
  status?: 'draft' | 'finalized' | 'shared';
  bucket_type?: 'monthly' | 'quarterly' | 'annual' | 'custom';
}

export function useBuckets(params: UseBucketsParams = {}) {
  const queryString = new URLSearchParams();
  if (params.page) queryString.set('page', String(params.page));
  if (params.per_page) queryString.set('per_page', String(params.per_page));
  if (params.financial_year) queryString.set('financial_year', params.financial_year);
  if (params.status) queryString.set('status', params.status);
  if (params.bucket_type) queryString.set('bucket_type', params.bucket_type);

  return useQuery({
    queryKey: ['buckets', params],
    queryFn: () => apiFetch<Bucket[]>(`/v1/buckets?${queryString.toString()}`),
  });
}

export function useBucket(id: number) {
  return useQuery({
    queryKey: ['buckets', id],
    queryFn: () => apiFetch<Bucket>(`/v1/buckets/${id}`),
    enabled: !!id,
  });
}

export function useMonthlyBucket(month: number, year: number) {
  return useQuery({
    queryKey: ['buckets', 'monthly', month, year],
    queryFn: () =>
      apiFetch<Bucket>('/v1/buckets/monthly', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      }),
    enabled: !!month && !!year,
  });
}

interface CreateBucketData {
  name?: string;
  description?: string;
  bucket_type?: 'monthly' | 'quarterly' | 'annual' | 'custom';
  month?: number;
  year?: number;
}

export function useCreateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBucketData) =>
      apiFetch<Bucket>('/v1/buckets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}

export function useAddDocumentToBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucket_id, document_id, notes }: { bucket_id: number; document_id: number; notes?: string }) =>
      apiFetch<Bucket>(`/v1/buckets/${bucket_id}/documents`, {
        method: 'POST',
        body: JSON.stringify({ document_id, notes }),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', variables.bucket_id] });
    },
  });
}

export function useRemoveDocumentFromBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucket_id, document_id }: { bucket_id: number; document_id: number }) =>
      apiFetch<Bucket>(`/v1/buckets/${bucket_id}/documents/${document_id}`, {
        method: 'DELETE',
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', variables.bucket_id] });
    },
  });
}

export function useFinalizeBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<Bucket>(`/v1/buckets/${id}/finalize`, { method: 'POST' }),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', id] });
    },
  });
}

interface ShareBucketData {
  id: number;
  email: string;
  name?: string;
  permission?: 'view' | 'download';
  message?: string;
  expires_in_days?: number;
}

export function useShareBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: ShareBucketData) =>
      apiFetch<BucketShare>(`/v1/buckets/${id}/share`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', variables.id] });
    },
  });
}

export function useAutoCollectBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, document_types }: { id: number; document_types?: string[] }) =>
      apiFetch<{ success: boolean; documents_added: number; total_documents: number }>(
        `/v1/buckets/${id}/auto-collect`,
        {
          method: 'POST',
          body: JSON.stringify({ document_types }),
        }
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', variables.id] });
    },
  });
}
