import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowKeys } from './keys';
import { apiFetch } from '../lib/api';
import type {
  Workflow,
  WorkflowExecution,
  WorkflowStep,
  StepTypeInfo,
  WorkflowTemplate,
  WorkflowStatus,
  WorkflowTriggerType,
} from '../types/api';

const API_BASE = '/api/v1/workflows';

// ============================================
// Query Hooks
// ============================================

interface UseWorkflowsParams {
  page?: number;
  per_page?: number;
  status?: WorkflowStatus;
  trigger_type?: WorkflowTriggerType;
}

export function useWorkflows(params: UseWorkflowsParams = {}) {
  return useQuery({
    queryKey: workflowKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.per_page) searchParams.set('per_page', params.per_page.toString());
      if (params.status) searchParams.set('status', params.status);
      if (params.trigger_type) searchParams.set('trigger_type', params.trigger_type);

      const url = `${API_BASE}?${searchParams.toString()}`;
      return apiFetch<Workflow[]>(url);
    },
  });
}

export function useWorkflow(id: number) {
  return useQuery({
    queryKey: workflowKeys.detail(id),
    queryFn: async () => {
      return apiFetch<Workflow>(`${API_BASE}/${id}`);
    },
    enabled: !!id,
  });
}

interface UseWorkflowExecutionsParams {
  page?: number;
  per_page?: number;
  status?: string;
}

export function useWorkflowExecutions(workflowId: number, params: UseWorkflowExecutionsParams = {}) {
  return useQuery({
    queryKey: workflowKeys.executions(workflowId, params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', params.page.toString());
      if (params.per_page) searchParams.set('per_page', params.per_page.toString());
      if (params.status) searchParams.set('status', params.status);

      const url = `${API_BASE}/${workflowId}/executions?${searchParams.toString()}`;
      return apiFetch<WorkflowExecution[]>(url);
    },
    enabled: !!workflowId,
  });
}

export function useWorkflowExecution(workflowId: number, executionId: number) {
  return useQuery({
    queryKey: workflowKeys.execution(workflowId, executionId),
    queryFn: async () => {
      return apiFetch<WorkflowExecution>(`${API_BASE}/${workflowId}/executions/${executionId}`);
    },
    enabled: !!workflowId && !!executionId,
  });
}

export function useStepTypes() {
  return useQuery({
    queryKey: workflowKeys.stepTypes(),
    queryFn: async () => {
      return apiFetch<StepTypeInfo[]>(`${API_BASE}/meta/step_types`);
    },
    staleTime: 1000 * 60 * 60, // 1 hour - step types rarely change
  });
}

interface UseWorkflowTemplatesParams {
  category?: string;
  featured_only?: boolean;
}

export function useWorkflowTemplates(params: UseWorkflowTemplatesParams = {}) {
  return useQuery({
    queryKey: workflowKeys.templates(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.category) searchParams.set('category', params.category);
      if (params.featured_only) searchParams.set('featured_only', 'true');

      const url = `${API_BASE}/meta/templates?${searchParams.toString()}`;
      return apiFetch<WorkflowTemplate[]>(url);
    },
  });
}

export function useWorkflowTemplate(id: number) {
  return useQuery({
    queryKey: workflowKeys.template(id),
    queryFn: async () => {
      return apiFetch<WorkflowTemplate>(`${API_BASE}/meta/templates/${id}`);
    },
    enabled: !!id,
  });
}

// ============================================
// Mutation Hooks
// ============================================

interface CreateWorkflowData {
  name: string;
  description?: string;
  trigger_type: WorkflowTriggerType;
  trigger_config?: Record<string, unknown>;
  steps?: Array<{
    step_type: string;
    name?: string;
    position: number;
    config?: Record<string, unknown>;
    conditions?: Record<string, unknown>;
    enabled?: boolean;
    continue_on_failure?: boolean;
  }>;
}

export function useCreateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWorkflowData) => {
      return apiFetch<Workflow>(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

interface UpdateWorkflowData {
  id: number;
  name?: string;
  description?: string;
  trigger_type?: WorkflowTriggerType;
  trigger_config?: Record<string, unknown>;
  status?: WorkflowStatus;
  metadata?: Record<string, unknown>;
}

export function useUpdateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateWorkflowData) => {
      return apiFetch<Workflow>(`${API_BASE}/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.id) });
    },
  });
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<{ success: boolean }>(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}

export function useActivateWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<Workflow>(`${API_BASE}/${id}/activate`, {
        method: 'POST',
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

export function usePauseWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      return apiFetch<Workflow>(`${API_BASE}/${id}/pause`, {
        method: 'POST',
      });
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
    },
  });
}

interface TriggerWorkflowData {
  id: number;
  trigger_data?: Record<string, unknown>;
}

export function useTriggerWorkflow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, trigger_data }: TriggerWorkflowData) => {
      return apiFetch<WorkflowExecution>(`${API_BASE}/${id}/trigger`, {
        method: 'POST',
        body: JSON.stringify({ trigger_data }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(variables.id, {}) });
    },
  });
}

// ============================================
// Step Mutation Hooks
// ============================================

interface AddStepData {
  workflowId: number;
  step_type: string;
  name?: string;
  position?: number;
  config?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  enabled?: boolean;
  continue_on_failure?: boolean;
}

export function useAddStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, ...data }: AddStepData) => {
      return apiFetch<WorkflowStep>(`${API_BASE}/${workflowId}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

interface UpdateStepData {
  workflowId: number;
  stepId: number;
  name?: string;
  position?: number;
  config?: Record<string, unknown>;
  conditions?: Record<string, unknown>;
  enabled?: boolean;
  continue_on_failure?: boolean;
}

export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, stepId, ...data }: UpdateStepData) => {
      return apiFetch<WorkflowStep>(`${API_BASE}/${workflowId}/steps/${stepId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, stepId }: { workflowId: number; stepId: number }) => {
      return apiFetch<{ success: boolean }>(`${API_BASE}/${workflowId}/steps/${stepId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

export function useReorderSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, stepIds }: { workflowId: number; stepIds: number[] }) => {
      return apiFetch<Workflow>(`${API_BASE}/${workflowId}/steps/reorder`, {
        method: 'POST',
        body: JSON.stringify({ step_ids: stepIds }),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
    },
  });
}

// ============================================
// Execution Control Hooks
// ============================================

export function useRetryExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, executionId }: { workflowId: number; executionId: number }) => {
      return apiFetch<WorkflowExecution>(`${API_BASE}/${workflowId}/executions/${executionId}/retry`, {
        method: 'POST',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(variables.workflowId, {}) });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.execution(variables.workflowId, variables.executionId)
      });
    },
  });
}

export function useCancelExecution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, executionId }: { workflowId: number; executionId: number }) => {
      return apiFetch<WorkflowExecution>(`${API_BASE}/${workflowId}/executions/${executionId}/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.detail(variables.workflowId) });
      queryClient.invalidateQueries({ queryKey: workflowKeys.executions(variables.workflowId, {}) });
      queryClient.invalidateQueries({
        queryKey: workflowKeys.execution(variables.workflowId, variables.executionId)
      });
    },
  });
}

// ============================================
// Template Hooks
// ============================================

interface CreateFromTemplateData {
  templateId: number;
  name?: string;
  trigger_config?: Record<string, unknown>;
}

export function useCreateFromTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, ...data }: CreateFromTemplateData) => {
      return apiFetch<Workflow>(`${API_BASE}/from_template/${templateId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
    },
  });
}
