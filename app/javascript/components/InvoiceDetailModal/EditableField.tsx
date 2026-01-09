import { type ReactNode, type ChangeEvent } from 'react';
import { clsx } from 'clsx';

interface EditableFieldProps {
  label: string;
  value: string;
  isEditing: boolean;
  icon: ReactNode;
  type?: 'text' | 'date' | 'number';
  placeholder?: string;
  onChange: (value: string) => void;
  displayValue?: string;
  className?: string;
  inputClassName?: string;
  step?: string;
  min?: string;
  maxLength?: number;
}

export function EditableField({
  label,
  value,
  isEditing,
  icon,
  type = 'text',
  placeholder,
  onChange,
  displayValue,
  className,
  inputClassName,
  step,
  min,
  maxLength,
}: EditableFieldProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={className}>
      <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
        {label}
      </p>
      {isEditing ? (
        <div className="flex items-center gap-2">
          <div className="shrink-0">{icon}</div>
          <input
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            step={step}
            min={min}
            maxLength={maxLength}
            className={clsx(
              'w-full px-2 py-1.5 text-sm font-semibold text-slate-900 bg-white border border-slate-200 rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300',
              inputClassName
            )}
            aria-label={label}
          />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {icon}
          <span className={clsx('font-semibold text-slate-900', !displayValue && 'truncate')}>
            {displayValue || value || '-'}
          </span>
        </div>
      )}
    </div>
  );
}
