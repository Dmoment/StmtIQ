import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Upload,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Link2,
  Unlink,
  Trash2,
  RefreshCw,
  Expand,
  ChevronDown,
  IndianRupee,
  Calendar,
  Building2,
  FileCheck,
  FileX,
  ArrowRight,
  Plus,
  Send,
  Eye,
  Download,
  Copy,
  MoreVertical,
  Mail,
  DollarSign,
  XCircle,
  Inbox,
  SendHorizonal,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  useInvoices,
  useInvoiceStats,
  useUploadInvoice,
  useDeleteInvoice,
  useUnlinkInvoice,
  useRetryInvoiceExtraction,
} from '../queries/useInvoices';
import {
  useSalesInvoices,
  useSalesInvoiceStats,
  useSendInvoice,
  useDuplicateInvoice,
  useDeleteSalesInvoice,
  useCancelInvoice,
} from '../queries/useSalesInvoices';
import type { Invoice, InvoiceStatus, InvoiceStats } from '../types/api';
import { InvoiceUploadModal } from '../components/InvoiceUploadModal';
import { InvoiceMatchingModal } from '../components/InvoiceMatchingModal';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

const statusConfig: Record<
  InvoiceStatus,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  extracted: {
    label: 'Extracted',
    icon: FileCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  unmatched: {
    label: 'Unmatched',
    icon: FileX,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

// Sales invoice status config
const salesStatusConfig: Record<
  string,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
  sent: {
    label: 'Sent',
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  viewed: {
    label: 'Viewed',
    icon: Eye,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
  },
  partially_paid: {
    label: 'Partial',
    icon: DollarSign,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
  },
  overdue: {
    label: 'Overdue',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
  },
};

export function Invoices() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial tab from URL query parameter
  const initialTab = searchParams.get('tab') === 'sent' ? 'sent' : 'received';
  const [activeTab, setActiveTab] = useState<'received' | 'sent'>(initialTab);

  // Update URL when tab changes
  const handleTabChange = (tab: 'received' | 'sent') => {
    setActiveTab(tab);
    if (tab === 'sent') {
      setSearchParams({ tab: 'sent' });
    } else {
      setSearchParams({});
    }
  };
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>(
    'all'
  );
  const [salesStatusFilter, setSalesStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: invoices, isLoading } = useInvoices({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: stats } = useInvoiceStats();
  const deleteInvoiceMutation = useDeleteInvoice();
  const unlinkInvoiceMutation = useUnlinkInvoice();
  const retryExtractionMutation = useRetryInvoiceExtraction();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusDropdown]);

  const formatCurrency = useCallback((amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  }, []);

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const handleOpenInvoice = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  }, []);

  const handleMatchInvoice = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowMatchingModal(true);
  }, []);

  const handleUnlinkInvoice = useCallback(async (invoice: Invoice) => {
    if (
      !confirm(
        'Are you sure you want to unlink this invoice from the transaction?'
      )
    )
      return;
    await unlinkInvoiceMutation.mutateAsync(invoice.id);
  }, [unlinkInvoiceMutation]);

  const handleDeleteInvoice = useCallback(async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    await deleteInvoiceMutation.mutateAsync(invoice.id);
  }, [deleteInvoiceMutation]);

  const handleRetryExtraction = useCallback(async (invoice: Invoice) => {
    await retryExtractionMutation.mutateAsync(invoice.id);
  }, [retryExtractionMutation]);

  // Filter invoices by search query - memoized for performance
  const filteredInvoices = useMemo(() => {
    return (invoices || []).filter((invoice) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        invoice.vendor_name?.toLowerCase().includes(query) ||
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.vendor_gstin?.toLowerCase().includes(query)
      );
    });
  }, [invoices, searchQuery]);

  // Calculate unmatched count for alert banner
  const unmatchedCount = useMemo(() => {
    return (stats?.by_status?.extracted || 0) + (stats?.by_status?.unmatched || 0);
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Tabs */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => handleTabChange('received')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'received'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <Inbox className="w-4 h-4" />
              Received
            </button>
            <button
              onClick={() => handleTabChange('sent')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                activeTab === 'sent'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <SendHorizonal className="w-4 h-4" />
              Sent
            </button>
          </div>
        </div>
        {activeTab === 'received' ? (
          <button
            onClick={() => setShowUploadModal(true)}
            className="h-10 inline-flex items-center gap-2 px-5 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Invoice
          </button>
        ) : (
          <button
            onClick={() => navigate('/invoices/new')}
            className="h-10 inline-flex items-center gap-2 px-5 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        )}
      </div>

      {/* Content based on active tab */}
      {activeTab === 'received' ? (
        <ReceivedInvoicesContent
          invoices={invoices}
          stats={stats}
          isLoading={isLoading}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredInvoices={filteredInvoices}
          unmatchedCount={unmatchedCount}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          handleOpenInvoice={handleOpenInvoice}
          handleMatchInvoice={handleMatchInvoice}
          handleUnlinkInvoice={handleUnlinkInvoice}
          handleDeleteInvoice={handleDeleteInvoice}
          handleRetryExtraction={handleRetryExtraction}
          unlinkInvoiceMutation={unlinkInvoiceMutation}
          deleteInvoiceMutation={deleteInvoiceMutation}
          retryExtractionMutation={retryExtractionMutation}
          showStatusDropdown={showStatusDropdown}
          setShowStatusDropdown={setShowStatusDropdown}
          dropdownRef={dropdownRef}
          setShowUploadModal={setShowUploadModal}
        />
      ) : (
        <SentInvoicesContent
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          salesStatusFilter={salesStatusFilter}
          setSalesStatusFilter={setSalesStatusFilter}
          navigate={navigate}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* Modals */}
      {showUploadModal && (
        <InvoiceUploadModal onClose={() => setShowUploadModal(false)} />
      )}

      {showMatchingModal && selectedInvoice && (
        <InvoiceMatchingModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowMatchingModal(false);
            setSelectedInvoice(null);
          }}
        />
      )}

      {showDetailModal && selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedInvoice(null);
          }}
          onMatch={() => {
            setShowDetailModal(false);
            setShowMatchingModal(true);
          }}
        />
      )}
    </div>
  );
}

