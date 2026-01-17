import { useState, useRef, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Building2, MapPin, Mail, AlertCircle, Search, Plus, Pencil, Phone, FileText, CreditCard, Image, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useGstLookupMutation, isValidGstin } from '../../queries/useGst';
import { AuthError } from '../../utils/api';
import {
  useBusinessProfile,
  useCreateBusinessProfile,
  useUpdateBusinessProfile,
  useUploadLogo,
} from '../../queries/useBusinessProfile';

interface BusinessProfileData {
  id?: number;
  business_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string; // API returns as 'pan'
  pan_number?: string; // Legacy/DB field name
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  state_code?: string;
  pincode?: string;
  country?: string;
  bank_name?: string;
  account_number?: string;
  ifsc_code?: string;
  upi_id?: string;
  logo_url?: string;
}

interface AddBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (profile: BusinessProfileData) => void;
}

export function AddBusinessModal({ isOpen, onClose, onSuccess }: AddBusinessModalProps) {
  // Only fetch profile when modal is open to prevent unnecessary API calls
  const { data: existingProfile, isLoading: isLoadingProfile } = useBusinessProfile({ enabled: isOpen });
  const createProfile = useCreateBusinessProfile();
  const updateProfile = useUpdateBusinessProfile();
  const uploadLogo = useUploadLogo();
  const gstLookup = useGstLookupMutation();

  const profile = existingProfile as BusinessProfileData | null;
  const isEditing = !!profile?.id;

  // Basic Info
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Tax Info
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Bank Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile && isOpen) {
      setBusinessName(profile.business_name || '');
      setLegalName(profile.legal_name || '');
      setEmail(profile.email || '');
      setPhone(profile.phone || '');
      setGstin(profile.gstin || '');
      setPan(profile.pan || profile.pan_number || '');
      setAddress(profile.address_line1 || '');
      setAddressLine2(profile.address_line2 || '');
      setCity(profile.city || '');
      setState(profile.state || '');
      setPincode(profile.pincode || '');
      setBankName(profile.bank_name || '');
      setAccountNumber(profile.account_number || '');
      setIfscCode(profile.ifsc_code || '');
      setUpiId(profile.upi_id || '');
      setLogoUrl(profile.logo_url || '');
    }
  }, [profile, isOpen]);

  const handleClose = () => {
    setLogoPreview(null);
    gstLookup.reset();
    onClose();
  };

  const handleGstLookup = async () => {
    if (!isValidGstin(gstin)) return;

    try {
      const result = await gstLookup.mutateAsync(gstin);
      if (result.success && result.data) {
        const data = result.data;
        setBusinessName(data.trade_name || data.legal_name || businessName);
        setLegalName(data.legal_name || legalName);
        // PAN is extracted from GSTIN (characters 3-12)
        if (data.pan) {
          setPan(data.pan);
        }
        if (data.address) {
          setAddress(data.address.line1 || '');
          setAddressLine2(data.address.line2 || '');
          setCity(data.address.city || '');
          setState(data.state_name || data.address.state || '');
          setPincode(data.address.pincode || '');
        }
      }
    } catch (error) {
      // Handle auth errors with a clear message
      if (error instanceof AuthError) {
        toast.error('Please log in', {
          description: 'You need to be logged in to use GST lookup',
        });
        return;
      }
      toast.error('GST lookup failed', {
        description: (error as Error)?.message || 'Could not fetch GST details',
      });
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload immediately if profile exists
      if (profile?.id) {
        try {
          await uploadLogo.mutateAsync(file);
          toast.success('Logo uploaded successfully');
        } catch (error) {
          toast.error('Logo upload failed', {
            description: (error as Error)?.message || 'Could not upload logo',
          });
        }
      }
    }
  };

  const handleSubmit = async () => {
    if (!businessName.trim()) return;

    const profileData = {
      business_name: businessName,
      legal_name: legalName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      gstin: gstin || undefined,
      pan_number: pan || undefined,
      address_line1: address || undefined,
      address_line2: addressLine2 || undefined,
      city: city || undefined,
      state: state || undefined,
      pincode: pincode || undefined,
      country: 'India',
      bank_name: bankName || undefined,
      account_number: accountNumber || undefined,
      ifsc_code: ifscCode || undefined,
      upi_id: upiId || undefined,
    };

    try {
      let result;
      if (isEditing && profile?.id) {
        result = await updateProfile.mutateAsync(profileData);
      } else {
        try {
          result = await createProfile.mutateAsync(profileData);
        } catch (createError: any) {
          // If profile already exists (422), fall back to update
          if (createError?.status === 422 || createError?.body?.error === 'Business profile already exists') {
            result = await updateProfile.mutateAsync(profileData);
          } else {
            throw createError;
          }
        }
      }
      toast.success(isEditing ? 'Business profile updated' : 'Business profile created');
      onSuccess?.(result as BusinessProfileData);
      handleClose();
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Something went wrong';
      toast.error(isEditing ? 'Failed to update profile' : 'Failed to create profile', {
        description: errorMessage,
      });
    }
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={clsx(
          "px-6 py-4 border-b border-slate-200 bg-gradient-to-r",
          isEditing ? "from-blue-50 to-indigo-50" : "from-emerald-50 to-teal-50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                isEditing
                  ? "from-blue-400 to-indigo-500 shadow-blue-200/50"
                  : "from-emerald-400 to-teal-500 shadow-emerald-200/50"
              )}>
                {isEditing ? <Pencil className="w-5 h-5 text-white" /> : <Building2 className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Edit Business Profile' : 'Add Business Profile'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditing ? 'Update your business details' : 'Set up your business details for invoices'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/80 rounded-xl transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {isLoadingProfile ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
            </div>
          ) : (
            <>
              {/* GST Lookup Section */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="w-4 h-4 text-blue-600" />
                  <label className="text-sm font-semibold text-blue-900">
                    Quick Fill with GSTIN
                  </label>
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="Enter 15-digit GSTIN"
                    maxLength={15}
                    className="flex-1 px-4 py-3 rounded-xl border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono tracking-wider bg-white"
                  />
                  <button
                    onClick={handleGstLookup}
                    disabled={!isValidGstin(gstin) || gstLookup.isPending}
                    className={clsx(
                      'px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2',
                      isValidGstin(gstin) && !gstLookup.isPending
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {gstLookup.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    Lookup
                  </button>
                </div>
                {gstLookup.isSuccess && (
                  <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Details fetched successfully!</span>
                    </p>
                  </div>
                )}
                {gstLookup.isError && (
                  <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {(gstLookup.error as Error)?.message || 'Lookup failed'}
                  </p>
                )}
              </div>

              {/* Section: Business Logo */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Image className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Business Logo</h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                    {logoPreview || logoUrl ? (
                      <img
                        src={logoPreview || logoUrl}
                        alt="Business logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogo.isPending}
                      className="px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-2"
                    >
                      {uploadLogo.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {logoPreview || logoUrl ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 2MB. Recommended: 200x200px</p>
                  </div>
                </div>
              </div>

              {/* Section: Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Your Business Name"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Legal Name
                    </label>
                    <input
                      type="text"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="Registered Legal Name"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Mail className="w-3.5 h-3.5 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="business@company.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Tax Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Tax Information</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      GSTIN
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value.toUpperCase())}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      PAN
                    </label>
                    <input
                      type="text"
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="AAAAA0000A"
                      maxLength={10}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Address Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Address Details</h3>
                </div>

                <div className="space-y-3">
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Address Line 1 (Street, Building)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />

                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Address Line 2 (Area, Landmark)"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="State"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                    <input
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      placeholder="Pincode"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Bank Account Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Bank Account Details</h3>
                  <span className="text-xs text-slate-400">(for invoice payment info)</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="HDFC Bank"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="1234567890"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      placeholder="HDFC0001234"
                      maxLength={11}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="business@upi"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!businessName.trim() || isPending || isLoadingProfile}
            className={clsx(
              "px-6 py-2.5 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
              isEditing
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/50"
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isEditing ? 'Saving...' : 'Creating...'}
              </>
            ) : (
              <>
                {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {isEditing ? 'Save Changes' : 'Save Profile'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
