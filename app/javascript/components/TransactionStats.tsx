import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { BasicStatsCards } from './stats/BasicStatsCards';
import { MonthlySpendCard } from './stats/MonthlySpendCard';
import { TopCategoriesCard } from './stats/TopCategoriesCard';
import { TopMerchantsCard } from './stats/TopMerchantsCard';
import { IncomeExpenseRatioCard } from './stats/IncomeExpenseRatioCard';
import { RecurringExpensesCard } from './stats/RecurringExpensesCard';
import { SilentDrainsCard } from './stats/SilentDrainsCard';
import { LargestExpenseCard } from './stats/LargestExpenseCard';
import { WeekendWeekdayCard } from './stats/WeekendWeekdayCard';

interface MonthlySpendData {
  month: string;
  month_key: string;
  amount: number;
  transaction_count: number;
}

interface Category {
  id: number;
  name: string;
  amount: number;
  color?: string;
  icon?: string;
  transaction_count: number;
}

interface Merchant {
  name: string;
  amount: number;
  transaction_count: number;
}

interface IncomeExpenseRatio {
  income: number;
  expense: number;
  income_percent: number;
  expense_percent: number;
}

interface RecurringExpenseItem {
  description: string;
  category?: string;
  monthly_average: number;
  frequency: number;
  last_date: string;
}

interface RecurringExpenses {
  total_monthly: number;
  items: RecurringExpenseItem[];
}

interface SilentDrain {
  label: string;
  max_amount: number;
  total_amount: number;
  transaction_count: number;
  average_per_transaction: number;
}

interface LargestExpense {
  amount: number;
  description: string;
  date: string;
  category?: string;
}

interface WeekendWeekdayData {
  weekend: {
    total: number;
    count: number;
    average: number;
  };
  weekday: {
    total: number;
    count: number;
    average: number;
  };
}

interface TransactionStats {
  total_debits: number;
  total_credits: number;
  analytics_loading?: boolean;
  monthly_spend?: MonthlySpendData[];
  top_categories?: Category[];
  top_merchants?: Merchant[];
  income_expense_ratio?: IncomeExpenseRatio;
  recurring_expenses?: RecurringExpenses;
  silent_drains?: SilentDrain[];
  largest_expense?: LargestExpense;
  weekend_vs_weekday?: WeekendWeekdayData;
}

interface TransactionStatsProps {
  stats: TransactionStats;
  isLoading?: boolean;
}

export function TransactionStats({ stats, isLoading }: TransactionStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || !stats) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm" role="status" aria-label="Loading transaction statistics">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded-lg w-1/3 mb-3" aria-hidden="true"></div>
              <div className="h-10 bg-slate-200 rounded-lg w-2/3" aria-hidden="true"></div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading transaction statistics...</span>
      </div>
    );
  }

  // Calculate basic stats from detailed stats or base stats
  const totalDebits = stats.total_debits || 0;
  const totalCredits = stats.total_credits || 0;
  const netFlow = totalCredits - totalDebits;

  // Check if analytics are still loading
  const analyticsLoading = stats.analytics_loading === true;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
      {/* Basic Stats - Always Visible */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Transaction Summary</h2>
            <p className="text-sm text-slate-500 mt-0.5">Overview of your financial activity</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-controls="detailed-analysis"
            aria-label={isExpanded ? 'Hide detailed analysis' : 'Show detailed analysis'}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-amber-200 text-slate-900 hover:bg-amber-300 transition-colors"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span>{isExpanded ? 'Hide' : 'Show'} Analysis</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" aria-hidden="true" />
            ) : (
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </div>

        <BasicStatsCards
          totalDebits={totalDebits}
          totalCredits={totalCredits}
          netFlow={netFlow}
        />
      </div>

      {/* Detailed Analysis - Collapsible */}
      {isExpanded && (
        <div id="detailed-analysis" className="border-t border-slate-100 p-6 space-y-6 bg-slate-50/30">
          {analyticsLoading ? (
            <div className="text-center py-12" role="status" aria-live="polite">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" aria-hidden="true"></div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700 mb-1">Computing analytics...</p>
                  <p className="text-xs text-slate-500">This may take a moment for large datasets</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Monthly Spend Breakdown */}
              <MonthlySpendCard data={stats.monthly_spend || []} />

              {/* Top Categories & Top Merchants Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <TopCategoriesCard categories={stats.top_categories || []} />
                <TopMerchantsCard merchants={stats.top_merchants || []} />
              </div>

              {/* Income vs Expense Ratio */}
              <IncomeExpenseRatioCard ratio={stats.income_expense_ratio} />

              {/* Delight Stats */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-slate-900">Smart Insights</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RecurringExpensesCard expenses={stats.recurring_expenses} />
                  <SilentDrainsCard drains={stats.silent_drains || []} />
                </div>

                {/* Largest Expense & Weekend vs Weekday */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <LargestExpenseCard expense={stats.largest_expense} />
                  <WeekendWeekdayCard data={stats.weekend_vs_weekday} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
