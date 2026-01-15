import { useState, useEffect } from 'react';
import {
  X,
  Share2,
  CheckCircle2,
  Mail,
  MessageCircle,
  Link2,
  Users,
  Plus,
} from 'lucide-react';
import { clsx } from 'clsx';

interface ShareDocumentsStepConfig {
  share_method: 'email' | 'whatsapp' | 'link' | 'all';
  recipients: string[];
  include_summary: boolean;
  auto_generate_link: boolean;
  link_expiry_days: number;
  message_template?: string;
}

interface ShareDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ShareDocumentsStepConfig;
  onSave: (config: ShareDocumentsStepConfig) => void;
}

const SHARE_METHODS = [
  {
    value: 'email' as const,
    label: 'Email',
    description: 'Send documents via email',
    icon: Mail,
    color: 'from-blue-400 to-blue-500',
  },
  {
    value: 'whatsapp' as const,
    label: 'WhatsApp',
    description: 'Share via WhatsApp',
    icon: MessageCircle,
    color: 'from-emerald-400 to-emerald-500',
  },
  {
    value: 'link' as const,
    label: 'Share Link',
    description: 'Generate a shareable link',
    icon: Link2,
    color: 'from-violet-400 to-violet-500',
  },
  {
    value: 'all' as const,
    label: 'All Methods',
    description: 'Use all available methods',
    icon: Share2,
    color: 'from-amber-400 to-amber-500',
  },
];

export function ShareDocumentsModal({
  isOpen,
  onClose,
  config,
  onSave,
}: ShareDocumentsModalProps) {
  const [shareMethod, setShareMethod] = useState<ShareDocumentsStepConfig['share_method']>(
    config.share_method || 'email'
  );
  const [recipients, setRecipients] = useState<string[]>(config.recipients || []);
  const [newRecipient, setNewRecipient] = useState('');
  const [includeSummary, setIncludeSummary] = useState(config.include_summary ?? true);
  const [autoGenerateLink, setAutoGenerateLink] = useState(config.auto_generate_link ?? true);
  const [linkExpiryDays, setLinkExpiryDays] = useState(config.link_expiry_days || 7);
  const [messageTemplate, setMessageTemplate] = useState(
    config.message_template ||
      'Hi, please find the documents for {{month}} attached. Let me know if you need anything else.'
  );

  useEffect(() => {
    if (isOpen) {
      setShareMethod(config.share_method || 'email');
      setRecipients(config.recipients || []);
      setIncludeSummary(config.include_summary ?? true);
      setAutoGenerateLink(config.auto_generate_link ?? true);
      setLinkExpiryDays(config.link_expiry_days || 7);
      setMessageTemplate(
        config.message_template ||
          'Hi, please find the documents for {{month}} attached. Let me know if you need anything else.'
      );
    }
  }, [isOpen, config]);

  const handleAddRecipient = () => {
    const trimmed = newRecipient.trim();
    if (trimmed && !recipients.includes(trimmed)) {
      setRecipients([...recipients, trimmed]);
      setNewRecipient('');
    }
  };

  const handleRemoveRecipient = (recipient: string) => {
    setRecipients(recipients.filter((r) => r !== recipient));
  };

  const handleSave = () => {
    onSave({
      share_method: shareMethod,
      recipients,
      include_summary: includeSummary,
      auto_generate_link: autoGenerateLink,
      link_expiry_days: linkExpiryDays,
      message_template: messageTemplate,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Share Documents</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Configure how to share documents with your CA
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-6">
          {/* Share Method */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Share Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              {SHARE_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = shareMethod === method.value;
                return (
                  <button
                    key={method.value}
                    onClick={() => setShareMethod(method.value)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                        isSelected ? method.color : 'from-slate-200 to-slate-300',
                        isSelected ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className={clsx(
                          'font-medium text-sm block',
                          isSelected ? 'text-emerald-900' : 'text-slate-700'
                        )}
                      >
                        {method.label}
                      </span>
                      <span className="text-xs text-slate-500">{method.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipients */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Recipients
            </label>

            {/* Recipient List */}
            <div className="flex flex-wrap gap-2 mb-3">
              {recipients.map((recipient) => (
                <span
                  key={recipient}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-sm font-medium"
                >
                  {recipient}
                  <button
                    onClick={() => handleRemoveRecipient(recipient)}
                    className="ml-1 p-0.5 hover:bg-emerald-200 rounded-full transition-colors"
                    aria-label={`Remove ${recipient}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {recipients.length === 0 && (
                <span className="text-sm text-slate-400 italic">No recipients added</span>
              )}
            </div>

            {/* Add Recipient */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                placeholder={shareMethod === 'whatsapp' ? '+91 9876543210' : 'email@example.com'}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
              />
              <button
                onClick={handleAddRecipient}
                disabled={!newRecipient.trim()}
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          {/* Message Template */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Message Template
            </label>
            <p className="text-xs text-slate-500 mb-2">
              Use {'{{month}}'} for the bucket month name
            </p>
            <textarea
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
              rows={3}
            />
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Include document summary</p>
                <p className="text-xs text-slate-500">
                  Add a summary of all documents in the message
                </p>
              </div>
            </label>

            {(shareMethod === 'link' || shareMethod === 'all') && (
              <>
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateLink}
                    onChange={(e) => setAutoGenerateLink(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">Auto-generate share link</p>
                    <p className="text-xs text-slate-500">
                      Automatically create a secure shareable link
                    </p>
                  </div>
                </label>

                <div className="p-3 bg-slate-50 rounded-xl">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Link expires after
                  </label>
                  <select
                    value={linkExpiryDays}
                    onChange={(e) => setLinkExpiryDays(parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                  >
                    <option value={1}>1 day</option>
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Config Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Configuration Summary</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Method: {SHARE_METHODS.find((m) => m.value === shareMethod)?.label}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Recipients: {recipients.length > 0 ? recipients.join(', ') : 'None added'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Summary: {includeSummary ? 'Included' : 'Not included'}
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
            className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
