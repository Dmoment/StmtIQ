import { useMemo } from 'react';
import { TrendingDown, TrendingUp, Info, ArrowDown } from 'lucide-react';
import { SpendingTrendChart } from '../charts/SpendingTrendChart';

interface MonthlySpendData {
  month: string;
  month_key: string;
  amount: number;
  transaction_count: number;
}

interface MonthlySpendCardProps {
  data: MonthlySpendData[];
}

export function MonthlySpendCard({ data }: MonthlySpendCardProps) {
  if (!data || data.length === 0) return null;

  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) =>
      a.month_key.localeCompare(b.month_key)
    );
    return {
      values: sortedData.map(d => d.amount),
      labels: sortedData.map(d => d.month.slice(0, 3)),
    };
  }, [data]);

  // Calculate trend
  const trend = useMemo(() => {
    if (data.length < 2) return null;
    const sortedData = [...data].sort((a, b) =>
      a.month_key.localeCompare(b.month_key)
    );
    const current = sortedData[sortedData.length - 1]?.amount || 0;
    const previous = sortedData[sortedData.length - 2]?.amount || 0;
    if (previous === 0) return null;
    const percentChange = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(percentChange).toFixed(1),
      isUp: percentChange > 0,
    };
  }, [data]);

  // Current month total
  const currentTotal = useMemo(() => {
    const sortedData = [...data].sort((a, b) =>
      a.month_key.localeCompare(b.month_key)
    );
    return sortedData[sortedData.length - 1]?.amount || 0;
  }, [data]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-slate-900">Monthly Spending</h3>
            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(currentTotal)}
            </span>
            {trend && (
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  trend.isUp ? 'text-red-500' : 'text-emerald-500'
                }`}
              >
                {trend.isUp ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Spending trend over the last {data.length} months
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            See details
          </button>
          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1">
            All months <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <SpendingTrendChart
        data={chartData.values}
        labels={chartData.labels}
        className="h-[200px]"
        color="#ef4444"
      />
    </div>
  );
}
