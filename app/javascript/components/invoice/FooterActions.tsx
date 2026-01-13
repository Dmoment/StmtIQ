import { useState } from 'react';
import {
  FileText,
  StickyNote,
  PenTool,
  Paperclip,
  Phone,
  Plus,
  X,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';

interface FooterActionsProps {
  terms: string;
  onTermsChange: (terms: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  signature?: string;
  onSignatureChange?: (signature: string) => void;
}

export function FooterActions({
  terms,
  onTermsChange,
  notes,
  onNotesChange,
  signature,
  onSignatureChange,
}: FooterActionsProps) {
  const [showTerms, setShowTerms] = useState(!!terms);
  const [showNotes, setShowNotes] = useState(!!notes);
  const [showSignature, setShowSignature] = useState(!!signature);
  const [showContactDetails, setShowContactDetails] = useState(false);

  return (
    <div className="space-y-4">
      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-2">
        {!showSignature && (
          <button
            onClick={() => setShowSignature(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <PenTool className="w-4 h-4" />
            Add Signature
          </button>
        )}

        {!showTerms && (
          <button
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Add Terms & Conditions
          </button>
        )}

        {!showNotes && (
          <button
            onClick={() => setShowNotes(true)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <StickyNote className="w-4 h-4" />
            Add Notes
          </button>
        )}

        <button
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <Paperclip className="w-4 h-4" />
          Add Attachments
        </button>
      </div>

      {/* Contact Details Button */}
      {!showContactDetails && (
        <button
          onClick={() => setShowContactDetails(true)}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <Phone className="w-4 h-4" />
          Add Contact Details
        </button>
      )}

      {/* Signature Section */}
      {showSignature && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PenTool className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Signature</span>
            </div>
            <button
              onClick={() => {
                setShowSignature(false);
                onSignatureChange?.('');
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="p-4">
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">
              <PenTool className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Click to upload or draw signature</p>
              <p className="text-xs text-slate-400 mt-1">PNG, JPG up to 2MB</p>
            </div>
          </div>
        </div>
      )}

      {/* Terms & Conditions Section */}
      {showTerms && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Terms & Conditions</span>
            </div>
            <button
              onClick={() => {
                setShowTerms(false);
                onTermsChange('');
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="p-4">
            <textarea
              value={terms}
              onChange={(e) => onTermsChange(e.target.value)}
              placeholder="Enter your terms and conditions..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Notes Section */}
      {showNotes && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Notes</span>
            </div>
            <button
              onClick={() => {
                setShowNotes(false);
                onNotesChange('');
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Add any additional notes for your client..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Contact Details Section */}
      {showContactDetails && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Contact Details</span>
            </div>
            <button
              onClick={() => setShowContactDetails(false)}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-sm text-slate-500 mb-3">
              Add contact information to appear on the invoice
            </p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Phone number"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="email"
                placeholder="Email address"
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
