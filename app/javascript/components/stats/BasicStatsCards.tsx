import { TrendingUp, TrendingDown, ArrowRightLeft } from 'lucide-react';
import { clsx } from 'clsx';

interface BasicStatsCardsProps {
  totalDebits: number;
  totalCredits: number;
  netFlow: number;
}

const formatAmountForCard = (amount: number) => {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString('en-IN');
};

export function BasicStatsCards({ totalDebits, totalCredits, netFlow }: BasicStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Debits */}
      <div className="relative p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">Total Debits</p>
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-red-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">₹{formatAmountForCard(totalDebits)}</p>
        <p className="text-xs text-red-600 font-medium mt-1">Expenses</p>
      </div>

      {/* Total Credits */}
      <div className="relative p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">Total Credits</p>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">₹{formatAmountForCard(totalCredits)}</p>
        <p className="text-xs text-emerald-600 font-medium mt-1">Income</p>
      </div>

      {/* Net Flow */}
      <div className="relative p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-500">Net Flow</p>
          <div className={clsx(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            netFlow >= 0 ? "bg-blue-100" : "bg-red-100"
          )}>
            <ArrowRightLeft className={clsx(
              "w-4 h-4",
              netFlow >= 0 ? "text-blue-600" : "text-red-600"
            )} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">₹{formatAmountForCard(Math.abs(netFlow))}</p>
        <p className={clsx(
          "text-xs font-medium mt-1",
          netFlow >= 0 ? "text-blue-600" : "text-red-600"
        )}>
          {netFlow >= 0 ? 'Positive' : 'Negative'}
        </p>
      </div>
    </div>
  );
}

