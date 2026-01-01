import { CreditCard, TrendingDown, TrendingUp, Calendar, AlertCircle, Wallet } from 'lucide-react';
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
  const statementPeriod = typeof summary.statement_period === 'string' 
    ? (summary.statement_period ? JSON.parse(summary.statement_period) : null)
    : summary.statement_period;
  
  const isCreditCard = summary.account_type === 'credit_card';
  
  if (isCreditCard) {
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
      <div className={clsx("rounded-lg bg-white border border-slate-200 p-6 shadow-sm", className)}>
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
          <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-slate-700" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Credit Card Summary</h3>
            <p className="text-sm text-slate-600">{statementMonth}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-700" />
              <p className="text-sm font-medium text-slate-700">Total Spent</p>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {formatCurrency(totalSpent)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              <p className="text-sm font-medium text-slate-700">Payments Made</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {formatCurrency(paymentsMade)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-700" />
              <p className="text-sm font-medium text-slate-700">Outstanding Balance</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {formatCurrency(outstandingBalance)}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <p className="text-sm font-medium text-slate-700">Amount Due</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(amountDue)}
            </p>
          </div>
        </div>

        {statementStart && statementEnd && (
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Statement Period</span>
              <span className="text-slate-900 font-medium">
                {formatDate(statementStart)} - {formatDate(statementEnd)}
              </span>
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Transactions</span>
            <span className="text-slate-900 font-semibold">
              {summary.transaction_count} transactions
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Regular account summary (savings/current)
  const dateRange = typeof summary.date_range === 'string'
    ? (summary.date_range ? JSON.parse(summary.date_range) : null)
    : summary.date_range;
  
  const totalDebits = parseFloat(summary.total_debits || '0');
  const totalCredits = parseFloat(summary.total_credits || '0');
  const net = parseFloat(summary.net || '0');

  return (
    <div className={clsx("rounded-lg bg-white border border-slate-200 p-6 shadow-sm", className)}>
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
          <Wallet className="w-6 h-6 text-slate-700" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Account Summary</h3>
          <p className="text-sm text-slate-600 capitalize">{summary.account_type} Account</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-700" />
            <p className="text-sm font-medium text-slate-700">Total Debits</p>
          </div>
          <p className="text-2xl font-bold text-red-700">
            {formatCurrency(totalDebits)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-700" />
            <p className="text-sm font-medium text-slate-700">Total Credits</p>
          </div>
          <p className="text-2xl font-bold text-emerald-700">
            {formatCurrency(totalCredits)}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-slate-700" />
            <p className="text-sm font-medium text-slate-700">Net Flow</p>
          </div>
          <p className={clsx(
            "text-2xl font-bold",
            net >= 0 ? "text-emerald-700" : "text-red-700"
          )}>
            {formatCurrency(net)}
          </p>
        </div>
      </div>

      {dateRange && (
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Period</span>
            <span className="text-slate-900 font-medium">
              {formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </span>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Transactions</span>
          <span className="text-slate-900 font-semibold">
            {summary.transaction_count} transactions
          </span>
        </div>
      </div>
    </div>
  );
}
