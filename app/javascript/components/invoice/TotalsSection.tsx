import { useState } from 'react';
import { Eye, EyeOff, Plus, ChevronDown, X } from 'lucide-react';
import { clsx } from 'clsx';
import { numberToWords } from '../../utils/numberToWords';
import { InfoTooltip } from '../ui/InfoTooltip';

interface TotalsSectionProps {
  subtotal: number;
  discount: number;
  discountAmount: number;
  discountType: 'fixed' | 'percentage';
  onDiscountChange: (amount: number, type: 'fixed' | 'percentage') => void;
  taxType: 'none' | 'cgst_sgst' | 'igst';
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount?: number;
  total: number;
  currency: string;
  currencySymbol: string;
  extraCharges?: number;
  onExtraChargesChange?: (amount: number) => void;
  isReverseCharge?: boolean;
}

export function TotalsSection({
  subtotal,
  discount,
  discountAmount,
  discountType,
  onDiscountChange,
  taxType,
  gstRate,
  cgstAmount,
  sgstAmount,
  igstAmount,
  cessAmount = 0,
  total,
  currency,
  currencySymbol,
  extraCharges = 0,
  onExtraChargesChange,
  isReverseCharge = false,
}: TotalsSectionProps) {
  const [showTotalInPdf, setShowTotalInPdf] = useState(true);
  const [showTotalInWords, setShowTotalInWords] = useState(true);
  const [showDiscountInput, setShowDiscountInput] = useState(discountAmount > 0);
  const [showExtraChargesInput, setShowExtraChargesInput] = useState(extraCharges > 0);
  const [summarizeQty, setSummarizeQty] = useState(false);

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Calculate total tax for RCM display
  const totalTax = cgstAmount + sgstAmount + igstAmount + cessAmount;

  // Amount payable to supplier (without tax) for RCM
  const amountPayableToSupplier = subtotal - discount + extraCharges;

  // For RCM, show amount payable to supplier in words, otherwise show total
  const totalInWords = numberToWords(isReverseCharge ? amountPayableToSupplier : total, currency);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-900">Totals</span>
          <button
            onClick={() => setShowTotalInPdf(!showTotalInPdf)}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
            title={showTotalInPdf ? 'Hide in PDF' : 'Show in PDF'}
          >
            {showTotalInPdf ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            <span>Show Total in PDF</span>
          </button>
        </div>
      </div>

      {/* Totals Content */}
      <div className="p-4 space-y-3">
        {/* Amount (Subtotal) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Amount</span>
          <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
        </div>

        {/* Tax */}
        {taxType === 'cgst_sgst' && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className={clsx("text-slate-600", isReverseCharge && "text-amber-700")}>
                CGST ({gstRate / 2}%)
                {isReverseCharge && <span className="text-xs ml-1">(RCM)</span>}
              </span>
              <span className={clsx("text-slate-900", isReverseCharge && "text-amber-700")}>
                {formatCurrency(cgstAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={clsx("text-slate-600", isReverseCharge && "text-amber-700")}>
                SGST ({gstRate / 2}%)
                {isReverseCharge && <span className="text-xs ml-1">(RCM)</span>}
              </span>
              <span className={clsx("text-slate-900", isReverseCharge && "text-amber-700")}>
                {formatCurrency(sgstAmount)}
              </span>
            </div>
          </>
        )}

        {taxType === 'igst' && (
          <div className="flex items-center justify-between text-sm">
            <span className={clsx("text-slate-600", isReverseCharge && "text-amber-700")}>
              IGST ({gstRate}%)
              {isReverseCharge && <span className="text-xs ml-1">(RCM)</span>}
            </span>
            <span className={clsx("text-slate-900", isReverseCharge && "text-amber-700")}>
              {formatCurrency(igstAmount)}
            </span>
          </div>
        )}

        {/* Cess */}
        {cessAmount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className={clsx("text-slate-600", isReverseCharge && "text-amber-700")}>
              Cess
              {isReverseCharge && <span className="text-xs ml-1">(RCM)</span>}
            </span>
            <span className={clsx("text-slate-900", isReverseCharge && "text-amber-700")}>
              {formatCurrency(cessAmount)}
            </span>
          </div>
        )}

        {/* Extra Charges */}
        {showExtraChargesInput ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Extra Charges</span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{currencySymbol}</span>
              <input
                type="number"
                value={extraCharges || ''}
                onChange={(e) => onExtraChargesChange?.(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 text-right rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
              <button
                onClick={() => {
                  setShowExtraChargesInput(false);
                  onExtraChargesChange?.(0);
                }}
                className="p-1 hover:bg-slate-100 rounded"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          </div>
        ) : null}

        {/* Add Discounts */}
        {showDiscountInput ? (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span className="flex items-center gap-2">
              Discount
              <button
                onClick={() => {
                  setShowDiscountInput(false);
                  onDiscountChange(0, 'fixed');
                }}
                className="p-0.5 hover:bg-emerald-100 rounded"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
            <div className="flex items-center gap-1">
              <span>-</span>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) =>
                  onDiscountChange(parseFloat(e.target.value) || 0, discountType)
                }
                className="w-20 px-2 py-1 text-right rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
                placeholder="0"
                min="0"
                step="0.01"
              />
              <select
                value={discountType}
                onChange={(e) =>
                  onDiscountChange(discountAmount, e.target.value as 'fixed' | 'percentage')
                }
                className="px-2 py-1 rounded border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900"
              >
                <option value="fixed">{currencySymbol}</option>
                <option value="percentage">%</option>
              </select>
            </div>
          </div>
        ) : null}

        {/* Action Links */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!showDiscountInput && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowDiscountInput(true)}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Discounts
              </button>
              <InfoTooltip
                content={
                  <>
                    Apply discount as fixed amount or percentage.
                    <br /><br />
                    Discount is applied before tax calculation.
                  </>
                }
                position="top"
              />
            </div>
          )}
          {!showExtraChargesInput && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowExtraChargesInput(true)}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Additional Charges
              </button>
              <InfoTooltip
                content={
                  <>
                    Add shipping, handling, or other charges.
                    <br /><br />
                    These are added to the subtotal before tax.
                  </>
                }
                position="top"
              />
            </div>
          )}
        </div>

        {/* Summarize Qty */}
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={summarizeQty}
            onChange={(e) => setSummarizeQty(e.target.checked)}
            className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
          />
          Summarise Total Quantity
        </label>

        {/* Total */}
        <div className="pt-3 border-t border-slate-200">
          {isReverseCharge && taxType !== 'none' ? (
            <>
              {/* RCM Display */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">Amount Payable to Supplier</span>
                  <span className="text-xl font-bold text-slate-900">{formatCurrency(amountPayableToSupplier)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                  <span className="text-sm text-amber-800">Tax Payable by Recipient (RCM)</span>
                  <span className="text-sm font-semibold text-amber-800">{formatCurrency(totalTax)}</span>
                </div>
                <p className="text-xs text-slate-500 italic">
                  * Tax to be paid directly to Government by the recipient under Reverse Charge Mechanism
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">Total ({currency})</span>
              <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
          )}
        </div>

        {/* Discount Applied */}
        {discount > 0 && (
          <div className="flex items-center justify-between text-xs text-emerald-600">
            <span>You saved</span>
            <span>{formatCurrency(discount)}</span>
          </div>
        )}

        {/* Add Custom Fields */}
        <button className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors">
          <Plus className="w-3 h-3" />
          Add Custom Fields
        </button>
      </div>

      {/* Total In Words */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Total In Words
          </span>
          <button
            onClick={() => setShowTotalInWords(!showTotalInWords)}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title={showTotalInWords ? 'Hide' : 'Show'}
          >
            {showTotalInWords ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>
        {showTotalInWords && (
          <p className="text-sm text-slate-700 leading-relaxed">{totalInWords}</p>
        )}
      </div>
    </div>
  );
}
