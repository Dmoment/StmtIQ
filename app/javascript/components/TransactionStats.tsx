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

interface TransactionStatsProps {
  stats: any;
  isLoading?: boolean;
}

export function TransactionStats({ stats, isLoading }: TransactionStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading || !stats) {
    return (
      <div className="bg-white rounded-xl border border-slate-200/60 p-8 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3"></div>
              <div className="h-10 bg-slate-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
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
    <div className="bg-white rounded-xl border border-slate-200/60 shadow-sm overflow-hidden">
      {/* Basic Stats - Always Visible */}
      <div className="p-8 bg-gradient-to-br from-slate-50 to-white">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Transaction Summary</h2>
            <p className="text-sm text-slate-500 font-medium">Overview of your financial activity</p>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-white hover:shadow-md transition-all duration-200 border border-slate-200/60 bg-white/50 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isExpanded ? 'Hide' : 'Show'} Detailed Analysis</span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
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
        <div className="border-t border-slate-200/60 p-8 space-y-8 bg-gradient-to-br from-slate-50/50 to-white">
          {analyticsLoading ? (
            <div className="text-center py-12">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <div className="text-center">
                  <p className="text-base font-semibold text-slate-700 mb-1">Computing analytics...</p>
                  <p className="text-sm text-slate-500">This may take a moment for large datasets</p>
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
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-6 h-6 text-blue-600" />
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Smart Insights</h2>
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
