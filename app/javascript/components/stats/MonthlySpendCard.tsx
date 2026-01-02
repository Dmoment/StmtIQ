import { BarChart3 } from 'lucide-react';
import { MonthlySpendVerticalChart } from './MonthlySpendVerticalChart';

interface MonthlySpendCardProps {
  data: Array<{
    month: string;
    month_key: string;
    amount: number;
    transaction_count: number;
  }>;
}

export function MonthlySpendCard({ data }: MonthlySpendCardProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <BarChart3 className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Monthly Spend Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">Last 12 months overview</p>
          </div>
        </div>
      </div>
      <MonthlySpendVerticalChart data={data} />
    </div>
  );
}

