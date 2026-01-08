import { Zap, Calendar } from 'lucide-react';

interface LargestExpenseCardProps {
  expense: {
    amount: number;
    description: string;
    date: string;
    category?: string;
  };
}

export function LargestExpenseCard({ expense }: LargestExpenseCardProps) {
  if (!expense) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Zap className="w-5 h-5 text-orange-600" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Largest Single Expense</h3>
            <p className="text-xs text-slate-500 mt-0.5">Your biggest spend</p>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-orange-50 border border-orange-200/80">
        <div className="mb-3">
          <p className="text-2xl font-semibold text-orange-900 mb-2">
            ₹{expense.amount.toLocaleString('en-IN')}
          </p>
          <p className="text-sm font-medium text-slate-900">{expense.description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-600 pt-3 border-t border-orange-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>
            {new Date(expense.date).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
          {expense.category && (
            <>
              <span className="text-slate-400">•</span>
              <span>{expense.category}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

