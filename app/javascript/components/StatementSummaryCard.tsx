import { CreditCard, TrendingDown, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import type { StatementSummary } from '../types/api';

interface StatementSummaryCardProps {
  summary: StatementSummary;
  className?: string;
}

export function StatementSummaryCard({ summary, className }: StatementSummaryCardProps) {
  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Credit card summary
  // Handle both string and object types for statement_period (generated types may be wrong)
  const statementPeriod = typeof summary.statement_period === 'string' 
    ? (summary.statement_period ? JSON.parse(summary.statement_period) : null)
    : summary.statement_period;
  
  // Check if it's a credit card statement - if account_type is credit_card, show credit card stats
  const isCreditCard = summary.account_type === 'credit_card';
  
  if (isCreditCard) {
    // API returns these as strings, handle both string and number types
    const totalSpent = parseFloat(String(summary.total_spent || '0'));
    const paymentsMade = parseFloat(String(summary.payments_made || '0'));
    const outstandingBalance = parseFloat(String(summary.outstanding_balance || '0'));
    const amountDue = parseFloat(String(summary.amount_due || '0'));
    
    const statementStart = statementPeriod?.start;
    const statementEnd = statementPeriod?.end;
    const statementMonth = statementEnd 
      ? new Date(statementEnd).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : 'Current Period';

    return (
      <div className={clsx("rounded-2xl bg-slate-900 border border-slate-800 p-6", className)}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">💳 Credit Card Summary</h3>
            <p className="text-sm text-slate-400">{statementMonth}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Spent */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <p className="text-sm text-slate-400">Total Spent</p>
            </div>
            <p className="text-2xl font-bold text-rose-400">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          {/* Payments Made */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-slate-400">Payments Made</p>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(paymentsMade)}
            </p>
          </div>

          {/* Outstanding Balance */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <p className="text-sm text-slate-400">Outstanding Balance</p>
            </div>
            <p className="text-2xl font-bold text-amber-400">
              {formatCurrency(outstandingBalance)}
            </p>
          </div>

          {/* Amount Due */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-violet-400" />
              <p className="text-sm text-slate-400">Amount Due</p>
            </div>
            <p className="text-2xl font-bold text-violet-400">
              {formatCurrency(amountDue)}
            </p>
          </div>
        </div>

        {/* Statement Period */}
        {statementStart && statementEnd && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Statement Period</span>
              <span className="text-slate-300">
                {formatDate(statementStart)} - {formatDate(statementEnd)}
              </span>
            </div>
          </div>
        )}

        {/* Transaction Count */}
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Transactions</span>
            <span className="text-slate-300 font-medium">
              {summary.transaction_count} transactions
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular account summary (savings/current)
  // Handle both string and object types for date_range (generated types may be wrong)
  const dateRange = typeof summary.date_range === 'string'
    ? (summary.date_range ? JSON.parse(summary.date_range) : null)
    : summary.date_range;
  
  const totalDebits = parseFloat(summary.total_debits || '0');
  const totalCredits = parseFloat(summary.total_credits || '0');
  const net = parseFloat(summary.net || '0');

  return (
    <div className={clsx("rounded-2xl bg-slate-900 border border-slate-800 p-6", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Account Summary</h3>
          <p className="text-sm text-slate-400 capitalize">{summary.account_type} Account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Debits */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <p className="text-sm text-slate-400">Total Debits</p>
          </div>
          <p className="text-2xl font-bold text-rose-400">
            {formatCurrency(totalDebits)}
          </p>
        </div>

        {/* Total Credits */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-slate-400">Total Credits</p>
          </div>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(totalCredits)}
          </p>
        </div>

        {/* Net Flow */}
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <p className="text-sm text-slate-400">Net Flow</p>
          </div>
          <p className={clsx(
            "text-2xl font-bold",
            net >= 0 ? "text-emerald-400" : "text-rose-400"
          )}>
            {formatCurrency(net)}
          </p>
        </div>
      </div>

      {/* Date Range */}
      {dateRange && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Period</span>
            <span className="text-slate-300">
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </span>
          </div>
        </div>
      )}

      {/* Transaction Count */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Transactions</span>
          <span className="text-slate-300 font-medium">
            {summary.transaction_count} transactions
          </span>
        </div>
      </div>
    </div>
  );
}

