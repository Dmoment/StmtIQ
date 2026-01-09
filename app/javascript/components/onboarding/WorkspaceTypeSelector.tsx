import { User, Briefcase, Check } from 'lucide-react';
import { clsx } from 'clsx';

type WorkspaceType = 'personal' | 'business';

interface WorkspaceTypeSelectorProps {
  value: WorkspaceType;
  onChange: (type: WorkspaceType) => void;
  disabled?: boolean;
}

export function WorkspaceTypeSelector({ value, onChange, disabled = false }: WorkspaceTypeSelectorProps) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="block text-sm font-medium text-slate-400 mb-3">
        Workspace Type
      </legend>
      <div className="grid grid-cols-2 gap-4" role="radiogroup" aria-label="Select workspace type">
        <button
          type="button"
          onClick={() => onChange('personal')}
          disabled={disabled}
          className={clsx(
            'relative p-4 rounded-xl border-2 transition-all text-left',
            value === 'personal'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700 bg-slate-800 hover:border-slate-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          role="radio"
          aria-checked={value === 'personal'}
          aria-label="Personal workspace - Track your personal expenses"
        >
          {value === 'personal' && (
            <div className="absolute top-2 right-2">
              <Check className="w-5 h-5 text-amber-500" aria-hidden="true" />
            </div>
          )}
          <User
            className={clsx(
              'w-8 h-8 mb-2',
              value === 'personal' ? 'text-amber-500' : 'text-slate-400'
            )}
            aria-hidden="true"
          />
          <div className="font-semibold text-white">Personal</div>
          <div className="text-sm text-slate-400 mt-1">Track your personal expenses</div>
        </button>

        <button
          type="button"
          onClick={() => onChange('business')}
          disabled={disabled}
          className={clsx(
            'relative p-4 rounded-xl border-2 transition-all text-left',
            value === 'business'
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-slate-700 bg-slate-800 hover:border-slate-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          role="radio"
          aria-checked={value === 'business'}
          aria-label="Business workspace - Manage business finances"
        >
          {value === 'business' && (
            <div className="absolute top-2 right-2">
              <Check className="w-5 h-5 text-amber-500" aria-hidden="true" />
            </div>
          )}
          <Briefcase
            className={clsx(
              'w-8 h-8 mb-2',
              value === 'business' ? 'text-amber-500' : 'text-slate-400'
            )}
            aria-hidden="true"
          />
          <div className="font-semibold text-white">Business</div>
          <div className="text-sm text-slate-400 mt-1">Manage business finances</div>
        </button>
      </div>
    </fieldset>
  );
}
