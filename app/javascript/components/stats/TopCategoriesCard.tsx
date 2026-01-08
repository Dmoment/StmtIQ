import { useMemo } from 'react';
import { Info, ArrowDown, TrendingUp } from 'lucide-react';
import { GroupedBarChart } from '../charts/GroupedBarChart';

// Color palette matching the reference design
const CHART_COLORS = [
  '#facc15', // Yellow
  '#4ade80', // Green
  '#22d3ee', // Cyan
  '#c084fc', // Purple
  '#fb923c', // Orange
];

interface Category {
  id: number;
  name: string;
  amount: number;
  color?: string;
  icon?: string;
  transaction_count: number;
}

interface TopCategoriesCardProps {
  categories: Category[];
}

export function TopCategoriesCard({ categories }: TopCategoriesCardProps) {
  if (!categories || categories.length === 0) return null;

  // Calculate total and percentage
  const totalAmount = useMemo(() => {
    return categories.reduce((sum, cat) => sum + cat.amount, 0);
  }, [categories]);

  // Get top 5 categories
  const topCategories = useMemo(() => {
    return categories.slice(0, 5).map((cat, index) => ({
      ...cat,
      color: cat.color || CHART_COLORS[index % CHART_COLORS.length],
      percentage: ((cat.amount / totalAmount) * 100).toFixed(1),
    }));
  }, [categories, totalAmount]);

  // Create chart data - simulate monthly breakdown for grouped bar effect
  const chartData = useMemo(() => {
    // Create a simplified grouped bar representation
    const months = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'];
    return months.map((label, index) => ({
      label,
      groups: topCategories.slice(0, 4).map((cat, catIndex) => ({
        name: cat.name,
        // Simulate variation based on category amount
        value: Math.round(
          (cat.amount / 4) * (0.5 + Math.random() * 1)
        ),
        color: cat.color,
      })),
    }));
  }, [topCategories]);

  // Top spending category
  const topCategory = topCategories[0];
  const topPercentage = topCategory
    ? ((topCategory.amount / totalAmount) * 100).toFixed(1)
    : '0';

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
            <h3 className="font-semibold text-slate-900">Category Breakdown</h3>
            <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {topPercentage}%
            </span>
            <span className="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              top category
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {topCategory?.name || 'N/A'} is your highest spending category
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            See details
          </button>
          <button className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1">
            All categories <ArrowDown className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Grouped Bar Chart */}
      <GroupedBarChart data={chartData} className="h-[200px]" showLegend />

      {/* Category List */}
      <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
        {topCategories.slice(0, 4).map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between py-2 hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-sm font-medium text-slate-700">
                {cat.name}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">
                {cat.transaction_count} txns
              </span>
              <span className="text-sm font-semibold text-slate-900 w-20 text-right">
                {formatCurrency(cat.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
