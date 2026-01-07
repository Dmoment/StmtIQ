import React, { useState, useCallback } from 'react';
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
  Eye,
  X,
  ChevronDown,
  IndianRupee,
  Calendar,
  Building2,
  FileCheck,
  FileX,
  ArrowRight
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  useInvoices,
  useInvoiceStats,
  useUploadInvoice,
  useDeleteInvoice,
  useUnlinkInvoice,
  useRetryInvoiceExtraction
} from '../queries/useInvoices';
import type { Invoice, InvoiceStatus } from '../types/api';
import { InvoiceUploadModal } from '../components/InvoiceUploadModal';
import { InvoiceMatchingModal } from '../components/InvoiceMatchingModal';
import { InvoiceDetailModal } from '../components/InvoiceDetailModal';

const statusConfig: Record<InvoiceStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50'
  },
  processing: {
    label: 'Processing',
    icon: Loader2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  extracted: {
    label: 'Extracted',
    icon: FileCheck,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50'
  },
  matched: {
    label: 'Matched',
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  unmatched: {
    label: 'Unmatched',
    icon: FileX,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  failed: {
    label: 'Failed',
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
};

export function Invoices() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMatchingModal, setShowMatchingModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const { data: invoices, isLoading } = useInvoices({
    status: statusFilter === 'all' ? undefined : statusFilter,
  });
  const { data: stats } = useInvoiceStats();
  const deleteInvoiceMutation = useDeleteInvoice();
  const unlinkInvoiceMutation = useUnlinkInvoice();
  const retryExtractionMutation = useRetryInvoiceExtraction();

  const formatCurrency = (amount: string | null) => {
    if (!amount) return '-';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleMatchInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowMatchingModal(true);
  };

  const handleUnlinkInvoice = async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to unlink this invoice from the transaction?')) return;
    await unlinkInvoiceMutation.mutateAsync(invoice.id);
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    await deleteInvoiceMutation.mutateAsync(invoice.id);
  };

  const handleRetryExtraction = async (invoice: Invoice) => {
    await retryExtractionMutation.mutateAsync(invoice.id);
  };

  // Filter invoices by search query
  const filteredInvoices = (invoices || []).filter(invoice => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      invoice.vendor_name?.toLowerCase().includes(query) ||
      invoice.invoice_number?.toLowerCase().includes(query) ||
      invoice.vendor_gstin?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Invoices</h1>
          <p className="text-slate-600 text-sm">
            Upload invoices and match them to your transactions
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload Invoice
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-600">Total Invoices</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">
                  {stats.by_status?.matched || 0}
                </p>
                <p className="text-sm text-slate-600">Matched</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <FileX className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {(stats.by_status?.extracted || 0) + (stats.by_status?.unmatched || 0)}
                </p>
                <p className="text-sm text-slate-600">Needs Matching</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-600">
                  {formatCurrency(stats.matched_amount)}
                </p>
                <p className="text-sm text-slate-600">Matched Value</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by vendor, invoice number, or GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <button
            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-slate-700">
              {statusFilter === 'all' ? 'All Status' : statusConfig[statusFilter].label}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>

          {showStatusDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-lg shadow-xl z-10">
              <button
                onClick={() => { setStatusFilter('all'); setShowStatusDropdown(false); }}
                className={clsx(
                  "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 first:rounded-t-lg",
                  statusFilter === 'all' && "bg-slate-50 font-medium"
                )}
              >
                All Status
              </button>
              {(Object.keys(statusConfig) as InvoiceStatus[]).map(status => {
                const config = statusConfig[status];
                const Icon = config.icon;
                return (
                  <button
                    key={status}
                    onClick={() => { setStatusFilter(status); setShowStatusDropdown(false); }}
                    className={clsx(
                      "w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-2 last:rounded-b-lg",
                      statusFilter === status && "bg-slate-50 font-medium"
                    )}
                  >
                    <Icon className={clsx("w-4 h-4", config.color)} />
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
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            {searchQuery || statusFilter !== 'all' ? 'No invoices found' : 'No invoices yet'}
          </h3>
          <p className="text-slate-600 mb-6">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Upload your first invoice to get started'}
          </p>
          {!searchQuery && statusFilter === 'all' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(invoice => {
                  const status = statusConfig[invoice.status];
                  const StatusIcon = status.icon;

                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            status.bgColor
                          )}>
                            <FileText className={clsx("w-5 h-5", status.color)} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {invoice.invoice_number || `INV-${invoice.id}`}
                            </p>
                            {invoice.vendor_gstin && (
                              <p className="text-xs text-slate-500 font-mono">
                                {invoice.vendor_gstin}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {invoice.vendor_name || 'Unknown Vendor'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-700">
                            {formatDate(invoice.invoice_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(invoice.total_amount)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={clsx(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            status.bgColor,
                            status.color
                          )}>
                            <StatusIcon className={clsx(
                              "w-3.5 h-3.5",
                              invoice.status === 'processing' && "animate-spin"
                            )} />
                            {status.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          {/* View */}
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Match/Unlink */}
                          {invoice.status === 'extracted' || invoice.status === 'unmatched' ? (
                            <button
                              onClick={() => handleMatchInvoice(invoice)}
                              className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 transition-colors"
                              title="Match to Transaction"
                            >
                              <Link2 className="w-4 h-4" />
                            </button>
                          ) : invoice.status === 'matched' ? (
                            <button
                              onClick={() => handleUnlinkInvoice(invoice)}
                              disabled={unlinkInvoiceMutation.isPending}
                              className="p-2 rounded-lg hover:bg-orange-50 text-orange-600 hover:text-orange-700 transition-colors disabled:opacity-50"
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
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
                              title="Retry Extraction"
                            >
                              <RefreshCw className={clsx(
                                "w-4 h-4",
                                retryExtractionMutation.isPending && "animate-spin"
                              )} />
                            </button>
                          )}

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteInvoice(invoice)}
                            disabled={deleteInvoiceMutation.isPending}
                            className="p-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
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
