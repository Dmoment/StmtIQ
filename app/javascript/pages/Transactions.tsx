import { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Play,
  FileText,
  Link2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { CategoryPicker } from '../components/CategoryPicker';
import { TransactionStats } from '../components/TransactionStats';
import { InvoiceBadge } from '../components/InvoiceBadge';
import { TransactionLinkInvoiceModal } from '../components/TransactionLinkInvoiceModal';
import {
  useTransactions,
  useTransactionStats,
  useCategorizationProgress,
  useCategorizeTransactions,
} from '../queries/useTransactions';
import type { SortField, SortDirection } from '../queries/useTransactions';
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

  // Sorting state
  const [sortBy, setSortBy] = useState<SortField>('transaction_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  // Invoice linking state
  const [transactionToLink, setTransactionToLink] = useState<Transaction | null>(null);

  const {
    data: transactions = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useTransactions({
    page: currentPage,
    per_page: perPage,
    uncategorized: showOnlyUncategorized,
    sort_by: sortBy,
    sort_direction: sortDirection,
    search: searchQuery || undefined,
    category_slug: selectedCategory || undefined,
  });

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      // New field, default to desc for date/amount, asc for description
      setSortBy(field);
      setSortDirection(field === 'description' ? 'asc' : 'desc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  // Get sort icon for a column
  const getSortIcon = (field: SortField) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-slate-900" />
    ) : (
      <ArrowDown className="w-4 h-4 text-slate-900" />
    );
  };
  const { data: detailedStats, isLoading: statsLoading } =
    useTransactionStats(true);

  // Categorization progress
  const { data: categorizationProgress } = useCategorizationProgress();
  const categorizeMutation = useCategorizeTransactions();

  const handleStartCategorization = () => {
    categorizeMutation.mutate({ limit: 500 });
  };

  const hasUncategorized =
    categorizationProgress &&
    categorizationProgress.total - categorizationProgress.categorized > 0;
  const isCategorizationRunning =
    categorizationProgress?.in_progress || categorizeMutation.isPending;

  const error = queryError
    ? queryError instanceof Error
      ? queryError.message
      : 'Failed to load transactions'
    : null;

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

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const getCategoryIcon = (slug: string | undefined) => {
    if (!slug) return HelpCircle;
    return categoryIcons[slug] || Tag;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 mb-1">
            {transactions.length} transactions loaded
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="h-10 w-10 sm:w-auto sm:px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* AI Categorization Progress */}
      {categorizationProgress && transactions.length > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-white border border-orange-100 p-6">
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">
                    AI Categorization
                  </h3>
                  <p className="text-sm text-orange-700/80">
                    Automatically categorize your transactions
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 mb-3">
                <div className="flex justify-between text-xs text-orange-800 mb-1.5">
                  <span>{categorizationProgress.progress_percent.toFixed(0)}% complete</span>
                  <span>{categorizationProgress.categorized} / {categorizationProgress.total}</span>
                </div>
                <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className={clsx(
                      'h-full rounded-full transition-all duration-500',
                      isCategorizationRunning
                        ? 'bg-orange-500 animate-pulse'
                        : 'bg-orange-500'
                    )}
                    style={{ width: `${categorizationProgress.progress_percent}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                {hasUncategorized && !isCategorizationRunning && (
                  <button
                    onClick={handleStartCategorization}
                    className="px-5 py-2.5 bg-amber-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Start Categorization
                    </span>
                  </button>
                )}
                {isCategorizationRunning && (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-100 text-amber-700 rounded-xl text-sm font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs font-medium text-orange-800">
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{categorizationProgress.categorized} done</span>
                  </div>
                  {categorizationProgress.total - categorizationProgress.categorized > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                      <span>{categorizationProgress.total - categorizationProgress.categorized} pending</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decorative Icon */}
            <div className="hidden md:block ml-6">
              <Brain className="w-20 h-20 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Transaction Statistics */}
      {transactions.length > 0 && detailedStats && (
        <TransactionStats stats={detailedStats} isLoading={statsLoading} />
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button
            onClick={() => handleCategorySelect(null)}
            className={clsx(
              'h-11 px-4 rounded-xl whitespace-nowrap transition-colors border text-sm font-medium',
              !selectedCategory
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            )}
          >
            All
          </button>
          {Object.keys(categoryIcons).map((cat) => (
            <button
              key={cat}
              onClick={() =>
                handleCategorySelect(cat === selectedCategory ? null : cat)
              }
              className={clsx(
                'h-11 px-4 rounded-xl capitalize whitespace-nowrap transition-colors border text-sm font-medium',
                cat === selectedCategory
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          {error}
        </div>
      )}

      {/* Transactions Table/List */}
      {transactions.length === 0 ? (
        <div className="rounded-xl bg-white border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">
            {transactions.length === 0
              ? 'No transactions yet'
              : 'No matching transactions'}
          </h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {transactions.length === 0
              ? 'Upload a bank statement to see your transactions here.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {transactions.length === 0 && (
            <a
              href="/upload"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors"
            >
              Upload Statement
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-sm">
          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-12 gap-4 p-4 border-b border-slate-200/80 text-sm font-medium text-slate-500 bg-slate-50/50">
            <button
              type="button"
              onClick={() => handleSort('transaction_date')}
              className={clsx(
                'col-span-2 flex items-center gap-1.5 hover:text-slate-900 transition-colors text-left',
                sortBy === 'transaction_date' && 'text-slate-900'
              )}
              aria-label={`Sort by date ${sortBy === 'transaction_date' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
            >
              Date {getSortIcon('transaction_date')}
            </button>
            <button
              type="button"
              onClick={() => handleSort('description')}
              className={clsx(
                'col-span-4 flex items-center gap-1.5 hover:text-slate-900 transition-colors text-left',
                sortBy === 'description' && 'text-slate-900'
              )}
              aria-label={`Sort by description ${sortBy === 'description' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
            >
              Description {getSortIcon('description')}
            </button>
            <div className="col-span-3">Category</div>
            <button
              type="button"
              onClick={() => handleSort('amount')}
              className={clsx(
                'col-span-2 flex items-center justify-end gap-1.5 hover:text-slate-900 transition-colors text-right',
                sortBy === 'amount' && 'text-slate-900'
              )}
              aria-label={`Sort by amount ${sortBy === 'amount' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : ''}`}
            >
              Amount {getSortIcon('amount')}
            </button>
            <div className="col-span-1 text-right">Conf.</div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-slate-100">
            {transactions.map((tx) => {
              const category = tx.category || tx.ai_category;
              const categorySlug = category?.slug || 'other';
              const categoryColor = category?.color;
              const Icon = getCategoryIcon(categorySlug);
              const confidence = tx.confidence ? parseFloat(tx.confidence) : null;
              const amount = parseFloat(tx.amount);

              const colorInfo = getCategoryColorWithCustom(
                categorySlug,
                categoryColor
              );
              const colorScheme = colorInfo;

              const hasInvoice = !!tx.invoice;

              return (
                <div
                  key={tx.id}
                  className={clsx(
                    'grid grid-cols-12 gap-4 p-4 items-center transition-colors relative group',
                    hasInvoice
                      ? 'bg-gradient-to-r from-emerald-50/50 to-transparent hover:from-emerald-50 border-l-2 border-l-emerald-400'
                      : 'hover:bg-slate-50/50'
                  )}
                >
                  <div className="col-span-12 sm:col-span-2 text-sm text-slate-500">
                    <span className="sm:hidden font-semibold text-slate-900 mr-2">
                      {tx.transaction_type === 'credit' ? '+' : '-'}₹
                      {amount.toLocaleString('en-IN')}
                    </span>
                    {new Date(tx.transaction_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: '2-digit',
                    })}
                  </div>
                  <div className="col-span-12 sm:col-span-4">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate flex-1">
                        {tx.description}
                      </p>
                      {tx.invoice && <InvoiceBadge invoice={tx.invoice} />}
                      {!tx.invoice && tx.transaction_type === 'debit' && (
                        <button
                          onClick={() => setTransactionToLink(tx)}
                          className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 text-xs font-medium hover:bg-amber-200 transition-all"
                          title="Link an invoice to this transaction"
                        >
                          <FileText className="w-3 h-3" />
                          <Link2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {tx.ai_explanation && (
                      <p
                        className="text-xs text-slate-400 truncate mt-0.5"
                        title={tx.ai_explanation}
                      >
                        {tx.ai_explanation}
                      </p>
                    )}
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <button
                      onClick={(e) => handleCategoryClick(tx, e)}
                      className="group/cat inline-flex items-center gap-1.5 hover:bg-slate-100 rounded-xl p-1.5 -m-1.5 transition-colors"
                    >
                      {colorInfo.hasCustomColor && colorInfo.customColor ? (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            backgroundColor: `${colorInfo.customColor}20`,
                          }}
                        >
                          <Icon
                            className="w-4 h-4"
                            style={{ color: colorInfo.customColor }}
                          />
                        </div>
                      ) : (
                        <div
                          className={clsx(
                            'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            colorScheme.bg
                          )}
                        >
                          <Icon
                            className={clsx('w-4 h-4', colorScheme.text)}
                          />
                        </div>
                      )}
                      <div className="flex flex-col items-start min-w-0 overflow-visible">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-sm font-medium capitalize group-hover/cat:text-slate-900"
                            style={
                              colorInfo.hasCustomColor && colorInfo.customColor
                                ? { color: colorInfo.customColor }
                                : {}
                            }
                          >
                            {category?.name || 'Other'}
                          </span>
                          {tx.subcategory && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-100 text-xs text-slate-600 font-medium">
                              {tx.subcategory.name}
                            </span>
                          )}
                        </div>
                        {tx.counterparty_name &&
                          tx.tx_kind?.startsWith('transfer') && (
                            <span className="text-xs text-slate-400 truncate mt-0.5">
                              → {tx.counterparty_name}
                            </span>
                          )}
                      </div>
                      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/cat:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  </div>
                  <div
                    className={clsx(
                      'hidden sm:block col-span-2 text-right font-semibold',
                      tx.transaction_type === 'credit'
                        ? 'text-emerald-600'
                        : 'text-slate-900'
                    )}
                  >
                    {tx.transaction_type === 'credit' ? '+' : '-'}₹
                    {amount.toLocaleString('en-IN')}
                  </div>
                  <div className="col-span-6 sm:col-span-1 text-right">
                    {confidence !== null && (
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={clsx(
                            'text-xs px-2 py-1 rounded-lg font-medium',
                            confidence > 0.8
                              ? 'bg-emerald-100 text-emerald-700'
                              : confidence > 0.5
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          )}
                        >
                          {Math.round(confidence * 100)}%
                        </span>
                        {tx.metadata?.categorization_method && (
                          <span className="text-xs text-slate-400 capitalize">
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500">
              Showing {(currentPage - 1) * perPage + 1} -{' '}
              {(currentPage - 1) * perPage + transactions.length} transactions
            </span>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">Per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-9 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              title="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              title="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="h-9 px-4 text-sm font-medium text-slate-700 bg-slate-50 rounded-xl border border-slate-200 flex items-center">
              Page {currentPage}
            </span>

            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={transactions.length < perPage}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
              title="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setCurrentPage((p) => p + 10);
              }}
              disabled={transactions.length < perPage}
              className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
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

      {/* Invoice Linking Modal */}
      {transactionToLink && (
        <TransactionLinkInvoiceModal
          transaction={transactionToLink}
          onClose={() => setTransactionToLink(null)}
        />
      )}
    </div>
  );
}
