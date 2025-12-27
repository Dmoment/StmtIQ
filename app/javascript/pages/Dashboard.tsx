import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  PieChart,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { clsx } from 'clsx';

interface Stats {
  total_transactions: number;
  total_debits: string;
  total_credits: string;
  net: string;
  uncategorized_count: number;
}

interface Statement {
  id: number;
  file_name: string;
  status: string;
  transaction_count: number;
  total_debits: string;
  total_credits: string;
  created_at: string;
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, statementsRes] = await Promise.all([
        fetch('/api/v1/transactions/stats'),
        fetch('/api/v1/statements?per_page=5')
      ]);
      
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (statementsRes.ok) {
        setStatements(await statementsRes.json());
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
  const totalTransactions = stats?.total_transactions || 0;

  const statCards = [
    { 
      label: 'Total Expenses', 
      value: formatCurrency(totalDebits), 
      icon: TrendingDown,
      color: 'from-rose-500 to-orange-500',
      subtext: `${stats?.total_transactions || 0} transactions`
    },
    { 
      label: 'Total Income', 
      value: formatCurrency(totalCredits), 
      icon: TrendingUp,
      color: 'from-emerald-500 to-cyan-500',
      subtext: 'Credits received'
    },
    { 
      label: 'Net Balance', 
      value: formatCurrency(netBalance), 
      icon: IndianRupee,
      color: 'from-violet-500 to-fuchsia-500',
      subtext: netBalance >= 0 ? 'Positive flow' : 'Negative flow',
      isPositive: netBalance >= 0
    },
    { 
      label: 'Statements', 
      value: statements.length.toString(), 
      icon: FileText,
      color: 'from-amber-500 to-yellow-500',
      subtext: 'Uploaded files'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Overview of your financial activity
          </p>
        </div>
        <button 
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div 
            key={stat.label}
            className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 group hover:border-slate-700 transition-colors"
          >
            <div className={clsx(
              "absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity bg-gradient-to-br",
              stat.color
            )} />
            
            <div className="relative">
              <div className={clsx(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4",
                stat.color
              )}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              
              <p className="text-sm text-slate-400 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-slate-500">
                  {stat.subtext}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Statements */}
      {statements.length > 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Statements</h2>
            <a href="/upload" className="text-sm text-emerald-400 hover:text-emerald-300">
              Upload new →
            </a>
          </div>
          
          <div className="space-y-3">
            {statements.map((statement) => (
              <div 
                key={statement.id}
                className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium">{statement.file_name}</p>
                    <p className="text-sm text-slate-500">
                      {statement.transaction_count} transactions • {new Date(statement.created_at).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={clsx(
                    "text-xs px-2 py-1 rounded-full",
                    statement.status === 'parsed' ? "bg-emerald-500/20 text-emerald-400" :
                    statement.status === 'failed' ? "bg-rose-500/20 text-rose-400" :
                    "bg-amber-500/20 text-amber-400"
                  )}>
                    {statement.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <PieChart className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No data yet</h3>
          <p className="text-slate-400 max-w-md mx-auto mb-6">
            Upload your first bank statement to see your expenses categorized and analyzed automatically.
          </p>
          <a 
            href="/upload"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all"
          >
            <FileText className="w-5 h-5" />
            Upload Statement
          </a>
        </div>
      )}

      {/* Uncategorized Alert */}
      {stats && stats.uncategorized_count > 0 && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <PieChart className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-medium text-amber-200">{stats.uncategorized_count} uncategorized transactions</p>
              <p className="text-sm text-amber-400/70">Review and categorize them for better insights</p>
            </div>
          </div>
          <a 
            href="/transactions"
            className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors"
          >
            Review
          </a>
        </div>
      )}
    </div>
  );
}
