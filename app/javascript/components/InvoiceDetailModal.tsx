import React from 'react';
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
  ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Invoice, InvoiceStatus } from '../types/api';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onMatch: () => void;
}

const statusConfig: Record<InvoiceStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending Extraction',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  processing: {
    label: 'Processing',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  extracted: {
    label: 'Ready to Match',
    icon: FileText,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50'
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  unmatched: {
    label: 'No Match Found',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  failed: {
    label: 'Extraction Failed',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
};

export function InvoiceDetailModal({ invoice, onClose, onMatch }: InvoiceDetailModalProps) {
  const status = statusConfig[invoice.status];
  const StatusIcon = status.icon;

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              status.bgColor
            )}>
              <FileText className={clsx("w-6 h-6", status.color)} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {invoice.invoice_number || `Invoice #${invoice.id}`}
              </h2>
              <span className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium mt-1",
                status.bgColor,
                status.color
              )}>
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Main Details */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Vendor
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {invoice.vendor_name || 'Unknown Vendor'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Invoice Date
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {formatDate(invoice.invoice_date)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Invoice Number
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <Hash className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900">
                    {invoice.invoice_number || '-'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Total Amount
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <IndianRupee className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold text-slate-900 text-lg">
                    {formatCurrency(invoice.total_amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  GSTIN
                </label>
                <p className="font-mono text-sm text-slate-900 mt-1">
                  {invoice.vendor_gstin || '-'}
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Source
                </label>
                <p className="font-medium text-slate-900 mt-1 capitalize">
                  {invoice.source}
                </p>
              </div>
            </div>
          </div>

          {/* Extraction Info */}
          {invoice.extraction_method && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-600" />
                Extraction Details
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-slate-500">Method</label>
                  <p className="font-medium text-slate-900 capitalize">
                    {invoice.extraction_method}
                  </p>
                </div>
                <div>
                  <label className="text-slate-500">Confidence</label>
                  <p className="font-medium text-slate-900">
                    {invoice.extraction_confidence
                      ? `${Math.round(parseFloat(invoice.extraction_confidence) * 100)}%`
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Matched Transaction */}
          {invoice.matched_transaction && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
              <h3 className="font-medium text-emerald-900 mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Linked Transaction
              </h3>
              <div className="space-y-2">
                <p className="text-sm text-emerald-800 font-medium">
                  {invoice.matched_transaction.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-emerald-700">
                  <span>{formatDate(invoice.matched_transaction.transaction_date)}</span>
                  <span>{formatCurrency(invoice.matched_transaction.amount)}</span>
                </div>
                {invoice.match_confidence && (
                  <p className="text-xs text-emerald-600">
                    Match confidence: {Math.round(parseFloat(invoice.match_confidence) * 100)}%
                  </p>
                )}
              </div>
            </div>
          )}

          {/* File Preview */}
          {invoice.file_url && (
            <div>
              <h3 className="font-medium text-slate-900 mb-3">Invoice File</h3>
              <a
                href={invoice.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View Original File
              </a>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Created: {formatDateTime(invoice.created_at)}</span>
              {invoice.matched_at && (
                <span>Matched: {formatDateTime(invoice.matched_at)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {canMatch && (
            <button
              onClick={onMatch}
              className="px-4 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              <Link2 className="w-4 h-4" />
              Match to Transaction
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
