import { useState, useRef, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Building2, MapPin, Mail, AlertCircle, Search, Plus, User, Pencil, Phone, FileText, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';
import { useCreateClient, useUpdateClient, useUploadClientLogo } from '../../queries/useClients';
import { useGstLookupMutation, isValidGstin } from '../../queries/useGst';
import { Client } from '../../types/invoice';

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (client: Client) => void;
  editingClient?: Client | null;
}

export function AddClientModal({ isOpen, onClose, onSuccess, editingClient }: AddClientModalProps) {
  // Basic Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');

  // Tax Info
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');

  // Address
  const [address, setAddress] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Logo
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const uploadLogo = useUploadClientLogo();
  const gstLookup = useGstLookupMutation();

  const isEditing = !!editingClient;

  // Populate form when editing
  useEffect(() => {
    if (editingClient && isOpen) {
      setName(editingClient.name || '');
      setEmail(editingClient.email || '');
      setPhone(editingClient.phone || '');
      setCompany(editingClient.company_name || '');
      setGstin(editingClient.gstin || '');
      setPan(editingClient.pan || '');
      setAddress(editingClient.billing_address_line1 || '');
      setAddressLine2(editingClient.billing_address_line2 || '');
      setCity(editingClient.billing_city || '');
      setState(editingClient.billing_state || '');
      setPincode(editingClient.billing_pincode || '');
      setNotes(editingClient.notes || '');
      setLogoUrl(editingClient.logo_url || '');
    }
  }, [editingClient, isOpen]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setGstin('');
    setPan('');
    setAddress('');
    setAddressLine2('');
    setCity('');
    setState('');
    setPincode('');
    setNotes('');
    setLogoUrl('');
    setLogoPreview(null);
    setPendingLogoFile(null);
    gstLookup.reset();
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setPendingLogoFile(file);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleGstLookup = async () => {
    if (!isValidGstin(gstin)) return;

    try {
      const result = await gstLookup.mutateAsync(gstin);
      if (result.success && result.data) {
        const data = result.data;
        setName(data.trade_name || data.legal_name || name);
        setCompany(data.legal_name || company);
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
      toast.error('GST lookup failed', {
        description: (error as Error)?.message || 'Could not fetch GST details',
      });
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;

    const clientData = {
      name,
      email: email || undefined,
      phone: phone || undefined,
      company_name: company || undefined,
      gstin: gstin || undefined,
      pan: pan || undefined,
      billing_address_line1: address || undefined,
      billing_address_line2: addressLine2 || undefined,
      billing_city: city || undefined,
      billing_state: state || undefined,
      billing_pincode: pincode || undefined,
      notes: notes || undefined,
    };

    try {
      let result;
      if (isEditing && editingClient) {
        result = await updateClient.mutateAsync({ id: editingClient.id, ...clientData });
      } else {
        result = await createClient.mutateAsync({ body: clientData });
      }

      // Upload logo if there's a pending file
      const clientId = (result as any).id;
      if (pendingLogoFile && clientId) {
        try {
          // uploadLogo returns the updated client with logo_url
          const updatedClient = await uploadLogo.mutateAsync({ id: clientId, file: pendingLogoFile });
          result = updatedClient; // Use the updated client with logo_url
        } catch (logoError) {
          const errorMessage = (logoError as Error)?.message || 'Logo upload failed';
          toast.error('Logo upload failed', {
            description: errorMessage,
          });
          // Continue even if logo upload fails
        }
      }

      toast.success(isEditing ? 'Client updated successfully' : 'Client created successfully');
      onSuccess?.(result as Client);
      handleClose();
    } catch (error) {
      const errorMessage = (error as Error)?.message || 'Something went wrong';
      toast.error(isEditing ? 'Failed to update client' : 'Failed to create client', {
        description: errorMessage,
      });
    }
  };

  const isPending = createClient.isPending || updateClient.isPending || uploadLogo.isPending;

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
          isEditing ? "from-blue-50 to-indigo-50" : "from-amber-50 to-orange-50"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                isEditing
                  ? "from-blue-400 to-indigo-500 shadow-blue-200/50"
                  : "from-amber-400 to-orange-500 shadow-amber-200/50"
              )}>
                {isEditing ? <Pencil className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {isEditing ? 'Edit Client' : 'Add New Client'}
                </h2>
                <p className="text-sm text-slate-500">
                  {isEditing ? 'Update client information' : 'Enter GSTIN to auto-fill or add manually'}
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

          {/* Section: Client Logo */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <User className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Client Logo</h3>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-slate-50">
                {logoPreview || logoUrl ? (
                  <img
                    src={logoPreview || logoUrl}
                    alt="Client logo"
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
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  {logoPreview || logoUrl ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className="text-xs text-slate-500 mt-1">PNG, JPG, SVG up to 2MB. Recommended: 200x200px</p>
              </div>
            </div>
          </div>

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
                {gstLookup.data?.data?.business_type && (
                  <p className="text-xs text-green-600 mt-1 ml-6">
                    {gstLookup.data.data.business_type} • {gstLookup.data.data.status}
                  </p>
                )}
              </div>
            )}
            {gstLookup.isError && (
              <p className="text-sm text-red-600 mt-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {(gstLookup.error as Error)?.message || 'Lookup failed'}
              </p>
            )}
          </div>

          {/* Section: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <User className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Basic Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Client / Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Company / Business Name
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Acme Pvt Ltd"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  placeholder="client@company.com"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Section: Tax Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <FileText className="w-4 h-4 text-amber-500" />
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono uppercase"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent font-mono uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section: Address Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <MapPin className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-900">Address Details</h3>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Address Line 1 (Street, Building)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />

              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Address Line 2 (Area, Landmark)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Pincode"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this client..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
            />
          </div>
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
            disabled={!name.trim() || isPending}
            className={clsx(
              "px-6 py-2.5 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2",
              isEditing
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-200/50 hover:shadow-blue-300/50"
                : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200/50 hover:shadow-amber-300/50"
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
                {isEditing ? 'Save Changes' : 'Create Client'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
