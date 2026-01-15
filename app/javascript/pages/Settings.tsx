import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Bell,
  Shield,
  Palette,
  Building2,
  Send,
  Mail,
  Loader2,
  AlertCircle,
  X,
  ChevronRight,
  Check,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  FileText,
  Upload,
  CreditCard,
  Save,
  Image,
  PenTool,
  CheckCircle2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { useGmailStatus, useGmailConnections, gmailKeys, useGmailSyncSuggestions } from '../queries';
import { useGmailManager } from '../hooks/useGmailManager';
import { GmailSyncModal } from '../components/gmail/GmailSyncModal';
import type { GmailConnection as GmailConnectionType } from '../types/api';
import {
  useBusinessProfile,
  useCreateBusinessProfile,
  useUpdateBusinessProfile,
  useUploadLogo,
  useUploadSignature,
} from '../queries/useBusinessProfile';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  available: boolean;
}

const settingsSections: SettingsSection[] = [
  {
    id: 'business',
    title: 'Business Profile',
    description: 'Company details for invoices',
    icon: FileText,
    available: true,
  },
  {
    id: 'gmail',
    title: 'Gmail Integration',
    description: 'Auto-import invoices from email',
    icon: Mail,
    available: true,
  },
  {
    id: 'ca',
    title: 'CA Integration',
    description: 'Auto-send summaries to your CA',
    icon: Send,
    available: true,
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Manage your account details',
    icon: User,
    available: false,
  },
  {
    id: 'banks',
    title: 'Bank Accounts',
    description: 'Manage linked accounts',
    icon: Building2,
    available: false,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure alerts',
    icon: Bell,
    available: false,
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password & authentication',
    icon: Shield,
    available: false,
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look',
    icon: Palette,
    available: false,
  },
];

