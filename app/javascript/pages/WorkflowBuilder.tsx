import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Save,
  Play,
  Pause,
  Settings,
  Loader2,
  Clock,
  Calendar,
  Zap,
  CheckCircle2,
  X,
  Bell,
  Folder,
  GitBranch,
  Timer,
  Mail,
  RefreshCw,
  ClipboardCheck,
  Share2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { WorkflowCanvas } from '../components/workflow/WorkflowCanvas';
import { SchedulePicker } from '../components/workflow/SchedulePicker';
import {
  GmailSyncStepModal,
  CreateBucketModal,
  AddRecurringModal,
  CheckDocumentsModal,
  ShareDocumentsModal,
  NotifyModal,
} from '../components/workflow/modals';
import {
  useWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
  useActivateWorkflow,
  usePauseWorkflow,
  useStepTypes,
  useAddStep,
  useUpdateStep,
  useDeleteStep,
  useTriggerWorkflow,
} from '../queries/useWorkflows';
import type {
  WorkflowStep,
  WorkflowTriggerType,
  StepTypeInfo,
} from '../types/api';

const TRIGGER_OPTIONS: { value: WorkflowTriggerType; label: string; description: string; icon: typeof Clock }[] = [
  { value: 'manual', label: 'Manual', description: 'Trigger manually from the UI', icon: Play },
  { value: 'schedule', label: 'Schedule', description: 'Run on a recurring schedule', icon: Calendar },
  { value: 'event', label: 'Event', description: 'Trigger when an event occurs', icon: Zap },
];

const STEP_ICONS: Record<string, typeof Bell> = {
  send_notification: Bell,
  organize_by_month: Folder,
  condition: GitBranch,
  delay: Timer,
  gmail_sync: Mail,
  create_bucket: Folder,
  add_recurring: RefreshCw,
  check_documents: ClipboardCheck,
  share_documents: Share2,
  notify: Bell,
};

const CATEGORY_COLORS: Record<string, string> = {
  notification: 'from-blue-400 to-blue-500',
  document: 'from-emerald-400 to-emerald-500',
  logic: 'from-violet-400 to-violet-500',
  utility: 'from-slate-400 to-slate-500',
};

