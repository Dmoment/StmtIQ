import { useState, useRef, useEffect } from 'react';
import { FileText, Link2, ExternalLink, Sparkles } from 'lucide-react';
import { clsx } from 'clsx';
import type { InvoiceCompact } from '../types/api';

interface InvoiceBadgeProps {
  invoice: InvoiceCompact;
}

export function InvoiceBadge({ invoice }: InvoiceBadgeProps) {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const matchConfidence = invoice.match_confidence ? parseFloat(invoice.match_confidence) : null;
  const isAutoMatched = matchConfidence !== null && matchConfidence >= 0.7;
  const showTooltip = isTooltipVisible || isFocused;

  // Close tooltip on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showTooltip) {
        setIsTooltipVisible(false);
        setIsFocused(false);
        linkRef.current?.blur();
      }
    };

    if (showTooltip) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showTooltip]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        linkRef.current &&
        !linkRef.current.contains(e.target as Node)
      ) {
        setIsTooltipVisible(false);
      }
    };

    if (showTooltip) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTooltip]);

  const tooltipId = `invoice-tooltip-${invoice.id}`;

  return (
    <div
      className="flex-shrink-0 relative"
      onMouseEnter={() => setIsTooltipVisible(true)}
      onMouseLeave={() => setIsTooltipVisible(false)}
    >
      <a
        ref={linkRef}
        href={`/invoices?id=${invoice.id}`}
        className="group/invoice flex items-center gap-1.5 px-2 py-1 rounded-md bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm hover:shadow-md hover:from-emerald-600 hover:to-teal-600 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        onClick={(e) => e.stopPropagation()}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-describedby={showTooltip ? tooltipId : undefined}
        aria-label={`View invoice from ${invoice.vendor_name || 'vendor'}`}
      >
        <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="text-xs font-semibold">Invoice</span>
        {isAutoMatched && (
          <Sparkles className="w-3 h-3 text-emerald-200" aria-label="Auto-matched" />
        )}
        <ExternalLink className="w-3 h-3 opacity-0 group-hover/invoice:opacity-100 transition-opacity" aria-hidden="true" />
      </a>

      {/* Tooltip - only rendered when visible */}
      {showTooltip && (
        <div
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="absolute left-0 top-full mt-2 z-50 w-64 p-3 rounded-lg bg-white border border-slate-200 shadow-xl animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {invoice.vendor_name || 'Invoice'}
              </p>
              {invoice.invoice_number && (
                <p className="text-xs text-slate-500 truncate">
                  #{invoice.invoice_number}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            {invoice.total_amount && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-900">
                  ₹{parseFloat(invoice.total_amount).toLocaleString('en-IN')}
                </span>
              </div>
            )}
            {invoice.invoice_date && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Date</span>
                <span className="font-medium text-slate-900">
                  {new Date(invoice.invoice_date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
            )}
            {matchConfidence !== null && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Match</span>
                <span className={clsx(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                  matchConfidence >= 0.7
                    ? "bg-emerald-100 text-emerald-700"
                    : matchConfidence >= 0.5
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                )}>
                  {isAutoMatched ? (
                    <>
                      <Sparkles className="w-3 h-3" aria-hidden="true" />
                      <span>Auto</span>
                    </>
                  ) : (
                    <span>Manual</span>
                  )}
                  {' '}{Math.round(matchConfidence * 100)}%
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
              Click to view full invoice
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
