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
  XCircle
} from 'lucide-react';
import { clsx } from 'clsx';
import { StatementSummaryCard } from '../components/StatementSummaryCard';
import { useStatementSummary, useStatements, useDeleteStatement } from '../queries/statements';
import { useTransactionStats } from '../queries/useTransactions';

function StatementSummaryView({ statementId }: { statementId: number }) {
  const { data: summary, isLoading, error } = useStatementSummary(statementId, true);

  if (isLoading) {
    return (
      <div className="p-4 rounded-lg bg-white border border-slate-200">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Loading summary...</span>
        </div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-4 rounded-lg bg-white border border-slate-200">
        <p className="text-sm text-red-600">Failed to load summary</p>
      </div>
    );
  }

  return <StatementSummaryCard summary={summary} />;
}

export function Dashboard() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [expandedStatementId, setExpandedStatementId] = useState<number | null>(null);

  const { data: stats, isLoading: statsLoading } = useTransactionStats();
  const { data: statementsData, isLoading: statementsLoading } = useStatements({ per_page: 5 });
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
      maximumFractionDigits: 0
    }).format(num);
  };

  const totalDebits = stats ? parseFloat(stats.total_debits) : 0;
  const totalCredits = stats ? parseFloat(stats.total_credits) : 0;
  const netBalance = stats ? parseFloat(stats.net) : 0;

  const statCards = [
    { 
      label: 'Total Expenses', 
      value: formatCurrency(totalDebits), 
      icon: TrendingDown,
      bgColor: 'bg-slate-50',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-700',
      borderColor: 'border-slate-200',
      change: '+4.58%',
      changeColor: 'text-red-600'
    },
    { 
      label: 'Total Income', 
      value: formatCurrency(totalCredits), 
      icon: TrendingUp,
      bgColor: 'bg-slate-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-700',
      borderColor: 'border-slate-200',
      change: '+1.5%',
      changeColor: 'text-emerald-600'
    },
    { 
      label: 'Net Balance', 
      value: formatCurrency(netBalance), 
      icon: IndianRupee,
      bgColor: 'bg-slate-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-700',
      borderColor: 'border-slate-200',
      change: netBalance >= 0 ? 'Positive' : 'Negative',
      changeColor: netBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
    },
    { 
      label: 'Statements', 
      value: statements.length.toString(), 
      icon: FileText,
      bgColor: 'bg-slate-50',
      iconBg: 'bg-slate-200',
      iconColor: 'text-slate-700',
      borderColor: 'border-slate-200',
      subtext: 'Uploaded files'
    },
  ];

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
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Key Metrics - Professional muted cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.label}
            className={clsx(
              "rounded-lg border p-5 bg-white shadow-sm hover:shadow-md transition-shadow",
              stat.borderColor
            )}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={clsx("p-2.5 rounded-lg", stat.iconBg)}>
                <stat.icon className={clsx("w-5 h-5", stat.iconColor)} />
              </div>
              {stat.change && (
                <div className={clsx("text-xs font-medium flex items-center gap-1", stat.changeColor)}>
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-600 mb-1 font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            {stat.subtext && (
              <p className="text-xs text-slate-500 mt-1.5">{stat.subtext}</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent Statements Section */}
      {statements.length > 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Statements</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {statements.length} {statements.length === 1 ? 'statement' : 'statements'} uploaded
                </p>
              </div>
              <a 
                href="/upload" 
                className="inline-flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 font-medium"
              >
                Upload new
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>
          </div>
          
          <div className="divide-y divide-slate-200">
            {statements.map((statement) => {
              const isExpanded = expandedStatementId === statement.id;
              return (
                <div key={statement.id}>
                  <div 
                    className="p-6 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedStatementId((prev) => prev === statement.id ? null : statement.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{statement.original_filename}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-slate-600">
                              {statement.transactions_count} transactions
                            </p>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1 text-sm text-slate-600">
                              <Calendar className="w-3 h-3" />
                              {new Date(statement.created_at).toLocaleDateString('en-IN', { 
                                day: 'numeric', 
                                month: 'short',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
                          getStatusColor(statement.status)
                        )}>
                          {getStatusIcon(statement.status)}
                          {statement.status.charAt(0).toUpperCase() + statement.status.slice(1)}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedStatementId((prev) => prev === statement.id ? null : statement.id);
                          }}
                          className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
                          title={isExpanded ? "Hide summary" : "View summary"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        
                        {showDeleteConfirm === statement.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleDeleteStatement(statement.id)}
                              disabled={deleteStatementMutation.isPending}
                              className="px-3 py-1 text-xs rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50 border border-red-200"
                            >
                              {deleteStatementMutation.isPending ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Confirm'
                              )}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="px-3 py-1 text-xs rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
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
                            className="p-2 rounded-lg text-slate-500 hover:text-red-700 hover:bg-red-50 transition-all"
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
                      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                        <p className="text-sm text-amber-700">
                          Statement status: {statement.status}. Summary available after parsing completes.
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
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No statements yet</h3>
          <p className="text-slate-600 max-w-md mx-auto mb-6">
            Upload your first bank statement to see your expenses categorized and analyzed automatically.
          </p>
          <a 
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Upload Statement
          </a>
        </div>
      )}

      {/* Uncategorized Alert */}
      {stats && stats.uncategorized_count > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <p className="font-semibold text-amber-900">{stats.uncategorized_count} uncategorized transactions</p>
              <p className="text-sm text-amber-700">Review and categorize them for better insights</p>
            </div>
          </div>
          <a 
            href="/transactions"
            className="px-4 py-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium text-sm"
          >
            Review
          </a>
        </div>
      )}
    </div>
  );
}
