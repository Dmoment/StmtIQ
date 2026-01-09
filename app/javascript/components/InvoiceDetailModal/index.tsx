import { useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  FileText,
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
  Pencil,
  Check,
  Loader2,
  Calendar,
  IndianRupee,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Invoice, InvoiceStatus } from '../../types/api';
import { useUpdateInvoice } from '../../queries/useInvoices';
import { InvoiceSummary } from './InvoiceSummary';
import { formatCurrency, formatDate, formatDateTime } from './utils';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  onClose: () => void;
  onMatch: () => void;
  onUnlink?: () => void;
}

interface EditableFields {
  vendor_name: string;
  vendor_gstin: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  currency: string;
}

const statusConfig: Record<
  InvoiceStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: 'Pending Extraction',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  processing: {
    label: 'Processing',
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  extracted: {
    label: 'Ready to Match',
    icon: FileText,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  unmatched: {
    label: 'No Match Found',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  failed: {
    label: 'Extraction Failed',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

export function InvoiceDetailModal({
  invoice,
  onClose,
  onMatch,
  onUnlink,
}: InvoiceDetailModalProps) {
  const status = statusConfig[invoice.status];
  const StatusIcon = status.icon;

  const canEdit = invoice.status !== 'processing' && invoice.status !== 'pending';
  const [isEditing, setIsEditing] = useState(false);
  const [editedFields, setEditedFields] = useState<EditableFields>({
    vendor_name: invoice.vendor_name || '',
    vendor_gstin: invoice.vendor_gstin || '',
    invoice_number: invoice.invoice_number || '',
    invoice_date: invoice.invoice_date || '',
    total_amount: invoice.total_amount || '',
    currency: invoice.currency || 'INR',
  });

  const modalRef = useRef<HTMLDivElement>(null);
  const updateInvoiceMutation = useUpdateInvoice();

  // Focus management - trap focus when modal opens
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  // Keyboard navigation - close on Escape (but warn if editing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          const shouldClose = confirm(
            'You have unsaved changes. Are you sure you want to close?'
          );
          if (shouldClose) {
            handleCancelEdit();
            onClose();
          }
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, onClose]);

  const handleFieldChange = useCallback((field: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    const updateData: Record<string, string | number | undefined> = {};

    // Only include changed fields
    if (editedFields.vendor_name !== (invoice.vendor_name || '')) {
      updateData.vendor_name = editedFields.vendor_name || undefined;
    }
    if (editedFields.vendor_gstin !== (invoice.vendor_gstin || '')) {
      updateData.vendor_gstin = editedFields.vendor_gstin || undefined;
    }
    if (editedFields.invoice_number !== (invoice.invoice_number || '')) {
      updateData.invoice_number = editedFields.invoice_number || undefined;
    }
    if (editedFields.invoice_date !== (invoice.invoice_date || '')) {
      updateData.invoice_date = editedFields.invoice_date || undefined;
    }
    if (editedFields.total_amount !== (invoice.total_amount || '')) {
      updateData.total_amount = editedFields.total_amount
        ? parseFloat(editedFields.total_amount)
        : undefined;
    }
    if (editedFields.currency !== (invoice.currency || 'INR')) {
      updateData.currency = editedFields.currency;
    }

    if (Object.keys(updateData).length === 0) {
      setIsEditing(false);
      return;
    }

    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoice.id,
        data: updateData,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update invoice:', error);
    }
  }, [editedFields, invoice, updateInvoiceMutation]);

  const handleCancelEdit = useCallback(() => {
    setEditedFields({
      vendor_name: invoice.vendor_name || '',
      vendor_gstin: invoice.vendor_gstin || '',
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date || '',
      total_amount: invoice.total_amount || '',
      currency: invoice.currency || 'INR',
    });
    setIsEditing(false);
  }, [invoice]);

  const handleBackdropClick = useCallback(() => {
    if (isEditing) {
      const shouldClose = confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (shouldClose) {
        handleCancelEdit();
        onClose();
      }
    } else {
      onClose();
    }
  }, [isEditing, onClose, handleCancelEdit]);

  const canMatch = invoice.status === 'extracted' || invoice.status === 'unmatched';
  const isMatched = invoice.status === 'matched' && invoice.matched_transaction;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2
                id="invoice-detail-title"
                className="text-lg font-semibold text-slate-900"
              >
                Invoice Details
              </h2>
              <p className="text-sm text-slate-500">
                {invoice.invoice_number || `INV-${invoice.id}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="h-9 px-3 rounded-xl hover:bg-amber-50 text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
                aria-label="Edit invoice"
                title="Edit invoice"
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            )}
            {isEditing && (
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg flex items-center gap-1">
                <Pencil className="w-3 h-3" />
                Editing
              </span>
            )}
            <button
              onClick={handleBackdropClick}
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <div
          className={clsx(
            'px-6 py-3 border-b flex items-center justify-between',
            status.bgColor,
            status.borderColor
          )}
        >
          <div className="flex items-center gap-2">
            <StatusIcon className={clsx('w-4 h-4', status.color)} />
            <span className={clsx('text-sm font-medium', status.color)}>
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
          {/* Invoice Summary - Extracted Component */}
          <InvoiceSummary
            isEditing={isEditing}
            editedFields={editedFields}
            invoice={invoice}
            onFieldChange={handleFieldChange}
          />

          {/* GSTIN - Editable */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs font-medium text-slate-500 uppercase">GSTIN</span>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editedFields.vendor_gstin}
                  onChange={(e) =>
                    handleFieldChange('vendor_gstin', e.target.value.toUpperCase())
                  }
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                  className="mt-2 w-full px-3 py-2 font-mono text-sm text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                  aria-label="GSTIN number"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Format: 22AAAAA0000A1Z5 (15 characters)
                </p>
              </>
            ) : (
              <p className="mt-1 font-mono text-sm text-slate-900">
                {invoice.vendor_gstin || 'Not provided'}
              </p>
            )}
          </div>

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
                    aria-label="Unlink transaction"
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
                      Match confidence:{' '}
                      {Math.round(parseFloat(invoice.match_confidence) * 100)}%
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
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Method
                  </p>
                  <p className="font-medium text-slate-900 capitalize">
                    {invoice.extraction_method}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase mb-1">
                    Confidence
                  </p>
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div>
            {isEditing && (
              <p className="text-xs text-slate-500 max-w-xs">
                Changes will trigger re-matching if amount, date, or vendor is modified
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={updateInvoiceMutation.isPending}
                  className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateInvoiceMutation.isPending}
                  className="px-5 py-2.5 rounded-lg bg-amber-200 text-slate-900 hover:bg-amber-300 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                >
                  {updateInvoiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
