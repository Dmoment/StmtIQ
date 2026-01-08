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
  Sparkles,
  Zap,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Invoice } from '../types/api';
import { useInvoiceSuggestions, useLinkInvoice } from '../queries/useInvoices';
import { useTransactions } from '../queries/useTransactions';

// API response structure for suggestions (flat, not nested)
interface SuggestionResponse {
  transaction_id: number;
  description: string;
  amount: string;
  transaction_date: string;
  transaction_type?: 'debit' | 'credit';
  category: string | null;
  score: number;
  breakdown: {
    amount_score: number;
    date_score: number;
    vendor_score: number;
  };
}

interface InvoiceMatchingModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceMatchingModal({ invoice, onClose }: InvoiceMatchingModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'all'>('suggestions');

  const { data: suggestionsRaw, isLoading: loadingSuggestions } = useInvoiceSuggestions(invoice.id);
  const suggestions = suggestionsRaw as unknown as SuggestionResponse[] | undefined;
  const { data: allTransactions, isLoading: loadingTransactions } = useTransactions({
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
    if (!selectedTransactionId) return;

    try {
      await linkMutation.mutateAsync({
        invoiceId: invoice.id,
        transactionId: selectedTransactionId
      });
      onClose();
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Filter transactions by search
  const filteredTransactions = useMemo(() => {
    if (!allTransactions) return [];
    if (!searchQuery) return allTransactions;
    const query = searchQuery.toLowerCase();
    return allTransactions.filter(tx =>
      tx.description.toLowerCase().includes(query)
    );
  }, [allTransactions, searchQuery]);

  const getScoreBadge = (score: number) => {
    if (score >= 0.8) return { label: 'Excellent', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    if (score >= 0.6) return { label: 'Good', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    return { label: 'Possible', color: 'bg-slate-100 text-slate-600 border-slate-200' };
  };

  const hasSuggestions = suggestions && suggestions.length > 0;

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
              <p className="text-sm text-slate-500">Match with a transaction</p>
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

        {/* Invoice Summary Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border-b border-orange-100 px-6 py-4">
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm">
              <FileText className="w-6 h-6 text-orange-500" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-0.5">Vendor</p>
                <p className="font-semibold text-slate-900 truncate">
                  {invoice.vendor_name || 'Unknown Vendor'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-0.5">Date</p>
                <p className="font-semibold text-slate-900">
                  {formatDate(invoice.invoice_date)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-0.5">Amount</p>
                <p className="font-bold text-slate-900 text-lg">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50" aria-hidden="true" />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-2">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'suggestions'
                ? "bg-amber-200 text-slate-900"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <Sparkles className="w-4 h-4" />
            AI Suggestions
            {hasSuggestions && (
              <span className="ml-1 px-1.5 py-0.5 rounded-md bg-white/80 text-xs font-semibold">
                {suggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === 'all'
                ? "bg-amber-200 text-slate-900"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
            )}
          >
            <Search className="w-4 h-4" />
            Browse All
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* AI Suggestions Tab */}
          {activeTab === 'suggestions' && (
            <div className="space-y-3 pt-2">
              {loadingSuggestions ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">Finding best matches...</p>
                  <p className="text-xs text-slate-400 mt-1">Analyzing transactions</p>
                </div>
              ) : hasSuggestions ? (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Found {suggestions.length} potential match{suggestions.length > 1 ? 'es' : ''} based on amount, date, and vendor
                  </p>
                  {suggestions.map((suggestion) => {
                    const isSelected = selectedTransactionId === suggestion.transaction_id;
                    const scoreBadge = getScoreBadge(suggestion.score);

                    return (
                      <button
                        key={suggestion.transaction_id}
                        onClick={() => setSelectedTransactionId(suggestion.transaction_id)}
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

                          {/* Transaction Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className={clsx(
                                "font-medium line-clamp-2 transition-colors",
                                isSelected ? "text-slate-900" : "text-slate-700"
                              )}>
                                {suggestion.description}
                              </p>
                              <span className={clsx(
                                "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border flex-shrink-0",
                                scoreBadge.color
                              )}>
                                <Zap className="w-3 h-3" />
                                {Math.round(suggestion.score * 100)}%
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-sm">
                              <span className="flex items-center gap-1.5 text-slate-500">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(suggestion.transaction_date)}
                              </span>
                              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                                <IndianRupee className="w-3.5 h-3.5" />
                                {formatCurrency(suggestion.amount)}
                              </span>
                            </div>

                            {/* Match Breakdown */}
                            {suggestion.breakdown && (
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                                <span className="text-xs text-slate-400">Match breakdown:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    Amount {Math.round(suggestion.breakdown.amount_score * 100)}%
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    Date {Math.round(suggestion.breakdown.date_score * 100)}%
                                  </span>
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    Vendor {Math.round(suggestion.breakdown.vendor_score * 100)}%
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">No matches found</h3>
                  <p className="text-sm text-slate-500 max-w-xs mb-4">
                    We couldn't find transactions that match this invoice automatically
                  </p>
                  <button
                    onClick={() => setActiveTab('all')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-200 text-slate-900 text-sm font-medium hover:bg-amber-300 transition-colors"
                  >
                    Browse all transactions
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* All Transactions Tab */}
          {activeTab === 'all' && (
            <div className="space-y-3 pt-2">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300 transition-all"
                  aria-label="Search transactions"
                />
              </div>

              {loadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : filteredTransactions.length > 0 ? (
                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                  {filteredTransactions.map((tx) => {
                    const isSelected = selectedTransactionId === tx.id;

                    return (
                      <button
                        key={tx.id}
                        onClick={() => setSelectedTransactionId(tx.id)}
                        className={clsx(
                          "w-full p-3 rounded-xl border-2 text-left transition-all group",
                          isSelected
                            ? "border-amber-400 bg-amber-50"
                            : "border-slate-200 hover:border-amber-200 hover:bg-amber-50/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {/* Selection Indicator */}
                          <div className={clsx(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                            isSelected
                              ? "border-amber-500 bg-amber-500"
                              : "border-slate-300 group-hover:border-amber-300"
                          )}>
                            {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={clsx(
                              "font-medium text-sm truncate transition-colors",
                              isSelected ? "text-slate-900" : "text-slate-700"
                            )}>
                              {tx.description}
                            </p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(tx.transaction_date)}
                              </span>
                              <span className={clsx(
                                "font-semibold",
                                tx.transaction_type === 'debit' ? 'text-slate-700' : 'text-emerald-600'
                              )}>
                                {tx.transaction_type === 'debit' ? '-' : '+'}
                                {formatCurrency(tx.amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-500">
                    {searchQuery ? 'No transactions match your search' : 'No transactions available'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="text-sm">
            {selectedTransactionId ? (
              <span className="flex items-center gap-2 text-emerald-600 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Ready to link
              </span>
            ) : (
              <span className="text-slate-400">Select a transaction to link</span>
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
              disabled={!selectedTransactionId || linkMutation.isPending}
              className={clsx(
                "px-5 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 text-sm",
                selectedTransactionId && !linkMutation.isPending
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
