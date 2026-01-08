import { useState, useMemo, useCallback } from 'react';
import {
  X,
  Search,
  Link2,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Calendar,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Transaction } from '../types/api';
import { useInvoices, useLinkInvoice } from '../queries/useInvoices';

interface TransactionLinkInvoiceModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export function TransactionLinkInvoiceModal({ transaction, onClose }: TransactionLinkInvoiceModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);

  // Fetch invoices that can be linked (extracted or unmatched status)
  const { data: invoices, isLoading: loadingInvoices } = useInvoices({
    per_page: 100,
  });
  const linkMutation = useLinkInvoice();

  const formatCurrency = useCallback((amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  }, []);

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const handleLink = async () => {
    if (!selectedInvoiceId) return;

    try {
      await linkMutation.mutateAsync({
        invoiceId: selectedInvoiceId,
        transactionId: transaction.id
      });
      onClose();
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Filter invoices - only show those that can be linked (extracted/unmatched)
  const availableInvoices = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv =>
      (inv.status === 'extracted' || inv.status === 'unmatched') &&
      !inv.matched_transaction
    );
  }, [invoices]);

  // Filter by search
  const filteredInvoices = useMemo(() => {
    if (!searchQuery) return availableInvoices;
    const query = searchQuery.toLowerCase();
    return availableInvoices.filter(inv =>
      (inv.vendor_name?.toLowerCase().includes(query)) ||
      (inv.invoice_number?.toLowerCase().includes(query))
    );
  }, [availableInvoices, searchQuery]);

  const txAmount = parseFloat(transaction.amount);

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
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-slate-900">Link Invoice</h2>
              <p className="text-sm text-slate-500">Select an invoice for this transaction</p>
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

        {/* Transaction Summary Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border-b border-orange-100 px-6 py-4">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm">
              <IndianRupee className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-0.5">Transaction</p>
              <p className="font-semibold text-slate-900 truncate">
                {transaction.description}
              </p>
              <div className="flex items-center gap-4 mt-1 text-sm">
                <span className="text-slate-500">{formatDate(transaction.transaction_date)}</span>
                <span className="font-bold text-slate-900">{formatCurrency(txAmount)}</span>
              </div>
            </div>
          </div>
          {/* Decorative element */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vendor or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
              aria-label="Search invoices"
            />
          </div>

          {loadingInvoices ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
              </div>
              <p className="text-sm font-medium text-slate-600">Loading invoices...</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <p className="text-xs text-slate-500 mb-3">
                {filteredInvoices.length} invoice{filteredInvoices.length > 1 ? 's' : ''} available to link
              </p>
              {filteredInvoices.map((invoice) => {
                const isSelected = selectedInvoiceId === invoice.id;
                const invoiceAmount = invoice.total_amount ? parseFloat(invoice.total_amount) : 0;
                const amountMatch = Math.abs(invoiceAmount - txAmount) < 1;

                return (
                  <button
                    key={invoice.id}
                    onClick={() => setSelectedInvoiceId(invoice.id)}
                    className={clsx(
                      "w-full p-4 rounded-xl border-2 text-left transition-all group",
                      isSelected
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-slate-200 hover:border-amber-200 hover:bg-amber-50/30"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Selection Indicator */}
                      <div className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                        isSelected
                          ? "border-amber-500 bg-amber-500"
                          : "border-slate-300 group-hover:border-amber-300"
                      )}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>

                      {/* Invoice Icon */}
                      <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-orange-500" />
                      </div>

                      {/* Invoice Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            <p className={clsx(
                              "font-medium transition-colors",
                              isSelected ? "text-slate-900" : "text-slate-700"
                            )}>
                              {invoice.vendor_name || 'Unknown Vendor'}
                            </p>
                            <p className="text-xs text-slate-500">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </p>
                          </div>
                          {amountMatch && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" />
                              Amount Match
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-sm mt-2">
                          <span className="flex items-center gap-1.5 text-slate-500">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(invoice.invoice_date)}
                          </span>
                          <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {formatCurrency(invoice.total_amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">No invoices available</h3>
              <p className="text-sm text-slate-500 max-w-xs">
                {searchQuery
                  ? 'No invoices match your search'
                  : 'Upload invoices first to link them to transactions'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-sm">
            {selectedInvoiceId ? (
              <span className="flex items-center gap-2 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Ready to link
              </span>
            ) : (
              <span className="text-slate-400">Select an invoice to link</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedInvoiceId || linkMutation.isPending}
              className={clsx(
                "px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 text-sm",
                selectedInvoiceId && !linkMutation.isPending
                  ? "bg-amber-200 text-slate-900 hover:bg-amber-300"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
              )}
            >
              {linkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  Link Invoice
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
