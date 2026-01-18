import { useState, useEffect, useMemo } from 'react';
import { X, Send, Mail, AlertCircle } from 'lucide-react';
import { useTemplateVariableSubstitution } from '../../hooks/useTemplateVariableSubstitution';

// Email options interface
interface EmailOptions {
  to: string;
  cc: string;
  subject: string;
  body: string;
}

// Component props interface
interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (options: EmailOptions) => void;
  isPending: boolean;
  clientEmail?: string;
  clientName?: string;
  businessName?: string;
  invoiceNumber?: string;
  dueDate?: string;
  totalAmount?: string;
  defaultSubject?: string;
  defaultBody?: string;
  defaultCc?: string;
  primaryColor?: string;
}

// Default templates
const DEFAULT_SUBJECT = 'Invoice {invoice_number} from {business_name}';
const DEFAULT_BODY = `Dear {client_name},

Please find attached invoice {invoice_number} for {amount}.

Payment is due by {due_date}.

Best regards,
{business_name}`;

/**
 * Modal for sending invoices via email
 * Extracted variable substitution logic to custom hook for reusability
 * Separated preview rendering into dedicated component
 */
export function SendInvoiceModal({
  isOpen,
  onClose,
  onSend,
  isPending,
  clientEmail = '',
  clientName = '',
  businessName = '',
  invoiceNumber = '',
  dueDate = '',
  totalAmount = '',
  defaultSubject = DEFAULT_SUBJECT,
  defaultBody = DEFAULT_BODY,
  defaultCc = '',
  primaryColor = '#f59e0b',
}: SendInvoiceModalProps) {
  // Form state
  const [to, setTo] = useState(clientEmail);
  const [cc, setCc] = useState(defaultCc);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTo(clientEmail);
      setCc(defaultCc);
      setSubject(defaultSubject || DEFAULT_SUBJECT);
      setBody(defaultBody || DEFAULT_BODY);
    }
  }, [isOpen, clientEmail, defaultCc, defaultSubject, defaultBody]);

  // Use extracted variable substitution hook
  const { substitute } = useTemplateVariableSubstitution({
    invoiceNumber,
    businessName,
    clientName,
    dueDate,
    totalAmount,
  });

  // Memoize previews for performance
  const subjectPreview = useMemo(() => substitute(subject), [subject, substitute]);
  const bodyPreview = useMemo(() => substitute(body), [body, substitute]);

  // Form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!to.trim()) return;

    onSend({
      to: to.trim(),
      cc: cc.trim(),
      subject: subject.trim(),
      body: body.trim(),
    });
  };

  // Early return for closed modal
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="send-invoice-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <ModalHeader
          invoiceNumber={invoiceNumber}
          primaryColor={primaryColor}
          onClose={onClose}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Email Fields */}
            <EmailToField value={to} onChange={setTo} clientEmail={clientEmail} />
            <EmailCcField value={cc} onChange={setCc} />
            <EmailSubjectField value={subject} onChange={setSubject} />
            <EmailBodyField value={body} onChange={setBody} />

            {/* Preview */}
            <EmailPreview
              subjectPreview={subjectPreview}
              bodyPreview={bodyPreview}
            />

            {/* Validation & Info */}
            {!to.trim() && <ValidationWarning />}
            <PdfAttachmentInfo />
          </div>

          {/* Footer */}
          <ModalFooter
            onClose={onClose}
            isPending={isPending}
            isValid={!!to.trim()}
            primaryColor={primaryColor}
          />
        </form>
      </div>
    </div>
  );
}

// Extracted sub-components for better organization

function ModalHeader({
  invoiceNumber,
  primaryColor,
  onClose,
}: {
  invoiceNumber: string;
  primaryColor: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: primaryColor }}
        >
          <Mail className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 id="send-invoice-title" className="text-lg font-semibold text-slate-900">
            Send Invoice via Email
          </h2>
          <p className="text-sm text-slate-500">Invoice {invoiceNumber}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        aria-label="Close modal"
      >
        <X className="w-5 h-5 text-slate-400" />
      </button>
    </div>
  );
}

