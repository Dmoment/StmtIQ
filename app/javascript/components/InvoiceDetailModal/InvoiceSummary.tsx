import {
  Building2,
  Calendar,
  Hash,
  IndianRupee,
  DollarSign,
  Euro,
  PoundSterling,
} from 'lucide-react';
import { EditableField } from './EditableField';
import { formatCurrency, formatDate } from './utils';

interface InvoiceSummaryProps {
  isEditing: boolean;
  editedFields: {
    vendor_name: string;
    invoice_number: string;
    invoice_date: string;
    total_amount: string;
    currency: string;
  };
  invoice: {
    vendor_name: string | null;
    invoice_number: string | null;
    invoice_date: string | null;
    total_amount: string | null;
    currency: string | null;
  };
  onFieldChange: (field: string, value: string) => void;
}

const currencyOptions = [
  { value: 'INR', label: 'INR (₹)', icon: IndianRupee },
  { value: 'USD', label: 'USD ($)', icon: DollarSign },
  { value: 'EUR', label: 'EUR (€)', icon: Euro },
  { value: 'GBP', label: 'GBP (£)', icon: PoundSterling },
];

export function InvoiceSummary({
  isEditing,
  editedFields,
  invoice,
  onFieldChange,
}: InvoiceSummaryProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-amber-50/30 border border-orange-100 p-5">
      <div className="relative z-10 grid grid-cols-2 gap-4">
        {/* Vendor Name */}
        <EditableField
          label="Vendor"
          value={editedFields.vendor_name}
          isEditing={isEditing}
          icon={<Building2 className="w-4 h-4 text-slate-400" />}
          placeholder="Enter vendor name"
          onChange={(value) => onFieldChange('vendor_name', value)}
          displayValue={invoice.vendor_name || 'Unknown'}
        />

        {/* Invoice Date */}
        <EditableField
          label="Date"
          value={editedFields.invoice_date}
          isEditing={isEditing}
          icon={<Calendar className="w-4 h-4 text-slate-400" />}
          type="date"
          onChange={(value) => onFieldChange('invoice_date', value)}
          displayValue={formatDate(invoice.invoice_date)}
        />

        {/* Invoice Number */}
        <EditableField
          label="Invoice #"
          value={editedFields.invoice_number}
          isEditing={isEditing}
          icon={<Hash className="w-4 h-4 text-slate-400" />}
          placeholder="Enter invoice number"
          onChange={(value) => onFieldChange('invoice_number', value)}
          displayValue={invoice.invoice_number || '-'}
        />

        {/* Amount & Currency */}
        <div>
          <p className="text-xs font-medium text-orange-600 uppercase tracking-wide mb-1">
            Amount
          </p>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <select
                value={editedFields.currency}
                onChange={(e) => onFieldChange('currency', e.target.value)}
                className="px-2 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                aria-label="Select currency"
              >
                {currencyOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.value}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={editedFields.total_amount}
                onChange={(e) => onFieldChange('total_amount', e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-2 py-1.5 text-sm font-bold text-slate-900 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-300"
                aria-label="Invoice amount"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-slate-400" />
              <span className="font-bold text-slate-900 text-lg">
                {formatCurrency(invoice.total_amount, invoice.currency || 'INR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Decorative element */}
      <div
        className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50"
        aria-hidden="true"
      />
    </div>
  );
}
