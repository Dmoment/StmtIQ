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
  Mail,
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
import { useCreateRecurringInvoice, useUpdateRecurringInvoice } from '../queries/useRecurringInvoices';
import { useBusinessProfile } from '../queries/useBusinessProfile';
import { useExchangeRate } from '../queries/useExchangeRates';
import { ConfigureTaxModal, TaxConfig } from '../components/invoice/ConfigureTaxModal';
import { BilledByCard } from '../components/invoice/BilledByCard';
import { BilledToCard } from '../components/invoice/BilledToCard';
import { TotalsSection } from '../components/invoice/TotalsSection';
import { FooterActions } from '../components/invoice/FooterActions';
import { InvoicePreviewModal } from '../components/invoice/InvoicePreviewModal';
import { RecurringInvoiceSettings, type RecurringSettings } from '../components/invoice/RecurringInvoiceSettings';
import { SendInvoiceModal } from '../components/invoice/SendInvoiceModal';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { LineItem, Client, BusinessProfile, InvoiceCalculations } from '../types/invoice';

// Extended BusinessProfile type with additional fields from API
interface ExtendedBusinessProfile extends BusinessProfile {
  default_payment_terms_days?: number;
  default_notes?: string;
  default_terms?: string;
}

// Type for next invoice number response
interface NextInvoiceNumberResponse {
  next_number: string;
}

// Type for exchange rate response
interface ExchangeRateResponse {
  rate: number;
  from_currency: string;
  to_currency: string;
}

// Type for recurring invoice from API
interface ExistingRecurringInvoice {
  id: number;
  name: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
  status: string;
  start_date: string;
  end_date?: string | null;
  auto_send: boolean;
  send_to_email?: string | null;
  send_cc_emails?: string | null;
  send_email_subject?: string | null;
  send_email_body?: string | null;
  currency: string;
  payment_terms_days: number;
}

