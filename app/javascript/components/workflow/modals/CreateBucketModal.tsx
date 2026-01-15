import { useState, useEffect } from 'react';
import {
  X,
  Folder,
  Calendar,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { clsx } from 'clsx';

interface CreateBucketStepConfig {
  bucket_type: 'previous_month' | 'current_month' | 'custom';
  custom_name?: string;
  include_gmail_docs: boolean;
  auto_categorize: boolean;
}

interface CreateBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CreateBucketStepConfig;
  onSave: (config: CreateBucketStepConfig) => void;
}

const BUCKET_TYPE_OPTIONS = [
  {
    value: 'previous_month' as const,
    label: 'Previous Month',
    description: 'Create bucket for the previous calendar month (e.g., December 2025)',
    icon: Calendar,
  },
  {
    value: 'current_month' as const,
    label: 'Current Month',
    description: 'Create bucket for the current calendar month',
    icon: Calendar,
  },
  {
    value: 'custom' as const,
    label: 'Custom Name',
    description: 'Specify a custom name for the bucket',
    icon: FileText,
  },
];

export function CreateBucketModal({
  isOpen,
  onClose,
  config,
  onSave,
}: CreateBucketModalProps) {
  const [bucketType, setBucketType] = useState<CreateBucketStepConfig['bucket_type']>(
    config.bucket_type || 'previous_month'
  );
  const [customName, setCustomName] = useState(config.custom_name || '');
  const [includeGmailDocs, setIncludeGmailDocs] = useState(config.include_gmail_docs ?? true);
  const [autoCategorize, setAutoCategorize] = useState(config.auto_categorize ?? true);

  useEffect(() => {
    if (isOpen) {
      setBucketType(config.bucket_type || 'previous_month');
      setCustomName(config.custom_name || '');
      setIncludeGmailDocs(config.include_gmail_docs ?? true);
      setAutoCategorize(config.auto_categorize ?? true);
    }
  }, [isOpen, config]);

  const handleSave = () => {
    onSave({
      bucket_type: bucketType,
      custom_name: bucketType === 'custom' ? customName : undefined,
      include_gmail_docs: includeGmailDocs,
      auto_categorize: autoCategorize,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-500 to-violet-500 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Create Monthly Bucket</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Configure bucket creation settings
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Bucket Type Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Bucket Type
            </label>
            <div className="space-y-2">
              {BUCKET_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setBucketType(option.value)}
                    className={clsx(
                      'w-full flex items-start gap-3 p-4 rounded-xl border transition-colors text-left',
                      bucketType === option.value
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                        bucketType === option.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div
                        className={clsx(
                          'font-medium',
                          bucketType === option.value ? 'text-blue-900' : 'text-slate-700'
                        )}
                      >
                        {option.label}
                      </div>
                      <div className="text-xs text-slate-500">{option.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Name Input */}
          {bucketType === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Custom Bucket Name
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Q4 2025 Documents"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={includeGmailDocs}
                onChange={(e) => setIncludeGmailDocs(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Include Gmail documents</p>
                <p className="text-xs text-slate-500">
                  Add documents fetched from Gmail to this bucket
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoCategorize}
                onChange={(e) => setAutoCategorize(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Auto-categorize documents</p>
                <p className="text-xs text-slate-500">
                  Automatically organize documents by type (invoices, statements, etc.)
                </p>
              </div>
            </label>
          </div>

          {/* Config Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Configuration Summary</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Bucket:{' '}
                {bucketType === 'previous_month'
                  ? 'Previous month'
                  : bucketType === 'current_month'
                    ? 'Current month'
                    : customName || 'Custom name'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Gmail docs: {includeGmailDocs ? 'Included' : 'Not included'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Auto-categorize: {autoCategorize ? 'Enabled' : 'Disabled'}
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
            disabled={bucketType === 'custom' && !customName.trim()}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
