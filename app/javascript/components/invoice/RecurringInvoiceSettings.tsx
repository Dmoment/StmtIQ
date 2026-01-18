import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

export interface RecurringSettings {
  isRecurring: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endType: 'never' | 'end_on_date' | 'end_after_invoices';
  endDate?: string;
  endAfterInvoices?: number;
  autoSend: boolean;
  sendToEmail: string;
  sendCcEmails: string;
  sendEmailSubject: string;
  sendEmailBody: string;
}

interface RecurringInvoiceSettingsProps {
  settings: RecurringSettings;
  onSettingsChange: (settings: RecurringSettings) => void;
  primaryColor: string;
  accentColor: string;
  clientEmail?: string;
  clientName?: string;
  businessName?: string;
  invoiceNumber?: string;
  totalAmount?: string;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Every 2 Weeks', description: 'Every other week' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Every year' },
];

export function RecurringInvoiceSettings({
  settings,
  onSettingsChange,
  primaryColor,
  accentColor,
  clientEmail,
  clientName,
  businessName,
  invoiceNumber,
  totalAmount,
}: RecurringInvoiceSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(settings.isRecurring);

  useEffect(() => {
    setIsExpanded(settings.isRecurring);
  }, [settings.isRecurring]);

  const handleToggle = useCallback(() => {
    onSettingsChange({
      ...settings,
      isRecurring: !settings.isRecurring,
    });
  }, [settings, onSettingsChange]);

  const handleFrequencyChange = useCallback((frequency: RecurringSettings['frequency']) => {
    onSettingsChange({
      ...settings,
      frequency,
    });
  }, [settings, onSettingsChange]);

  const handleStartDateChange = useCallback((startDate: string) => {
    onSettingsChange({
      ...settings,
      startDate,
    });
  }, [settings, onSettingsChange]);

  const handleEndTypeChange = useCallback((endType: RecurringSettings['endType']) => {
    onSettingsChange({
      ...settings,
      endType,
      endDate: endType === 'end_on_date' ? settings.endDate : undefined,
      endAfterInvoices: endType === 'end_after_invoices' ? settings.endAfterInvoices || 12 : undefined,
    });
  }, [settings, onSettingsChange]);

  const handleEndDateChange = useCallback((endDate: string) => {
    onSettingsChange({
      ...settings,
      endDate,
    });
  }, [settings, onSettingsChange]);

  const handleEndAfterInvoicesChange = useCallback((count: number) => {
    onSettingsChange({
      ...settings,
      endAfterInvoices: Math.max(1, count),
    });
  }, [settings, onSettingsChange]);

  const DEFAULT_EMAIL_SUBJECT = 'Invoice #{invoice_number} from {business_name}';
  const DEFAULT_EMAIL_BODY = `Dear {client_name},

Please find attached the invoice #{invoice_number} for {amount}.

Payment is due by {due_date}.

If you have any questions regarding this invoice, please don't hesitate to reach out.

Best regards,
{business_name}`;

  // Calculate example due date based on start date and payment terms (assume 30 days)
  const exampleDueDate = useMemo(() => {
    if (!settings.startDate) return 'DD MMM YYYY';
    const startDate = new Date(settings.startDate);
    startDate.setDate(startDate.getDate() + 30);
    return startDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, [settings.startDate]);

  // Helper to substitute variables with actual/example values and highlight them
  const substituteVariables = useCallback((text: string): { text: string; parts: Array<{ value: string; isDynamic: boolean }> } => {
    const variables: Record<string, { value: string; isExample: boolean }> = {
      '{invoice_number}': { value: invoiceNumber || 'INV-001', isExample: !invoiceNumber },
      '{business_name}': { value: businessName || 'Your Business', isExample: !businessName },
      '{client_name}': { value: clientName || 'Client Name', isExample: !clientName },
      '{due_date}': { value: exampleDueDate, isExample: true },
      '{amount}': { value: totalAmount || '₹10,000', isExample: !totalAmount },
    };

    const parts: Array<{ value: string; isDynamic: boolean }> = [];

    // Find all variable occurrences and split into parts
    const variablePattern = /\{(invoice_number|business_name|client_name|due_date|amount)\}/g;
    let lastIndex = 0;
    let match;

    while ((match = variablePattern.exec(text)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        parts.push({ value: text.slice(lastIndex, match.index), isDynamic: false });
      }
      // Add the variable value
      const varKey = match[0];
      const varInfo = variables[varKey];
      parts.push({ value: varInfo.value, isDynamic: true });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({ value: text.slice(lastIndex), isDynamic: false });
    }

    // Also create substituted plain text
    let substitutedText = text;
    Object.entries(variables).forEach(([key, info]) => {
      substitutedText = substitutedText.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), info.value);
    });

    return { text: substitutedText, parts };
  }, [invoiceNumber, businessName, clientName, exampleDueDate, totalAmount]);

  // Memoize the preview content
  const subjectPreview = useMemo(() => {
    const subject = settings.sendEmailSubject || DEFAULT_EMAIL_SUBJECT;
    return substituteVariables(subject);
  }, [settings.sendEmailSubject, substituteVariables]);

  const bodyPreview = useMemo(() => {
    const body = settings.sendEmailBody || DEFAULT_EMAIL_BODY;
    return substituteVariables(body);
  }, [settings.sendEmailBody, substituteVariables]);

  const handleAutoSendChange = useCallback((autoSend: boolean) => {
    onSettingsChange({
      ...settings,
      autoSend,
      // Pre-populate with defaults when enabling auto-send
      sendToEmail: autoSend ? (settings.sendToEmail || clientEmail || '') : settings.sendToEmail,
      sendEmailSubject: autoSend ? (settings.sendEmailSubject || DEFAULT_EMAIL_SUBJECT) : settings.sendEmailSubject,
      sendEmailBody: autoSend ? (settings.sendEmailBody || DEFAULT_EMAIL_BODY) : settings.sendEmailBody,
    });
  }, [settings, onSettingsChange, clientEmail]);

  const handleEmailChange = useCallback((email: string) => {
    onSettingsChange({
      ...settings,
      sendToEmail: email,
    });
  }, [settings, onSettingsChange]);

  const handleCcEmailsChange = useCallback((ccEmails: string) => {
    onSettingsChange({
      ...settings,
      sendCcEmails: ccEmails,
    });
  }, [settings, onSettingsChange]);

  const handleEmailSubjectChange = useCallback((subject: string) => {
    onSettingsChange({
      ...settings,
      sendEmailSubject: subject,
    });
  }, [settings, onSettingsChange]);

  const handleEmailBodyChange = useCallback((body: string) => {
    onSettingsChange({
      ...settings,
      sendEmailBody: body,
    });
  }, [settings, onSettingsChange]);

  // Helper function to add months while preserving the day of month
  const addMonthsPreserveDay = (date: Date, months: number, originalDay: number): Date => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);

    // Get the last day of the new month
    const lastDayOfMonth = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate();

    // Set to the original day or last day of month (whichever is smaller)
    newDate.setDate(Math.min(originalDay, lastDayOfMonth));

    return newDate;
  };

  // Memoize expensive calculation - only recalculates when dependencies change
  const nextOccurrences = useMemo(() => {
    const occurrences: string[] = [];
    if (!settings.startDate) return occurrences;

    const startDate = new Date(settings.startDate);
    const originalDay = startDate.getDate(); // Preserve the original day (e.g., 1st, 15th, etc.)
    let currentDate = new Date(startDate);
    const count = Math.min(12, settings.endAfterInvoices || 12);

    for (let i = 0; i < count; i++) {
      const dateStr = currentDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      occurrences.push(dateStr);

      // Add frequency interval while preserving the day of month
      switch (settings.frequency) {
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate = addMonthsPreserveDay(currentDate, 1, originalDay);
          break;
        case 'quarterly':
          currentDate = addMonthsPreserveDay(currentDate, 3, originalDay);
          break;
        case 'yearly':
          currentDate = addMonthsPreserveDay(currentDate, 12, originalDay);
          break;
      }

      // Stop if we've passed the end date
      if (settings.endType === 'end_on_date' && settings.endDate && currentDate > new Date(settings.endDate)) {
        break;
      }
    }

    return occurrences;
  }, [settings.startDate, settings.frequency, settings.endType, settings.endDate, settings.endAfterInvoices]);

  const lastInvoiceDate =
    nextOccurrences.length > 0 ? nextOccurrences[nextOccurrences.length - 1] : 'Not calculated';

  const handleExpandCollapse = useCallback(() => {
    if (settings.isRecurring) {
      setIsExpanded((prev) => !prev);
    }
  }, [settings.isRecurring]);

  return (
    <div className="border-t border-slate-100">
      {/* Header with toggle */}
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Custom toggle switch */}
          <button
            type="button"
            onClick={handleToggle}
            aria-label={settings.isRecurring ? 'Disable recurring invoice' : 'Enable recurring invoice'}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.isRecurring
                ? 'bg-gradient-to-r'
                : 'bg-slate-200'
            }`}
            style={
              settings.isRecurring
                ? {
                    backgroundImage: `linear-gradient(to right, ${primaryColor}, ${accentColor})`,
                  }
                : {}
            }
          >
            <div
              className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.isRecurring ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <div>
            <h3 className="font-semibold text-slate-900">This is a Recurring invoice</h3>
            <p className="text-xs text-slate-500">
              A draft invoice will be created with the same details every next period.
            </p>
          </div>
        </div>
        {settings.isRecurring && (
          <button
            type="button"
            onClick={handleExpandCollapse}
            aria-label={isExpanded ? 'Collapse settings' : 'Expand settings'}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
        )}
      </div>

      {/* Expanded Settings */}
      {settings.isRecurring && isExpanded && (
        <div className="px-6 py-6 border-t border-slate-100 bg-slate-50 space-y-6">
          {/* Invoice Repeats */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              Invoice Repeats
              <InfoTooltip
                title="Invoice Frequency"
                content="How often should the invoice be created? Choose based on your billing cycle."
                position="right"
              />
            </label>
            <select
              value={settings.frequency}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              aria-label="Select invoice repeat frequency"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* First Invoice Date */}
          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
              First Invoice Date
              <InfoTooltip
                title="Start Date"
                content="When should the first recurring invoice be created? Subsequent invoices will be created on the same day (e.g., 1st of every month)."
                position="right"
              />
            </label>
            <input
              type="date"
              value={settings.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              aria-label="Select first recurring invoice date"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </div>

          {/* Ends Section */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">Ends</h4>
            <div className="space-y-3">
              {/* Never */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="end_type"
                  value="never"
                  checked={settings.endType === 'never'}
                  onChange={(e) => handleEndTypeChange(e.target.value)}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900">Never</div>
                  <div className="text-xs text-slate-500">Invoice will repeat indefinitely</div>
                </div>
              </label>

              {/* End on Date */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="end_type"
                  value="end_on_date"
                  checked={settings.endType === 'end_on_date'}
                  onChange={(e) => handleEndTypeChange(e.target.value)}
                  className="w-4 h-4 mt-1 text-amber-500 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 mb-2">End on date</div>
                  {settings.endType === 'end_on_date' && (
                    <input
                      type="date"
                      value={settings.endDate || ''}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      aria-label="Select end date for recurring invoices"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 [&::-webkit-calendar-picker-indicator]:opacity-60"
                    />
                  )}
                </div>
              </label>

              {/* End after N invoices */}
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="end_type"
                  value="end_after_invoices"
                  checked={settings.endType === 'end_after_invoices'}
                  onChange={(e) => handleEndTypeChange(e.target.value)}
                  className="w-4 h-4 mt-1 text-amber-500 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900 mb-2">End after N invoices</div>
                  {settings.endType === 'end_after_invoices' && (
                    <input
                      type="number"
                      min="1"
                      value={settings.endAfterInvoices || 12}
                      onChange={(e) => handleEndAfterInvoicesChange(parseInt(e.target.value))}
                      aria-label="Number of invoices to generate"
                      className="w-20 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
              </label>
            </div>

            {/* Last Invoice Preview */}
            {settings.endType === 'end_after_invoices' && settings.endAfterInvoices && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Last invoice will be sent on{' '}
                  <span className="font-medium text-slate-900">{lastInvoiceDate}</span>
                </p>
              </div>
            )}

            {settings.endType === 'end_on_date' && settings.endDate && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  Last invoice will be sent on or before{' '}
                  <span className="font-medium text-slate-900">
                    {new Date(settings.endDate).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* After Invoice is Created */}
          <div className="bg-white p-4 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-900 mb-4">After invoice is created</h4>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="auto_send"
                  checked={!settings.autoSend}
                  onChange={() => handleAutoSendChange(false)}
                  className="w-4 h-4 mt-1 text-amber-500 focus:ring-amber-500"
                />
                <div>
                  <div className="text-sm font-medium text-slate-900">Create as Draft</div>
                  <div className="text-xs text-slate-500">
                    Create a draft invoice. You can review and send it manually.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="auto_send"
                  checked={settings.autoSend}
                  onChange={() => handleAutoSendChange(true)}
                  className="w-4 h-4 mt-1 text-amber-500 focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-900">Create and Send Automatically</div>
                  <div className="text-xs text-slate-500">
                    Invoice will be emailed automatically on the invoice date.
                  </div>
                  {settings.autoSend && (
                    <div className="mt-3 space-y-4">
                      {/* Primary Email */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Send invoice to (Primary)
                        </label>
                        <input
                          type="email"
                          value={settings.sendToEmail}
                          onChange={(e) => handleEmailChange(e.target.value)}
                          placeholder="Enter primary email address"
                          aria-label="Primary email address to send invoice to"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        {clientEmail && settings.sendToEmail !== clientEmail && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEmailChange(clientEmail);
                            }}
                            className="mt-1 text-xs text-amber-600 hover:text-amber-700"
                          >
                            Use client's email: {clientEmail}
                          </button>
                        )}
                      </div>

                      {/* CC Emails */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          CC (Optional)
                        </label>
                        <input
                          type="text"
                          value={settings.sendCcEmails}
                          onChange={(e) => handleCcEmailsChange(e.target.value)}
                          placeholder="Enter CC email addresses (comma separated)"
                          aria-label="CC email addresses"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Separate multiple emails with commas
                        </p>
                      </div>

                      {/* Email Subject */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Subject
                        </label>
                        <input
                          type="text"
                          value={settings.sendEmailSubject}
                          onChange={(e) => handleEmailSubjectChange(e.target.value)}
                          placeholder="Invoice #{invoice_number} from {business_name}"
                          aria-label="Email subject"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Variables: {'{invoice_number}'}, {'{business_name}'}, {'{client_name}'}, {'{due_date}'}, {'{amount}'}
                        </p>
                      </div>

                      {/* Email Body */}
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Email Body
                        </label>
                        <textarea
                          value={settings.sendEmailBody}
                          onChange={(e) => handleEmailBodyChange(e.target.value)}
                          placeholder="Dear {client_name},&#10;&#10;Please find attached the invoice #{invoice_number} for {amount}.&#10;&#10;Payment is due by {due_date}.&#10;&#10;Best regards,&#10;{business_name}"
                          aria-label="Email body"
                          rows={6}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Variables: {'{invoice_number}'}, {'{business_name}'}, {'{client_name}'}, {'{due_date}'}, {'{amount}'}
                        </p>
                      </div>

                      {/* Email Preview */}
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">Preview</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-500">
                              <span
                                className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium"
                              >
                                highlighted values
                              </span>
                              {' '}are dynamic
                            </span>
                          </div>
                        </div>
                        <div className="bg-white p-4 space-y-3">
                          {/* Subject Preview */}
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Subject</div>
                            <div className="text-sm text-slate-800">
                              {subjectPreview.parts.map((part, idx) => (
                                part.isDynamic ? (
                                  <span
                                    key={idx}
                                    className="inline-block px-1 py-0.5 bg-amber-100 text-amber-800 rounded font-medium"
                                  >
                                    {part.value}
                                  </span>
                                ) : (
                                  <span key={idx}>{part.value}</span>
                                )
                              ))}
                            </div>
                          </div>
                          {/* Body Preview */}
                          <div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">Body</div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                              {bodyPreview.parts.map((part, idx) => (
                                part.isDynamic ? (
                                  <span
                                    key={idx}
                                    className="inline-block px-1 py-0.5 bg-amber-100 text-amber-800 rounded font-medium"
                                  >
                                    {part.value}
                                  </span>
                                ) : (
                                  <span key={idx}>{part.value}</span>
                                )
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {!settings.sendToEmail && (
                        <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xs text-red-700">
                            Please enter a primary email address to send the invoice.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
