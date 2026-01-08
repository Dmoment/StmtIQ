import React, { useState } from 'react';
import {
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Send,
  Mail,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Check,
  ExternalLink,
  RefreshCw,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useGmailStatus, useGmailConnections } from '../queries';
import { useGmailManager } from '../hooks/useGmailManager';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'gmail',
    title: 'Gmail Integration',
    description: 'Auto-import invoices from email',
    icon: Mail,
    available: true,
  },
  {
    id: 'ca',
    title: 'CA Integration',
    description: 'Auto-send summaries to your CA',
    icon: Send,
    available: true,
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your account details',
    icon: User,
    available: false,
  },
  {
    id: 'banks',
    title: 'Bank Accounts',
    description: 'Manage linked accounts',
    icon: Building2,
    available: false,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure alerts',
    icon: Bell,
    available: false,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password & authentication',
    icon: Shield,
    available: false,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look',
    icon: Palette,
    available: false,
  },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState('gmail');

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-64 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
            {settingsSections.map((section, index) => (
              <button
                key={section.id}
                onClick={() => section.available && setActiveSection(section.id)}
                disabled={!section.available}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all',
                  index !== 0 && 'border-t border-slate-100',
                  activeSection === section.id
                    ? 'bg-slate-50 border-l-2 border-l-slate-900'
                    : 'hover:bg-slate-50/50 border-l-2 border-l-transparent',
                  !section.available && 'opacity-50 cursor-not-allowed'
                )}
                aria-label={section.title}
              >
                <div
                  className={clsx(
                    'w-9 h-9 rounded-xl flex items-center justify-center',
                    activeSection === section.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  <section.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={clsx(
                      'font-medium text-sm truncate',
                      activeSection === section.id
                        ? 'text-slate-900'
                        : 'text-slate-700'
                    )}
                  >
                    {section.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {section.description}
                  </p>
                </div>
                {section.available ? (
                  <ChevronRight
                    className={clsx(
                      'w-4 h-4',
                      activeSection === section.id
                        ? 'text-slate-900'
                        : 'text-slate-300'
                    )}
                  />
                ) : (
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                    Soon
                  </span>
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {activeSection === 'gmail' && <GmailSettings />}
          {activeSection === 'ca' && <CASettings />}
          {activeSection === 'profile' && <ComingSoon title="Profile" />}
          {activeSection === 'banks' && <ComingSoon title="Bank Accounts" />}
          {activeSection === 'notifications' && (
            <ComingSoon title="Notifications" />
          )}
          {activeSection === 'security' && <ComingSoon title="Security" />}
          {activeSection === 'appearance' && <ComingSoon title="Appearance" />}
        </main>
      </div>
    </div>
  );
}

function GmailSettings() {
  const { data: status, isLoading: statusLoading } = useGmailStatus();
  const {
    data: connections,
    isLoading: connectionsLoading,
    refetch,
  } = useGmailConnections();
  const {
    handleConnect,
    handleSync,
    handleToggleSync,
    handleDisconnect,
    disconnectingId,
    error,
    clearError,
  } = useGmailManager(refetch);

  if (statusLoading || connectionsLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-12 shadow-sm">
        <div
          className="flex flex-col items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="w-8 h-8 text-slate-300 animate-spin mb-4" />
          <p className="text-sm text-slate-500">Loading Gmail settings...</p>
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Gmail not configured</p>
            <p className="text-sm text-amber-700 mt-1">
              Google OAuth credentials are not set up. Please contact support to
              enable Gmail integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-sm">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">
              Gmail Integration
            </h2>
            <p className="text-slate-500 mt-1">
              Automatically import invoice PDFs from your Gmail inbox
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          className="flex items-start justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-xl"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl p-5">
        <div className="flex gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2">How it works</h3>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  We scan for emails with PDF attachments from common vendors
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Invoice PDFs are extracted and matched with your transactions
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <span>
                  Read-only access &mdash; we never modify or delete your emails
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      {hasConnections && (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Connected Accounts</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {connections.map((connection) => (
              <GmailConnectionRow
                key={connection.id}
                connection={connection}
                onSync={handleSync}
                onToggleSync={handleToggleSync}
                onDisconnect={handleDisconnect}
                isDisconnecting={disconnectingId === connection.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Connect Button */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-3 h-12 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 shadow-sm"
          aria-label="Connect Gmail account"
        >
          <Mail className="w-5 h-5" />
          {hasConnections ? 'Connect Another Account' : 'Connect Gmail Account'}
          <ExternalLink className="w-4 h-4 opacity-60" />
        </button>
        <p className="text-xs text-slate-400 text-center mt-3">
          We only request read-only access. Your data is encrypted and never
          shared.
        </p>
      </div>
    </div>
  );
}

interface GmailConnection {
  id: number;
  email: string;
  status: string;
  sync_enabled: boolean;
  last_sync_at: string | null;
  invoices_imported: number;
}

interface GmailConnectionRowProps {
  connection: GmailConnection;
  onSync: (id: number) => void;
  onToggleSync: (id: number, enabled: boolean) => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
}

function GmailConnectionRow({
  connection,
  onSync,
  onToggleSync,
  onDisconnect,
  isDisconnecting,
}: GmailConnectionRowProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    try {
      await onSync(connection.id);
    } finally {
      setIsSyncing(false);
    }
  };

  const statusColor = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    syncing: 'bg-blue-100 text-blue-700 border-blue-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    disconnected: 'bg-slate-100 text-slate-600 border-slate-200',
  }[connection.status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">
              {connection.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={clsx(
                  'text-xs px-2 py-0.5 rounded-lg font-medium border',
                  statusColor
                )}
              >
                {connection.status}
              </span>
              {connection.last_sync_at && (
                <span className="text-xs text-slate-400">
                  Last sync:{' '}
                  {new Date(connection.last_sync_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Sync */}
          <button
            onClick={() => onToggleSync(connection.id, !connection.sync_enabled)}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-colors flex items-center justify-center"
            title={connection.sync_enabled ? 'Disable sync' : 'Enable sync'}
            aria-label={connection.sync_enabled ? 'Disable sync' : 'Enable sync'}
          >
            {connection.sync_enabled ? (
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Sync Now */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncing || !connection.sync_enabled}
            className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            title="Sync now"
            aria-label="Sync now"
          >
            <RefreshCw
              className={clsx(
                'w-5 h-5 text-slate-500',
                isSyncing && 'animate-spin'
              )}
            />
          </button>

          {/* Disconnect */}
          <button
            onClick={() => onDisconnect(connection.id)}
            disabled={isDisconnecting}
            className="h-9 w-9 rounded-xl hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600 disabled:opacity-50 flex items-center justify-center"
            title="Disconnect"
            aria-label="Disconnect account"
          >
            {isDisconnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      {connection.invoices_imported > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">
              {connection.invoices_imported}
            </span>{' '}
            invoices imported
          </p>
        </div>
      )}
    </div>
  );
}

function CASettings() {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-sm">
            <Send className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">
              CA Integration
            </h2>
            <p className="text-slate-500 mt-1">
              Automatically send monthly expense summaries to your CA via
              WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Coming Soon</p>
          <p className="text-sm text-amber-700 mt-1">
            This feature requires WhatsApp Business API access and is currently
            in development.
          </p>
        </div>
      </div>

      {/* Settings Preview */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-6 opacity-60 pointer-events-none shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CA WhatsApp Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 placeholder-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Send Schedule
            </label>
            <select
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400"
            >
              <option>1st of every month</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="font-medium text-slate-400">Auto-send enabled</p>
              <p className="text-sm text-slate-300">
                Automatically send summary on schedule
              </p>
            </div>
            <ToggleLeft className="w-6 h-6 text-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComingSoonProps {
  title: string;
}

function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-12 shadow-sm">
      <div className="text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500">
          This section is coming soon. We're working hard to bring you more
          features.
        </p>
      </div>
    </div>
  );
}
