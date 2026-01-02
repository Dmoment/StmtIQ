interface IncomeExpenseRatioProps {
  ratio: {
    income: number;
    expense: number;
    income_percent: number;
    expense_percent: number;
  };
}

export function IncomeExpenseRatio({ ratio }: IncomeExpenseRatioProps) {
  const total = ratio.income + ratio.expense;
  const incomeWidth = total > 0 ? (ratio.income / total) * 100 : 0;
  const expenseWidth = total > 0 ? (ratio.expense / total) * 100 : 0;

  const getHealthMessage = () => {
    if (ratio.income_percent > 60) {
      return {
        message: "Great! You're saving more than you spend. Keep it up!",
        color: "text-emerald-600"
      };
    } else if (ratio.income_percent > 50) {
      return {
        message: "Good balance! You're earning more than you spend.",
        color: "text-blue-600"
      };
    } else if (ratio.income_percent > 40) {
      return {
        message: "Be mindful. Your expenses are close to your income.",
        color: "text-amber-600"
      };
    } else {
      return {
        message: "Warning: Your expenses exceed your income. Review your spending.",
        color: "text-red-600"
      };
    }
  };

  const healthInfo = getHealthMessage();

  return (
    <div className="space-y-6">
      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
        <p className="text-xs text-slate-600 leading-relaxed">
          <span className="font-semibold text-slate-700">What this means:</span> This shows how much of your total money flow comes from income (money coming in) versus expenses (money going out). A higher income percentage means you're saving more.
        </p>
      </div>

      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-medium text-slate-700">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              ₹{ratio.income.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">{ratio.income_percent}%</span>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${incomeWidth}%` }}
          />
        </div>
      </div>
      
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span className="text-sm font-medium text-slate-700">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              ₹{ratio.expense.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-slate-500">{ratio.expense_percent}%</span>
          </div>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-500 rounded-full transition-all duration-500"
            style={{ width: `${expenseWidth}%` }}
          />
        </div>
      </div>

      <div className="pt-2 border-t border-slate-200">
        <p className={`text-xs font-medium ${healthInfo.color}`}>
          {healthInfo.message}
        </p>
      </div>
    </div>
  );
}

