import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, User, Building2, MapPin, ChevronDown, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { useClients, useCreateClient } from '../../queries/useClients';
import { useGstLookupMutation, isValidGstin, getLogoUrl, getFallbackLogoUrl, getStateFromGstin } from '../../queries/useGst';

interface Client {
  id: number;
  name: string;
  email?: string;
  company_name?: string;
  gstin?: string;
  billing_city?: string;
  billing_state?: string;
  billing_state_code?: string;
  billing_address_line1?: string;
  billing_address_line2?: string;
  billing_pincode?: string;
  display_name?: string;
}

interface InlineClientSelectorProps {
  selectedClient: Client | null;
  onSelect: (client: Client | null) => void;
  placeholder?: string;
}

export function InlineClientSelector({
  selectedClient,
  onSelect,
  placeholder = 'Select a client',
}: InlineClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);

  // New client form fields
  const [newClientGstin, setNewClientGstin] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');
  const [newClientAddress1, setNewClientAddress1] = useState('');
  const [newClientAddress2, setNewClientAddress2] = useState('');
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientState, setNewClientState] = useState('');
  const [newClientStateCode, setNewClientStateCode] = useState('');
  const [newClientPincode, setNewClientPincode] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useClients({ search, active_only: true });
  const clients = (clientsData as Client[]) || [];
  const createClient = useCreateClient();
  const gstLookup = useGstLookupMutation();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewClientForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset form when opening new client form
  useEffect(() => {
    if (showNewClientForm) {
      setNewClientGstin('');
      setNewClientName('');
      setNewClientEmail('');
      setNewClientCompany('');
      setNewClientAddress1('');
      setNewClientAddress2('');
      setNewClientCity('');
      setNewClientState('');
      setNewClientStateCode('');
      setNewClientPincode('');
      setLogoUrl(null);
      setLogoError(false);
      gstLookup.reset();
    }
  }, [showNewClientForm]);

  const handleSelect = (client: Client) => {
    onSelect(client);
    setIsOpen(false);
    setSearch('');
  };

  const handleGstinChange = (value: string) => {
    const formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
    setNewClientGstin(formatted);

    // Auto-extract state when GSTIN is valid
    if (formatted.length >= 2) {
      const stateInfo = getStateFromGstin(formatted);
      if (stateInfo) {
        setNewClientState(stateInfo.name);
        setNewClientStateCode(formatted.substring(0, 2));
      }
    }
  };

  const handleGstLookup = async () => {
    if (!isValidGstin(newClientGstin)) return;

    try {
      const result = await gstLookup.mutateAsync(newClientGstin);

      if (result.success && result.data) {
        const data = result.data;

        // Populate form fields
        setNewClientName(data.trade_name || data.legal_name || '');
        setNewClientCompany(data.legal_name || '');

        if (data.state_name) {
          setNewClientState(data.state_name);
        }
        if (data.state_code) {
          setNewClientStateCode(data.state_code);
        }

        if (data.address) {
          setNewClientAddress1(data.address.line1 || '');
          setNewClientAddress2(data.address.line2 || '');
          setNewClientCity(data.address.city || '');
          if (data.address.state) {
            setNewClientState(data.address.state);
          }
          setNewClientPincode(data.address.pincode || '');
        }

        // Set logo URL if available
        if (data.logo_url) {
          setLogoUrl(data.logo_url);
        }
      }
    } catch (error) {
      console.error('GST lookup error:', error);
    }
  };

  const handleLogoError = () => {
    if (!logoError && logoUrl) {
      // Try fallback to Google Favicon
      const domain = logoUrl.match(/logo\.clearbit\.com\/([^?]+)/)?.[1];
      if (domain) {
        setLogoUrl(getFallbackLogoUrl(domain));
        setLogoError(true);
      }
    }
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;

    try {
      const result = await createClient.mutateAsync({
        body: {
          name: newClientName,
          email: newClientEmail || undefined,
          company_name: newClientCompany || undefined,
          gstin: newClientGstin || undefined,
          billing_address_line1: newClientAddress1 || undefined,
          billing_address_line2: newClientAddress2 || undefined,
          billing_city: newClientCity || undefined,
          billing_state: newClientState || undefined,
          billing_state_code: newClientStateCode || undefined,
          billing_pincode: newClientPincode || undefined,
        },
      });
      onSelect(result as Client);
      setShowNewClientForm(false);
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const gstinValid = isValidGstin(newClientGstin);
  const canLookup = gstinValid && !gstLookup.isPending;

  return (
    <div ref={containerRef} className="relative">
      {/* Display/Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={clsx(
          'w-full text-left cursor-pointer rounded-lg p-3 -m-3 transition-colors',
          'hover:bg-amber-50',
          isOpen && 'bg-amber-50'
        )}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedClient ? (
          <div className="flex items-start gap-3">
            {/* Client Logo */}
            {selectedClient.email && (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-100 overflow-hidden">
                <img
                  src={getLogoUrl(selectedClient.email) || ''}
                  alt=""
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const fallback = getFallbackLogoUrl(selectedClient.email);
                    if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                      (e.target as HTMLImageElement).src = fallback;
                    } else {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  }}
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900 truncate">
                  {selectedClient.display_name || selectedClient.name}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
              </div>
              {selectedClient.company_name && (
                <div className="text-sm text-slate-600 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">{selectedClient.company_name}</span>
                </div>
              )}
              {(selectedClient.billing_city || selectedClient.billing_state) && (
                <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {[selectedClient.billing_city, selectedClient.billing_state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {selectedClient.gstin && (
                <div className="text-xs text-slate-400 font-mono mt-1">
                  GSTIN: {selectedClient.gstin}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 italic flex items-center gap-2">
            <User className="w-4 h-4" aria-hidden="true" />
            {placeholder}
            <ChevronDown className="w-4 h-4" aria-hidden="true" />
          </div>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden"
          role="listbox"
        >
          {!showNewClientForm ? (
            <>
              {/* Search Input */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search clients..."
                    aria-label="Search clients"
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Client List */}
              <div className="max-h-60 overflow-y-auto">
                {clients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">
                    No clients found
                  </div>
                ) : (
                  clients.map((client: Client) => (
                    <button
                      key={client.id}
                      onClick={() => handleSelect(client)}
                      role="option"
                      aria-selected={selectedClient?.id === client.id}
                      className={clsx(
                        'w-full text-left p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3',
                        selectedClient?.id === client.id && 'bg-amber-50'
                      )}
                    >
                      {/* Client Logo */}
                      {client.email && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 overflow-hidden">
                          <img
                            src={getLogoUrl(client.email) || ''}
                            alt=""
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              const fallback = getFallbackLogoUrl(client.email);
                              if (fallback) {
                                (e.target as HTMLImageElement).src = fallback;
                              }
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                          {client.display_name || client.name}
                        </div>
                        {client.company_name && (
                          <div className="text-sm text-slate-500 truncate">{client.company_name}</div>
                        )}
                        {client.gstin && (
                          <div className="text-xs text-slate-400 font-mono">{client.gstin}</div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Add New Client Button */}
              <div className="p-2 border-t border-slate-100">
                <button
                  onClick={() => setShowNewClientForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Add New Client
                </button>
              </div>
            </>
          ) : (
            /* New Client Form with GST Lookup */
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-slate-900">New Client</h4>
                <button
                  onClick={() => setShowNewClientForm(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Close form"
                >
                  <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
                </button>
              </div>

              {/* Logo Preview */}
              {logoUrl && (
                <div className="flex justify-center pb-2">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden p-2">
                    <img
                      src={logoUrl}
                      alt="Company logo"
                      className="w-full h-full object-contain"
                      onError={handleLogoError}
                    />
                  </div>
                </div>
              )}

              {/* GSTIN Input with Lookup */}
              <div>
                <label htmlFor="gstin-input" className="block text-xs font-medium text-slate-500 mb-1">
                  GSTIN (Auto-fetch company details)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      id="gstin-input"
                      type="text"
                      value={newClientGstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="22AAAAA0000A1Z5"
                      maxLength={15}
                      className={clsx(
                        'w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm font-mono uppercase',
                        newClientGstin.length === 15 && !gstinValid
                          ? 'border-red-300 bg-red-50'
                          : gstinValid
                          ? 'border-green-300 bg-green-50'
                          : 'border-slate-200'
                      )}
                    />
                    {newClientGstin.length > 0 && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {gstinValid ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" aria-label="Valid GSTIN" />
                        ) : newClientGstin.length === 15 ? (
                          <AlertCircle className="w-4 h-4 text-red-500" aria-label="Invalid GSTIN" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleGstLookup}
                    disabled={!canLookup}
                    className={clsx(
                      'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
                      canLookup
                        ? 'bg-blue-500 hover:bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    )}
                  >
                    {gstLookup.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Search className="w-4 h-4" aria-hidden="true" />
                    )}
                    Lookup
                  </button>
                </div>
                {gstLookup.isError && (
                  <p className="text-xs text-red-500 mt-1">
                    {(gstLookup.error as Error)?.message || 'Lookup failed'}
                  </p>
                )}
                {gstLookup.isSuccess && gstLookup.data?.source === 'gstin_extraction' && (
                  <p className="text-xs text-amber-600 mt-1">
                    Basic info extracted. Full details unavailable.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name *"
                  aria-label="Client name (required)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                  autoFocus
                />
                <input
                  type="text"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="Company name"
                  aria-label="Company name"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
              </div>

              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Email (for logo)"
                aria-label="Email address"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />

              <input
                type="text"
                value={newClientAddress1}
                onChange={(e) => setNewClientAddress1(e.target.value)}
                placeholder="Address line 1"
                aria-label="Address line 1"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newClientCity}
                  onChange={(e) => setNewClientCity(e.target.value)}
                  placeholder="City"
                  aria-label="City"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  value={newClientState}
                  onChange={(e) => setNewClientState(e.target.value)}
                  placeholder="State"
                  aria-label="State"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-slate-50"
                  readOnly={!!newClientStateCode}
                />
              </div>

              <input
                type="text"
                value={newClientPincode}
                onChange={(e) => setNewClientPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Pincode"
                aria-label="Pincode"
                maxLength={6}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />

              <button
                onClick={handleCreateClient}
                disabled={!newClientName.trim() || createClient.isPending}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {createClient.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Create Client
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
