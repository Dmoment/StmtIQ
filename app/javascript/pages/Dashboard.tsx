import { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  FileText,
  PieChart,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Sparkles,
  AlertCircle,
  Info,
  MoreHorizontal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { StatementSummaryCard } from '../components/StatementSummaryCard';
import {
  useStatementSummary,
  useStatements,
  useDeleteStatement,
} from '../queries/statements';
import { useTransactionStats } from '../queries/useTransactions';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  infoTooltip?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  infoTooltip,
  action,
  children,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {trend && (
            <div
              className={clsx(
                'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg',
                trend.isPositive
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}%
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        {infoTooltip && (
          <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
        )}
      </div>

      <p className="text-2xl font-bold text-slate-900 mb-1">{value}</p>

      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}

      {children}
    </div>
  );
}

function StatementSummaryView({ statementId }: { statementId: number }) {
  const { data: summary, isLoading, error } = useStatementSummary(statementId, true);

  if (isLoading) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading summary...</span>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-4 rounded-xl bg-red-50 border border-red-200">
        <p className="text-sm text-red-600">Failed to load summary</p>
      </div>
    );
  }

  return <StatementSummaryCard summary={summary} />;
}

export function Dashboard() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(
    null
  );
  const [expandedStatementId, setExpandedStatementId] = useState<number | null>(
    null
  );

  const { data: stats, isLoading: statsLoading } = useTransactionStats();
  const { data: statementsData, isLoading: statementsLoading } = useStatements({
    per_page: 5,
  });
  const deleteStatementMutation = useDeleteStatement();

  const statements = statementsData || [];
  const loading = statsLoading || statementsLoading;

  const handleDeleteStatement = async (id: number) => {
    try {
      await deleteStatementMutation.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting statement:', err);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const totalDebits = stats ? parseFloat(stats.total_debits) : 0;
  const totalCredits = stats ? parseFloat(stats.total_credits) : 0;
  const netBalance = stats ? parseFloat(stats.net) : 0;
  const budgetUsed = totalCredits > 0 ? (totalDebits / totalCredits) * 100 : 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'parsed':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'parsed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'failed':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Total Spending"
          value={formatCurrency(totalDebits)}
          subtitle="This period"
          icon={<Wallet className="h-5 w-5" />}
          trend={{ value: 12, isPositive: false, label: 'vs last month' }}
          infoTooltip="Total operational expenses for current month"
        />

        <MetricCard
          title="Remaining Budget"
          value={formatCurrency(totalCredits - totalDebits)}
          subtitle={netBalance >= 0 ? 'Healthy' : 'Over budget'}
          icon={<Sparkles className="h-5 w-5" />}
          action={
            <span
              className={clsx(
                'text-xs font-medium px-2 py-1 rounded-lg',
                netBalance >= 0
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-red-50 text-red-600'
              )}
            >
              {netBalance >= 0 ? 'Healthy' : 'Alert'}
            </span>
          }
        >
          <div className="mt-3 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Used: {Math.min(budgetUsed, 100).toFixed(0)}%</span>
              <span>Total: {formatCurrency(totalCredits)}</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all',
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                )}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              ></div>
            </div>
          </div>
        </MetricCard>

        <MetricCard
          title="Statements"
          value={statements.length.toString()}
          subtitle="Uploaded files"
          icon={<FileText className="h-5 w-5" />}
        >
          <div className="mt-3 flex -space-x-2">
            {statements.slice(0, 3).map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600"
              >
                {String.fromCharCode(65 + i)}
              </div>
            ))}
            {statements.length > 3 && (
              <div className="h-8 px-2 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500">
                +{statements.length - 3}
              </div>
            )}
          </div>
        </MetricCard>
      </div>

      {/* Alert Banner */}
      {stats && stats.uncategorized_count > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-white border border-orange-100 p-6 flex items-center justify-between">
          <div className="relative z-10 max-w-xl">
            <h3 className="text-base font-semibold text-orange-900 mb-1">
              {stats.uncategorized_count} uncategorized transactions
            </h3>
            <p className="text-sm text-orange-700/80 mb-4">
              Review and categorize them for better insights into your spending
              patterns.
            </p>
            <div className="flex items-center gap-4">
              <a
                href="/app/transactions"
                className="px-5 py-2.5 bg-amber-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors"
              >
                Review Now
              </a>
              <div className="flex items-center gap-2 text-xs font-medium text-orange-800">
                <div className="h-1.5 w-12 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-orange-500 rounded-full"></div>
                </div>
                Priority: Medium
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <PieChart className="w-20 h-20 text-orange-200" />
          </div>
        </div>
      )}

      {/* Recent Statements Section */}
      {statements.length > 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Statements</h3>
              <p className="text-sm text-slate-500">
                {statements.length}{' '}
                {statements.length === 1 ? 'statement' : 'statements'} uploaded
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
              <a
                href="/app/upload"
                className="px-5 py-2.5 bg-amber-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors"
              >
                Upload New
              </a>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {statements.map((statement) => {
              const isExpanded = expandedStatementId === statement.id;
              return (
                <div key={statement.id}>
                  <div
                    className="p-6 hover:bg-slate-50/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpandedStatementId((prev) =>
                        prev === statement.id ? null : statement.id
                      )
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">
                            {statement.original_filename}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-500">
                              {statement.transactions_count} transactions
                            </p>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1 text-sm text-slate-500">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(statement.created_at).toLocaleDateString(
                                'en-IN',
                                {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border',
                            getStatusColor(statement.status)
                          )}
                        >
                          {getStatusIcon(statement.status)}
                          {statement.status.charAt(0).toUpperCase() +
                            statement.status.slice(1)}
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStatementId((prev) =>
                              prev === statement.id ? null : statement.id
                            );
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                          title={isExpanded ? 'Hide summary' : 'View summary'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>

                        {showDeleteConfirm === statement.id ? (
                          <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => handleDeleteStatement(statement.id)}
                              disabled={deleteStatementMutation.isPending}
                              className="px-4 py-2 text-sm rounded-xl bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
                            >
                              {deleteStatementMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Confirm'
                              )}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-4 py-2 text-sm rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowDeleteConfirm(statement.id);
                            }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Delete statement"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Statement Summary Card */}
                  {isExpanded && statement.status === 'parsed' && (
                    <div className="px-6 pb-6">
                      <StatementSummaryView statementId={statement.id} />
                    </div>
                  )}
                  {isExpanded && statement.status !== 'parsed' && (
                    <div className="px-6 pb-6">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-700">
                          Statement status: {statement.status}. Summary
                          available after parsing completes.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            No statements yet
          </h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Upload your first bank statement to see your expenses categorized and
            analyzed automatically.
          </p>
          <a
            href="/app/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Upload Statement
          </a>
        </div>
      )}
    </div>
  );
}
