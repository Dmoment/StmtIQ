import { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { X, Building2, User, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';

type WorkspaceType = 'personal' | 'business';

interface FormData {
  name: string;
  workspaceType: WorkspaceType;
  description: string;
}

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose }: CreateWorkspaceModalProps) {
  const { getToken } = useAuth();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const modalRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    workspaceType: 'personal',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', workspaceType: 'personal', description: '' });
      setError(null);
      modalRef.current?.focus();
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        setError('Please enter a workspace name');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const response = await fetch('/api/v1/workspaces', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            workspace_type: formData.workspaceType,
            description: formData.description.trim() || undefined,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to create workspace');
        }

        const newWorkspace = await response.json();

        // Refresh workspaces list
        await refreshWorkspaces();

        // Switch to the new workspace
        await switchWorkspace(newWorkspace.id);

        onClose();
      } catch (err) {
        console.error('Create workspace error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [formData, getToken, refreshWorkspaces, switchWorkspace, onClose]
  );

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-workspace-title"
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border-b border-orange-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-orange-500" aria-hidden="true" />
              <h2 id="create-workspace-title" className="text-lg font-semibold text-slate-900">
                Create Workspace
              </h2>
            </div>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-white/60 transition-colors text-slate-500 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Workspace Name */}
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Workspace Name
              </label>
              <input
                id="workspace-name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="My Company"
                disabled={isLoading}
                required
                autoFocus
                className={clsx(
                  'w-full px-4 py-2.5 bg-slate-100 border rounded-xl text-slate-900',
                  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'border-slate-200 hover:bg-slate-200/70 transition-colors'
                )}
              />
            </div>

            {/* Workspace Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Workspace Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateFormData({ workspaceType: 'personal' })}
                  disabled={isLoading}
                  className={clsx(
                    'p-3 rounded-xl border-2 transition-all text-left',
                    formData.workspaceType === 'personal'
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
                    formData.workspaceType === 'personal' ? 'bg-amber-200' : 'bg-slate-100'
                  )}>
                    <User className={clsx(
                      'w-4 h-4',
                      formData.workspaceType === 'personal' ? 'text-slate-900' : 'text-slate-500'
                    )} aria-hidden="true" />
                  </div>
                  <div className={clsx(
                    'font-medium text-sm',
                    formData.workspaceType === 'personal' ? 'text-slate-900' : 'text-slate-600'
                  )}>Personal</div>
                  <div className="text-xs text-slate-400 mt-0.5">Track personal expenses</div>
                </button>

                <button
                  type="button"
                  onClick={() => updateFormData({ workspaceType: 'business' })}
                  disabled={isLoading}
                  className={clsx(
                    'p-3 rounded-xl border-2 transition-all text-left',
                    formData.workspaceType === 'business'
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300',
                    isLoading && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
                    formData.workspaceType === 'business' ? 'bg-amber-200' : 'bg-slate-100'
                  )}>
                    <Building2 className={clsx(
                      'w-4 h-4',
                      formData.workspaceType === 'business' ? 'text-slate-900' : 'text-slate-500'
                    )} aria-hidden="true" />
                  </div>
                  <div className={clsx(
                    'font-medium text-sm',
                    formData.workspaceType === 'business' ? 'text-slate-900' : 'text-slate-600'
                  )}>Business</div>
                  <div className="text-xs text-slate-400 mt-0.5">Manage business finances</div>
                </button>
              </div>
            </div>

            {/* Description (Optional) */}
            <div>
              <label htmlFor="workspace-description" className="block text-sm font-medium text-slate-700 mb-1.5">
                Description <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="workspace-description"
                name="description"
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Brief description of this workspace..."
                disabled={isLoading}
                rows={2}
                className={clsx(
                  'w-full px-4 py-2.5 bg-slate-100 border rounded-xl text-slate-900 resize-none',
                  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'border-slate-200 hover:bg-slate-200/70 transition-colors'
                )}
              />
            </div>

            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !formData.name.trim()}
                className={clsx(
                  'flex-1 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                  formData.name.trim() && !isLoading
                    ? 'bg-amber-200 text-slate-900 hover:bg-amber-300'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
