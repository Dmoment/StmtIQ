import { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Calendar,
  Search,
  Tag,
  Plus,
  Paperclip,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { clsx } from 'clsx';

interface GmailSyncStepConfig {
  keywords: string[];
  date_from?: string;
  date_to?: string;
  attachments_only: boolean;
  use_previous_month: boolean;
}

interface GmailSyncStepModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GmailSyncStepConfig;
  onSave: (config: GmailSyncStepConfig) => void;
}

const DEFAULT_KEYWORDS = [
  'invoice',
  'receipt',
  'bill',
  'payment',
  'statement',
  'FIRC',
  'bank statement',
  'tax',
];

export function GmailSyncStepModal({
  isOpen,
  onClose,
  config,
  onSave,
}: GmailSyncStepModalProps) {
  const [keywords, setKeywords] = useState<string[]>(config.keywords || []);
  const [customKeyword, setCustomKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState(config.date_from || '');
  const [dateTo, setDateTo] = useState(config.date_to || '');
  const [attachmentsOnly, setAttachmentsOnly] = useState(config.attachments_only ?? true);
  const [usePreviousMonth, setUsePreviousMonth] = useState(config.use_previous_month ?? true);

  useEffect(() => {
    if (isOpen) {
      setKeywords(config.keywords || []);
      setDateFrom(config.date_from || '');
      setDateTo(config.date_to || '');
      setAttachmentsOnly(config.attachments_only ?? true);
      setUsePreviousMonth(config.use_previous_month ?? true);
    }
  }, [isOpen, config]);

  const handleAddKeyword = () => {
    if (customKeyword.trim() && !keywords.includes(customKeyword.trim())) {
      setKeywords([...keywords, customKeyword.trim()]);
      setCustomKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleToggleKeyword = (keyword: string) => {
    if (keywords.includes(keyword)) {
      handleRemoveKeyword(keyword);
    } else {
      setKeywords([...keywords, keyword]);
    }
  };

  const handleSave = () => {
    onSave({
      keywords,
      date_from: usePreviousMonth ? undefined : dateFrom || undefined,
      date_to: usePreviousMonth ? undefined : dateTo || undefined,
      attachments_only: attachmentsOnly,
      use_previous_month: usePreviousMonth,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-rose-500 via-pink-500 to-violet-500 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Gmail Sync Configuration</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Configure which emails to scan for documents
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-6">
          {/* Date Range Option */}
          <div className="bg-slate-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-900">Date Range</h3>
            </div>

            {/* Auto Previous Month */}
            <label className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={usePreviousMonth}
                onChange={(e) => setUsePreviousMonth(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <p className="font-medium text-slate-900">Use previous month automatically</p>
                <p className="text-xs text-slate-500">Scans emails from the previous calendar month</p>
              </div>
            </label>

            {/* Custom Date Range */}
            {!usePreviousMonth && (
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
              {keywords.map((keyword) => (
                <span
                  key={keyword}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium"
                >
                  <Tag className="w-3.5 h-3.5" />
                  {keyword}
                  <button
                    onClick={() => handleRemoveKeyword(keyword)}
                    className="ml-1 p-0.5 hover:bg-amber-200 rounded-full transition-colors"
                    aria-label={`Remove ${keyword}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {keywords.length === 0 && (
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

            {/* Default Keywords */}
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Suggested keywords
              </p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_KEYWORDS.map((keyword) => (
                  <button
                    key={keyword}
                    onClick={() => handleToggleKeyword(keyword)}
                    className={clsx(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      keywords.includes(keyword)
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
                type="button"
                onClick={() => setAttachmentsOnly(!attachmentsOnly)}
                className={clsx(
                  'w-12 h-7 rounded-full transition-colors relative',
                  attachmentsOnly ? 'bg-amber-500' : 'bg-slate-300'
                )}
                role="switch"
                aria-checked={attachmentsOnly}
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

          {/* Config Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Configuration Summary</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {usePreviousMonth
                  ? 'Date: Previous month (automatic)'
                  : `Date: ${dateFrom || 'Any'} to ${dateTo || 'Any'}`}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Keywords: {keywords.length > 0 ? keywords.join(', ') : 'None specified'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {attachmentsOnly ? 'Only emails with attachments' : 'All matching emails'}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-slate-600 hover:text-slate-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
