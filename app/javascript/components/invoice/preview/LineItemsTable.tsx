import { useMemo } from 'react';
import { LineItem, ItemCalculation } from '../../../types/invoice';
import { formatCurrency } from '../../../utils/formatters';

interface LineItemsTableProps {
  lineItems: LineItem[];
  itemCalculations: ItemCalculation[];
  currencySymbol: string;
  primaryColor: string;
}

export function LineItemsTable({
  lineItems,
  itemCalculations,
  currencySymbol,
  primaryColor,
}: LineItemsTableProps) {
  const validItems = useMemo(() => lineItems.filter((item) => !item._destroy), [lineItems]);

  return (
    <div className="mb-8">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: primaryColor }}>
            <th className="text-left py-3 px-4 text-white font-semibold">#</th>
            <th className="text-left py-3 px-4 text-white font-semibold">Item</th>
            <th className="text-center py-3 px-4 text-white font-semibold">HSN/SAC</th>
            <th className="text-center py-3 px-4 text-white font-semibold">Qty</th>
            <th className="text-right py-3 px-4 text-white font-semibold">Rate</th>
            <th className="text-right py-3 px-4 text-white font-semibold">Tax</th>
            <th className="text-right py-3 px-4 text-white font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {validItems.map((item, index) => {
            const calc = itemCalculations[index] || {
              amount: 0,
              taxAmount: 0,
              total: 0,
            };
            return (
              <tr key={item.id || `item-${index}`} className="border-b border-slate-100">
                <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                <td className="py-3 px-4 text-slate-900 font-medium">
                  {item.description || '-'}
                </td>
                <td className="py-3 px-4 text-center text-slate-600 font-mono">
                  {item.hsn_sac_code || '-'}
                </td>
                <td className="py-3 px-4 text-center text-slate-600">
                  {item.quantity} {item.unit}
                </td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {formatCurrency(item.rate, currencySymbol)}
                </td>
                <td className="py-3 px-4 text-right text-slate-600">
                  {formatCurrency(calc.taxAmount, currencySymbol)}
                  <span className="text-xs text-slate-400 ml-1">({item.gst_rate}%)</span>
                </td>
                <td className="py-3 px-4 text-right text-slate-900 font-medium">
                  {formatCurrency(calc.total, currencySymbol)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
