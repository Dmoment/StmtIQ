import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  Calendar,
  Clock,
  X,
  Percent,
  Image,
  Settings,
  ChevronDown,
  ChevronUp,
  Upload,
  RefreshCw,
  Palette,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useClients } from '../queries/useClients';
import {
  useCreateSalesInvoice,
  useUpdateSalesInvoice,
  useSalesInvoice,
  useNextInvoiceNumber,
  useSendInvoice,
} from '../queries/useSalesInvoices';
import { useBusinessProfile } from '../queries/useBusinessProfile';
import { useExchangeRate } from '../queries/useExchangeRates';
import { ConfigureTaxModal, TaxConfig } from '../components/invoice/ConfigureTaxModal';
import { BilledByCard } from '../components/invoice/BilledByCard';
import { BilledToCard } from '../components/invoice/BilledToCard';
import { TotalsSection } from '../components/invoice/TotalsSection';
import { FooterActions } from '../components/invoice/FooterActions';
import { InvoicePreviewModal } from '../components/invoice/InvoicePreviewModal';
import { LineItem, Client, BusinessProfile, InvoiceCalculations } from '../types/invoice';

// Indian state codes for GST
const INDIAN_STATES = [
  { code: '01', name: 'Jammu & Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '26', name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '31', name: 'Lakshadweep' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '34', name: 'Puducherry' },
  { code: '35', name: 'Andaman & Nicobar Islands' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
  { code: '38', name: 'Ladakh' },
];

const GST_RATES = [0, 5, 12, 18, 28];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

const UNITS = ['hrs', 'days', 'units', 'pcs', 'qty', 'months', 'years'];

export function CreateInvoice() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  // Queries
  const { data: clientsData, isLoading: clientsLoading } = useClients({ per_page: 100 });
  const { data: businessProfile, isLoading: profileLoading } = useBusinessProfile();
  const { data: nextNumberData } = useNextInvoiceNumber();
  const { data: existingInvoice, isLoading: invoiceLoading } = useSalesInvoice(
    isEditing ? parseInt(id) : 0
  );

  // Mutations
  const createInvoice = useCreateSalesInvoice();
  const updateInvoice = useUpdateSalesInvoice();
  const sendInvoice = useSendInvoice();

  // Form state
  const [invoiceTitle, setInvoiceTitle] = useState('Tax Invoice');
  const [invoiceSubtitle, setInvoiceSubtitle] = useState('');
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState<'INR' | 'USD' | 'EUR' | 'GBP'>('INR');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', hsn_sac_code: '', quantity: 1, unit: 'qty', rate: 0, gst_rate: 18 },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
  const [extraCharges, setExtraCharges] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

  // Tax configuration
  const [taxConfig, setTaxConfig] = useState<TaxConfig>({
    taxType: 'gst_india',
    placeOfSupply: '',
    gstType: 'igst',
    cessRate: 0,
    isReverseCharge: false,
  });
  const [showTaxModal, setShowTaxModal] = useState(false);

  // Additional info
  const [additionalFields, setAdditionalFields] = useState<{ label: string; value: string }[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Color customization
  const [primaryColor, setPrimaryColor] = useState('#f59e0b');
  const [accentColor, setAccentColor] = useState('#d97706');

  // Preview modal
  const [showPreview, setShowPreview] = useState(false);

  const profile = businessProfile as any;
  const invoiceNumber = (nextNumberData as any)?.next_number || 'INV-001';
  const currencyConfig = CURRENCIES.find((c) => c.code === currency);

  // Get exchange rate if not INR
  const { data: exchangeRateData } = useExchangeRate(
    currency !== 'INR' ? currency : '',
    currency !== 'INR' ? 'INR' : ''
  );

  // Set default due date based on payment terms
  useEffect(() => {
    if (businessProfile && invoiceDate && !isEditing) {
      const date = new Date(invoiceDate);
      const days = profile?.default_payment_terms_days || 30;
      date.setDate(date.getDate() + days);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [invoiceDate, businessProfile, isEditing]);

  // Load defaults from business profile
  useEffect(() => {
    if (businessProfile && !isEditing) {
      setNotes(profile?.default_notes || '');
      setTerms(profile?.default_terms || '');
      if (profile?.state_code) {
        setTaxConfig((prev) => ({ ...prev, placeOfSupply: profile.state_code }));
      }
      // Add default additional fields
      if (profile?.gstin) {
        setAdditionalFields([{ label: 'GST Number', value: profile.gstin }]);
      }
    }
  }, [businessProfile, isEditing]);

  // Load existing invoice data
  useEffect(() => {
    if (existingInvoice && isEditing) {
      const invoice = existingInvoice as any;
      if (invoice.client) {
        setSelectedClient(invoice.client);
      }
      setInvoiceDate(invoice.invoice_date || '');
      setDueDate(invoice.due_date || '');
      setCurrency(invoice.currency || 'INR');
      setDiscountAmount(parseFloat(invoice.discount_amount) || 0);
      setDiscountType(invoice.discount_type || 'fixed');
      setNotes(invoice.notes || '');
      setTerms(invoice.terms || '');
      if (invoice.line_items?.length > 0) {
        setLineItems(
          invoice.line_items.map((item: any) => ({
            id: item.id,
            description: item.description || '',
            hsn_sac_code: item.hsn_sac_code || '',
            quantity: parseFloat(item.quantity) || 1,
            unit: item.unit || 'qty',
            rate: parseFloat(item.rate) || 0,
            gst_rate: item.gst_rate || 18,
          }))
        );
      }
      // Set tax config from invoice
      setTaxConfig({
        taxType: invoice.tax_type === 'none' ? 'none' : 'gst_india',
        placeOfSupply: invoice.place_of_supply || '',
        gstType: invoice.igst_rate ? 'igst' : 'cgst_sgst',
        cessRate: invoice.cess_rate || 0,
        isReverseCharge: invoice.is_reverse_charge || false,
      });
    }
  }, [existingInvoice, isEditing]);

  // Auto-detect GST type based on states
  useEffect(() => {
    if (selectedClient && businessProfile) {
      const sellerState = profile?.state_code;
      const buyerState = selectedClient.billing_state_code;
      if (sellerState && buyerState) {
        setTaxConfig((prev) => ({
          ...prev,
          placeOfSupply: buyerState,
          gstType: sellerState === buyerState ? 'cgst_sgst' : 'igst',
        }));
      }
    }
  }, [selectedClient, businessProfile]);

  // Calculate totals
  const calculations = useMemo(() => {
    const validItems = lineItems.filter((item) => !item._destroy);

    // Calculate per-item amounts
    const itemCalculations = validItems.map((item) => {
      const amount = item.quantity * item.rate;
      let taxAmount = 0;
      if (taxConfig.taxType === 'gst_india') {
        taxAmount = (amount * item.gst_rate) / 100;
      }
      return {
        amount,
        taxAmount,
        total: amount + taxAmount,
      };
    });

    const subtotal = itemCalculations.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = itemCalculations.reduce((sum, item) => sum + item.taxAmount, 0);

    let discount = 0;
    if (discountType === 'percentage') {
      discount = (subtotal * discountAmount) / 100;
    } else {
      discount = discountAmount;
    }

    const taxableAmount = subtotal - discount + extraCharges;

    // Split tax for display
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (taxConfig.taxType === 'gst_india') {
      if (taxConfig.gstType === 'cgst_sgst') {
        cgstAmount = totalTax / 2;
        sgstAmount = totalTax / 2;
      } else {
        igstAmount = totalTax;
      }
    }

    const cessAmount = taxConfig.cessRate > 0 ? (taxableAmount * taxConfig.cessRate) / 100 : 0;
    const total = taxableAmount + totalTax + cessAmount;

    let totalInINR = total;
    if (currency !== 'INR' && exchangeRateData) {
      totalInINR = total * ((exchangeRateData as any).rate || 1);
    }

    return {
      subtotal,
      discount,
      taxableAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      cessAmount,
      totalTax,
      total,
      totalInINR,
      itemCalculations,
    };
  }, [lineItems, discountAmount, discountType, extraCharges, taxConfig, currency, exchangeRateData]);

  // Handlers
  const handleAddLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      { description: '', hsn_sac_code: '', quantity: 1, unit: 'qty', rate: 0, gst_rate: 18 },
    ]);
  }, []);

  const handleRemoveLineItem = useCallback((index: number) => {
    setLineItems((prev) => {
      const item = prev[index];
      if (item.id) {
        return prev.map((it, i) => (i === index ? { ...it, _destroy: true } : it));
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleLineItemChange = useCallback(
    (index: number, field: keyof LineItem, value: string | number | boolean) => {
      setLineItems((prev) =>
        prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
      );
    },
    []
  );

  const handleAddAdditionalField = () => {
    setAdditionalFields((prev) => [...prev, { label: '', value: '' }]);
  };

  const handleRemoveAdditionalField = (index: number) => {
    setAdditionalFields((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClient) {
      newErrors.client = 'Please select a client';
    }

    if (!invoiceDate) {
      newErrors.invoiceDate = 'Invoice date is required';
    }

    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    }

    const validLineItems = lineItems.filter((item) => !item._destroy);
    if (validLineItems.length === 0) {
      newErrors.lineItems = 'At least one line item is required';
    }

    const hasEmptyDescription = validLineItems.some((item) => !item.description.trim());
    if (hasEmptyDescription) {
      newErrors.lineItems = 'All line items must have a description';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (send = false) => {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const invoiceData = {
        client_id: selectedClient!.id,
        invoice_date: invoiceDate,
        due_date: dueDate,
        currency,
        exchange_rate: currency !== 'INR' ? (exchangeRateData as any)?.rate : undefined,
        exchange_rate_date: currency !== 'INR' ? new Date().toISOString().split('T')[0] : undefined,
        discount_amount: discountAmount,
        discount_type: discountType,
        tax_type: taxConfig.taxType === 'none' ? 'none' : taxConfig.gstType,
        place_of_supply: taxConfig.placeOfSupply,
        cess_rate: taxConfig.cessRate,
        is_reverse_charge: taxConfig.isReverseCharge,
        notes,
        terms,
        line_items: lineItems.map((item) => ({
          id: item.id,
          _destroy: item._destroy,
          description: item.description,
          hsn_sac_code: item.hsn_sac_code || undefined,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          gst_rate: item.gst_rate,
        })),
      };

      let result;
      if (isEditing) {
        result = await updateInvoice.mutateAsync({
          id: parseInt(id),
          ...invoiceData,
        });
      } else {
        result = await createInvoice.mutateAsync(invoiceData);
      }

      const invoiceId = (result as any).id || parseInt(id);

      if (send && invoiceId) {
        await sendInvoice.mutateAsync(invoiceId);
      }

      navigate('/invoices');
    } catch (error) {
      console.error('Failed to save invoice:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isLoading = clientsLoading || profileLoading || (isEditing && invoiceLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="text-slate-500">Loading...</span>
        </div>
      </div>
    );
  }

  // Get average GST rate for display
  const avgGstRate = lineItems.length > 0
    ? lineItems.filter((i) => !i._destroy).reduce((sum, i) => sum + i.gst_rate, 0) /
      lineItems.filter((i) => !i._destroy).length
    : 18;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/invoices')}
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Create New Invoice</h1>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
              <span className="flex items-center gap-1">
                <span
                  className="w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}
                >
                  1
                </span>
                Add Invoice Details
              </span>
              <span className="text-slate-300">{'>'}</span>
              <span className="text-slate-400">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs font-medium inline-flex items-center justify-center mr-1">
                  2
                </span>
                Design & Share (optional)
              </span>
            </div>
          </div>
        </div>

        {/* Preview Button */}
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-colors hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          <Eye className="w-4 h-4" />
          Preview Invoice
        </button>
      </div>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <ul className="list-disc list-inside text-sm text-red-600">
            {Object.values(errors).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Invoice Title Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Editable Title */}
              <div className="flex items-center gap-2 mb-1">
                <input
                  type="text"
                  value={invoiceTitle}
                  onChange={(e) => setInvoiceTitle(e.target.value)}
                  className="text-2xl font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                  placeholder="Tax Invoice"
                />
                <Pencil className="w-4 h-4 text-slate-400" />
              </div>
              {/* Subtitle */}
              {showSubtitle ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={invoiceSubtitle}
                    onChange={(e) => setInvoiceSubtitle(e.target.value)}
                    placeholder="Add subtitle"
                    className="text-sm text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSubtitle(false);
                      setInvoiceSubtitle('');
                    }}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSubtitle(true)}
                  className="text-sm flex items-center gap-1 hover:opacity-80"
                  style={{ color: accentColor }}
                >
                  <Plus className="w-3 h-3" />
                  Add Subtitle
                </button>
              )}
            </div>

            {/* Add Business Logo */}
            <div className="ml-6">
              <div className="w-32 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-amber-300 hover:bg-amber-50 transition-colors cursor-pointer">
                <Upload className="w-6 h-6 mb-1" />
                <span className="text-xs text-center px-2">Add Business Logo</span>
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Details Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-6">
            {/* Invoice Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice No<span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={isEditing ? (existingInvoice as any)?.invoice_number : invoiceNumber}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
              />
              {!isEditing && (
                <p className="text-xs text-slate-500 mt-1">
                  Last No: {invoiceNumber} ({formatDate(new Date().toISOString().split('T')[0])})
                </p>
              )}
            </div>

            {/* Empty space for alignment */}
            <div></div>

            {/* Invoice Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice Date<span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                />
                <button className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors" title="Set reminder">
                  <Clock className="w-5 h-5 text-slate-500" />
                </button>
                {dueDate && (
                  <button
                    onClick={() => setDueDate('')}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                    title="Clear due date"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Add Custom Fields */}
          <button
            className="mt-4 text-sm flex items-center gap-1 hover:opacity-80"
            style={{ color: accentColor }}
          >
            <Plus className="w-3 h-3" />
            Add Custom Fields
          </button>
        </div>

        {/* Billed By / Billed To Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="grid grid-cols-2 gap-6">
            <BilledByCard
              profile={profile}
              onEdit={() => navigate('/settings/business')}
            />
            <BilledToCard
              selectedClient={selectedClient}
              onSelect={setSelectedClient}
              onEdit={(client) => navigate(`/clients/${client.id}/edit`)}
            />
          </div>

          {/* Add Shipping Details */}
          <label className="mt-4 flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm text-slate-600">Add Shipping Details</span>
          </label>
        </div>

        {/* Options Bar */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Currency*</span>

            {/* Configure GST Button */}
            <button
              onClick={() => setShowTaxModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Percent className="w-4 h-4 text-slate-500" />
              Configure GST
            </button>

            {/* Currency Selector */}
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.symbol})
                </option>
              ))}
            </select>

            {/* Number Format */}
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              <span className="font-mono">123</span>
              Number and Currency Format
            </button>

            {/* Color Picker */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white">
              <Palette className="w-4 h-4 text-slate-500" />
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-xs text-slate-500">Primary</span>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <span className="text-xs text-slate-500">Accent</span>
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-slate-200"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="p-6 border-b border-slate-100">
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div
              className="border-b"
              style={{
                backgroundColor: `${primaryColor}20`,
                borderColor: `${primaryColor}40`,
              }}
            >
              <div
                className="flex items-center px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                style={{ color: accentColor }}
              >
                <div className="flex-[3] min-w-[200px]">Item</div>
                <div className="w-20 text-center">HSN/SAC</div>
                <div className="w-16 text-center">GST %</div>
                <div className="w-24 text-center">Quantity</div>
                <div className="w-24 text-right">Rate</div>
                <div className="w-24 text-right">Amount</div>
                <div className="w-20 text-right">
                  {taxConfig.gstType === 'igst' ? 'IGST' : 'Tax'}
                </div>
                <div className="w-24 text-right">Total</div>
                <div className="w-8"></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-slate-100">
              {lineItems
                .filter((item) => !item._destroy)
                .map((item, displayIndex) => {
                  const actualIndex = lineItems.findIndex((li) => li === item);
                  const calc = calculations.itemCalculations[displayIndex] || {
                    amount: 0,
                    taxAmount: 0,
                    total: 0,
                  };

                  return (
                    <div key={actualIndex} className="group">
                      {/* Main Row */}
                      <div className="flex items-center px-4 py-3 hover:bg-slate-50 transition-colors">
                        {/* Item Number + Description */}
                        <div className="flex-[3] min-w-[200px]">
                          <div className="flex items-start gap-2">
                            <span className="text-sm font-medium text-slate-500 mt-2">
                              {displayIndex + 1}.
                            </span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) =>
                                  handleLineItemChange(actualIndex, 'description', e.target.value)
                                }
                                placeholder="Name/SKU Id (Required)"
                                className="w-full px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        {/* HSN/SAC */}
                        <div className="w-20">
                          <input
                            type="text"
                            value={item.hsn_sac_code}
                            onChange={(e) =>
                              handleLineItemChange(actualIndex, 'hsn_sac_code', e.target.value)
                            }
                            placeholder="—"
                            className="w-full px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-center"
                          />
                        </div>

                        {/* GST Rate */}
                        <div className="w-16">
                          <select
                            value={item.gst_rate}
                            onChange={(e) =>
                              handleLineItemChange(actualIndex, 'gst_rate', parseInt(e.target.value))
                            }
                            className="w-full px-1 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-center bg-transparent"
                          >
                            {GST_RATES.map((rate) => (
                              <option key={rate} value={rate}>
                                {rate}%
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Quantity */}
                        <div className="w-24">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleLineItemChange(
                                  actualIndex,
                                  'quantity',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-12 px-1 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-center"
                              min="0"
                              step="0.5"
                            />
                            <select
                              value={item.unit}
                              onChange={(e) =>
                                handleLineItemChange(actualIndex, 'unit', e.target.value)
                              }
                              className="w-12 text-xs text-slate-500 bg-transparent border-none focus:outline-none cursor-pointer"
                            >
                              {UNITS.map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Rate */}
                        <div className="w-24">
                          <div className="flex items-center justify-end">
                            <span className="text-sm text-slate-400 mr-1">
                              {currencyConfig?.symbol}
                            </span>
                            <input
                              type="number"
                              value={item.rate || ''}
                              onChange={(e) =>
                                handleLineItemChange(
                                  actualIndex,
                                  'rate',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="0"
                              className="w-16 px-2 py-1.5 rounded border border-transparent hover:border-slate-200 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm text-right"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="w-24 text-right text-sm text-slate-700">
                          {currencyConfig?.symbol}
                          {calc.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Tax */}
                        <div className="w-20 text-right text-sm text-slate-700">
                          {currencyConfig?.symbol}
                          {calc.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Total */}
                        <div className="w-24 text-right text-sm font-medium text-slate-900">
                          {currencyConfig?.symbol}
                          {calc.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>

                        {/* Actions */}
                        <div className="w-8 flex items-center justify-end">
                          <button
                            onClick={() => handleRemoveLineItem(actualIndex)}
                            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Row Options */}
                      <div className="px-4 pb-3 pl-10 flex items-center gap-4">
                        <button
                          onClick={() =>
                            handleLineItemChange(actualIndex, 'showDescription', !item.showDescription)
                          }
                          className="text-xs text-slate-500 hover:text-amber-600 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Description
                        </button>
                        <button className="text-xs text-slate-500 hover:text-amber-600 flex items-center gap-1">
                          <Image className="w-3 h-3" />
                          Add Image
                        </button>
                      </div>

                      {/* Expanded Description */}
                      {item.showDescription && (
                        <div className="px-4 pb-3 pl-10">
                          <textarea
                            placeholder="Add detailed description..."
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Add Buttons */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAddLineItem}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: `${primaryColor}60`,
                color: accentColor,
                backgroundColor: `${primaryColor}08`,
              }}
            >
              <Plus className="w-4 h-4" />
              Add New Line
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl text-sm font-medium transition-colors hover:opacity-80"
              style={{
                borderColor: `${primaryColor}60`,
                color: accentColor,
                backgroundColor: `${primaryColor}08`,
              }}
            >
              <Plus className="w-4 h-4" />
              Add New Group
            </button>
          </div>
        </div>

        {/* Totals Section */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex justify-end">
            <div className="w-80">
              <TotalsSection
                subtotal={calculations.subtotal}
                discount={calculations.discount}
                discountAmount={discountAmount}
                discountType={discountType}
                onDiscountChange={(amount, type) => {
                  setDiscountAmount(amount);
                  setDiscountType(type);
                }}
                taxType={taxConfig.taxType === 'none' ? 'none' : taxConfig.gstType}
                gstRate={avgGstRate}
                cgstAmount={calculations.cgstAmount}
                sgstAmount={calculations.sgstAmount}
                igstAmount={calculations.igstAmount}
                cessAmount={calculations.cessAmount}
                total={calculations.total}
                currency={currency}
                currencySymbol={currencyConfig?.symbol || '₹'}
                extraCharges={extraCharges}
                onExtraChargesChange={setExtraCharges}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-b border-slate-100">
          <FooterActions
            terms={terms}
            onTermsChange={setTerms}
            notes={notes}
            onNotesChange={setNotes}
          />
        </div>

        {/* Additional Info Section */}
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Additional Info</h3>

          <div className="space-y-3">
            {additionalFields.map((field, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => {
                    const newFields = [...additionalFields];
                    newFields[index].label = e.target.value;
                    setAdditionalFields(newFields);
                  }}
                  placeholder="Label"
                  className="w-32 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => {
                    const newFields = [...additionalFields];
                    newFields[index].value = e.target.value;
                    setAdditionalFields(newFields);
                  }}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  onClick={() => handleRemoveAdditionalField(index)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddAdditionalField}
            className="mt-3 text-sm flex items-center gap-1 hover:opacity-80"
            style={{ color: accentColor }}
          >
            <Plus className="w-3 h-3" />
            Add Custom Fields
          </button>
        </div>

        {/* Recurring Invoice Option */}
        <div className="p-6 border-b border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-amber-500 focus:ring-amber-500"
            />
            <div>
              <span className="text-sm font-medium text-slate-900">
                This is a Recurring invoice
              </span>
              <p className="text-xs text-slate-500 mt-0.5">
                A draft invoice will be created with the same details every next period.
              </p>
            </div>
          </label>
        </div>

        {/* Advanced Options */}
        <div className="p-6">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            {showAdvancedOptions ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            Advanced options
          </button>

          {showAdvancedOptions && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Select HSN column view
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>Default</option>
                    <option>Detailed</option>
                    <option>Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Display unit as
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>Merge with quantity</option>
                    <option>Separate column</option>
                    <option>Hidden</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-600 mb-1">
                    Show tax summary in invoice
                  </label>
                  <select className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option>Do not show</option>
                    <option>Show at bottom</option>
                    <option>Show per item</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Hide place/country of supply
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Show HSN summary in invoice
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  Show description in full width
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className="px-8 py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save & Continue'
          )}
        </button>
      </div>

      {/* Configure Tax Modal */}
      <ConfigureTaxModal
        isOpen={showTaxModal}
        onClose={() => setShowTaxModal(false)}
        config={taxConfig}
        onSave={setTaxConfig}
        businessStateCode={profile?.state_code}
      />

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        invoiceTitle={invoiceTitle}
        invoiceSubtitle={invoiceSubtitle}
        invoiceNumber={isEditing ? (existingInvoice as any)?.invoice_number : invoiceNumber}
        invoiceDate={invoiceDate}
        dueDate={dueDate}
        businessProfile={profile}
        client={selectedClient}
        lineItems={lineItems}
        calculations={calculations}
        taxType={taxConfig.taxType === 'none' ? 'none' : taxConfig.gstType}
        gstRate={avgGstRate}
        currency={currency}
        currencySymbol={currencyConfig?.symbol || '₹'}
        primaryColor={primaryColor}
        accentColor={accentColor}
        terms={terms}
        notes={notes}
      />
    </div>
  );
}
