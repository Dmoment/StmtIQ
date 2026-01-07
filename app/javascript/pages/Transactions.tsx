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
  Tag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Brain,
  CheckCircle2,
  AlertCircle,
  Play
} from 'lucide-react';
import { clsx } from 'clsx';
import { CategoryPicker } from '../components/CategoryPicker';
import { TransactionStats } from '../components/TransactionStats';
import { useTransactions, useTransactionStats, useCategorizationProgress, useCategorizeTransactions } from '../queries/useTransactions';
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

import { getCategoryColorWithCustom } from '../lib/theme';

export function Transactions() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [showOnlyUncategorized, setShowOnlyUncategorized] = useState(false);
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const { data: transactions = [], isLoading: loading, error: queryError, refetch, isRefetching } = useTransactions({ 
    page: currentPage, 
    per_page: perPage,
    uncategorized: showOnlyUncategorized
  });
  const { data: detailedStats, isLoading: statsLoading } = useTransactionStats(true);

  // Categorization progress
  const { data: categorizationProgress } = useCategorizationProgress();
  const categorizeMutation = useCategorizeTransactions();

  const handleStartCategorization = () => {
    categorizeMutation.mutate({ limit: 500 });
  };

  const hasUncategorized = categorizationProgress &&
    (categorizationProgress.total - categorizationProgress.categorized) > 0;
  const isCategorizationRunning = categorizationProgress?.in_progress ||
    categorizeMutation.isPending;
  


  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load transactions') : null;

  const handleCategoryClick = (tx: Transaction, event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPosition({
      top: Math.min(rect.bottom + 8, window.innerHeight - 400),
      left: Math.min(rect.left, window.innerWidth - 320),
    });
    setSelectedTransaction(tx);
    setPickerOpen(true);
  };

  const handleCategoryUpdate = () => {
    refetch();
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

  const getCategoryIcon = (slug: string | undefined) => {
    if (!slug) return HelpCircle;
    return categoryIcons[slug] || Tag;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Transactions</h1>
          <p className="text-slate-600 text-sm">
            {transactions.length} transactions loaded
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* AI Categorization Progress */}
      {categorizationProgress && transactions.length > 0 && (
        <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-900">AI Categorization</span>
            </div>
            {hasUncategorized && !isCategorizationRunning && (
              <button
                onClick={handleStartCategorization}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Play className="w-4 h-4" />
                Categorize
              </button>
            )}
            {isCategorizationRunning && (
              <div className="flex items-center gap-2 text-indigo-600 text-sm font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
            <div
              className={clsx(
                "absolute top-0 left-0 h-full rounded-full transition-all duration-500",
                isCategorizationRunning ? "bg-indigo-500 animate-pulse" : "bg-indigo-600"
              )}
              style={{ width: `${categorizationProgress.progress_percent}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-slate-700">
                  <span className="font-semibold text-emerald-700">{categorizationProgress.categorized}</span>
                  <span className="text-slate-500"> categorized</span>
                </span>
              </div>
              {categorizationProgress.processing > 0 && (
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-slate-700">
                    <span className="font-semibold text-indigo-600">{categorizationProgress.processing}</span>
                    <span className="text-slate-500"> processing</span>
                  </span>
                </div>
              )}
              {(categorizationProgress.total - categorizationProgress.categorized) > 0 && (
                <div className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-slate-700">
                    <span className="font-semibold text-amber-600">
                      {categorizationProgress.total - categorizationProgress.categorized}
                    </span>
                    <span className="text-slate-500"> uncategorized</span>
                  </span>
                </div>
              )}
            </div>
            <span className="font-semibold text-slate-700">
              {categorizationProgress.progress_percent.toFixed(1)}%
            </span>
          </div>

          {/* Categorization method breakdown hint */}
          {categorizationProgress.categorized > 0 && !isCategorizationRunning && (
            <p className="mt-2 text-xs text-slate-500">
              Categorized using: Rules (instant) + Embeddings (similarity) + LLM (AI)
            </p>
          )}
        </div>
      )}

      {/* Transaction Statistics */}
      {transactions.length > 0 && detailedStats && (
        <TransactionStats stats={detailedStats} isLoading={statsLoading} />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 shadow-sm"
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => setSelectedCategory(null)}
            className={clsx(
              "px-4 py-2 rounded-lg whitespace-nowrap transition-colors border text-sm font-medium",
              !selectedCategory 
                ? "bg-slate-800 text-white border-slate-800" 
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            All
          </button>
          {Object.keys(categoryIcons).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              className={clsx(
                "px-4 py-2 rounded-lg capitalize whitespace-nowrap transition-colors border text-sm font-medium",
                cat === selectedCategory 
                  ? "bg-slate-800 text-white border-slate-800" 
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Transactions Table/List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-lg bg-white border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-6">
            <Filter className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {transactions.length === 0 ? 'No transactions yet' : 'No matching transactions'}
          </h3>
          <p className="text-slate-600 max-w-md mx-auto">
            {transactions.length === 0 
              ? 'Upload a bank statement to see your transactions here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {transactions.length === 0 && (
            <a 
              href="/upload"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors shadow-sm"
            >
              Upload Statement
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-lg bg-white border border-slate-200 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-slate-200 text-sm font-semibold text-slate-600 bg-slate-50">
            <div className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-slate-900">
              Date <ArrowUpDown className="w-4 h-4" />
            </div>
            <div className="col-span-4">Description</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-1 text-right">Conf.</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-200">
            {filteredTransactions.map((tx) => {
              const category = tx.category || tx.ai_category;
              const categorySlug = category?.slug || 'other';
              const categoryColor = category?.color;
              const Icon = getCategoryIcon(categorySlug);
              const confidence = tx.confidence ? parseFloat(tx.confidence) : null;
              const amount = parseFloat(tx.amount);
              
              const colorInfo = getCategoryColorWithCustom(categorySlug, categoryColor);
              const colorScheme = colorInfo;
              
              return (
                <div key={tx.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-50 transition-colors">
                  <div className="col-span-12 sm:col-span-2 text-sm text-slate-600">
                    <span className="sm:hidden font-medium text-slate-900 mr-2">
                      {tx.transaction_type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                    </span>
                    {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit'
                    })}
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <p className="font-medium text-slate-900 truncate">{tx.description}</p>
                    {tx.ai_explanation && (
                      <p className="text-xs text-slate-400 truncate mt-0.5" title={tx.ai_explanation}>
                        {tx.ai_explanation}
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <button
                      onClick={(e) => handleCategoryClick(tx, e)}
                      className="group inline-flex items-center gap-1.5 hover:bg-slate-100 rounded-lg p-1 -m-1 transition-colors"
                    >
                      {colorInfo.hasCustomColor && colorInfo.customColor ? (
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${colorInfo.customColor}20` }}
                        >
                          <Icon
                            className="w-3.5 h-3.5"
                            style={{ color: colorInfo.customColor }}
                          />
                        </div>
                      ) : (
                        <div className={clsx(
                          "w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0",
                          colorScheme.bg
                        )}>
                          <Icon
                            className={clsx("w-3.5 h-3.5", colorScheme.text)}
                          />
                        </div>
                      )}
                      <div className="flex flex-col items-start min-w-0 overflow-visible">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-sm font-medium capitalize group-hover:text-slate-900"
                            style={colorInfo.hasCustomColor && colorInfo.customColor ? { color: colorInfo.customColor } : {}}
                          >
                            {category?.name || 'Other'}
                          </span>
                          {tx.subcategory && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-xs text-slate-600 font-medium">
                              {tx.subcategory.name}
                            </span>
                          )}
                        </div>
                        {tx.counterparty_name && tx.tx_kind?.startsWith('transfer') && (
                          <span className="text-xs text-slate-400 truncate mt-0.5">
                            → {tx.counterparty_name}
                          </span>
                        )}
                      </div>
                      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  </div>
                  <div className={clsx(
                    "hidden sm:block col-span-2 text-right font-semibold",
                    tx.transaction_type === 'credit' ? 'text-emerald-700' : 'text-slate-900'
                  )}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}₹{amount.toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-6 sm:col-span-1 text-right">
                    {confidence !== null && (
                      <div className="flex flex-col items-end gap-1">
                        <span className={clsx(
                          "text-xs px-2 py-1 rounded-full font-medium",
                          confidence > 0.8 ? "bg-emerald-100 text-emerald-700" :
                          confidence > 0.5 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        )}>
                          {Math.round(confidence * 100)}%
                        </span>
                        {tx.metadata?.categorization_method && (
                          <span className="text-xs text-slate-500 capitalize">
                            {tx.metadata.categorization_method}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && transactions.length > 0 && (
        <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-600">
              Showing {((currentPage - 1) * perPage) + 1} - {((currentPage - 1) * perPage) + transactions.length} transactions
            </span>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-300 shadow-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
              Page {currentPage}
            </span>
            
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={transactions.length < perPage}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => {
                // Calculate last page - would need total count from API
                setCurrentPage(p => p + 10); // Placeholder
              }}
              disabled={transactions.length < perPage}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              title="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
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
