import { DollarSign } from 'lucide-react';
import { IncomeExpenseRatio } from './IncomeExpenseRatio';

interface IncomeExpenseRatioCardProps {
  ratio: {
    income: number;
    expense: number;
    income_percent: number;
    expense_percent: number;
  };
}

export function IncomeExpenseRatioCard({ ratio }: IncomeExpenseRatioCardProps) {
  if (!ratio) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <DollarSign className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Income vs Expense Ratio</h3>
            <p className="text-xs text-slate-500 mt-0.5">Financial health check</p>
          </div>
        </div>
      </div>
      <IncomeExpenseRatio ratio={ratio} />
    </div>
  );
}

