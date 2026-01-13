import { useMemo } from 'react';
import { X } from 'lucide-react';
import { BusinessProfile, Client, LineItem, InvoiceCalculations, TaxType } from '../../types/invoice';
import { numberToWords } from '../../utils/numberToWords';
import { useModalFocus } from '../../hooks/useModalFocus';
import { InvoiceHeader } from './preview/InvoiceHeader';
import { InvoiceDetails } from './preview/InvoiceDetails';
import { BillingSection } from './preview/BillingSection';
import { LineItemsTable } from './preview/LineItemsTable';
import { TotalsSummary } from './preview/TotalsSummary';

interface InvoicePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceTitle: string;
  invoiceSubtitle?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  businessProfile: BusinessProfile | null;
  client: Client | null;
  lineItems: LineItem[];
  calculations: InvoiceCalculations;
  taxType: TaxType;
  gstRate: number;
  currency: string;
  currencySymbol: string;
  primaryColor: string;
  accentColor: string;
  terms?: string;
  notes?: string;
}

export function InvoicePreviewModal({
  isOpen,
  onClose,
  invoiceTitle,
  invoiceSubtitle,
  invoiceNumber,
  invoiceDate,
  dueDate,
  businessProfile,
  client,
  lineItems,
  calculations,
  taxType,
  gstRate,
  currency,
  currencySymbol,
  primaryColor,
  accentColor,
  terms,
  notes,
}: InvoicePreviewModalProps) {
  const modalRef = useModalFocus(isOpen, onClose);

  const totalInWords = useMemo(
    () => numberToWords(calculations.total, currency),
    [calculations.total, currency]
  );

  const hasTermsOrNotes = Boolean(terms || notes);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-preview-title"
        tabIndex={-1}
        className="relative bg-slate-100 rounded-2xl shadow-2xl w-[900px] max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
          <h2 id="invoice-preview-title" className="text-lg font-semibold text-slate-900">
            Invoice Preview
          </h2>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Invoice Paper */}
          <div className="bg-white rounded-lg shadow-lg mx-auto max-w-[800px] overflow-hidden">
            {/* Header Bar with Primary Color */}
            <div className="h-2" style={{ backgroundColor: primaryColor }} aria-hidden="true" />

            <div className="p-8">
              <InvoiceHeader
                invoiceTitle={invoiceTitle}
                invoiceSubtitle={invoiceSubtitle}
                invoiceNumber={invoiceNumber}
                primaryColor={primaryColor}
              />

              <InvoiceDetails invoiceDate={invoiceDate} dueDate={dueDate} currency={currency} />

              <BillingSection
                businessProfile={businessProfile}
                client={client}
                accentColor={accentColor}
              />

              <LineItemsTable
                lineItems={lineItems}
                itemCalculations={calculations.itemCalculations}
                currencySymbol={currencySymbol}
                primaryColor={primaryColor}
              />

              <TotalsSummary
                calculations={calculations}
                taxType={taxType}
                gstRate={gstRate}
                currency={currency}
                currencySymbol={currencySymbol}
                primaryColor={primaryColor}
              />

              {/* Total in Words */}
              <div
                className="p-4 rounded-lg mb-6"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-1"
                  style={{ color: accentColor }}
                >
                  Total In Words
                </div>
                <p className="text-sm text-slate-700">{totalInWords}</p>
              </div>

              {/* Terms & Notes */}
              {hasTermsOrNotes && (
                <div className="grid grid-cols-2 gap-6 text-sm">
                  {terms && (
                    <section>
                      <h3 className="font-semibold mb-2" style={{ color: accentColor }}>
                        Terms & Conditions
                      </h3>
                      <p className="text-slate-600 whitespace-pre-wrap">{terms}</p>
                    </section>
                  )}
                  {notes && (
                    <section>
                      <h3 className="font-semibold mb-2" style={{ color: accentColor }}>
                        Notes
                      </h3>
                      <p className="text-slate-600 whitespace-pre-wrap">{notes}</p>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Footer Bar with Primary Color */}
            <div className="h-2" style={{ backgroundColor: primaryColor }} aria-hidden="true" />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            className="px-4 py-2 text-sm text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
            aria-label="Download invoice as PDF"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
