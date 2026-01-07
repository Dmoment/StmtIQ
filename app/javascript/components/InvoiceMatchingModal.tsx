import React, { useState } from 'react';
import {
  X,
  Search,
  Link2,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Calendar,
  Building2,
  FileText,
  ArrowRight,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Invoice, InvoiceSuggestion, Transaction } from '../types/api';
import { useInvoiceSuggestions, useLinkInvoice } from '../queries/useInvoices';
import { useTransactions } from '../queries/useTransactions';

interface InvoiceMatchingModalProps {
  invoice: Invoice;
  onClose: () => void;
}

export function InvoiceMatchingModal({ invoice, onClose }: InvoiceMatchingModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  const { data: suggestions, isLoading: loadingSuggestions } = useInvoiceSuggestions(invoice.id);
  const { data: allTransactions, isLoading: loadingTransactions } = useTransactions({
    per_page: 50,
  });
  const linkMutation = useLinkInvoice();

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
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

  const handleLink = async () => {
    if (!selectedTransaction) return;

    try {
      await linkMutation.mutateAsync({
        invoiceId: invoice.id,
        transactionId: selectedTransaction.id
      });
      onClose();
    } catch (err) {
      // Error handled by mutation
    }
  };

  // Filter transactions by search
  const filteredTransactions = showAllTransactions
    ? (allTransactions || []).filter(tx => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return tx.description.toLowerCase().includes(query);
      })
    : [];

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-emerald-600 bg-emerald-50';
    if (score >= 0.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Match Invoice</h2>
            <p className="text-sm text-slate-600 mt-1">
              Select a transaction to link with this invoice
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="p-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center">
              <FileText className="w-6 h-6 text-violet-600" />
            </div>
            <div className="flex-1 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Vendor</p>
                <p className="font-medium text-slate-900">
                  {invoice.vendor_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Date</p>
                <p className="font-medium text-slate-900">
                  {formatDate(invoice.invoice_date)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Amount</p>
                <p className="font-semibold text-slate-900">
                  {formatCurrency(invoice.total_amount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Suggestions */}
          {!showAllTransactions && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                <h3 className="font-semibold text-slate-900">AI Suggestions</h3>
              </div>

              {loadingSuggestions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.transaction.id}
                      onClick={() => setSelectedTransaction(suggestion.transaction)}
                      className={clsx(
                        "w-full p-4 rounded-lg border-2 text-left transition-all",
                        selectedTransaction?.id === suggestion.transaction.id
                          ? "border-slate-800 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-slate-900 line-clamp-1">
                            {suggestion.transaction.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(suggestion.transaction.transaction_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <IndianRupee className="w-3.5 h-3.5" />
                              {formatCurrency(suggestion.transaction.amount)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={clsx(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            getScoreColor(suggestion.score)
                          )}>
                            {Math.round(suggestion.score * 100)}% match
                          </span>
                          {suggestion.breakdown && (
                            <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                              <p>Amount: {Math.round(suggestion.breakdown.amount_score * 100)}%</p>
                              <p>Date: {Math.round(suggestion.breakdown.date_score * 100)}%</p>
                              <p>Vendor: {Math.round(suggestion.breakdown.vendor_score * 100)}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-slate-50 rounded-lg">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600">No matching transactions found</p>
                </div>
              )}

              <button
                onClick={() => setShowAllTransactions(true)}
                className="w-full py-2 text-center text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Or browse all transactions
              </button>
            </div>
          )}

          {/* All Transactions */}
          {showAllTransactions && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">All Transactions</h3>
                <button
                  onClick={() => setShowAllTransactions(false)}
                  className="text-sm text-slate-600 hover:text-slate-900"
                >
                  Back to suggestions
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>

              {loadingTransactions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {filteredTransactions.map((tx) => (
                    <button
                      key={tx.id}
                      onClick={() => setSelectedTransaction(tx)}
                      className={clsx(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedTransaction?.id === tx.id
                          ? "border-slate-800 bg-slate-50"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <p className="font-medium text-slate-900 text-sm line-clamp-1">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{formatDate(tx.transaction_date)}</span>
                        <span className={tx.transaction_type === 'debit' ? 'text-red-600' : 'text-emerald-600'}>
                          {formatCurrency(tx.amount)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-200">
          <div className="text-sm text-slate-600">
            {selectedTransaction && (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Transaction selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedTransaction || linkMutation.isPending}
              className={clsx(
                "px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2",
                selectedTransaction && !linkMutation.isPending
                  ? "bg-slate-800 text-white hover:bg-slate-700"
                  : "bg-slate-200 text-slate-500 cursor-not-allowed"
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
