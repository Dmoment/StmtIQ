import { useState, useCallback, FormEvent, useEffect, useRef } from 'react';
import { User, Building2, ArrowRight, Loader2, Wallet } from 'lucide-react';
import { clsx } from 'clsx';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../../contexts/AuthContext';

type WorkspaceType = 'personal' | 'business';

interface FormData {
  name: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
}

export function OnboardingModal() {
  const { getToken, refreshUser } = useAuth();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const modalRef = useRef<HTMLDivElement>(null);
  const hasPrefilledName = useRef(false);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    workspaceName: '',
    workspaceType: 'personal',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Focus trap - keep focus inside modal
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  // Prefill name from Clerk user data when it becomes available (works with Google OAuth)
  useEffect(() => {
    if (!isClerkLoaded || hasPrefilledName.current) return;

    // Try multiple sources for the name
    // Google OAuth stores name in externalAccounts or directly on user
    const googleAccount = clerkUser?.externalAccounts?.find(
      (acc: { provider: string }) => acc.provider === 'google'
    ) as { firstName?: string; lastName?: string } | undefined;

    const clerkName =
      clerkUser?.fullName ||
      clerkUser?.firstName ||
      (googleAccount?.firstName && googleAccount?.lastName
        ? `${googleAccount.firstName} ${googleAccount.lastName}`
        : googleAccount?.firstName) ||
      '';

    if (clerkName) {
      setFormData((prev) => ({ ...prev, name: clerkName }));
      hasPrefilledName.current = true;
    }
  }, [isClerkLoaded, clerkUser]);

  const validateForm = useCallback((): string | null => {
    if (!formData.name.trim()) {
      return 'Please enter your name';
    }
    if (!formData.workspaceName.trim()) {
      return 'Please enter a workspace name';
    }
    return null;
  }, [formData]);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const token = await getToken();
        const response = await fetch('/api/v1/onboarding/complete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            workspace_name: formData.workspaceName.trim(),
            workspace_type: formData.workspaceType,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          // If user is already onboarded, just refresh to close the modal
          if (data.error === 'User already onboarded') {
            await refreshUser();
            return;
          }
          throw new Error(data.error || 'Failed to complete setup');
        }

        // Refresh user data to get updated onboarded_at
        await refreshUser();
      } catch (err) {
        console.error('Onboarding error:', err);
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, getToken, refreshUser]
  );

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const isFormValid = formData.name.trim() && formData.workspaceName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        tabIndex={-1}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border-b border-orange-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-orange-500" aria-hidden="true" />
            <div>
              <h2 id="onboarding-title" className="text-lg font-bold text-slate-900">
                Welcome to KhataTrack
              </h2>
              <p className="text-sm text-slate-600">Quick setup to get you started</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-5">
            {/* Name Input */}
            <div>
              <label htmlFor="onboard-name" className="block text-sm font-medium text-slate-700 mb-1.5">
                Your Name
              </label>
              <div className="relative">
                <input
                  id="onboard-name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="John Doe"
                  disabled={isLoading}
                  required
                  className={clsx(
                    'w-full pl-4 pr-10 py-2.5 bg-slate-100 border rounded-xl text-slate-900',
                    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'border-slate-200 hover:bg-slate-200/70 transition-colors'
                  )}
                  autoFocus
                  autoComplete="name"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Workspace Name Input */}
            <div>
              <label htmlFor="onboard-workspace" className="block text-sm font-medium text-slate-700 mb-1.5">
                Workspace Name
              </label>
              <div className="relative">
                <input
                  id="onboard-workspace"
                  name="workspaceName"
                  type="text"
                  value={formData.workspaceName}
                  onChange={(e) => updateFormData({ workspaceName: e.target.value })}
                  placeholder="My Finances"
                  disabled={isLoading}
                  required
                  className={clsx(
                    'w-full pl-4 pr-10 py-2.5 bg-slate-100 border rounded-xl text-slate-900',
                    'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'border-slate-200 hover:bg-slate-200/70 transition-colors'
                  )}
                  autoComplete="organization"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </div>
              </div>
            </div>

            {/* Workspace Type Selection */}
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
                    formData.workspaceType === 'personal'
                      ? 'bg-amber-200'
                      : 'bg-slate-100'
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
                    formData.workspaceType === 'business'
                      ? 'bg-amber-200'
                      : 'bg-slate-100'
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

            {error && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={clsx(
                'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors',
                isFormValid && !isLoading
                  ? 'bg-amber-200 text-slate-900 hover:bg-amber-300'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>Setting up...</span>
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="w-5 h-5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
