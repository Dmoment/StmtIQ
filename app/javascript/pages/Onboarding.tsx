import { useState, useCallback, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Building2, ArrowRight, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import { WorkspaceTypeSelector } from '../components/onboarding/WorkspaceTypeSelector';

type WorkspaceType = 'personal' | 'business';

interface FormData {
  name: string;
  workspaceName: string;
  workspaceType: WorkspaceType;
}

interface OnboardingError {
  message: string;
  field?: keyof FormData;
}

export function Onboarding() {
  const navigate = useNavigate();
  const { getToken, refreshUser } = useAuth();

  const [formData, setFormData] = useState<FormData>({
    name: '',
    workspaceName: '',
    workspaceType: 'personal',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<OnboardingError | null>(null);

  const validateForm = useCallback((): OnboardingError | null => {
    if (!formData.name.trim()) {
      return { message: 'Please enter your name', field: 'name' };
    }
    if (!formData.workspaceName.trim()) {
      return { message: 'Please enter a workspace name', field: 'workspaceName' };
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
          throw new Error(data.error || 'Failed to complete onboarding');
        }

        // Refresh user data to get updated onboarded_at
        await refreshUser();

        // Navigate to dashboard (full reload to ensure state is fresh)
        window.location.href = '/app';
      } catch (err) {
        console.error('Onboarding error:', err);
        setError({
          message: err instanceof Error ? err.message : 'Something went wrong',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, getToken, refreshUser, navigate]
  );

  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const isFormValid = formData.name.trim() && formData.workspaceName.trim();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-4">
            <span className="text-2xl font-bold text-slate-900" aria-hidden="true">
              K
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to KhataTrack</h1>
          <p className="text-slate-400">Let's set up your account in just a few steps</p>
        </div>

        {/* Onboarding Form */}
        <main className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-6">
              {/* Name Input */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-slate-400 mb-2">
                  Your Name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateFormData({ name: e.target.value })}
                    placeholder="John Doe"
                    disabled={isLoading}
                    required
                    aria-label="Enter your name"
                    aria-invalid={error?.field === 'name'}
                    aria-describedby={error?.field === 'name' ? 'onboarding-error' : undefined}
                    className={clsx(
                      'w-full pl-4 pr-12 py-3 bg-slate-800 border rounded-xl text-white text-lg',
                      'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      error?.field === 'name' ? 'border-red-500' : 'border-slate-700'
                    )}
                    autoFocus
                    autoComplete="name"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Workspace Name Input */}
              <div>
                <label
                  htmlFor="workspace-name"
                  className="block text-sm font-medium text-slate-400 mb-2"
                >
                  Workspace Name
                </label>
                <div className="relative">
                  <input
                    id="workspace-name"
                    name="workspaceName"
                    type="text"
                    value={formData.workspaceName}
                    onChange={(e) => updateFormData({ workspaceName: e.target.value })}
                    placeholder="My Finances or Company Name"
                    disabled={isLoading}
                    required
                    aria-label="Enter workspace name"
                    aria-invalid={error?.field === 'workspaceName'}
                    aria-describedby={
                      error?.field === 'workspaceName' ? 'onboarding-error' : undefined
                    }
                    className={clsx(
                      'w-full pl-4 pr-12 py-3 bg-slate-800 border rounded-xl text-white text-lg',
                      'placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      error?.field === 'workspaceName' ? 'border-red-500' : 'border-slate-700'
                    )}
                    autoComplete="organization"
                  />
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Building2 className="w-5 h-5 text-slate-500" aria-hidden="true" />
                  </div>
                </div>
              </div>

              {/* Workspace Type Selection */}
              <WorkspaceTypeSelector
                value={formData.workspaceType}
                onChange={(type) => updateFormData({ workspaceType: type })}
                disabled={isLoading}
              />

              {error && (
                <div
                  id="onboarding-error"
                  role="alert"
                  className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {error.message}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !isFormValid}
                aria-label="Complete onboarding and get started"
                className={clsx(
                  'w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all',
                  isFormValid && !isLoading
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 hover:opacity-90'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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
        </main>

        <p className="text-center text-slate-500 text-sm mt-6">
          You can always change these settings later
        </p>
      </div>
    </div>
  );
}
