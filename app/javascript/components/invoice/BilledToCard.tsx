import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Pencil, Search, Plus, User, X, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useClients, useCreateClient } from '../../queries/useClients';
import { Client } from '../../types/invoice';

interface BilledToCardProps {
  selectedClient: Client | null;
  onSelect: (client: Client | null) => void;
  onEdit?: (client: Client) => void;
}

export function BilledToCard({ selectedClient, onSelect, onEdit }: BilledToCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useClients({ search, active_only: true });
  const clients = (clientsData as Client[]) || [];
  const createClient = useCreateClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setShowNewClientForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const handleSelectClient = (client: Client) => {
    onSelect(client);
    setIsDropdownOpen(false);
    setSearch('');
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;

    try {
      const result = await createClient.mutateAsync({
        body: {
          name: newClientName,
          email: newClientEmail,
          company_name: newClientCompany,
        },
      });
      onSelect(result as Client);
      setShowNewClientForm(false);
      setIsDropdownOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientCompany('');
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const fullAddress = selectedClient
    ? [
        selectedClient.billing_address_line1,
        selectedClient.billing_address_line2,
        selectedClient.billing_city,
        selectedClient.billing_state,
        selectedClient.billing_pincode,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden" ref={dropdownRef}>
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">Billed To</span>
            <span className="text-xs text-slate-500">Client's Details</span>
          </div>
          <ChevronDown
            className={clsx(
              'w-4 h-4 text-slate-400 transition-transform cursor-pointer',
              !isExpanded && '-rotate-90'
            )}
            onClick={() => setIsExpanded(!isExpanded)}
          />
        </div>
      </div>

      {/* Client Selector */}
      <div className="relative">
        <div
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              selectedClient ? 'bg-emerald-100' : 'bg-slate-100'
            )}>
              <User className={clsx(
                'w-4 h-4',
                selectedClient ? 'text-emerald-600' : 'text-slate-400'
              )} />
            </div>
            <span className={clsx(
              'flex-1 font-medium',
              selectedClient ? 'text-slate-900' : 'text-slate-400 italic'
            )}>
              {selectedClient
                ? selectedClient.display_name || selectedClient.name
                : 'Select a client'}
            </span>
            <ChevronDown className={clsx(
              'w-4 h-4 text-slate-400 transition-transform',
              isDropdownOpen && 'rotate-180'
            )} />
          </div>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-b-xl shadow-lg z-50 overflow-hidden">
            {!showNewClientForm ? (
              <>
                {/* Search */}
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Client List */}
                <div className="max-h-48 overflow-y-auto">
                  {clients.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No clients found
                    </div>
                  ) : (
                    clients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleSelectClient(client)}
                        className={clsx(
                          'w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                          selectedClient?.id === client.id && 'bg-amber-50'
                        )}
                      >
                        <div className="font-medium text-slate-900">
                          {client.display_name || client.name}
                        </div>
                        {client.company_name && (
                          <div className="text-xs text-slate-500">{client.company_name}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>

                {/* Add New Client */}
                <div className="p-2 border-t border-slate-100">
                  <button
                    onClick={() => setShowNewClientForm(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add New Client
                  </button>
                </div>
              </>
            ) : (
              /* New Client Form */
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-slate-900">New Client</h4>
                  <button
                    onClick={() => setShowNewClientForm(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                <input
                  type="text"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Client name *"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  autoFocus
                />

                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="Email (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />

                <input
                  type="text"
                  value={newClientCompany}
                  onChange={(e) => setNewClientCompany(e.target.value)}
                  placeholder="Company name (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />

                <button
                  onClick={handleCreateClient}
                  disabled={!newClientName.trim() || createClient.isPending}
                  className="w-full px-4 py-2 bg-amber-200 hover:bg-amber-300 text-slate-900 font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                >
                  {createClient.isPending ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expandable Details */}
      {isExpanded && selectedClient && (
        <div className="px-4 py-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Business details
            </span>
            {onEdit && (
              <button
                onClick={() => onEdit(selectedClient)}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
              <span className="text-slate-500">Business Name</span>
              <span className="text-slate-900 font-medium">
                {selectedClient.company_name || selectedClient.name}
              </span>
            </div>

            {fullAddress && (
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-slate-500">Address</span>
                <span className="text-slate-900">{fullAddress}</span>
              </div>
            )}

            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
              <span className="text-slate-500">GSTIN</span>
              <span className="text-slate-900 font-mono">
                {selectedClient.gstin || '-'}
              </span>
            </div>

            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
              <span className="text-slate-500">PAN</span>
              <span className="text-slate-900 font-mono">
                {selectedClient.pan || '-'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {isExpanded && !selectedClient && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-slate-500">
            Select a client to see their details
          </p>
        </div>
      )}
    </div>
  );
}
