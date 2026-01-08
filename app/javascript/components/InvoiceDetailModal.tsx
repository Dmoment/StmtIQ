import {
  X,
  FileText,
  Building2,
  Calendar,
  IndianRupee,
  Hash,
  Link2,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Unlink,
  Mail,
  Upload,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Invoice, InvoiceStatus } from '../types/api';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onMatch: () => void;
  onUnlink?: () => void;
}

const statusConfig: Record<InvoiceStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  pending: {
    label: 'Pending Extraction',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200'
  },
  processing: {
    label: 'Processing',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  extracted: {
    label: 'Ready to Match',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200'
  },
  unmatched: {
    label: 'No Match Found',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  failed: {
    label: 'Extraction Failed',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
};

export function InvoiceDetailModal({ invoice, onClose, onMatch, onUnlink }: InvoiceDetailModalProps) {
  const status = statusConfig[invoice.status];
  const StatusIcon = status.icon;

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canMatch = invoice.status === 'extracted' || invoice.status === 'unmatched';
  const isMatched = invoice.status === 'matched' && invoice.matched_transaction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 id="invoice-detail-title" className="text-lg font-semibold text-slate-900">
                Invoice Details
              </h2>
              <p className="text-sm text-slate-500">
                {invoice.invoice_number || `INV-${invoice.id}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Banner */}
        <div className={clsx(
          "px-6 py-3 border-b flex items-center justify-between",
          status.bgColor,
          status.borderColor
        )}>
          <div className="flex items-center gap-2">
            <StatusIcon className={clsx("w-4 h-4", status.color)} />
            <span className={clsx("text-sm font-medium", status.color)}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {invoice.source === 'gmail' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-xs font-medium text-slate-600">
                <Mail className="w-3 h-3" />
                Gmail
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/80 text-xs font-medium text-slate-600">
                <Upload className="w-3 h-3" />
                Uploaded
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Invoice Summary Banner */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-amber-50/30 border border-orange-100 p-5">
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Vendor</p>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900 truncate">
                    {invoice.vendor_name || 'Unknown'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {formatDate(invoice.invoice_date)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Invoice #</p>
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900">
                    {invoice.invoice_number || '-'}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">Amount</p>
                <div className="flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-slate-400" />
                  <span className="font-bold text-slate-900 text-lg">
                    {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
              </div>
            </div>
            {/* Decorative element */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50" aria-hidden="true" />
          </div>

          {/* GSTIN if available */}
          {invoice.vendor_gstin && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-medium text-slate-500 uppercase">GSTIN</span>
              <span className="font-mono text-sm text-slate-900">{invoice.vendor_gstin}</span>
            </div>
          )}

          {/* Linked Transaction */}
          {isMatched && invoice.matched_transaction && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-emerald-900 flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Linked Transaction
                </h3>
                {onUnlink && (
                  <button
                    onClick={onUnlink}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    Unlink
                  </button>
                )}
              </div>
              <div className="bg-white rounded-lg p-3 border border-emerald-200">
                <p className="font-medium text-slate-900 mb-2">
                  {invoice.matched_transaction.description}
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(invoice.matched_transaction.transaction_date)}
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {formatCurrency(invoice.matched_transaction.amount)}
                  </span>
                </div>
                {invoice.match_confidence && (
                  <div className="mt-2 pt-2 border-t border-emerald-100">
                    <span className="text-xs text-emerald-600">
                      Match confidence: {Math.round(parseFloat(invoice.match_confidence) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Extraction Details */}
          {invoice.extraction_method && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Extraction Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Method</p>
                  <p className="font-medium text-slate-900 capitalize">
                    {invoice.extraction_method}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">Confidence</p>
                  <p className="font-medium text-slate-900">
                    {invoice.extraction_confidence
                      ? `${Math.round(parseFloat(invoice.extraction_confidence) * 100)}%`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* File Link */}
          {invoice.file_url && (
            <a
              href={invoice.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-500" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 group-hover:text-orange-600 transition-colors">
                    View Original Invoice
                  </p>
                  <p className="text-xs text-slate-500">Open in new tab</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </a>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>Created {formatDateTime(invoice.created_at)}</span>
            {invoice.matched_at && (
              <span>Matched {formatDateTime(invoice.matched_at)}</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-sm font-medium"
          >
            Close
          </button>
          {canMatch && (
            <button
              onClick={onMatch}
              className="px-5 py-2.5 rounded-lg bg-amber-200 text-slate-900 hover:bg-amber-300 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Link2 className="w-4 h-4" />
              Link to Transaction
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
