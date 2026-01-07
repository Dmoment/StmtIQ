import React from 'react';
import {
  Mail,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { GmailConnection } from '../../types/api';

interface GmailConnectionCardProps {
  connection: GmailConnection;
  onSync: (id: number) => void;
  onToggleSync: (connection: GmailConnection) => void;
  onDisconnect: (id: number) => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}

function getStatusIcon(status: GmailConnection['status']) {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    case 'syncing':
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:
      return <AlertCircle className="w-4 h-4 text-amber-400" />;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function GmailConnectionCard({
  connection,
  onSync,
  onToggleSync,
  onDisconnect,
  isSyncing,
  isDisconnecting,
}: GmailConnectionCardProps) {
  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center"
            aria-hidden="true"
          >
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-medium">{connection.email}</p>
              {getStatusIcon(connection.status)}
            </div>
            <p className="text-sm text-slate-500">
              {connection.display_status} • {connection.invoice_count} invoices
              imported
            </p>
          </div>
        </div>
        <button
          onClick={() => onDisconnect(connection.id)}
          disabled={isDisconnecting}
          className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={`Disconnect ${connection.email}`}
        >
          {isDisconnecting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </button>
      </div>

      {connection.error_message && (
        <div
          className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300"
          role="alert"
        >
          {connection.error_message}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-700">
        <div className="text-sm text-slate-500">
          Last synced: {formatDate(connection.last_sync_at)}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onToggleSync(connection)}
            onKeyDown={(e) => handleKeyDown(e, () => onToggleSync(connection))}
            className={clsx(
              'relative w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-800',
              connection.sync_enabled ? 'bg-emerald-500' : 'bg-slate-700'
            )}
            role="switch"
            aria-checked={connection.sync_enabled}
            aria-label={`${connection.sync_enabled ? 'Disable' : 'Enable'} auto-sync for ${connection.email}`}
          >
            <span
              className={clsx(
                'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                connection.sync_enabled ? 'left-6' : 'left-1'
              )}
              aria-hidden="true"
            />
          </button>

          <button
            onClick={() => onSync(connection.id)}
            disabled={connection.status === 'syncing' || isSyncing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800"
            aria-label={`Sync ${connection.email} now`}
          >
            <RefreshCw
              className={clsx(
                'w-4 h-4',
                (connection.status === 'syncing' || isSyncing) && 'animate-spin'
              )}
            />
            Sync Now
          </button>
        </div>
      </div>
    </div>
  );
}