function EmailToField({
  value,
  onChange,
  clientEmail,
}: {
  value: string;
  onChange: (value: string) => void;
  clientEmail: string;
}) {
  return (
    <div>
      <label htmlFor="email-to" className="block text-sm font-medium text-slate-700 mb-1.5">
        To <span className="text-red-500">*</span>
      </label>
      <input
        id="email-to"
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="recipient@example.com"
        required
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
      {clientEmail && value !== clientEmail && (
        <button
          type="button"
          onClick={() => onChange(clientEmail)}
          className="mt-1.5 text-xs text-amber-600 hover:text-amber-700"
        >
          Use client's email: {clientEmail}
        </button>
      )}
    </div>
  );
}

function EmailCcField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="email-cc" className="block text-sm font-medium text-slate-700 mb-1.5">
        CC (Optional)
      </label>
      <input
        id="email-cc"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter CC email addresses (comma separated)"
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-slate-500">Separate multiple emails with commas</p>
    </div>
  );
}

function EmailSubjectField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="email-subject" className="block text-sm font-medium text-slate-700 mb-1.5">
        Subject
      </label>
      <input
        id="email-subject"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Invoice {invoice_number} from {business_name}"
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
      />
      <p className="mt-1 text-xs text-slate-500">
        Variables: {'{invoice_number}'}, {'{business_name}'}, {'{client_name}'}, {'{due_date}'}, {'{amount}'}
      </p>
    </div>
  );
}

function EmailBodyField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label htmlFor="email-body" className="block text-sm font-medium text-slate-700 mb-1.5">
        Message
      </label>
      <textarea
        id="email-body"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        placeholder="Dear {client_name},&#10;&#10;Please find attached the invoice..."
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
      />
      <p className="mt-1 text-xs text-slate-500">
        Variables: {'{invoice_number}'}, {'{business_name}'}, {'{client_name}'}, {'{due_date}'}, {'{amount}'}
      </p>
    </div>
  );
}

function EmailPreview({
  subjectPreview,
  bodyPreview,
}: {
  subjectPreview: { parts: Array<{ value: string; isDynamic: boolean }> };
  bodyPreview: { parts: Array<{ value: string; isDynamic: boolean }> };
}) {
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-600">Email Preview</span>
          <span className="text-xs text-slate-400">&bull;</span>
          <span className="text-xs text-slate-500">
            <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
              highlighted values
            </span>{' '}
            are dynamic
          </span>
        </div>
      </div>
      <div className="bg-white p-4 space-y-4">
        <PreviewSection label="Subject" parts={subjectPreview.parts} />
        <PreviewSection label="Message" parts={bodyPreview.parts} multiline />
      </div>
    </div>
  );
}

function PreviewSection({
  label,
  parts,
  multiline = false,
}: {
  label: string;
  parts: Array<{ value: string; isDynamic: boolean }>;
  multiline?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</div>
      <div className={`text-sm text-slate-${multiline ? '700' : '800'} ${multiline ? 'whitespace-pre-wrap leading-relaxed' : ''}`}>
        {parts.map((part, idx) =>
          part.isDynamic ? (
            <span key={idx} className="inline-block px-1 py-0.5 bg-amber-100 text-amber-800 rounded font-medium">
              {part.value}
            </span>
          ) : (
            <span key={idx}>{part.value}</span>
          )
        )}
      </div>
    </div>
  );
}

function ValidationWarning() {
  return (
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700">Please enter a recipient email address.</p>
    </div>
  );
}

function PdfAttachmentInfo() {
  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
      <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
      <p className="text-sm text-blue-700">The invoice PDF will be attached to this email automatically.</p>
    </div>
  );
}

function ModalFooter({
  onClose,
  isPending,
  isValid,
  primaryColor,
}: {
  onClose: () => void;
  isPending: boolean;
  isValid: boolean;
  primaryColor: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-100 transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isPending || !isValid}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-medium transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: primaryColor }}
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Send Invoice
          </>
        )}
      </button>
    </div>
  );
}
