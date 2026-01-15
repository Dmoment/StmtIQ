import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  CheckCircle2,
  Mail,
  Smartphone,
  AlertTriangle,
  CheckCheck,
  XCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

interface NotifyStepConfig {
  notification_type: 'success' | 'failure' | 'both';
  channels: ('email' | 'push' | 'in_app')[];
  success_message: string;
  failure_message: string;
  include_summary: boolean;
  notify_on_each_step: boolean;
}

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: NotifyStepConfig;
  onSave: (config: NotifyStepConfig) => void;
}

const NOTIFICATION_TYPES = [
  {
    value: 'success' as const,
    label: 'Success Only',
    description: 'Notify when workflow completes successfully',
    icon: CheckCheck,
    color: 'from-emerald-400 to-emerald-500',
  },
  {
    value: 'failure' as const,
    label: 'Failure Only',
    description: 'Notify when workflow fails',
    icon: XCircle,
    color: 'from-red-400 to-red-500',
  },
  {
    value: 'both' as const,
    label: 'Both',
    description: 'Notify on success and failure',
    icon: Bell,
    color: 'from-amber-400 to-amber-500',
  },
];

const CHANNELS = [
  { id: 'email' as const, label: 'Email', icon: Mail },
  { id: 'push' as const, label: 'Push Notification', icon: Smartphone },
  { id: 'in_app' as const, label: 'In-App', icon: Bell },
];

export function NotifyModal({
  isOpen,
  onClose,
  config,
  onSave,
}: NotifyModalProps) {
  const [notificationType, setNotificationType] = useState<NotifyStepConfig['notification_type']>(
    config.notification_type || 'both'
  );
  const [channels, setChannels] = useState<NotifyStepConfig['channels']>(
    config.channels || ['email', 'in_app']
  );
  const [successMessage, setSuccessMessage] = useState(
    config.success_message ||
      'Workflow completed successfully! All documents for {{month}} have been processed and shared.'
  );
  const [failureMessage, setFailureMessage] = useState(
    config.failure_message ||
      'Workflow encountered an error. Please check the execution logs for details.'
  );
  const [includeSummary, setIncludeSummary] = useState(config.include_summary ?? true);
  const [notifyOnEachStep, setNotifyOnEachStep] = useState(config.notify_on_each_step ?? false);

  useEffect(() => {
    if (isOpen) {
      setNotificationType(config.notification_type || 'both');
      setChannels(config.channels || ['email', 'in_app']);
      setSuccessMessage(
        config.success_message ||
          'Workflow completed successfully! All documents for {{month}} have been processed and shared.'
      );
      setFailureMessage(
        config.failure_message ||
          'Workflow encountered an error. Please check the execution logs for details.'
      );
      setIncludeSummary(config.include_summary ?? true);
      setNotifyOnEachStep(config.notify_on_each_step ?? false);
    }
  }, [isOpen, config]);

  const handleToggleChannel = (channelId: NotifyStepConfig['channels'][number]) => {
    setChannels((prev) =>
      prev.includes(channelId)
        ? prev.filter((c) => c !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSave = () => {
    onSave({
      notification_type: notificationType,
      channels,
      success_message: successMessage,
      failure_message: failureMessage,
      include_summary: includeSummary,
      notify_on_each_step: notifyOnEachStep,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-cyan-500 to-blue-600 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Completion Notification</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Configure workflow completion alerts
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-6">
          {/* Notification Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              When to Notify
            </label>
            <div className="space-y-2">
              {NOTIFICATION_TYPES.map((type) => {
                const Icon = type.icon;
                const isSelected = notificationType === type.value;
                return (
                  <button
                    key={type.value}
                    onClick={() => setNotificationType(type.value)}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                        isSelected ? type.color : 'from-slate-200 to-slate-300',
                        isSelected ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className={clsx(
                          'font-medium text-sm block',
                          isSelected ? 'text-cyan-900' : 'text-slate-700'
                        )}
                      >
                        {type.label}
                      </span>
                      <span className="text-xs text-slate-500">{type.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Channels */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Notification Channels
            </label>
            <div className="flex gap-3">
              {CHANNELS.map((channel) => {
                const Icon = channel.icon;
                const isSelected = channels.includes(channel.id);
                return (
                  <button
                    key={channel.id}
                    onClick={() => handleToggleChannel(channel.id)}
                    className={clsx(
                      'flex-1 flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                      isSelected
                        ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-6 h-6',
                        isSelected ? 'text-cyan-600' : 'text-slate-400'
                      )}
                    />
                    <span
                      className={clsx(
                        'text-sm font-medium',
                        isSelected ? 'text-cyan-900' : 'text-slate-600'
                      )}
                    >
                      {channel.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Success Message */}
          {(notificationType === 'success' || notificationType === 'both') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <CheckCircle2 className="w-4 h-4 inline mr-1 text-emerald-500" />
                Success Message
              </label>
              <p className="text-xs text-slate-500 mb-2">
                Use {'{{month}}'} for bucket name, {'{{count}}'} for document count
              </p>
              <textarea
                value={successMessage}
                onChange={(e) => setSuccessMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Failure Message */}
          {(notificationType === 'failure' || notificationType === 'both') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                <AlertTriangle className="w-4 h-4 inline mr-1 text-red-500" />
                Failure Message
              </label>
              <textarea
                value={failureMessage}
                onChange={(e) => setFailureMessage(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummary}
                onChange={(e) => setIncludeSummary(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Include execution summary</p>
                <p className="text-xs text-slate-500">
                  Add details about steps completed and documents processed
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={notifyOnEachStep}
                onChange={(e) => setNotifyOnEachStep(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-cyan-500 focus:ring-cyan-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Notify on each step</p>
                <p className="text-xs text-slate-500">
                  Send progress updates as each step completes
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
                Notify on: {NOTIFICATION_TYPES.find((t) => t.value === notificationType)?.label}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Channels:{' '}
                {channels.length > 0
                  ? channels.map((c) => CHANNELS.find((ch) => ch.id === c)?.label).join(', ')
                  : 'None selected'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Include summary: {includeSummary ? 'Yes' : 'No'}
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
            disabled={channels.length === 0}
            className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
