import { InvoiceCalculations, TaxType } from '../../../types/invoice';
import { formatCurrency } from '../../../utils/formatters';

interface TotalsSummaryProps {
  calculations: InvoiceCalculations;
  taxType: TaxType;
  gstRate: number;
  currency: string;
  currencySymbol: string;
  primaryColor: string;
}

export function TotalsSummary({
  calculations,
  taxType,
  gstRate,
  currency,
  currencySymbol,
  primaryColor,
}: TotalsSummaryProps) {
  return (
    <div className="flex justify-end mb-8">
      <div className="w-72">
        <div className="flex justify-between py-2 text-sm">
          <span className="text-slate-600">Subtotal</span>
          <span className="text-slate-900">
            {formatCurrency(calculations.subtotal, currencySymbol)}
          </span>
        </div>

        {calculations.discount > 0 && (
          <div className="flex justify-between py-2 text-sm text-emerald-600">
            <span>Discount</span>
            <span>-{formatCurrency(calculations.discount, currencySymbol)}</span>
          </div>
        )}

        {taxType === 'cgst_sgst' && (
          <>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">CGST ({gstRate / 2}%)</span>
              <span className="text-slate-900">
                {formatCurrency(calculations.cgstAmount, currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-slate-600">SGST ({gstRate / 2}%)</span>
              <span className="text-slate-900">
                {formatCurrency(calculations.sgstAmount, currencySymbol)}
              </span>
            </div>
          </>
        )}

        {taxType === 'igst' && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-slate-600">IGST ({gstRate}%)</span>
            <span className="text-slate-900">
              {formatCurrency(calculations.igstAmount, currencySymbol)}
            </span>
          </div>
        )}

        {calculations.cessAmount > 0 && (
          <div className="flex justify-between py-2 text-sm">
            <span className="text-slate-600">Cess</span>
            <span className="text-slate-900">
              {formatCurrency(calculations.cessAmount, currencySymbol)}
            </span>
          </div>
        )}

        <div
          className="flex justify-between py-3 mt-2 border-t-2 font-semibold"
          style={{ borderColor: primaryColor }}
        >
          <span className="text-slate-900">Total ({currency})</span>
          <span style={{ color: primaryColor }}>
            {formatCurrency(calculations.total, currencySymbol)}
          </span>
        </div>
      </div>
    </div>
  );
}
