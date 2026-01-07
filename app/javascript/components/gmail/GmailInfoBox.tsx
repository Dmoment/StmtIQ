import React from 'react';
import { FileText } from 'lucide-react';

export function GmailInfoBox() {
  return (
    <div
      className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30"
      role="region"
      aria-label="How Gmail integration works"
    >
      <div className="flex items-start gap-3">
        <FileText
          className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div className="text-sm text-blue-200">
          <p className="font-medium">How it works</p>
          <ul className="mt-1 space-y-1 text-blue-200/70 list-disc list-inside">
            <li>Searches for emails with PDF attachments</li>
            <li>
              Extracts invoices from Amazon, Swiggy, Zomato, airlines, and more
            </li>
            <li>Automatically matches invoices to your transactions</li>
            <li>Syncs every hour when enabled</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
