import { useState, useRef, useEffect } from 'react';
import { Search, Plus, X, User, Building2, MapPin, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useClients, useCreateClient } from '../../queries/useClients';

interface Client {
  id: number;
  name: string;
  email?: string;
  company_name?: string;
  gstin?: string;
  billing_city?: string;
  billing_state?: string;
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
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientCompany, setNewClientCompany] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: clientsData } = useClients({ search, active_only: true });
  const clients = (clientsData as any) || [];
  const createClient = useCreateClient();

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

  const handleSelect = (client: Client) => {
    onSelect(client);
    setIsOpen(false);
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
      onSelect(result as any);
      setShowNewClientForm(false);
      setIsOpen(false);
      setNewClientName('');
      setNewClientEmail('');
      setNewClientCompany('');
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Display/Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        className={clsx(
          'cursor-pointer rounded-lg p-3 -m-3 transition-colors',
          'hover:bg-amber-50',
          isOpen && 'bg-amber-50'
        )}
      >
        {selectedClient ? (
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                {selectedClient.display_name || selectedClient.name}
              </span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
            {selectedClient.company_name && (
              <div className="text-sm text-slate-600 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3" />
                {selectedClient.company_name}
              </div>
            )}
            {(selectedClient.billing_city || selectedClient.billing_state) && (
              <div className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {[selectedClient.billing_city, selectedClient.billing_state].filter(Boolean).join(', ')}
              </div>
            )}
            {selectedClient.gstin && (
              <div className="text-xs text-slate-400 font-mono mt-1">
                GSTIN: {selectedClient.gstin}
              </div>
            )}
          </div>
        ) : (
          <div className="text-slate-400 italic flex items-center gap-2">
            <User className="w-4 h-4" />
            {placeholder}
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          {!showNewClientForm ? (
            <>
              {/* Search Input */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search clients..."
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
                      className={clsx(
                        'w-full text-left p-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                        selectedClient?.id === client.id && 'bg-amber-50'
                      )}
                    >
                      <div className="font-medium text-slate-900">
                        {client.display_name || client.name}
                      </div>
                      {client.company_name && (
                        <div className="text-sm text-slate-500">{client.company_name}</div>
                      )}
                      {client.email && (
                        <div className="text-xs text-slate-400">{client.email}</div>
                      )}
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
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                autoFocus
              />

              <input
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Email (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
              />

              <input
                type="text"
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                placeholder="Company name (optional)"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
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
  );
}