export function Settings() {
  const [activeSection, setActiveSection] = useState('business');
  const [searchParams, setSearchParams] = useSearchParams();
  const [gmailNotification, setGmailNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const queryClient = useQueryClient();

  // Handle Gmail OAuth callback redirect
  useEffect(() => {
    const gmailSuccess = searchParams.get('gmail_success');
    const gmailError = searchParams.get('gmail_error');
    const gmailEmail = searchParams.get('gmail_email');

    if (gmailSuccess === 'true') {
      setGmailNotification({
        type: 'success',
        message: gmailEmail ? `Gmail connected: ${gmailEmail}` : 'Gmail connected successfully!',
      });
      setActiveSection('gmail');
      // Refresh Gmail connections
      queryClient.invalidateQueries({ queryKey: gmailKeys.connections() });
      // Clear URL params
      setSearchParams({}, { replace: true });
    } else if (gmailError) {
      setGmailNotification({
        type: 'error',
        message: gmailError,
      });
      setActiveSection('gmail');
      // Clear URL params
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, queryClient]);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (gmailNotification) {
      const timer = setTimeout(() => setGmailNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [gmailNotification]);

  return (
    <div className="space-y-6">
      {/* Gmail OAuth Notification */}
      {gmailNotification && (
        <div
          className={clsx(
            'flex items-center gap-3 p-4 rounded-xl border',
            gmailNotification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          )}
        >
          {gmailNotification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span className="flex-1 text-sm font-medium">{gmailNotification.message}</span>
          <button
            onClick={() => setGmailNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar Navigation */}
        <nav className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Settings</h2>
              <p className="text-xs text-slate-500 mt-0.5">Manage your preferences</p>
            </div>
            <div className="p-2">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    onClick={() => section.available && setActiveSection(section.id)}
                    disabled={!section.available}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all mb-1',
                      isActive
                        ? 'bg-amber-200 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-600',
                      !section.available && 'opacity-50 cursor-not-allowed'
                    )}
                    aria-label={section.title}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                      <Icon className={clsx(
                        'w-5 h-5',
                        isActive ? 'text-amber-600' : 'text-amber-500'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={clsx(
                        'font-medium text-sm truncate',
                        isActive ? 'text-slate-900' : 'text-slate-700'
                      )}>
                        {section.title}
                      </p>
                      <p className="text-xs text-slate-400 truncate">
                        {section.description}
                      </p>
                    </div>
                    {section.available ? (
                      <ChevronRight className={clsx(
                        'w-4 h-4 flex-shrink-0',
                        isActive ? 'text-amber-600' : 'text-slate-300'
                      )} />
                    ) : (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg flex-shrink-0">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {activeSection === 'business' && <BusinessProfileSettings />}
          {activeSection === 'gmail' && <GmailSettings />}
          {activeSection === 'ca' && <CASettings />}
          {activeSection === 'profile' && <ComingSoon title="Profile" icon={User} />}
          {activeSection === 'banks' && <ComingSoon title="Bank Accounts" icon={Building2} />}
          {activeSection === 'notifications' && <ComingSoon title="Notifications" icon={Bell} />}
          {activeSection === 'security' && <ComingSoon title="Security" icon={Shield} />}
          {activeSection === 'appearance' && <ComingSoon title="Appearance" icon={Palette} />}
        </main>
      </div>
    </div>
  );
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

function BusinessProfileSettings() {
  const { data: profile, isLoading } = useBusinessProfile();
  const createProfile = useCreateBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const uploadLogo = useUploadLogo();
  const uploadSignature = useUploadSignature();

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    business_name: '',
    legal_name: '',
    gstin: '',
    pan_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    state_code: '',
    pincode: '',
    country: 'India',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    upi_id: '',
    primary_color: '#1e293b',
    secondary_color: '#fcd34d',
    invoice_prefix: 'INV-',
    invoice_start_number: 1,
    default_payment_terms_days: 30,
    default_notes: '',
    default_terms: '',
  });

  // Load profile data when available
  useState(() => {
    if (profile) {
      const p = profile as any;
      setFormData({
        business_name: p.business_name || '',
        legal_name: p.legal_name || '',
        gstin: p.gstin || '',
        pan_number: p.pan_number || '',
        address_line1: p.address_line1 || '',
        address_line2: p.address_line2 || '',
        city: p.city || '',
        state: p.state || '',
        state_code: p.state_code || '',
        pincode: p.pincode || '',
        country: p.country || 'India',
        bank_name: p.bank_name || '',
        account_number: p.account_number || '',
        ifsc_code: p.ifsc_code || '',
        upi_id: p.upi_id || '',
        primary_color: p.primary_color || '#1e293b',
        secondary_color: p.secondary_color || '#fcd34d',
        invoice_prefix: p.invoice_prefix || 'INV-',
        invoice_start_number: p.invoice_start_number || 1,
        default_payment_terms_days: p.default_payment_terms_days || 30,
        default_notes: p.default_notes || '',
        default_terms: p.default_terms || '',
      });
    }
  });

  // Update form when profile loads
  if (profile && formData.business_name === '' && (profile as any).business_name) {
    const p = profile as any;
    setFormData({
      business_name: p.business_name || '',
      legal_name: p.legal_name || '',
      gstin: p.gstin || '',
      pan_number: p.pan_number || '',
      address_line1: p.address_line1 || '',
      address_line2: p.address_line2 || '',
      city: p.city || '',
      state: p.state || '',
      state_code: p.state_code || '',
      pincode: p.pincode || '',
      country: p.country || 'India',
      bank_name: p.bank_name || '',
      account_number: p.account_number || '',
      ifsc_code: p.ifsc_code || '',
      upi_id: p.upi_id || '',
      primary_color: p.primary_color || '#1e293b',
      secondary_color: p.secondary_color || '#fcd34d',
      invoice_prefix: p.invoice_prefix || 'INV-',
      invoice_start_number: p.invoice_start_number || 1,
      default_payment_terms_days: p.default_payment_terms_days || 30,
      default_notes: p.default_notes || '',
      default_terms: p.default_terms || '',
    });
  }

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStateChange = (stateCode: string) => {
    const state = INDIAN_STATES.find((s) => s.code === stateCode);
    setFormData((prev) => ({
      ...prev,
      state_code: stateCode,
      state: state?.name || '',
    }));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadLogo.mutateAsync(file);
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadSignature.mutateAsync(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      if (profile) {
        await updateProfile.mutateAsync({ body: formData });
      } else {
        await createProfile.mutateAsync({ body: formData });
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-500">Loading business profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50/30 border border-amber-100 rounded-2xl p-6">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex items-center justify-center shadow-sm">
            <FileText className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">Business Profile</h2>
            <p className="text-slate-600 mt-1">
              Set up your business details for professional invoices
            </p>
          </div>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-amber-100/50" />
      </div>

      {/* Success Message */}
      {saveSuccess && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <Check className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-700">Profile saved successfully!</p>
        </div>
      )}

      {/* Business Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            Business Details
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => handleChange('business_name', e.target.value)}
                placeholder="Your Business Name"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Legal Name
              </label>
              <input
                type="text"
                value={formData.legal_name}
                onChange={(e) => handleChange('legal_name', e.target.value)}
                placeholder="Legal Entity Name"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">GSTIN</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">PAN Number</label>
              <input
                type="text"
                value={formData.pan_number}
                onChange={(e) => handleChange('pan_number', e.target.value.toUpperCase())}
                placeholder="AAAAA0000A"
                maxLength={10}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Address */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-700 mb-3">Address</h4>
            <div className="space-y-4">
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => handleChange('address_line1', e.target.value)}
                placeholder="Address Line 1"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <input
                type="text"
                value={formData.address_line2}
                onChange={(e) => handleChange('address_line2', e.target.value)}
                placeholder="Address Line 2"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="City"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <select
                  value={formData.state_code}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="Pincode"
                  maxLength={6}
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleChange('country', e.target.value)}
                  placeholder="Country"
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo & Signature */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Image className="w-4 h-4 text-amber-500" />
            Logo & Signature
          </h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Business Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
                {(profile as any)?.logo_url ? (
                  <img
                    src={(profile as any).logo_url}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Image className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={logoInputRef}
                  onChange={handleLogoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadLogo.isPending}
                  className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  {uploadLogo.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Logo
                </button>
                <p className="text-xs text-slate-400 mt-2">PNG, JPG up to 2MB</p>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Signature</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden">
                {(profile as any)?.signature_url ? (
                  <img
                    src={(profile as any).signature_url}
                    alt="Signature"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <PenTool className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div>
                <input
                  type="file"
                  ref={signatureInputRef}
                  onChange={handleSignatureUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  disabled={uploadSignature.isPending}
                  className="h-10 px-4 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  {uploadSignature.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Signature
                </button>
                <p className="text-xs text-slate-400 mt-2">PNG, JPG up to 1MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            Bank Details
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">For invoice payment information</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Name</label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="e.g., HDFC Bank"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Account Number
              </label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => handleChange('account_number', e.target.value)}
                placeholder="Account Number"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">IFSC Code</label>
              <input
                type="text"
                value={formData.ifsc_code}
                onChange={(e) => handleChange('ifsc_code', e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                maxLength={11}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI ID</label>
              <input
                type="text"
                value={formData.upi_id}
                onChange={(e) => handleChange('upi_id', e.target.value)}
                placeholder="yourbusiness@upi"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-500" />
            Invoice Settings
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={formData.invoice_prefix}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                placeholder="INV-"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Starting Number
              </label>
              <input
                type="number"
                value={formData.invoice_start_number}
                onChange={(e) => handleChange('invoice_start_number', parseInt(e.target.value) || 1)}
                min="1"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Payment Terms (days)
              </label>
              <input
                type="number"
                value={formData.default_payment_terms_days}
                onChange={(e) =>
                  handleChange('default_payment_terms_days', parseInt(e.target.value) || 30)
                }
                min="1"
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Primary Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.primary_color}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Accent Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.secondary_color}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Default Notes & Terms */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Default Notes
              </label>
              <textarea
                value={formData.default_notes}
                onChange={(e) => handleChange('default_notes', e.target.value)}
                rows={3}
                placeholder="Default notes for all invoices..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Default Terms & Conditions
              </label>
              <textarea
                value={formData.default_terms}
                onChange={(e) => handleChange('default_terms', e.target.value)}
                rows={3}
                placeholder="Default payment terms and conditions..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || !formData.business_name}
          className="h-11 px-6 rounded-lg bg-amber-200 text-slate-900 font-medium hover:bg-amber-300 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Profile
        </button>
      </div>
    </div>
  );
}

function GmailSettings() {
  const { data: status, isLoading: statusLoading } = useGmailStatus();
  const {
    data: connections,
    isLoading: connectionsLoading,
    refetch,
  } = useGmailConnections();
  const { data: syncSuggestions } = useGmailSyncSuggestions();
  const {
    handleConnect,
    handleToggleSync,
    handleDisconnect,
    disconnectingId,
    error,
    clearError,
  } = useGmailManager(refetch);

  // State for sync modal
  const [syncModalConnection, setSyncModalConnection] = useState<GmailConnectionType | null>(null);

  const handleOpenSyncModal = (connection: GmailConnectionType) => {
    setSyncModalConnection(connection);
  };

  const handleCloseSyncModal = () => {
    setSyncModalConnection(null);
  };

  // Check if user has transactions (can sync)
  const canSync = syncSuggestions?.has_transactions ?? false;

  if (statusLoading || connectionsLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm">
        <div className="flex flex-col items-center justify-center" role="status" aria-live="polite">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
          </div>
          <p className="text-sm text-slate-500">Loading Gmail settings...</p>
        </div>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm">
        <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Gmail not configured</p>
            <p className="text-sm text-amber-700 mt-1">
              Google OAuth credentials are not set up. Please contact support to enable Gmail integration.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border border-orange-100 rounded-2xl p-6">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm">
            <Mail className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">Gmail Integration</h2>
            <p className="text-slate-600 mt-1">
              Automatically import invoice PDFs from your Gmail inbox
            </p>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50" aria-hidden="true" />
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start justify-between gap-4 p-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <button
            onClick={clearError}
            className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">How it works</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span>We scan for emails with PDF attachments from common vendors</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span>Invoice PDFs are extracted and matched with your transactions</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-emerald-600" />
                </div>
                <span>Read-only access — we never modify or delete your emails</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Connected Accounts */}
      {hasConnections && (
        <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-semibold text-slate-900">Connected Accounts</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {connections.map((connection) => (
              <GmailConnectionRow
                key={connection.id}
                connection={connection}
                onOpenSyncModal={handleOpenSyncModal}
                onToggleSync={handleToggleSync}
                onDisconnect={handleDisconnect}
                isDisconnecting={disconnectingId === connection.id}
                canSync={canSync}
              />
            ))}
          </div>
        </div>
      )}

      {/* Gmail Sync Modal */}
      {syncModalConnection && (
        <GmailSyncModal
          isOpen={!!syncModalConnection}
          onClose={handleCloseSyncModal}
          connection={syncModalConnection}
        />
      )}

      {/* Connect Button */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <button
          onClick={handleConnect}
          className="w-full flex items-center justify-center gap-3 h-12 bg-amber-200 text-slate-900 font-medium rounded-lg hover:bg-amber-300 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300 focus:ring-offset-2"
          aria-label="Connect Gmail account"
        >
          <Mail className="w-5 h-5" />
          {hasConnections ? 'Connect Another Account' : 'Connect Gmail Account'}
          <ExternalLink className="w-4 h-4 opacity-60" />
        </button>
        <p className="text-xs text-slate-400 text-center mt-3">
          We only request read-only access. Your data is encrypted and never shared.
        </p>
      </div>
    </div>
  );
}

interface GmailConnectionRowProps {
  connection: GmailConnectionType;
  onOpenSyncModal: (connection: GmailConnectionType) => void;
  onToggleSync: (connection: GmailConnectionType) => void;
  onDisconnect: (id: number) => void;
  isDisconnecting: boolean;
  canSync: boolean;
}

function GmailConnectionRow({
  connection,
  onOpenSyncModal,
  onToggleSync,
  onDisconnect,
  isDisconnecting,
  canSync,
}: GmailConnectionRowProps) {
  const statusColor = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    syncing: 'bg-blue-100 text-blue-700 border-blue-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    disconnected: 'bg-slate-100 text-slate-600 border-slate-200',
  }[connection.status] || 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate">{connection.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={clsx(
                'text-xs px-2 py-0.5 rounded-lg font-medium border capitalize',
                statusColor
              )}>
                {connection.status}
              </span>
              {connection.last_sync_at && (
                <span className="text-xs text-slate-400">
                  Last sync: {new Date(connection.last_sync_at).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Toggle Sync */}
          <button
            onClick={() => onToggleSync(connection)}
            className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center"
            title={connection.sync_enabled ? 'Disable sync' : 'Enable sync'}
            aria-label={connection.sync_enabled ? 'Disable sync' : 'Enable sync'}
          >
            {connection.sync_enabled ? (
              <ToggleRight className="w-5 h-5 text-emerald-600" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-slate-400" />
            )}
          </button>

          {/* Scan Inbox */}
          <button
            onClick={() => onOpenSyncModal(connection)}
            disabled={!canSync || connection.status === 'syncing'}
            className={clsx(
              "h-9 px-3 rounded-xl font-medium text-sm transition-colors flex items-center gap-2",
              canSync && connection.status !== 'syncing'
                ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
            title={canSync ? "Scan inbox for invoices" : "Upload transactions first to enable scanning"}
            aria-label="Scan inbox for invoices"
          >
            <Mail className="w-4 h-4" />
            Scan
          </button>

          {/* Disconnect */}
          <button
            onClick={() => onDisconnect(connection.id)}
            disabled={isDisconnecting}
            className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600 disabled:opacity-50 flex items-center justify-center"
            title="Disconnect"
            aria-label="Disconnect account"
          >
            {isDisconnecting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Trash2 className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Stats */}
      {connection.invoice_count > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-700">{connection.invoice_count}</span> invoices imported
          </p>
        </div>
      )}
    </div>
  );
}

function CASettings() {
  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-50 to-amber-50/30 border border-orange-100 rounded-2xl p-6">
        <div className="relative z-10 flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white border border-orange-200 flex items-center justify-center shadow-sm">
            <Send className="w-6 h-6 text-orange-500" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-slate-900">CA Integration</h2>
            <p className="text-slate-600 mt-1">
              Automatically send monthly expense summaries to your CA via WhatsApp
            </p>
          </div>
        </div>
        {/* Decorative element */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-orange-100/50" aria-hidden="true" />
      </div>

      {/* Coming Soon Notice */}
      <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800">Coming Soon</p>
          <p className="text-sm text-amber-700 mt-1">
            This feature requires WhatsApp Business API access and is currently in development.
          </p>
        </div>
      </div>

      {/* Settings Preview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 opacity-60 pointer-events-none shadow-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              CA WhatsApp Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400 placeholder-slate-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Send Schedule
            </label>
            <select
              disabled
              className="w-full h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-400"
            >
              <option>1st of every month</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <p className="font-medium text-slate-400">Auto-send enabled</p>
              <p className="text-sm text-slate-300">Automatically send summary on schedule</p>
            </div>
            <ToggleLeft className="w-6 h-6 text-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface ComingSoonProps {
  title: string;
  icon: React.ElementType;
}

function ComingSoon({ title, icon: Icon }: ComingSoonProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-12 shadow-sm">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          This section is coming soon. We're working hard to bring you more features.
        </p>
        <div className="mt-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
