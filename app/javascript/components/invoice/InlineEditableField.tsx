import { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';

interface InlineEditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'date' | 'textarea';
  placeholder?: string;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  formatter?: (value: string) => string;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  rows?: number;
  disabled?: boolean;
}

export function InlineEditableField({
  value,
  onChange,
  type = 'text',
  placeholder = 'Click to edit',
  className = '',
  displayClassName = '',
  inputClassName = '',
  formatter,
  prefix,
  suffix,
  min,
  step,
  rows = 3,
  disabled = false,
}: InlineEditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== 'date') {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleClick = () => {
    if (!disabled) {
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type !== 'textarea') {
      e.preventDefault();
      handleBlur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  const displayValue = formatter ? formatter(value) : value;

  if (isEditing) {
    const commonProps = {
      ref: inputRef as any,
      value: localValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setLocalValue(e.target.value),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      placeholder,
      className: clsx(
        'bg-white border border-amber-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
        inputClassName
      ),
    };

    if (type === 'textarea') {
      return (
        <textarea
          {...commonProps}
          rows={rows}
          className={clsx(commonProps.className, 'resize-none w-full')}
        />
      );
    }

    return (
      <input
        {...commonProps}
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        min={min}
        step={step}
      />
    );
  }

  return (
    <span
      onClick={handleClick}
      className={clsx(
        'cursor-pointer rounded px-1 -mx-1 transition-colors',
        !disabled && 'hover:bg-amber-50',
        disabled && 'cursor-default',
        !value && 'text-slate-400 italic',
        className,
        displayClassName
      )}
    >
      {prefix}
      {displayValue || placeholder}
      {suffix}
    </span>
  );
}
