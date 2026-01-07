import React from 'react';
import { Mail, ExternalLink, Loader2 } from 'lucide-react';

interface GmailConnectButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export function GmailConnectButton({
  onClick,
  isLoading,
}: GmailConnectButtonProps) {
  return (
    <div className="space-y-3">
      <button
        onClick={onClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold hover:from-red-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-slate-900"
        aria-label="Connect Gmail account"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Mail className="w-5 h-5" />
            Connect Gmail Account
            <ExternalLink className="w-4 h-4" />
          </>
        )}
      </button>

      <p className="text-xs text-slate-500 text-center">
        We only request read-only access to your emails. Your data is encrypted
        and never shared.
      </p>
    </div>
  );
}
