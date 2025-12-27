import { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download,
  ArrowUpDown,
  ShoppingBag,
  Utensils,
  Car,
  Home,
  Smartphone,
  Briefcase,
  Heart,
  HelpCircle,
  Loader2,
  TrendingUp,
  CreditCard,
  Landmark,
  ArrowRightLeft,
  Wallet,
  Gamepad2,
  RefreshCw,
  Edit2,
  Tag
} from 'lucide-react';
import { clsx } from 'clsx';
import { CategoryPicker } from '../components/CategoryPicker';
import type { Transaction } from '../types/api';

const categoryIcons: Record<string, React.ElementType> = {
  shopping: ShoppingBag,
  food: Utensils,
  transport: Car,
  housing: Home,
  utilities: Smartphone,
  business: Briefcase,
  health: Heart,
  entertainment: Gamepad2,
  transfer: ArrowRightLeft,
  salary: Wallet,
  investment: TrendingUp,
  emi: CreditCard,
  tax: Landmark,
  other: HelpCircle,
};

// Fallback gradient colors for system categories (used when category.color is not set)
const categoryGradients: Record<string, string> = {
  shopping: 'from-pink-500 to-rose-500',
  food: 'from-orange-500 to-amber-500',
  transport: 'from-blue-500 to-cyan-500',
  housing: 'from-violet-500 to-purple-500',
  utilities: 'from-emerald-500 to-teal-500',
  business: 'from-slate-500 to-zinc-500',
  health: 'from-red-500 to-pink-500',
  entertainment: 'from-indigo-500 to-purple-500',
  transfer: 'from-sky-500 to-cyan-500',
  salary: 'from-green-500 to-emerald-500',
  investment: 'from-purple-500 to-fuchsia-500',
  emi: 'from-amber-500 to-yellow-500',
  tax: 'from-zinc-500 to-slate-500',
  other: 'from-gray-500 to-slate-500',
};

export function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Category picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/transactions?per_page=100');
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCategoryClick = (tx: Transaction, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - 400),
      left: Math.min(rect.left, window.innerWidth - 320),
    });
    setSelectedTransaction(tx);
    setPickerOpen(true);
  };

  const handleCategoryUpdate = (updatedTx: Transaction) => {
    setTransactions(prev => 
      prev.map(tx => tx.id === updatedTx.id ? updatedTx : tx)
    );
  };

  const filteredTransactions = transactions.filter(tx => {
    const category = tx.category || tx.ai_category;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!tx.description.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (selectedCategory && category?.slug !== selectedCategory) {
      return false;
    }
    return true;
  });

  const totalDebits = filteredTransactions
    .filter(tx => tx.transaction_type === 'debit')
    .reduce((sum, tx) => sum + Math.abs(parseFloat(tx.amount)), 0);

  const totalCredits = filteredTransactions
    .filter(tx => tx.transaction_type === 'credit')
    .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Get icon for a category
  const getCategoryIcon = (slug: string | undefined) => {
    if (!slug) return HelpCircle;
    return categoryIcons[slug] || Tag;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-slate-400 mt-1">
            {transactions.length} transactions loaded
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchTransactions}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-sm text-slate-400 mb-1">Total Debits</p>
            <p className="text-2xl font-bold text-rose-400">{formatCurrency(totalDebits)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-sm text-slate-400 mb-1">Total Credits</p>
            <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalCredits)}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-sm text-slate-400 mb-1">Net Flow</p>
            <p className={clsx(
              "text-2xl font-bold",
              totalCredits - totalDebits >= 0 ? "text-emerald-400" : "text-rose-400"
            )}>
              {formatCurrency(totalCredits - totalDebits)}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              "px-4 py-2 rounded-lg whitespace-nowrap transition-colors",
              !selectedCategory 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
            )}
          >
            All
          </button>
          {Object.keys(categoryIcons).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={clsx(
                "px-4 py-2 rounded-lg capitalize whitespace-nowrap transition-colors",
                cat === selectedCategory 
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                  : "bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          {error}
        </div>
      )}

      {/* Transactions Table/List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-6">
            <Filter className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
          </h3>
          <p className="text-slate-400 max-w-md mx-auto">
            {transactions.length === 0 
              ? 'Upload a bank statement to see your transactions here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {transactions.length === 0 && (
            <a 
              href="/upload"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all"
            >
              Upload Statement
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-slate-800 text-sm font-medium text-slate-400">
            <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-slate-200">
              Date <ArrowUpDown className="w-4 h-4" />
            </div>
            <div className="col-span-5">Description</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-right">Conf.</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-800">
            {filteredTransactions.map((tx) => {
              const category = tx.category || tx.ai_category;
              const categorySlug = category?.slug || 'other';
              const categoryColor = category?.color;
              const Icon = getCategoryIcon(categorySlug);
              const confidence = tx.confidence ? parseFloat(tx.confidence) : null;
              const amount = parseFloat(tx.amount);
              
              // Use category.color if available, otherwise fall back to gradient
              const hasCustomColor = !!categoryColor;
              const gradientClass = categoryGradients[categorySlug] || categoryGradients.other;
              
              return (
                <div key={tx.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-800/50 transition-colors">
                  <div className="col-span-12 sm:col-span-2 text-sm text-slate-400">
                    <span className="sm:hidden font-medium text-slate-200 mr-2">
                      {tx.transaction_type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                    </span>
                    {new Date(tx.transaction_date).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <p className="font-medium truncate">{tx.description}</p>
                    {tx.raw_description && tx.raw_description !== tx.description && (
                      <p className="text-sm text-slate-500 truncate">{tx.raw_description}</p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-2">
                    {/* Clickable Category Badge */}
                    <button
                      onClick={(e) => handleCategoryClick(tx, e)}
                      className="group inline-flex items-center gap-2 hover:bg-slate-700/50 rounded-lg p-1 -m-1 transition-colors"
                    >
                      {/* Category Icon with color */}
                      {hasCustomColor ? (
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${categoryColor}20` }}
                        >
                          <Icon 
                            className="w-3.5 h-3.5" 
                            style={{ color: categoryColor }} 
                          />
                        </div>
                      ) : (
                        <div className={clsx(
                          "w-6 h-6 rounded-md bg-gradient-to-br flex items-center justify-center",
                          gradientClass
                        )}>
                          <Icon className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}
                      <span 
                        className="text-sm capitalize group-hover:text-slate-100"
                        style={hasCustomColor ? { color: categoryColor } : { color: '#cbd5e1' }}
                      >
                        {category?.name || 'Other'}
                      </span>
                      <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </div>
                  <div className={clsx(
                    "hidden sm:block col-span-2 text-right font-medium",
                    tx.transaction_type === 'credit' ? 'text-emerald-400' : 'text-slate-100'
                  )}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-6 sm:col-span-1 text-right">
                    {confidence !== null && (
                      <span className={clsx(
                        "text-xs px-2 py-1 rounded-full",
                        confidence > 0.8 ? "bg-emerald-500/20 text-emerald-400" :
                        confidence > 0.5 ? "bg-amber-500/20 text-amber-400" :
                        "bg-rose-500/20 text-rose-400"
                      )}>
                        {Math.round(confidence * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Picker Popup */}
      {selectedTransaction && (
        <CategoryPicker
          transaction={selectedTransaction}
          isOpen={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setSelectedTransaction(null);
          }}
          onSuccess={handleCategoryUpdate}
          anchorPosition={pickerPosition}
        />
      )}
    </div>
  );
}
