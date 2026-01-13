import { useState } from 'react';
import {
  RefreshCw,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  X,
  AlertCircle,
  Pause,
  Play,
  Calendar,
  DollarSign,
  Clock,
  User,
  FileText,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { clsx } from 'clsx';
import {
  useRecurringInvoices,
  useCreateRecurringInvoice,
  useUpdateRecurringInvoice,
  useDeleteRecurringInvoice,
  usePauseRecurringInvoice,
  useResumeRecurringInvoice,
  useGenerateInvoice,
} from '../queries/useRecurringInvoices';
import { useClients } from '../queries/useClients';

interface RecurringInvoiceFormData {
  name: string;
  client_id: number | '';
  frequency: string;
  start_date: string;
  end_date: string;
  auto_send: boolean;
  send_days_before_due: number;
  template_data: {
    line_items: Array<{
      description: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    notes: string;
    terms: string;
    currency: string;
    tax_type: string;
    gst_rate: number;
  };
}

const initialFormData: RecurringInvoiceFormData = {
  name: '',
  client_id: '',
  frequency: 'monthly',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  auto_send: false,
  send_days_before_due: 0,
  template_data: {
    line_items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    notes: '',
    terms: '',
    currency: 'INR',
    tax_type: 'none',
    gst_rate: 18,
  },
};

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'biweekly', label: 'Bi-weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Every month' },
  { value: 'quarterly', label: 'Quarterly', description: 'Every 3 months' },
  { value: 'yearly', label: 'Yearly', description: 'Every year' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Active', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  paused: { label: 'Paused', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  completed: { label: 'Completed', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

export function RecurringInvoices() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [formData, setFormData] = useState<RecurringInvoiceFormData>(initialFormData);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState<number | null>(null);

  const { data: recurringInvoicesData, isLoading } = useRecurringInvoices({ status: statusFilter || undefined });
  const { data: clients } = useClients({});
  const createRecurring = useCreateRecurringInvoice();
  const updateRecurring = useUpdateRecurringInvoice();
  const deleteRecurring = useDeleteRecurringInvoice();
  const pauseRecurring = usePauseRecurringInvoice();
  const resumeRecurring = useResumeRecurringInvoice();
  const generateInvoice = useGenerateInvoice();

  const recurringInvoices = (recurringInvoicesData as any)?.recurring_invoices || [];

  const handleOpenModal = (invoice?: any) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        name: invoice.name || '',
        client_id: invoice.client_id || '',
        frequency: invoice.frequency || 'monthly',
        start_date: invoice.start_date || new Date().toISOString().split('T')[0],
        end_date: invoice.end_date || '',
        auto_send: invoice.auto_send || false,
        send_days_before_due: invoice.send_days_before_due || 0,
        template_data: invoice.template_data || initialFormData.template_data,
      });
    } else {
      setEditingInvoice(null);
      setFormData(initialFormData);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingInvoice(null);
    setFormData(initialFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        client_id: formData.client_id || undefined,
      };
      if (editingInvoice) {
        await updateRecurring.mutateAsync({ id: editingInvoice.id, ...data });
      } else {
        await createRecurring.mutateAsync(data as any);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Error saving recurring invoice:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRecurring.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting recurring invoice:', error);
    }
  };

  const handlePause = async (id: number) => {
    try {
      await pauseRecurring.mutateAsync(id);
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error pausing recurring invoice:', error);
    }
  };

  const handleResume = async (id: number) => {
    try {
      await resumeRecurring.mutateAsync(id);
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error resuming recurring invoice:', error);
    }
  };

  const handleGenerateNow = async (id: number) => {
    try {
      await generateInvoice.mutateAsync(id);
      setShowActionsMenu(null);
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const items = [...formData.template_data.line_items];
    items[index] = { ...items[index], [field]: value };
    if (field === 'quantity' || field === 'rate') {
      items[index].amount = items[index].quantity * items[index].rate;
    }
    setFormData({
      ...formData,
      template_data: { ...formData.template_data, line_items: items },
    });
  };

  const addLineItem = () => {
    setFormData({
      ...formData,
      template_data: {
        ...formData.template_data,
        line_items: [...formData.template_data.line_items, { description: '', quantity: 1, rate: 0, amount: 0 }],
      },
    });
  };

  const removeLineItem = (index: number) => {
    const items = formData.template_data.line_items.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      template_data: { ...formData.template_data, line_items: items.length ? items : [{ description: '', quantity: 1, rate: 0, amount: 0 }] },
    });
  };

  const calculateTotal = () => {
    const subtotal = formData.template_data.line_items.reduce((sum, item) => sum + item.amount, 0);
    let tax = 0;
    if (formData.template_data.tax_type !== 'none') {
      tax = subtotal * (formData.template_data.gst_rate / 100);
    }
    return { subtotal, tax, total: subtotal + tax };
  };

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  };

  const getFrequencyLabel = (frequency: string) => {
    return FREQUENCY_OPTIONS.find(f => f.value === frequency)?.label || frequency;
  };

  const filteredInvoices = recurringInvoices.filter((inv: any) =>
    inv.name?.toLowerCase().includes(search.toLowerCase()) ||
    inv.client?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Automate your invoicing with scheduled recurring invoices</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Recurring Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <RefreshCw className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No recurring invoices</h3>
            <p className="text-sm text-slate-500 mb-4">Set up your first recurring invoice schedule</p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Schedule
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInvoices.map((invoice: any) => {
              const status = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.active;
              const totals = invoice.template_data ?
                invoice.template_data.line_items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0
                : 0;

              return (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center text-white flex-shrink-0">
                      <RefreshCw className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900">{invoice.name}</h3>
                        <span className={clsx('text-xs px-2 py-0.5 rounded-lg font-medium', status.bgColor, status.color)}>
                          {status.label}
                        </span>
                        {invoice.auto_send && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg font-medium flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Auto-send
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                        {invoice.client && (
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5" />
                            {invoice.client.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {getFrequencyLabel(invoice.frequency)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Next: {invoice.next_run_date ? new Date(invoice.next_run_date).toLocaleDateString() : 'N/A'}
                        </span>
                        {totals > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {formatCurrency(totals, invoice.template_data?.currency || 'INR')}
                          </span>
                        )}
                        {invoice.invoice_count > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText className="w-3.5 h-3.5" />
                            {invoice.invoice_count} invoices generated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 relative">
                    <button
                      onClick={() => handleOpenModal(invoice)}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4 text-slate-500" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowActionsMenu(showActionsMenu === invoice.id ? null : invoice.id)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      </button>
                      {showActionsMenu === invoice.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-1 w-48 z-10">
                          {invoice.status === 'active' ? (
                            <button
                              onClick={() => handlePause(invoice.id)}
                              disabled={pauseRecurring.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Pause className="w-4 h-4" />
                              Pause Schedule
                            </button>
                          ) : invoice.status === 'paused' ? (
                            <button
                              onClick={() => handleResume(invoice.id)}
                              disabled={resumeRecurring.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Play className="w-4 h-4" />
                              Resume Schedule
                            </button>
                          ) : null}
                          {invoice.status !== 'completed' && (
                            <button
                              onClick={() => handleGenerateNow(invoice.id)}
                              disabled={generateInvoice.isPending}
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              <Zap className="w-4 h-4" />
                              Generate Now
                            </button>
                          )}
                          <hr className="my-1 border-slate-100" />
                          <button
                            onClick={() => {
                              setShowActionsMenu(null);
                              setShowDeleteConfirm(invoice.id);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === invoice.id && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900">Delete Schedule</h3>
                            <p className="text-sm text-slate-500">This action cannot be undone</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-6">
                          Are you sure you want to delete <strong>{invoice.name}</strong>? This will stop all future invoice generation.
                        </p>
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(invoice.id)}
                            disabled={deleteRecurring.isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            {deleteRecurring.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Click outside to close actions menu */}
      {showActionsMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowActionsMenu(null)} />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingInvoice ? 'Edit Recurring Invoice' : 'New Recurring Invoice'}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  {editingInvoice ? 'Update schedule settings' : 'Set up automatic invoice generation'}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Schedule Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Monthly Retainer"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Client <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value ? Number(e.target.value) : '' })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select a client</option>
                    {((clients as any) || []).map((client: any) => (
                      <option key={client.id} value={client.id}>
                        {client.display_name || client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Schedule Settings */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Schedule Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Frequency
                    </label>
                    <select
                      value={formData.frequency}
                      onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                      {FREQUENCY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      End Date <span className="text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Auto-send Settings */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="auto_send"
                    checked={formData.auto_send}
                    onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div>
                    <label htmlFor="auto_send" className="text-sm font-medium text-slate-900 cursor-pointer">
                      Auto-send invoices
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Automatically send invoices to the client when generated
                    </p>
                    {formData.auto_send && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-sm text-slate-600">Send</span>
                        <input
                          type="number"
                          value={formData.send_days_before_due}
                          onChange={(e) => setFormData({ ...formData, send_days_before_due: parseInt(e.target.value) || 0 })}
                          min="0"
                          max="30"
                          className="w-16 px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-center"
                        />
                        <span className="text-sm text-slate-600">days before due date</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Invoice Template */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">Invoice Template</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
                    <select
                      value={formData.template_data.currency}
                      onChange={(e) => setFormData({
                        ...formData,
                        template_data: { ...formData.template_data, currency: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Tax Type</label>
                    <select
                      value={formData.template_data.tax_type}
                      onChange={(e) => setFormData({
                        ...formData,
                        template_data: { ...formData.template_data, tax_type: e.target.value }
                      })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
                    >
                      <option value="none">No Tax</option>
                      <option value="gst">GST (CGST + SGST)</option>
                      <option value="igst">IGST</option>
                    </select>
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">Line Items</label>
                  {formData.template_data.line_items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                        className="w-20 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-center"
                      />
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                        min="0"
                        step="0.01"
                        className="w-28 px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm text-right"
                      />
                      <div className="w-28 px-3 py-2 bg-slate-50 rounded-lg text-sm text-right font-medium text-slate-700">
                        {formatCurrency(item.amount, formData.template_data.currency)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Line Item
                  </button>
                </div>

                {/* Totals */}
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-medium text-slate-900">{formatCurrency(calculateTotal().subtotal, formData.template_data.currency)}</span>
                    </div>
                    {formData.template_data.tax_type !== 'none' && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {formData.template_data.tax_type === 'gst' ? `GST (${formData.template_data.gst_rate}%)` : `IGST (${formData.template_data.gst_rate}%)`}
                        </span>
                        <span className="font-medium text-slate-900">{formatCurrency(calculateTotal().tax, formData.template_data.currency)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-bold text-slate-900">{formatCurrency(calculateTotal().total, formData.template_data.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                  <textarea
                    value={formData.template_data.notes}
                    onChange={(e) => setFormData({
                      ...formData,
                      template_data: { ...formData.template_data, notes: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Notes to appear on invoice..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Terms & Conditions</label>
                  <textarea
                    value={formData.template_data.terms}
                    onChange={(e) => setFormData({
                      ...formData,
                      template_data: { ...formData.template_data, terms: e.target.value }
                    })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                    rows={3}
                    placeholder="Payment terms and conditions..."
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRecurring.isPending || updateRecurring.isPending}
                  className="px-6 py-2.5 text-sm font-medium text-slate-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {(createRecurring.isPending || updateRecurring.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {editingInvoice ? 'Update Schedule' : 'Create Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
