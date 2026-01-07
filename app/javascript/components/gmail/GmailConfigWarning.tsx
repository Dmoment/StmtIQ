import React from 'react';
import { AlertCircle } from 'lucide-react';

export function GmailConfigWarning() {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Gmail Integration</h2>
        <p className="text-slate-400">
          Automatically import invoice PDFs from your Gmail inbox.
        </p>
      </div>

      <div
        className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle
            className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm text-amber-200 font-medium">
              Configuration Required
            </p>
            <p className="text-sm text-amber-200/70 mt-1">
              Gmail integration requires Google OAuth credentials. Please
              contact the administrator to set up GOOGLE_CLIENT_ID and
              GOOGLE_CLIENT_SECRET.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