// Type definitions for component props
interface ReceivedInvoicesContentProps {
  invoices: Invoice[] | undefined;
  stats: InvoiceStats | undefined;
  isLoading: boolean;
  statusFilter: InvoiceStatus | 'all';
  setStatusFilter: (status: InvoiceStatus | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredInvoices: Invoice[];
  unmatchedCount: number;
  formatCurrency: (amount: string | null) => string;
  formatDate: (dateStr: string | null) => string;
  handleOpenInvoice: (invoice: Invoice) => void;
  handleMatchInvoice: (invoice: Invoice) => void;
  handleUnlinkInvoice: (invoice: Invoice) => Promise<void>;
  handleDeleteInvoice: (invoice: Invoice) => Promise<void>;
  handleRetryExtraction: (invoice: Invoice) => Promise<void>;
  unlinkInvoiceMutation: { isPending: boolean };
  deleteInvoiceMutation: { isPending: boolean };
  retryExtractionMutation: { isPending: boolean };
  showStatusDropdown: boolean;
  setShowStatusDropdown: (show: boolean) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  setShowUploadModal: (show: boolean) => void;
}

// Component for Received Invoices
function ReceivedInvoicesContent({
  invoices,
  stats,
  isLoading,
  statusFilter,
  setStatusFilter,
  searchQuery,
  setSearchQuery,
  filteredInvoices,
  unmatchedCount,
  formatCurrency,
  formatDate,
  handleOpenInvoice,
  handleMatchInvoice,
  handleUnlinkInvoice,
  handleDeleteInvoice,
  handleRetryExtraction,
  unlinkInvoiceMutation,
  deleteInvoiceMutation,
  retryExtractionMutation,
  showStatusDropdown,
  setShowStatusDropdown,
  dropdownRef,
  setShowUploadModal,
}: ReceivedInvoicesContentProps) {
  return (
    <>
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Inbox className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">Received Invoices</h3>
            <p className="text-sm text-blue-700 mt-1">
              These are invoices you've received from vendors and suppliers. Upload invoices from Gmail or files, then match them to your bank transactions for accurate expense tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Total Invoices</p>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">All uploaded</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Matched</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.by_status?.matched || 0}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Linked to transactions</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Needs Matching</p>
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileX className="w-4 h-4 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(stats.by_status?.extracted || 0) +
                (stats.by_status?.unmatched || 0)}
            </p>
            <p className="text-xs text-orange-600 font-medium mt-1">Awaiting match</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Matched Value</p>
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-violet-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatCurrency(stats.matched_amount)}
            </p>
            <p className="text-xs text-violet-600 font-medium mt-1">Total verified</p>
          </div>
        </div>
      )}

      {/* Alert Banner for Unmatched Invoices */}
      {stats && unmatchedCount > 0 && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-orange-50 to-white border border-orange-100 p-6">
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1 max-w-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">
                    {unmatchedCount} invoices need matching
                  </h3>
                  <p className="text-sm text-orange-700/80">
                    Link invoices to transactions for complete expense tracking
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-4 mb-3">
                <div className="flex justify-between text-xs text-orange-800 mb-1.5">
                  <span>{stats.total > 0 ? ((stats.by_status?.matched || 0) / stats.total * 100).toFixed(0) : 0}% matched</span>
                  <span>{stats.by_status?.matched || 0} / {stats.total}</span>
                </div>
                <div className="h-1.5 w-full bg-orange-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.total > 0 ? ((stats.by_status?.matched || 0) / stats.total * 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setStatusFilter('extracted')}
                  className="px-5 py-2.5 bg-amber-200 text-slate-900 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4" />
                    Review Unmatched
                  </span>
                </button>
                <div className="flex items-center gap-2 text-xs font-medium text-orange-800">
                  <div className="h-1.5 w-12 bg-orange-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full"
                      style={{ width: `${stats.total > 0 ? ((stats.by_status?.matched || 0) / stats.total * 100) : 0}%` }}
                    />
                  </div>
                  {stats.total > 0 && ((stats.by_status?.matched || 0) / stats.total * 100) < 30
                    ? 'Priority: High'
                    : ((stats.by_status?.matched || 0) / stats.total * 100) < 70
                      ? 'Priority: Medium'
                      : 'Priority: Low'}
                </div>
              </div>
            </div>

            {/* Decorative Icon */}
            <div className="hidden md:block ml-6">
              <FileText className="w-20 h-20 text-orange-200" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor, invoice number, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            aria-expanded={showStatusDropdown}
            aria-haspopup="listbox"
            aria-label="Filter invoices by status"
            className="h-11 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span className="text-slate-700 text-sm font-medium">
              {statusFilter === 'all'
                ? 'All Status'
                : statusConfig[statusFilter].label}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>

          {showStatusDropdown && (
            <div
              role="listbox"
              aria-label="Status filter options"
              className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden"
            >
              <button
                role="option"
                aria-selected={statusFilter === 'all'}
                onClick={() => {
                  setStatusFilter('all');
                  setShowStatusDropdown(false);
                }}
                className={clsx(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50',
                  statusFilter === 'all' && 'bg-slate-50 font-medium'
                )}
              >
                All Status
              </button>
              {(Object.keys(statusConfig) as InvoiceStatus[]).map((status) => {
                const config = statusConfig[status];
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    role="option"
                    aria-selected={statusFilter === status}
                    onClick={() => {
                      setStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2',
                      statusFilter === status && 'bg-slate-50 font-medium'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', config.color)} aria-hidden="true" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invoice List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-label="Loading invoices">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Loading invoices...</span>
          </div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || statusFilter !== 'all'
              ? 'No invoices found'
              : 'No invoices yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Upload your first invoice to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              aria-label="Upload your first invoice"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors"
            >
              <Upload className="w-4 h-4" aria-hidden="true" />
              Upload Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Invoices table">
              <caption className="sr-only">List of uploaded invoices with their details and actions</caption>
              <thead className="bg-slate-50/50 border-b border-slate-200/80">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-5 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status];
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </p>
                            {invoice.vendor_gstin && (
                              <p className="text-xs text-slate-400 font-mono">
                                {invoice.vendor_gstin}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {invoice.vendor_name || 'Unknown Vendor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {formatDate(invoice.invoice_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border',
                              status.bgColor,
                              status.color,
                              status.borderColor
                            )}
                          >
                            <StatusIcon
                              className={clsx(
                                'w-3.5 h-3.5',
                                invoice.status === 'processing' && 'animate-spin'
                              )}
                            />
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* Open Details */}
                          <button
                            onClick={() => handleOpenInvoice(invoice)}
                            className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
                            title="Open Details"
                            aria-label="Open invoice details"
                          >
                            <Expand className="w-4 h-4" />
                          </button>

                          {/* Match/Unlink */}
                          {invoice.status === 'extracted' ||
                          invoice.status === 'unmatched' ? (
                            <button
                              onClick={() => handleMatchInvoice(invoice)}
                              className="h-9 w-9 rounded-xl hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors flex items-center justify-center"
                              title="Match to Transaction"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                          ) : invoice.status === 'matched' ? (
                            <button
                              onClick={() => handleUnlinkInvoice(invoice)}
                              disabled={unlinkInvoiceMutation.isPending}
                              className="h-9 w-9 rounded-xl hover:bg-orange-50 text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                              title="Unlink from Transaction"
                            >
                              <Unlink className="w-4 h-4" />
                            </button>
                          ) : null}

                          {/* Retry */}
                          {invoice.status === 'failed' && (
                            <button
                              onClick={() => handleRetryExtraction(invoice)}
                              disabled={retryExtractionMutation.isPending}
                              className="h-9 w-9 rounded-xl hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                              title="Retry Extraction"
                            >
                              <RefreshCw
                                className={clsx(
                                  'w-4 h-4',
                                  retryExtractionMutation.isPending &&
                                    'animate-spin'
                                )}
                              />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            disabled={deleteInvoiceMutation.isPending}
                            className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center"
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

// Sales Invoice type for sent invoices tab
interface SalesInvoice {
  id: number;
  invoice_number: string | null;
  client_name: string | null;
  client_email: string | null;
  invoice_date: string | null;
  due_date: string | null;
  total_amount: string | number | null;
  balance_due: number;
  status: string;
  currency?: string;
}

// Sales Invoice Stats type
interface SalesInvoiceStats {
  total: number;
  total_amount: string | number;
  total_paid: string | number;
  total_outstanding: string | number;
  by_status: Record<string, { count: number; amount: string | number }>;
}

// Type definitions for SentInvoicesContent props
interface SentInvoicesContentProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  salesStatusFilter: string;
  setSalesStatusFilter: (status: string) => void;
  navigate: (path: string) => void;
  formatCurrency: (amount: string | null) => string;
  formatDate: (dateStr: string | null) => string;
}

// Component for Sent Invoices (Sales Invoices)
function SentInvoicesContent({
  searchQuery,
  setSearchQuery,
  salesStatusFilter,
  setSalesStatusFilter,
  navigate,
}: SentInvoicesContentProps) {
  const { data: salesInvoicesData, isLoading } = useSalesInvoices({
    status: salesStatusFilter === 'all' ? undefined : salesStatusFilter,
  });
  const { data: salesStats } = useSalesInvoiceStats();
  const sendInvoice = useSendInvoice();
  const duplicateInvoice = useDuplicateInvoice();
  const deleteSalesInvoice = useDeleteSalesInvoice();
  const cancelInvoice = useCancelInvoice();

  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // API returns array directly, not wrapped in { invoices: [...] }
  const salesInvoices: SalesInvoice[] = Array.isArray(salesInvoicesData)
    ? (salesInvoicesData as SalesInvoice[])
    : [];

  // Type the stats data
  const typedSalesStats = salesStats as SalesInvoiceStats | undefined;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    }

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStatusDropdown]);

  // Filter invoices by search query
  const filteredSalesInvoices = useMemo(() => {
    return salesInvoices.filter((invoice: SalesInvoice) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        invoice.client_name?.toLowerCase().includes(query) ||
        invoice.invoice_number?.toLowerCase().includes(query) ||
        invoice.client_email?.toLowerCase().includes(query)
      );
    });
  }, [salesInvoices, searchQuery]);

  const handleSendInvoice = useCallback(async (id: number) => {
    try {
      await sendInvoice.mutateAsync(id);
    } catch (error) {
      console.error('Failed to send invoice:', error);
    }
    setActionMenuId(null);
  }, [sendInvoice]);

  const handleDuplicateInvoice = useCallback(async (id: number) => {
    try {
      await duplicateInvoice.mutateAsync(id);
    } catch (error) {
      console.error('Failed to duplicate invoice:', error);
    }
    setActionMenuId(null);
  }, [duplicateInvoice]);

  const handleDeleteSalesInvoice = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteSalesInvoice.mutateAsync(id);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
    setActionMenuId(null);
  }, [deleteSalesInvoice]);

  const handleCancelInvoice = useCallback(async (id: number) => {
    if (!confirm('Are you sure you want to cancel this invoice?')) return;
    try {
      await cancelInvoice.mutateAsync(id);
    } catch (error) {
      console.error('Failed to cancel invoice:', error);
    }
    setActionMenuId(null);
  }, [cancelInvoice]);

  const formatSalesCurrency = useCallback((amount: string | number | null) => {
    if (amount === null || amount === undefined) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num);
  }, []);

  const formatDate = useCallback((dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  return (
    <>
      {/* Info Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <SendHorizonal className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-medium text-emerald-900">Sent Invoices</h3>
            <p className="text-sm text-emerald-700 mt-1">
              These are invoices you've created and sent to your clients. Track payment status, send reminders, and manage your accounts receivable all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {typedSalesStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Total Invoices</p>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{typedSalesStats.total || 0}</p>
            <p className="text-xs text-slate-500 mt-1">All created</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Paid</p>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {typedSalesStats.by_status?.paid?.count || 0}
            </p>
            <p className="text-xs text-emerald-600 font-medium mt-1">Payment received</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Pending</p>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {(typedSalesStats.by_status?.sent?.count || 0) + (typedSalesStats.by_status?.viewed?.count || 0)}
            </p>
            <p className="text-xs text-amber-600 font-medium mt-1">Awaiting payment</p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-500">Total Revenue</p>
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                <IndianRupee className="w-4 h-4 text-violet-600" aria-hidden="true" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatSalesCurrency(typedSalesStats.total_paid)}
            </p>
            <p className="text-xs text-violet-600 font-medium mt-1">Payments collected</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by client, invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search sent invoices"
            className="w-full h-11 pl-11 pr-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm"
          />
        </div>

        {/* Status Filter */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            aria-expanded={showStatusDropdown}
            aria-haspopup="listbox"
            aria-label="Filter sent invoices by status"
            className="h-11 inline-flex items-center gap-2 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Filter className="w-4 h-4 text-slate-500" aria-hidden="true" />
            <span className="text-slate-700 text-sm font-medium">
              {salesStatusFilter === 'all'
                ? 'All Status'
                : salesStatusConfig[salesStatusFilter]?.label || 'All Status'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </button>

          {showStatusDropdown && (
            <div
              role="listbox"
              aria-label="Status filter options"
              className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden"
            >
              <button
                role="option"
                aria-selected={salesStatusFilter === 'all'}
                onClick={() => {
                  setSalesStatusFilter('all');
                  setShowStatusDropdown(false);
                }}
                className={clsx(
                  'w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50',
                  salesStatusFilter === 'all' && 'bg-slate-50 font-medium'
                )}
              >
                All Status
              </button>
              {Object.entries(salesStatusConfig).map(([status, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    role="option"
                    aria-selected={salesStatusFilter === status}
                    onClick={() => {
                      setSalesStatusFilter(status);
                      setShowStatusDropdown(false);
                    }}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2',
                      salesStatusFilter === status && 'bg-slate-50 font-medium'
                    )}
                  >
                    <Icon className={clsx('w-4 h-4', config.color)} aria-hidden="true" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Invoice List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-label="Loading sent invoices">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" aria-hidden="true" />
            <span className="text-slate-500">Loading invoices...</span>
          </div>
        </div>
      ) : filteredSalesInvoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            {searchQuery || salesStatusFilter !== 'all'
              ? 'No invoices found'
              : 'No invoices yet'}
          </h3>
          <p className="text-slate-500 mb-6">
            {searchQuery || salesStatusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first invoice to get started'}
          </p>
          {!searchQuery && salesStatusFilter === 'all' && (
            <button
              onClick={() => navigate('/invoices/new')}
              aria-label="Create your first invoice"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="w-full" aria-label="Sent invoices table">
              <caption className="sr-only">List of sent invoices with their details and actions</caption>
              <thead className="bg-slate-50/50 border-b border-slate-200/80">
                <tr>
                  <th scope="col" className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th scope="col" className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-5 py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Due
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-5 py-4 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-5 py-4 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSalesInvoices.map((invoice: SalesInvoice) => {
                  const statusKey = invoice.status || 'draft';
                  const status = salesStatusConfig[statusKey] || salesStatusConfig.draft;
                  const StatusIcon = status.icon;

                  return (
                    <tr
                      key={invoice.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center">
                            <FileText className="w-5 h-5 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </p>
                            {invoice.currency && invoice.currency !== 'INR' && (
                              <p className="text-xs text-slate-400">
                                {invoice.currency}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-slate-900 font-medium">
                            {invoice.client_name || 'Unknown Client'}
                          </p>
                          {invoice.client_email && (
                            <p className="text-xs text-slate-500">
                              {invoice.client_email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-slate-700">
                          {formatDate(invoice.invoice_date)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={clsx(
                          'text-sm',
                          statusKey === 'overdue' ? 'text-red-600 font-medium' : 'text-slate-700'
                        )}>
                          {formatDate(invoice.due_date)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <p className="font-semibold text-slate-900">
                          {formatSalesCurrency(invoice.total_amount)}
                        </p>
                        {invoice.balance_due > 0 && invoice.balance_due !== invoice.total_amount && (
                          <p className="text-xs text-amber-600">
                            Due: {formatSalesCurrency(invoice.balance_due)}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center">
                          <span
                            className={clsx(
                              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border',
                              status.bgColor,
                              status.color,
                              status.borderColor
                            )}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1 relative">
                          {/* Edit */}
                          <button
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                            className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
                            title="Edit"
                          >
                            <FileText className="w-4 h-4" />
                          </button>

                          {/* Send (if draft) */}
                          {statusKey === 'draft' && (
                            <button
                              onClick={() => handleSendInvoice(invoice.id)}
                              disabled={sendInvoice.isPending}
                              className="h-9 w-9 rounded-xl hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center disabled:opacity-50"
                              title="Send invoice"
                              aria-label="Send invoice to client"
                            >
                              <Send className="w-4 h-4" aria-hidden="true" />
                            </button>
                          )}

                          {/* More Actions */}
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuId(actionMenuId === invoice.id ? null : invoice.id);
                              }}
                              className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center"
                              title="More actions"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {actionMenuId === invoice.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionMenuId(null);
                                  }}
                                />
                                <div
                                  role="menu"
                                  aria-label="Invoice actions"
                                  className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden"
                                  style={{ position: 'absolute' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Resend (for non-draft invoices) */}
                                  {statusKey !== 'draft' && statusKey !== 'cancelled' && (
                                    <button
                                      role="menuitem"
                                      onClick={() => handleSendInvoice(invoice.id)}
                                      disabled={sendInvoice.isPending}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
                                    >
                                      <Send className="w-4 h-4 text-blue-500" aria-hidden="true" />
                                      Resend
                                    </button>
                                  )}
                                  <button
                                    role="menuitem"
                                    onClick={() => handleDuplicateInvoice(invoice.id)}
                                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                                  >
                                    <Copy className="w-4 h-4 text-slate-500" aria-hidden="true" />
                                    Duplicate
                                  </button>
                                  {statusKey !== 'cancelled' && statusKey !== 'paid' && (
                                    <button
                                      role="menuitem"
                                      onClick={() => handleCancelInvoice(invoice.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-orange-600"
                                    >
                                      <XCircle className="w-4 h-4" aria-hidden="true" />
                                      Cancel
                                    </button>
                                  )}
                                  {statusKey === 'draft' && (
                                    <button
                                      role="menuitem"
                                      onClick={() => handleDeleteSalesInvoice(invoice.id)}
                                      className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