export function WorkflowBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<WorkflowTriggerType>('manual');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [showStepPalette, setShowStepPalette] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [configModalStep, setConfigModalStep] = useState<WorkflowStep | null>(null);

  // Queries and mutations
  const { data: workflow, isLoading: workflowLoading } = useWorkflow(isNew ? 0 : parseInt(id!));
  const { data: stepTypes, isLoading: stepTypesLoading } = useStepTypes();
  const createWorkflow = useCreateWorkflow();
  const updateWorkflow = useUpdateWorkflow();
  const activateWorkflow = useActivateWorkflow();
  const pauseWorkflow = usePauseWorkflow();
  const addStep = useAddStep();
  const updateStep = useUpdateStep();
  const deleteStep = useDeleteStep();
  const triggerWorkflow = useTriggerWorkflow();

  // Load workflow data
  useEffect(() => {
    if (workflow && !isNew) {
      setName(workflow.name);
      setDescription(workflow.description || '');
      setTriggerType(workflow.trigger_type);
      setTriggerConfig(workflow.trigger_config);
      setSteps(workflow.workflow_steps || []);
    }
  }, [workflow, isNew]);

  const handleSave = async () => {
    try {
      if (isNew) {
        const newWorkflow = await createWorkflow.mutateAsync({
          name,
          description,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
          steps: steps.map((s, i) => ({
            step_type: s.step_type,
            name: s.name || undefined,
            position: i + 1,
            config: s.config,
            conditions: s.conditions,
            enabled: s.enabled,
            continue_on_failure: s.continue_on_failure,
          })),
        });
        navigate(`/workflows/${newWorkflow.id}/edit`, { replace: true });
      } else {
        await updateWorkflow.mutateAsync({
          id: parseInt(id!),
          name,
          description,
          trigger_type: triggerType,
          trigger_config: triggerConfig,
        });
      }
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  const handleAddStep = async (stepType: StepTypeInfo) => {
    if (isNew) {
      // For new workflows, just add to local state
      const newStep: WorkflowStep = {
        id: Date.now(), // Temporary ID
        workflow_id: 0,
        step_type: stepType.type,
        name: null,
        display_name: stepType.name,
        position: steps.length + 1,
        config: {},
        conditions: {},
        enabled: true,
        continue_on_failure: false,
        step_metadata: {
          category: stepType.category,
          icon: stepType.icon,
          description: stepType.description,
        },
        is_configured: false,
        config_schema: stepType.config_schema,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setSteps([...steps, newStep]);
      setSelectedStepId(newStep.id);
      setHasUnsavedChanges(true);
    } else {
      // For existing workflows, save to backend
      try {
        const newStep = await addStep.mutateAsync({
          workflowId: parseInt(id!),
          step_type: stepType.type,
          position: steps.length + 1,
        });
        setSteps([...steps, newStep]);
        setSelectedStepId(newStep.id);
      } catch (error) {
        console.error('Error adding step:', error);
      }
    }
    setShowStepPalette(false);
  };

  const handleUpdateStepConfig = async (stepId: number, config: Record<string, unknown>) => {
    if (isNew) {
      setSteps(steps.map(s => s.id === stepId ? { ...s, config } : s));
      setHasUnsavedChanges(true);
    } else {
      try {
        await updateStep.mutateAsync({
          workflowId: parseInt(id!),
          stepId,
          config,
        });
        setSteps(steps.map(s => s.id === stepId ? { ...s, config } : s));
      } catch (error) {
        console.error('Error updating step:', error);
      }
    }
  };

  const handleDeleteStep = async (stepId: number) => {
    if (isNew) {
      setSteps(steps.filter(s => s.id !== stepId));
      if (selectedStepId === stepId) setSelectedStepId(null);
      setHasUnsavedChanges(true);
    } else {
      try {
        await deleteStep.mutateAsync({
          workflowId: parseInt(id!),
          stepId,
        });
        setSteps(steps.filter(s => s.id !== stepId));
        if (selectedStepId === stepId) setSelectedStepId(null);
      } catch (error) {
        console.error('Error deleting step:', error);
      }
    }
  };

  const handleActivate = async () => {
    if (!isNew && workflow) {
      try {
        await activateWorkflow.mutateAsync(workflow.id);
      } catch (error) {
        console.error('Error activating workflow:', error);
      }
    }
  };

  const handlePause = async () => {
    if (!isNew && workflow) {
      try {
        await pauseWorkflow.mutateAsync(workflow.id);
      } catch (error) {
        console.error('Error pausing workflow:', error);
      }
    }
  };

  const handleRun = async () => {
    if (!isNew && workflow) {
      try {
        await triggerWorkflow.mutateAsync({ id: workflow.id });
      } catch (error) {
        console.error('Error triggering workflow:', error);
      }
    }
  };

  const selectedStep = steps.find(s => s.id === selectedStepId);

  if (workflowLoading && !isNew) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/workflows')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Go back to workflows list"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" aria-hidden="true" />
          </button>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              placeholder="Untitled Workflow"
              aria-label="Workflow name"
              className="text-xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-400"
            />
            {!isNew && workflow && (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={clsx(
                    'text-xs px-2 py-0.5 rounded-lg font-medium',
                    workflow.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                    workflow.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  )}
                >
                  {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
                </span>
                <span className="text-xs text-slate-500">
                  {workflow.executions_count} runs
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && workflow?.can_execute && (
            <button
              onClick={handleRun}
              disabled={triggerWorkflow.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {triggerWorkflow.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Now
            </button>
          )}
          {!isNew && workflow?.status === 'draft' && (
            <button
              onClick={handleActivate}
              disabled={activateWorkflow.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {activateWorkflow.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Activate
            </button>
          )}
          {!isNew && workflow?.status === 'active' && (
            <button
              onClick={handlePause}
              disabled={pauseWorkflow.isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {pauseWorkflow.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
              Pause
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={createWorkflow.isPending || updateWorkflow.isPending || !name}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors disabled:opacity-50"
          >
            {(createWorkflow.isPending || updateWorkflow.isPending) ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isNew ? 'Create' : 'Save'}
            {hasUnsavedChanges && <span className="w-2 h-2 bg-amber-500 rounded-full" />}
          </button>
        </div>
      </div>

      {/* Main Content - 3 Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Settings */}
        <div className="w-80 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-6">
            {/* Description */}
            <div>
              <label htmlFor="workflow-description" className="block text-sm font-medium text-slate-700 mb-1.5">
                Description
              </label>
              <textarea
                id="workflow-description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="What does this workflow do?"
                aria-label="Workflow description"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none text-sm"
                rows={3}
              />
            </div>

            {/* Trigger Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trigger
              </label>
              <div className="space-y-2">
                {TRIGGER_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        setTriggerType(option.value);
                        setTriggerConfig({});
                        setHasUnsavedChanges(true);
                      }}
                      className={clsx(
                        'w-full flex items-start gap-3 p-3 rounded-xl border transition-colors text-left',
                        triggerType === option.value
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <Icon className={clsx(
                        'w-5 h-5 mt-0.5',
                        triggerType === option.value ? 'text-amber-600' : 'text-slate-400'
                      )} />
                      <div>
                        <div className={clsx(
                          'text-sm font-medium',
                          triggerType === option.value ? 'text-amber-900' : 'text-slate-700'
                        )}>
                          {option.label}
                        </div>
                        <div className="text-xs text-slate-500">{option.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Schedule Config */}
            {triggerType === 'schedule' && (
              <SchedulePicker
                value={triggerConfig as { cron?: string; timezone?: string; frequency?: string; time?: string; dayOfWeek?: number; dayOfMonth?: number }}
                onChange={(config) => {
                  setTriggerConfig(config);
                  setHasUnsavedChanges(true);
                }}
              />
            )}

            {/* Event Config */}
            {triggerType === 'event' && (
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <h4 className="text-sm font-medium text-slate-700">Event Settings</h4>
                <div>
                  <label htmlFor="event-type-select" className="block text-xs text-slate-500 mb-1">Event Type</label>
                  <select
                    id="event-type-select"
                    value={(triggerConfig.event_type as string) || ''}
                    onChange={(e) => {
                      setTriggerConfig({ ...triggerConfig, event_type: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    aria-label="Select event type"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                  >
                    <option value="">Select an event...</option>
                    <option value="statement_parsed">Statement Parsed</option>
                    <option value="new_gmail_invoice">New Gmail Invoice</option>
                    <option value="invoice_matched">Invoice Matched</option>
                    <option value="document_uploaded">Document Uploaded</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center Panel - Figma-like Canvas */}
        <div className="flex-1">
          <WorkflowCanvas
            steps={steps}
            triggerType={triggerType}
            selectedStepId={selectedStepId}
            onSelectStep={setSelectedStepId}
            onDeleteStep={handleDeleteStep}
            onAddStep={() => setShowStepPalette(true)}
          />
        </div>

        {/* Right Panel - Step Config */}
        <aside className="w-80 border-l border-slate-200 bg-white overflow-y-auto" aria-label="Step configuration">
          {selectedStep ? (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Configure Step</h3>
                <button
                  onClick={() => setSelectedStepId(null)}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                  aria-label="Close step configuration"
                >
                  <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </button>
              </div>

              {/* Step Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Step Name
                </label>
                <input
                  type="text"
                  value={selectedStep.name || ''}
                  onChange={(e) => {
                    if (isNew) {
                      setSteps(steps.map(s =>
                        s.id === selectedStep.id ? { ...s, name: e.target.value || null } : s
                      ));
                      setHasUnsavedChanges(true);
                    } else {
                      updateStep.mutate({
                        workflowId: parseInt(id!),
                        stepId: selectedStep.id,
                        name: e.target.value || undefined,
                      });
                    }
                  }}
                  placeholder={selectedStep.display_name}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>

              {/* Open Modal Button for supported step types */}
              {['gmail_sync', 'create_bucket', 'add_recurring', 'check_documents', 'share_documents', 'notify', 'send_notification'].includes(selectedStep.step_type) && (
                <button
                  onClick={() => setConfigModalStep(selectedStep)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 rounded-xl font-medium transition-all shadow-sm"
                >
                  <Settings className="w-4 h-4" />
                  Configure Step
                </button>
              )}

              {/* Dynamic Config Fields */}
              {selectedStep.config_schema?.properties && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700 pt-2 border-t border-slate-100">
                    Configuration
                  </h4>
                  {Object.entries(selectedStep.config_schema.properties).map(([key, schema]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {schema.title || key}
                        {selectedStep.config_schema?.required?.includes(key) && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {schema.description && (
                        <p className="text-xs text-slate-500 mb-1">{schema.description}</p>
                      )}
                      {schema.type === 'string' && schema.enum ? (
                        <select
                          value={(selectedStep.config[key] as string) || (typeof schema.default === 'string' ? schema.default : '')}
                          onChange={(e) => handleUpdateStepConfig(selectedStep.id, {
                            ...selectedStep.config,
                            [key]: e.target.value,
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                        >
                          <option value="">Select...</option>
                          {schema.enum.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : schema.type === 'string' && schema.format === 'textarea' ? (
                        <textarea
                          value={(selectedStep.config[key] as string) || ''}
                          onChange={(e) => handleUpdateStepConfig(selectedStep.id, {
                            ...selectedStep.config,
                            [key]: e.target.value,
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm resize-none"
                          rows={3}
                        />
                      ) : schema.type === 'string' ? (
                        <input
                          type="text"
                          value={(selectedStep.config[key] as string) || ''}
                          onChange={(e) => handleUpdateStepConfig(selectedStep.id, {
                            ...selectedStep.config,
                            [key]: e.target.value,
                          })}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                      ) : schema.type === 'integer' || schema.type === 'number' ? (
                        <input
                          type="number"
                          value={(selectedStep.config[key] as number) ?? (typeof schema.default === 'number' ? schema.default : '')}
                          onChange={(e) => handleUpdateStepConfig(selectedStep.id, {
                            ...selectedStep.config,
                            [key]: parseInt(e.target.value) || 0,
                          })}
                          min={schema.minimum}
                          max={schema.maximum}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                      ) : schema.type === 'boolean' ? (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(selectedStep.config[key] as boolean) || false}
                            onChange={(e) => handleUpdateStepConfig(selectedStep.id, {
                              ...selectedStep.config,
                              [key]: e.target.checked,
                            })}
                            className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm text-slate-700">Enable</span>
                        </label>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Step Options */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStep.enabled}
                    onChange={(e) => {
                      if (isNew) {
                        setSteps(steps.map(s =>
                          s.id === selectedStep.id ? { ...s, enabled: e.target.checked } : s
                        ));
                        setHasUnsavedChanges(true);
                      } else {
                        updateStep.mutate({
                          workflowId: parseInt(id!),
                          stepId: selectedStep.id,
                          enabled: e.target.checked,
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">Step enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedStep.continue_on_failure}
                    onChange={(e) => {
                      if (isNew) {
                        setSteps(steps.map(s =>
                          s.id === selectedStep.id ? { ...s, continue_on_failure: e.target.checked } : s
                        ));
                        setHasUnsavedChanges(true);
                      } else {
                        updateStep.mutate({
                          workflowId: parseInt(id!),
                          stepId: selectedStep.id,
                          continue_on_failure: e.target.checked,
                        });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">Continue on failure</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-slate-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300" aria-hidden="true" />
              <p className="text-sm">Select a step to configure</p>
            </div>
          )}
        </aside>
      </div>

      {/* Step Palette Modal */}
      {showStepPalette && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="step-palette-title"
        >
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h2 id="step-palette-title" className="text-lg font-semibold text-slate-900">Add Step</h2>
              <button
                onClick={() => setShowStepPalette(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                aria-label="Close step palette"
              >
                <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {stepTypesLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-2">
                  {(stepTypes || []).map((stepType) => {
                    const Icon = STEP_ICONS[stepType.type] || Settings;
                    const categoryColor = CATEGORY_COLORS[stepType.category] || CATEGORY_COLORS.utility;

                    return (
                      <button
                        key={stepType.type}
                        onClick={() => handleAddStep(stepType)}
                        className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50 transition-colors text-left"
                      >
                        <div className={clsx(
                          'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white flex-shrink-0',
                          categoryColor
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{stepType.name}</div>
                          <div className="text-xs text-slate-500">{stepType.description}</div>
                          <div className="text-xs text-slate-400 mt-1 capitalize">{stepType.category}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step Configuration Modals */}
      {configModalStep?.step_type === 'gmail_sync' && (
        <GmailSyncStepModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}

      {configModalStep?.step_type === 'create_bucket' && (
        <CreateBucketModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}

      {configModalStep?.step_type === 'add_recurring' && (
        <AddRecurringModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}

      {configModalStep?.step_type === 'check_documents' && (
        <CheckDocumentsModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}

      {configModalStep?.step_type === 'share_documents' && (
        <ShareDocumentsModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}

      {(configModalStep?.step_type === 'notify' || configModalStep?.step_type === 'send_notification') && (
        <NotifyModal
          isOpen={true}
          onClose={() => setConfigModalStep(null)}
          config={configModalStep.config as Record<string, unknown>}
          onSave={(config) => {
            handleUpdateStepConfig(configModalStep.id, config as unknown as Record<string, unknown>);
            setConfigModalStep(null);
          }}
        />
      )}
    </div>
  );
}
