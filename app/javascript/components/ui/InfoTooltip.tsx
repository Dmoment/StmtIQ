import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface InfoTooltipProps {
  content: string | React.ReactNode;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md';
}

export function InfoTooltip({
  content,
  title,
  position = 'top',
  size = 'sm'
}: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close tooltip when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-white border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-white border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-white border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-white border-y-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsVisible(!isVisible)}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className={clsx(
          "text-slate-400 hover:text-slate-600 transition-colors focus:outline-none",
          size === 'sm' ? 'p-0.5' : 'p-1'
        )}
        aria-label="More information"
      >
        <HelpCircle className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={clsx(
            "absolute z-50 w-64 p-3 bg-white text-slate-700 text-xs rounded-xl shadow-lg border border-slate-200",
            positionClasses[position]
          )}
        >
          {/* Arrow */}
          <div
            className={clsx(
              "absolute w-0 h-0 border-[6px]",
              arrowClasses[position]
            )}
          />

          {title && (
            <div className="font-semibold text-amber-600 mb-1.5">{title}</div>
          )}
          <div className="text-slate-600 leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  );
}
