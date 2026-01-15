import { useState, useEffect } from 'react';
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  FileText,
  Receipt,
  Building2,
  Landmark,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { clsx } from 'clsx';

interface CheckDocumentsStepConfig {
  required_documents: string[];
  parse_statements: boolean;
  notify_on_missing: boolean;
  missing_doc_action: 'notify' | 'pause' | 'continue';
}

interface CheckDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CheckDocumentsStepConfig;
  onSave: (config: CheckDocumentsStepConfig) => void;
}

const DOCUMENT_TYPES = [
  { id: 'bank_statement', label: 'Bank Statements', icon: Landmark, color: 'from-blue-400 to-blue-500' },
  { id: 'firc', label: 'FIRC', icon: FileSpreadsheet, color: 'from-emerald-400 to-emerald-500' },
  { id: 'invoices', label: 'Invoices', icon: Receipt, color: 'from-amber-400 to-amber-500' },
  { id: 'gst_returns', label: 'GST Returns', icon: FileText, color: 'from-violet-400 to-violet-500' },
  { id: 'tds_certificates', label: 'TDS Certificates', icon: FileText, color: 'from-pink-400 to-pink-500' },
  { id: 'rent_agreements', label: 'Rent Agreements', icon: Building2, color: 'from-cyan-400 to-cyan-500' },
];

const MISSING_DOC_ACTIONS = [
  {
    value: 'notify' as const,
    label: 'Notify Only',
    description: 'Send notification but continue workflow',
  },
  {
    value: 'pause' as const,
    label: 'Pause Workflow',
    description: 'Stop workflow until documents are added',
  },
  {
    value: 'continue' as const,
    label: 'Continue Silently',
    description: 'Skip notification and continue',
  },
];

export function CheckDocumentsModal({
  isOpen,
  onClose,
  config,
  onSave,
}: CheckDocumentsModalProps) {
  const [requiredDocs, setRequiredDocs] = useState<string[]>(
    config.required_documents || []
  );
  const [parseStatements, setParseStatements] = useState(config.parse_statements ?? true);
  const [notifyOnMissing, setNotifyOnMissing] = useState(config.notify_on_missing ?? true);
  const [missingAction, setMissingAction] = useState<CheckDocumentsStepConfig['missing_doc_action']>(
    config.missing_doc_action || 'notify'
  );

  useEffect(() => {
    if (isOpen) {
      setRequiredDocs(config.required_documents || []);
      setParseStatements(config.parse_statements ?? true);
      setNotifyOnMissing(config.notify_on_missing ?? true);
      setMissingAction(config.missing_doc_action || 'notify');
    }
  }, [isOpen, config]);

  const handleToggleDoc = (docId: string) => {
    setRequiredDocs((prev) =>
      prev.includes(docId)
        ? prev.filter((d) => d !== docId)
        : [...prev, docId]
    );
  };

  const handleSave = () => {
    onSave({
      required_documents: requiredDocs,
      parse_statements: parseStatements,
      notify_on_missing: notifyOnMissing,
      missing_doc_action: missingAction,
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-amber-500 to-orange-500 px-6 py-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-xl transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Document Collection Check</h2>
              <p className="text-white/80 text-sm mt-0.5">
                Verify all required documents are present
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)] space-y-6">
          {/* Required Documents */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Required Documents
            </label>
            <div className="grid grid-cols-2 gap-3">
              {DOCUMENT_TYPES.map((doc) => {
                const Icon = doc.icon;
                const isSelected = requiredDocs.includes(doc.id);
                return (
                  <button
                    key={doc.id}
                    onClick={() => handleToggleDoc(doc.id)}
                    className={clsx(
                      'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                      isSelected
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                        isSelected ? doc.color : 'from-slate-200 to-slate-300',
                        isSelected ? 'text-white' : 'text-slate-500'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={clsx(
                        'font-medium text-sm',
                        isSelected ? 'text-amber-900' : 'text-slate-700'
                      )}
                    >
                      {doc.label}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-amber-500 ml-auto" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parse Statements Option */}
          <div className="bg-slate-50 rounded-2xl p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={parseStatements}
                onChange={(e) => setParseStatements(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
              />
              <div>
                <p className="font-medium text-slate-900 text-sm">Parse bank statements</p>
                <p className="text-xs text-slate-500">
                  Automatically parse and extract transactions from bank statements
                </p>
              </div>
            </label>
          </div>

          {/* Missing Document Action */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-500" />
              When documents are missing
            </label>
            <div className="space-y-2">
              {MISSING_DOC_ACTIONS.map((action) => (
                <button
                  key={action.value}
                  onClick={() => setMissingAction(action.value)}
                  className={clsx(
                    'w-full flex items-start gap-3 p-3 rounded-xl border transition-colors text-left',
                    missingAction === action.value
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div
                    className={clsx(
                      'w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5',
                      missingAction === action.value
                        ? 'border-amber-500 bg-amber-500'
                        : 'border-slate-300'
                    )}
                  >
                    {missingAction === action.value && (
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div
                      className={clsx(
                        'font-medium text-sm',
                        missingAction === action.value ? 'text-amber-900' : 'text-slate-700'
                      )}
                    >
                      {action.label}
                    </div>
                    <div className="text-xs text-slate-500">{action.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Config Summary */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-5 text-white">
            <h3 className="font-semibold mb-3">Configuration Summary</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Required docs: {requiredDocs.length > 0 ? requiredDocs.join(', ') : 'None selected'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Parse statements: {parseStatements ? 'Yes' : 'No'}
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                On missing: {MISSING_DOC_ACTIONS.find((a) => a.value === missingAction)?.label}
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
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-semibold transition-all shadow-lg shadow-amber-500/25 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}
