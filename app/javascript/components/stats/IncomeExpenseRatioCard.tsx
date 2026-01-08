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
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-amber-500" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Income vs Expense Ratio</h3>
            <p className="text-xs text-slate-500 mt-0.5">Financial health check</p>
          </div>
        </div>
      </div>
      <IncomeExpenseRatio ratio={ratio} />
    </div>
  );
}

