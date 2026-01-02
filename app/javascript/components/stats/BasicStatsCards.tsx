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
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {/* Total Debits */}
      <div className="group relative p-6 rounded-xl bg-gradient-to-br from-red-50/50 to-white border border-red-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="relative">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Debits</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">₹{formatAmountForCard(totalDebits)}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-red-700 font-semibold">Expenses</span>
          </div>
        </div>
      </div>

      {/* Total Credits */}
      <div className="group relative p-6 rounded-xl bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200/80 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="relative">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Credits</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">₹{formatAmountForCard(totalCredits)}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-semibold">Income</span>
          </div>
        </div>
      </div>

      {/* Net Flow */}
      <div className={clsx(
        "group relative p-6 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden",
        netFlow >= 0 
          ? "bg-gradient-to-br from-blue-50/50 to-white border-blue-200/80"
          : "bg-gradient-to-br from-red-50/50 to-white border-red-200/80"
      )}>
        <div className="relative">
          <div className="mb-4">
            <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Net Flow</p>
            <p className="text-4xl font-bold text-slate-900 tracking-tight">₹{formatAmountForCard(Math.abs(netFlow))}</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ArrowRightLeft className={clsx(
              "w-4 h-4",
              netFlow >= 0 ? "text-blue-600" : "text-red-600"
            )} />
            <span className={clsx(
              "font-semibold",
              netFlow >= 0 ? "text-blue-700" : "text-red-700"
            )}>
              {netFlow >= 0 ? 'Positive' : 'Negative'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

