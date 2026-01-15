import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  Search,
  Tag,
  Plus,
  Loader2,
  Shield,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Clock,
  Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useGmailSyncSuggestions, useSyncGmail, type GmailSyncFilters } from '../../queries/useGmail';
import type { GmailConnection } from '../../types/api';

// Animated circular progress component
function ScanningProgress() {
  return (
    <div className="relative w-32 h-32">
      {/* Background circle */}
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-slate-100"
        />
        {/* Animated progress arc */}
        <circle
          cx="64"
          cy="64"
          r="56"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="352"
          strokeDashoffset="88"
          className="animate-[spin_3s_linear_infinite] origin-center"
          style={{ transformOrigin: '64px 64px' }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center icon with pulse */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-amber-400/30 rounded-full animate-ping" />
          <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Mail className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface GmailSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection: GmailConnection;
}

export function GmailSyncModal({ isOpen, onClose, connection }: GmailSyncModalProps) {
  const { data: suggestions, isLoading: suggestionsLoading } = useGmailSyncSuggestions();
  const syncGmail = useSyncGmail();

  // Form state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [customKeyword, setCustomKeyword] = useState('');
  const [attachmentsOnly, setAttachmentsOnly] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form with suggestions
  useEffect(() => {
    if (suggestions?.date_range) {
      setDateFrom(suggestions.date_range.start_date || '');
      setDateTo(suggestions.date_range.end_date || '');
    }
    if (suggestions?.default_keywords) {
      setSelectedKeywords(suggestions.default_keywords.slice(0, 4));
    }
  }, [suggestions]);

  const handleAddKeyword = () => {
    if (customKeyword.trim() && !selectedKeywords.includes(customKeyword.trim())) {
      setSelectedKeywords([...selectedKeywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setSelectedKeywords(selectedKeywords.filter(k => k !== keyword));
  };

  const handleToggleKeyword = (keyword: string) => {
    if (selectedKeywords.includes(keyword)) {
      handleRemoveKeyword(keyword);
    } else {
      setSelectedKeywords([...selectedKeywords, keyword]);
    }
  };

  const handleSync = async () => {
    const filters: GmailSyncFilters = {
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      keywords: selectedKeywords.length > 0 ? selectedKeywords : undefined,
      include_attachments_only: attachmentsOnly,
    };

    try {
      await syncGmail.mutateAsync({ id: connection.id, filters });
      setShowSuccess(true);
      // Don't auto-close - let user close when ready
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleClose = () => {
    setShowSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  const canSync = suggestions?.has_transactions;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-rose-500 via-pink-500 to-violet-500 px-6 py-8 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Mail className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Scan Gmail for Invoices</h2>
              <p className="text-white/80 text-sm mt-1">
                Connected: {connection.email}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {suggestionsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
          ) : showSuccess ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              {/* Animated Progress Circle */}
              <ScanningProgress />

              {/* Main Message */}
              <h3 className="text-2xl font-bold text-slate-900 mt-6 mb-2">
                Scanning Your Inbox
              </h3>
              <p className="text-slate-500 max-w-sm mb-6">
                We're searching through your emails to find invoices and receipts.
                This happens in the background — feel free to close this window.
              </p>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-sm mb-6">
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-800">PROCESSING</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    Usually takes 2-5 minutes
                  </p>
                </div>
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-100">
                  <div className="flex items-center gap-2 mb-1">
                    <Bell className="w-4 h-4 text-violet-600" />
                    <span className="text-xs font-semibold text-violet-800">NOTIFICATION</span>
                  </div>
                  <p className="text-sm text-violet-700">
                    We'll notify when done
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white rounded-xl font-semibold transition-all shadow-lg"
              >
                Got it, close window
              </button>

              {/* Small reassurance text */}
              <p className="text-xs text-slate-400 mt-4 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Your data is secure and never leaves your account
              </p>
            </div>
          ) : !canSync ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Transactions Found</h3>
              <p className="text-slate-600 text-sm">
                Please upload and parse bank statements first. We use your transaction data to
                intelligently filter emails and find matching invoices.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Transparency Notice */}
              <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-1">What we scan</h4>
                    <p className="text-sm text-slate-600">
                      We only search for emails matching your filters below. We look for PDF/image
                      attachments that could be invoices. Your data stays private and secure.
                    </p>
                  </div>
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Date Range</h3>
                  <span className="text-xs text-slate-500 bg-white px-2 py-0.5 rounded-lg">
                    Based on your transactions
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">From</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1.5">To</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
                    />
                  </div>
                </div>
                {suggestions?.transaction_count && (
                  <p className="text-xs text-slate-500 mt-2">
                    <Sparkles className="w-3 h-3 inline mr-1" />
                    Auto-set from {suggestions.transaction_count.toLocaleString()} transactions
                  </p>
                )}
              </div>

              {/* Keywords Section */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Search Keywords</h3>
                </div>

                {/* Selected Keywords */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedKeywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      {keyword}
                      <button
                        onClick={() => handleRemoveKeyword(keyword)}
                        className="ml-1 p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {selectedKeywords.length === 0 && (
                    <span className="text-sm text-slate-400 italic">No keywords selected</span>
                  )}
                </div>

                {/* Add Custom Keyword */}
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={customKeyword}
                    onChange={(e) => setCustomKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="Add custom keyword..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white text-sm"
                  />
                  <button
                    onClick={handleAddKeyword}
                    disabled={!customKeyword.trim()}
                    className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {/* Suggested Keywords */}
                {suggestions?.suggested_keywords && suggestions.suggested_keywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      From your transactions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.suggested_keywords.map((keyword) => (
                        <button
                          key={keyword}
                          onClick={() => handleToggleKeyword(keyword)}
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                            selectedKeywords.includes(keyword)
                              ? 'bg-violet-100 text-violet-800 ring-2 ring-violet-300'
                              : 'bg-white border border-slate-200 text-slate-600 hover:border-violet-300 hover:text-violet-700'
                          )}
                        >
                          {keyword}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Default Keywords */}
                <div className="mt-4">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Common invoice keywords
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions?.default_keywords?.map((keyword) => (
                      <button
                        key={keyword}
                        onClick={() => handleToggleKeyword(keyword)}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                          selectedKeywords.includes(keyword)
                            ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-300'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-700'
                        )}
                      >
                        {keyword}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Attachment Filter */}
              <div className="bg-slate-50 rounded-2xl p-5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                      <Paperclip className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Only emails with attachments</p>
                      <p className="text-sm text-slate-500">Skip emails without PDF or image attachments</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachmentsOnly(!attachmentsOnly)}
                    className={clsx(
                      'w-12 h-7 rounded-full transition-colors relative',
                      attachmentsOnly ? 'bg-amber-500' : 'bg-slate-300'
                    )}
                  >
                    <span
                      className={clsx(
                        'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform',
                        attachmentsOnly ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </label>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold">Search Summary</h3>
                </div>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Date range: {dateFrom || 'Any'} → {dateTo || 'Any'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Keywords: {selectedKeywords.length > 0 ? selectedKeywords.join(', ') : 'None specified'}
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    {attachmentsOnly ? 'Only emails with attachments' : 'All matching emails'}
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showSuccess && canSync && (
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={handleClose}
              className="px-5 py-2.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSync}
              disabled={syncGmail.isPending}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {syncGmail.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Start Scanning
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
