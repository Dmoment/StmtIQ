import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Plus,
  Search,
  Play,
  Pause,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  Calendar,
  Zap,
  GitBranch,
  CheckCircle2,
  XCircle,
  History,
  Settings,
  MoreVertical,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  useWorkflows,
  useDeleteWorkflow,
  useActivateWorkflow,
  usePauseWorkflow,
  useTriggerWorkflow,
} from '../queries/useWorkflows';
import type { Workflow, WorkflowStatus, WorkflowTriggerType } from '../types/api';

const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string; bgColor: string; icon: typeof Play }> = {
  draft: { label: 'Draft', color: 'text-slate-600', bgColor: 'bg-slate-100', icon: Settings },
  active: { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  paused: { label: 'Paused', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: Pause },
  archived: { label: 'Archived', color: 'text-slate-500', bgColor: 'bg-slate-100', icon: XCircle },
};

const TRIGGER_CONFIG: Record<WorkflowTriggerType, { label: string; icon: typeof Clock; color: string }> = {
  schedule: { label: 'Scheduled', icon: Calendar, color: 'text-blue-600' },
  event: { label: 'Event-based', icon: Zap, color: 'text-violet-600' },
  manual: { label: 'Manual', icon: Play, color: 'text-slate-600' },
};

export function Workflows() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | ''>('');
  const [triggerFilter, setTriggerFilter] = useState<WorkflowTriggerType | ''>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  const { data: workflows, isLoading } = useWorkflows({
    status: statusFilter || undefined,
    trigger_type: triggerFilter || undefined,
  });
  const deleteWorkflow = useDeleteWorkflow();
  const activateWorkflow = useActivateWorkflow();
  const pauseWorkflow = usePauseWorkflow();
  const triggerWorkflow = useTriggerWorkflow();

  const handleCreateNew = () => {
    navigate('/workflows/new');
  };

  const handleEdit = (id: number) => {
    navigate(`/workflows/${id}/edit`);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteWorkflow.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const handleActivate = async (id: number) => {
    try {
      await activateWorkflow.mutateAsync(id);
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error activating workflow:', error);
    }
  };

  const handlePause = async (id: number) => {
    try {
      await pauseWorkflow.mutateAsync(id);
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error pausing workflow:', error);
    }
  };

  const handleTrigger = async (id: number) => {
    try {
      await triggerWorkflow.mutateAsync({ id });
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error triggering workflow:', error);
    }
  };

  const filteredWorkflows = (workflows || []).filter((workflow: Workflow) =>
    workflow.name.toLowerCase().includes(search.toLowerCase()) ||
    workflow.description?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automate your financial tasks with custom workflows
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Workflow
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | '')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={triggerFilter}
            onChange={(e) => setTriggerFilter(e.target.value as WorkflowTriggerType | '')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="">All Triggers</option>
            <option value="manual">Manual</option>
            <option value="schedule">Scheduled</option>
            <option value="event">Event-based</option>
          </select>
        </div>
      </div>

      {/* Workflows List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <GitBranch className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No workflows yet</h3>
            <p className="text-sm text-slate-500 mb-4 max-w-sm">
              Create your first workflow to automate tasks like monthly document organization,
              CA sharing, and invoice processing.
            </p>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredWorkflows.map((workflow: Workflow) => {
              const status = STATUS_CONFIG[workflow.status];
              const trigger = TRIGGER_CONFIG[workflow.trigger_type];
              const StatusIcon = status.icon;
              const TriggerIcon = trigger.icon;

              return (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                      <GitBranch className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => handleEdit(workflow.id)}
                          className="font-semibold text-slate-900 hover:text-amber-600 transition-colors"
                        >
                          {workflow.name}
                        </button>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1',
                            status.bgColor,
                            status.color
                          )}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </span>
                        <span
                          className={clsx(
                            'text-xs px-2 py-0.5 rounded-lg font-medium flex items-center gap-1 bg-slate-100',
                            trigger.color
                          )}
                        >
                          <TriggerIcon className="w-3 h-3" />
                          {trigger.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                        {workflow.description && (
                          <span className="truncate max-w-xs">{workflow.description}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {workflow.trigger_description}
                        </span>
                        <span className="flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />
                          {workflow.executions_count} runs
                        </span>
                        {workflow.last_executed_at && (
                          <span className="flex items-center gap-1 text-xs">
                            Last run: {formatDate(workflow.last_executed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    {/* Quick Action: Run Now */}
                    {workflow.can_execute && (
                      <button
                        onClick={() => handleTrigger(workflow.id)}
                        disabled={triggerWorkflow.isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors disabled:opacity-50"
                        title="Run now"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Run
                      </button>
                    )}

                    {/* More Actions */}
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(showActionsMenu === workflow.id ? null : workflow.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      {showActionsMenu === workflow.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-48 z-10">
                          <button
                            onClick={() => {
                              handleEdit(workflow.id);
                              setShowActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Edit Workflow
                          </button>
                          <button
                            onClick={() => {
                              navigate(`/workflows/${workflow.id}/history`);
                              setShowActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <History className="w-4 h-4" />
                            View History
                          </button>
                          <hr className="my-1 border-slate-100" />
                          {workflow.status === 'draft' && (
                            <button
                              onClick={() => handleActivate(workflow.id)}
                              disabled={activateWorkflow.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Activate
                            </button>
                          )}
                          {workflow.status === 'active' && (
                            <button
                              onClick={() => handlePause(workflow.id)}
                              disabled={pauseWorkflow.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pause className="w-4 h-4" />
                              Pause
                            </button>
                          )}
                          {workflow.status === 'paused' && (
                            <button
                              onClick={() => handleActivate(workflow.id)}
                              disabled={activateWorkflow.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Resume
                            </button>
                          )}
                          <hr className="my-1 border-slate-100" />
                          <button
                            onClick={() => {
                              setShowActionsMenu(null);
                              setShowDeleteConfirm(workflow.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === workflow.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Delete Workflow</h3>
                            <p className="text-sm text-slate-500">This action cannot be undone</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">
                          Are you sure you want to delete <strong>{workflow.name}</strong>? All
                          execution history will also be deleted.
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(workflow.id)}
                            disabled={deleteWorkflow.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {deleteWorkflow.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside to close actions menu */}
      {showActionsMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowActionsMenu(null)} />
      )}
    </div>
  );
}