// Type for existing sales invoice
interface ExistingSalesInvoice {
  id: number;
  invoice_number: string;
  client?: Client;
  invoice_date: string | null;
  due_date: string | null;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  discount_amount: string | null;
  discount_type: 'fixed' | 'percentage';
  notes: string | null;
  terms: string | null;
  tax_type: 'none' | 'cgst_sgst' | 'igst';
  place_of_supply: string | null;
  igst_rate?: number;
  cess_rate?: number;
  is_reverse_charge?: boolean;
  line_items?: Array<{
    id?: number;
    description: string;
    hsn_sac_code?: string;
    quantity: string | number;
    unit: string;
    rate: string | number;
    gst_rate: number;
  }>;
  custom_fields?: Array<{ label: string; value: string }>;
  recurring_invoice_id?: number | null;
  recurring_invoice?: ExistingRecurringInvoice | null;
}

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
  const createRecurringInvoice = useCreateRecurringInvoice();
  const updateRecurringInvoice = useUpdateRecurringInvoice();

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

  // Recurring invoice settings
  const [recurringSettings, setRecurringSettings] = useState<RecurringSettings>({
    isRecurring: false,
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endType: 'never',
    autoSend: false,
    sendToEmail: '',
    sendCcEmails: '',
    sendEmailSubject: '',
    sendEmailBody: '',
  });
  const [existingRecurringInvoiceId, setExistingRecurringInvoiceId] = useState<number | null>(null);

  // Line item display options
  const [showHsnSac, setShowHsnSac] = useState(false);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Color customization
  const [primaryColor, setPrimaryColor] = useState('#f59e0b');
  const [accentColor, setAccentColor] = useState('#d97706');

  // Preview and Send modals
  const [showPreview, setShowPreview] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);

  const profile = businessProfile as ExtendedBusinessProfile | undefined;
  const typedNextNumber = nextNumberData as NextInvoiceNumberResponse | undefined;
  const invoiceNumber = typedNextNumber?.next_number || 'INV-001';
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
      const invoice = existingInvoice as ExistingSalesInvoice;
      if (invoice.client) {
        setSelectedClient(invoice.client);
      }
      setInvoiceDate(invoice.invoice_date || '');
      setDueDate(invoice.due_date || '');
      setCurrency(invoice.currency || 'INR');
      setDiscountAmount(parseFloat(invoice.discount_amount || '0') || 0);
      setDiscountType(invoice.discount_type || 'fixed');
      setNotes(invoice.notes || '');
      setTerms(invoice.terms || '');
      if (invoice.line_items && invoice.line_items.length > 0) {
        setLineItems(
          invoice.line_items.map((item) => ({
            id: item.id,
            description: item.description || '',
            hsn_sac_code: item.hsn_sac_code || '',
            quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity || 1,
            unit: item.unit || 'qty',
            rate: typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate || 0,
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
      // Load custom fields (additional info)
      if (invoice.custom_fields && invoice.custom_fields.length > 0) {
        setAdditionalFields(invoice.custom_fields);
      }

      // Load recurring invoice settings if this invoice was generated from a recurring schedule
      if (invoice.recurring_invoice) {
        const recurring = invoice.recurring_invoice;
        setExistingRecurringInvoiceId(recurring.id);
        setRecurringSettings({
          isRecurring: true,
          frequency: recurring.frequency,
          startDate: recurring.start_date,
          endType: recurring.end_date ? 'end_on_date' : 'never',
          endDate: recurring.end_date || undefined,
          autoSend: recurring.auto_send,
          sendToEmail: recurring.send_to_email || '',
          sendCcEmails: recurring.send_cc_emails || '',
          sendEmailSubject: recurring.send_email_subject || '',
          sendEmailBody: recurring.send_email_body || '',
        });
      } else if (invoice.recurring_invoice_id) {
        // If we only have the ID but not the full object, still track it
        setExistingRecurringInvoiceId(invoice.recurring_invoice_id);
      }
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
      const typedExchangeRate = exchangeRateData as ExchangeRateResponse;
      totalInINR = total * (typedExchangeRate.rate || 1);
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

  const validateForm = (isRecurring = false): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClient) {
      newErrors.client = 'Please select a client';
    }

    // For recurring invoices, dates are generated automatically on each occurrence
    if (!isRecurring) {
      if (!invoiceDate) {
        newErrors.invoiceDate = 'Invoice date is required';
      }

      if (!dueDate) {
        newErrors.dueDate = 'Due date is required';
      }
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
    // Validate form - skip date validation for recurring invoices
    if (!validateForm(recurringSettings.isRecurring)) return;

    // If recurring invoice, validate recurring settings
    if (recurringSettings.isRecurring && !recurringSettings.startDate) {
      setErrors({ ...errors, startDate: 'Start date is required for recurring invoices' });
      return;
    }

    setIsSaving(true);

    try {
      // If recurring invoice, create or update the recurring schedule
      if (recurringSettings.isRecurring) {
        const templateData = {
          notes: notes || undefined,
          terms: terms || undefined,
          line_items: lineItems
            .filter((item) => !item._destroy)
            .map((item) => ({
              description: item.description,
              hsn_sac_code: item.hsn_sac_code || undefined,
              quantity: Number(item.quantity),
              unit: item.unit,
              rate: Number(item.rate),
            })),
        };

        // Validate email is provided if auto-send is enabled
        if (recurringSettings.autoSend && !recurringSettings.sendToEmail) {
          setErrors({ ...errors, email: 'Email address is required for auto-send' });
          setIsSaving(false);
          return;
        }

        const recurringPayload = {
          name: `${selectedClient?.display_name} - ${invoiceTitle}`,
          client_id: selectedClient!.id,
          frequency: recurringSettings.frequency,
          start_date: recurringSettings.startDate,
          end_date: recurringSettings.endType === 'end_on_date' ? recurringSettings.endDate : undefined,
          currency,
          payment_terms_days: profile?.default_payment_terms_days || 30,
          auto_send: recurringSettings.autoSend,
          send_to_email: recurringSettings.sendToEmail || undefined,
          send_cc_emails: recurringSettings.sendCcEmails || undefined,
          send_email_subject: recurringSettings.sendEmailSubject || undefined,
          send_email_body: recurringSettings.sendEmailBody || undefined,
          template_data: templateData,
        };

        try {
          let recurringId: number;

          // Check if we're updating an existing recurring invoice or creating a new one
          if (existingRecurringInvoiceId) {
            console.log('Updating existing recurring invoice:', existingRecurringInvoiceId, recurringPayload);
            await updateRecurringInvoice.mutateAsync({
              id: existingRecurringInvoiceId,
              ...recurringPayload,
            });
            console.log('Recurring invoice updated successfully');
            recurringId = existingRecurringInvoiceId;
          } else {
            console.log('Creating new recurring invoice:', recurringPayload);
            const result = await createRecurringInvoice.mutateAsync({ requestBody: recurringPayload });
            console.log('Recurring invoice created successfully:', result);
            recurringId = (result as { id: number }).id;

            // If editing an existing invoice, link the new recurring invoice to it
            if (isEditing && id && recurringId) {
              const salesInvoiceId = parseInt(id, 10);
              console.log('Linking recurring invoice', recurringId, 'to sales invoice', salesInvoiceId);
              try {
                await updateInvoice.mutateAsync({
                  id: salesInvoiceId,
                  recurring_invoice_id: recurringId,
                });
                console.log('Sales invoice linked successfully');
              } catch (linkError) {
                console.error('Failed to link recurring invoice to sales invoice:', linkError);
                // Don't fail the whole operation, just log the error
              }
            }
          }

          // Show success and navigate to invoices page
          const message = existingRecurringInvoiceId
            ? 'Recurring invoice schedule updated successfully!'
            : isEditing
              ? 'Recurring invoice schedule created and linked to this invoice!'
              : 'Recurring invoice schedule created successfully!';
          alert(message);
          navigate('/invoices?tab=sent');
        } catch (error) {
          console.error('Failed to save recurring invoice:', error);
          setErrors({ ...errors, submit: 'Failed to save recurring invoice. Please try again.' });
        } finally {
          setIsSaving(false);
        }
        return;
      }

      // Otherwise, create/update regular invoice
      const typedExchangeRate = exchangeRateData as ExchangeRateResponse | undefined;
      const invoiceData = {
        client_id: selectedClient!.id,
        invoice_date: invoiceDate || undefined,
        due_date: dueDate || undefined,
        currency,
        exchange_rate: currency !== 'INR' ? typedExchangeRate?.rate : undefined,
        exchange_rate_date: currency !== 'INR' ? new Date().toISOString().split('T')[0] : undefined,
        discount_amount: discountAmount,
        discount_type: discountType as 'fixed' | 'percentage',
        tax_type: (taxConfig.taxType === 'none' ? 'none' : taxConfig.gstType) as 'none' | 'cgst_sgst' | 'igst',
        place_of_supply: taxConfig.placeOfSupply || undefined,
        cess_rate: taxConfig.cessRate,
        is_reverse_charge: taxConfig.isReverseCharge,
        notes: notes || undefined,
        terms: terms || undefined,
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
        // Additional info fields (LUT Number, PO Number, etc.)
        custom_fields: additionalFields.filter(f => f.label && f.value),
      };

      let result: { id?: number } | undefined;
      if (isEditing) {
        const updateData = {
          id: parseInt(id!),
          ...invoiceData,
        };
        result = await updateInvoice.mutateAsync(updateData) as { id?: number };
      } else {
        result = await createInvoice.mutateAsync(invoiceData) as { id?: number };
      }

      const invoiceId = result?.id || parseInt(id!);

      if (send && invoiceId) {
        await sendInvoice.mutateAsync(invoiceId);
      }

      navigate('/invoices?tab=sent');
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
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Loading invoice form">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" aria-hidden="true" />
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
            aria-label="Go back to invoices list"
            className="h-10 w-10 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Create New Invoice</h1>
            <nav aria-label="Invoice creation steps" className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
              <span className="flex items-center gap-1" aria-current="step">
                <span
                  className="w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}30`, color: primaryColor }}
                  aria-hidden="true"
                >
                  1
                </span>
                Add Invoice Details
              </span>
              <span className="text-slate-300" aria-hidden="true">{'>'}</span>
              <span className="text-slate-400">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 text-xs font-medium inline-flex items-center justify-center mr-1" aria-hidden="true">
                  2
                </span>
                Design & Share (optional)
              </span>
            </nav>
          </div>
        </div>

        {/* Preview and Send Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            aria-label="Preview invoice before saving"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            Preview
          </button>
          <button
            onClick={() => setShowSendModal(true)}
            disabled={!isEditing}
            aria-label={isEditing ? 'Send invoice via email' : 'Save invoice first to send'}
            title={isEditing ? undefined : 'Save invoice first to send'}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-medium transition-colors',
              isEditing ? 'hover:opacity-90' : 'opacity-50 cursor-not-allowed'
            )}
            style={{ backgroundColor: '#3b82f6' }}
          >
            <Mail className="w-4 h-4" aria-hidden="true" />
            Send
          </button>
        </div>
      </div>

      {/* Validation Errors */}
      {Object.keys(errors).length > 0 && (
        <div role="alert" aria-live="polite" className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
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
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Invoice No<span className="text-red-500">*</span>
                <InfoTooltip
                  title="Invoice Number"
                  content={
                    <>
                      Auto-generated unique number for each invoice. Format follows your business settings.
                      <br /><br />
                      Used for tracking payments and required for GST compliance.
                    </>
                  }
                  position="right"
                />
              </label>
              <input
                type="text"
                value={isEditing ? (existingInvoice as ExistingSalesInvoice | undefined)?.invoice_number : invoiceNumber}
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
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Invoice Date<span className="text-red-500">*</span>
                <InfoTooltip
                  title="Invoice Date"
                  content={
                    <>
                      The date when the invoice is issued to the client.
                      <br /><br />
                      This date is used for:
                      <br />• GST return filing period
                      <br />• Payment terms calculation
                      <br />• Financial records
                    </>
                  }
                  position="right"
                />
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
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                Due Date
                <InfoTooltip
                  title="Due Date"
                  content={
                    <>
                      Payment deadline for this invoice. Auto-calculated based on your default payment terms.
                      <br /><br />
                      <strong>Tips:</strong>
                      <br />• Set reminders before due date
                      <br />• Track overdue invoices easily
                      <br />• Industry standard: Net 30 days
                    </>
                  }
                  position="right"
                />
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
              profile={profile as BusinessProfile | null}
            />
            <BilledToCard
              selectedClient={selectedClient}
              onSelect={setSelectedClient}
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowTaxModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Percent className="w-4 h-4 text-slate-500" />
                Configure GST
              </button>
              <InfoTooltip
                title="GST Configuration"
                content={
                  <>
                    <strong>IGST:</strong> For sales to other states (inter-state)
                    <br /><br />
                    <strong>CGST + SGST:</strong> For sales within same state (intra-state)
                    <br /><br />
                    <strong>No Tax:</strong> For exports, SEZ, or exempt supplies
                  </>
                }
                position="bottom"
              />
            </div>

            {/* HSN/SAC Toggle */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHsnSac(!showHsnSac)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-2 rounded-xl border text-sm transition-colors",
                  showHsnSac
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                )}
              >
                <span className="font-mono text-xs">HSN</span>
                {showHsnSac ? 'Hide HSN/SAC' : 'Show HSN/SAC'}
              </button>
              <InfoTooltip
                title="HSN/SAC Codes"
                content={
                  <>
                    <strong>HSN:</strong> For goods (4-8 digits)
                    <br />
                    <strong>SAC:</strong> For services (6 digits, starts with 99)
                    <br /><br />
                    Required for businesses with turnover above ₹5 Cr. Optional for smaller businesses.
                  </>
                }
                position="bottom"
              />
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-1">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as 'INR' | 'USD' | 'EUR' | 'GBP')}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
              <InfoTooltip
                title="Currency"
                content={
                  <>
                    Select the currency for this invoice.
                    <br /><br />
                    <strong>For foreign currency:</strong>
                    <br />• Exchange rate auto-fetched
                    <br />• INR equivalent shown for GST
                    <br />• Client sees their currency
                  </>
                }
                position="bottom"
              />
            </div>

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
                {showHsnSac && <div className="w-20 text-center">HSN/SAC</div>}
                {taxConfig.taxType !== 'none' && (
                  <div className="w-16 text-center">GST %</div>
                )}
                <div className="w-24 text-center">Quantity</div>
                <div className="w-24 text-right">Rate</div>
                <div className="w-24 text-right">Amount</div>
                {taxConfig.taxType !== 'none' && (
                  <div className="w-20 text-right">
                    {taxConfig.gstType === 'igst' ? 'IGST' : 'Tax'}
                  </div>
                )}
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
                        {showHsnSac && (
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
                        )}

                        {/* GST Rate */}
                        {taxConfig.taxType !== 'none' && (
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
                        )}

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
                        {taxConfig.taxType !== 'none' && (
                          <div className="w-20 text-right text-sm text-slate-700">
                            {currencyConfig?.symbol}
                            {calc.taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        )}

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
                isReverseCharge={taxConfig.isReverseCharge}
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
            isReverseCharge={taxConfig.isReverseCharge}
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

        {/* Recurring Invoice Settings */}
        <RecurringInvoiceSettings
          settings={recurringSettings}
          onSettingsChange={setRecurringSettings}
          primaryColor={primaryColor}
          accentColor={accentColor}
          clientEmail={selectedClient?.email}
          clientName={selectedClient?.display_name}
          businessName={profile?.business_name}
          invoiceNumber={invoiceNumber}
          totalAmount={new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          }).format(calculations.total)}
        />

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
          aria-label={isSaving ? 'Saving invoice' : 'Save invoice and continue'}
          aria-busy={isSaving}
          className="px-8 py-3 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2 hover:opacity-90"
          style={{ backgroundColor: primaryColor }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
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
        invoiceNumber={isEditing ? (existingInvoice as ExistingSalesInvoice | undefined)?.invoice_number || '' : invoiceNumber}
        invoiceDate={invoiceDate}
        dueDate={dueDate}
        businessProfile={profile as BusinessProfile | null}
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
        customFields={additionalFields.filter(f => f.label && f.value)}
      />

      {/* Send Invoice Modal */}
      <SendInvoiceModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        onSend={(emailOptions) => {
          if (isEditing && existingInvoice?.id) {
            sendInvoice.mutate(
              {
                id: existingInvoice.id,
                ...emailOptions,
              },
              {
                onSuccess: () => {
                  setShowSendModal(false);
                },
              }
            );
          }
        }}
        isPending={sendInvoice.isPending}
        clientEmail={selectedClient?.email || ''}
        clientName={selectedClient?.name || selectedClient?.display_name || ''}
        businessName={profile?.business_name || ''}
        invoiceNumber={isEditing ? (existingInvoice as ExistingSalesInvoice | undefined)?.invoice_number || '' : invoiceNumber}
        dueDate={dueDate ? new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
        totalAmount={`${currencyConfig?.symbol || '₹'}${(calculations?.grandTotal ?? 0).toLocaleString()}`}
        defaultSubject={(profile as ExtendedBusinessProfile & { invoice_email_subject?: string })?.invoice_email_subject || ''}
        defaultBody={(profile as ExtendedBusinessProfile & { invoice_email_body?: string })?.invoice_email_body || ''}
        defaultCc={(profile as ExtendedBusinessProfile & { invoice_email_cc?: string })?.invoice_email_cc || ''}
        primaryColor={primaryColor}
      />
    </div>
  );
}
