import { Repeat } from 'lucide-react';

interface RecurringExpenseItem {
  description: string;
  category?: string;
  monthly_average: number;
  frequency: number;
  last_date: string;
}

interface RecurringExpensesCardProps {
  expenses: {
    total_monthly: number;
    items: RecurringExpenseItem[];
  };
}

export function RecurringExpensesCard({ expenses }: RecurringExpensesCardProps) {
  if (!expenses || !expenses.items || expenses.items.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <Repeat className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Recurring Expenses</h3>
            <p className="text-xs text-slate-500 mt-0.5">Auto-detected subscriptions</p>
          </div>
        </div>
      </div>
      
      <div className="mb-5 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-amber-700">Monthly Total</span>
          <span className="text-lg font-semibold text-amber-900">
            ₹{expenses.total_monthly.toLocaleString('en-IN')}
            <span className="text-sm font-medium text-amber-700 ml-1">/month</span>
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {expenses.items.slice(0, 5).map((item, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{item.description}</p>
              {item.category && (
                <p className="text-xs text-slate-500 mt-0.5">{item.category}</p>
              )}
            </div>
            <div className="text-right ml-4">
              <p className="text-sm font-semibold text-slate-900">₹{item.monthly_average.toLocaleString('en-IN')}</p>
              <p className="text-xs text-slate-500">{item.frequency}x</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

