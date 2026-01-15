import { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  Building2,
  Wifi,
  Zap,
  Phone,
  Cloud,
  CreditCard,
  Shield,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';

interface AddRecurringStepConfig {
  invoice_categories: string[];
  auto_match: boolean;
  create_if_missing: boolean;
  notify_on_missing: boolean;
}

interface AddRecurringModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AddRecurringStepConfig;
  onSave: (config: AddRecurringStepConfig) => void;
}

const RECURRING_CATEGORIES = [
  { id: 'rent', label: 'Rent', icon: Building2, color: 'from-violet-400 to-violet-500' },
  { id: 'internet', label: 'Internet', icon: Wifi, color: 'from-blue-400 to-blue-500' },
  { id: 'electricity', label: 'Electricity', icon: Zap, color: 'from-amber-400 to-amber-500' },
  { id: 'phone', label: 'Phone/Mobile', icon: Phone, color: 'from-emerald-400 to-emerald-500' },
  { id: 'cloud_services', label: 'Cloud Services', icon: Cloud, color: 'from-cyan-400 to-cyan-500' },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard, color: 'from-pink-400 to-pink-500' },
  { id: 'insurance', label: 'Insurance', icon: Shield, color: 'from-slate-400 to-slate-500' },
];

export function AddRecurringModal({
  isOpen,
  onClose,
  config,
  onSave,
}: AddRecurringModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    config.invoice_categories || []
  );
  const [autoMatch, setAutoMatch] = useState(config.auto_match ?? true);
  const [createIfMissing, setCreateIfMissing] = useState(config.create_if_missing ?? false);
  const [notifyOnMissing, setNotifyOnMissing] = useState(config.notify_on_missing ?? true);
  const [customCategory, setCustomCategory] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedCategories(config.invoice_categories || []);
      setAutoMatch(config.auto_match ?? true);
      setCreateIfMissing(config.create_if_missing ?? false);
      setNotifyOnMissing(config.notify_on_missing ?? true);
    }
  }, [isOpen, config]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((c) => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleAddCustomCategory = () => {
    if (customCategory.trim() && !selectedCategories.includes(customCategory.trim().toLowerCase())) {
      setSelectedCategories([...selectedCategories, customCategory.trim().toLowerCase()]);
      setCustomCategory('');
    }
  };

  const handleSave = () => {
    onSave({
      invoice_categories: selectedCategories,
      auto_match: autoMatch,
      create_if_missing: createIfMissing,
      notify_on_missing: notifyOnMissing,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-500 to-purple-600 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add Recurring Invoices</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Select recurring invoice types to add
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Invoice Categories
            </label>
            <div className="grid grid-cols-2 gap-3">
              {RECURRING_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <button
                    key={category.id}
                    onClick={() => handleToggleCategory(category.id)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected
                        ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                        isSelected ? category.color : 'from-slate-200 to-slate-300',
                        isSelected ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={clsx(
                        'font-medium text-sm',
                        isSelected ? 'text-violet-900' : 'text-slate-700'
                      )}
                    >
                      {category.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-violet-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Add Custom Category */}
            <div className="flex gap-2 mt-4">
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomCategory()}
                placeholder="Add custom category..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleAddCustomCategory}
                disabled={!customCategory.trim()}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Custom categories display */}
            {selectedCategories.filter(c => !RECURRING_CATEGORIES.find(rc => rc.id === c)).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedCategories
                  .filter(c => !RECURRING_CATEGORIES.find(rc => rc.id === c))
                  .map((category) => (
                    <span
                      key={category}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-800 rounded-lg text-sm font-medium"
                    >
                      {category}
                      <button
                        onClick={() => handleToggleCategory(category)}
                        className="ml-1 p-0.5 hover:bg-violet-200 rounded-full transition-colors"
                        aria-label={`Remove ${category}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={autoMatch}
                onChange={(e) => setAutoMatch(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Auto-match with transactions</p>
                <p className="text-xs text-slate-500">
                  Automatically link invoices to matching transactions
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={createIfMissing}
                onChange={(e) => setCreateIfMissing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Create placeholder if missing</p>
                <p className="text-xs text-slate-500">
                  Create a placeholder entry if no invoice is found
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnMissing}
                onChange={(e) => setNotifyOnMissing(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-violet-500 focus:ring-violet-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Notify if missing</p>
                <p className="text-xs text-slate-500">
                  Send a notification when recurring invoices are missing
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
                Categories: {selectedCategories.length > 0 ? selectedCategories.join(', ') : 'None selected'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Auto-match: {autoMatch ? 'Enabled' : 'Disabled'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Notify on missing: {notifyOnMissing ? 'Yes' : 'No'}
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
            className="px-6 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-violet-500/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
