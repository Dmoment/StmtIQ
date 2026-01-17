import { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useClients, useDeleteClient } from '../queries/useClients';
import { getLogoUrl, getFallbackLogoUrl } from '../queries/useGst';
import { AddClientModal } from '../components/clients/AddClientModal';
import { Client } from '../types/invoice';

export function Clients() {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const { data: clientsData, isLoading } = useClients({ search, active_only: true });
  const clients = (clientsData as Client[]) || [];
  const deleteClient = useDeleteClient();

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
    } else {
      setEditingClient(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteClient.mutateAsync(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting client:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your clients and their billing information</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search clients by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search clients"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" aria-label="Loading clients" />
          </div>
        ) : !clients || clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-slate-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">No clients yet</h3>
            <p className="text-sm text-slate-500 mb-4">Add your first client to start creating invoices</p>
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Add Client
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {/* Client Logo/Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0 overflow-hidden">
                    {client.email ? (
                      <img
                        src={getLogoUrl(client.email) || ''}
                        alt=""
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const fallback = getFallbackLogoUrl(client.email);
                          if (fallback && (e.target as HTMLImageElement).src !== fallback) {
                            (e.target as HTMLImageElement).src = fallback;
                          } else {
                            // Show initial if logo fails
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = client.name?.charAt(0)?.toUpperCase() || 'C';
                          }
                        }}
                      />
                    ) : (
                      client.name?.charAt(0)?.toUpperCase() || 'C'
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{client.display_name || client.name}</h3>
                      {client.gstin && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-lg font-medium flex-shrink-0">
                          GST
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500 flex-wrap">
                      {client.email && (
                        <span className="flex items-center gap-1 truncate">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          {client.email}
                        </span>
                      )}
                      {client.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          {client.phone}
                        </span>
                      )}
                      {client.company_name && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                          {client.company_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenModal(client)}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit"
                    aria-label={`Edit ${client.name}`}
                  >
                    <Edit className="w-4 h-4 text-slate-500" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(client.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                    aria-label={`Delete ${client.name}`}
                  >
                    <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" aria-hidden="true" />
                  </button>
                </div>

                {/* Delete Confirmation */}
                {showDeleteConfirm === client.id && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">Delete Client</h3>
                          <p className="text-sm text-slate-500">This action cannot be undone</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 mb-6">
                        Are you sure you want to delete <strong>{client.name}</strong>?
                        {(client.total_invoiced?.count ?? 0) > 0 && ' The client will be deactivated instead since they have invoices.'}
                      </p>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(client.id)}
                          disabled={deleteClient.isPending}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {deleteClient.isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddClientModal
        isOpen={showModal}
        onClose={handleCloseModal}
        editingClient={editingClient}
      />
    </div>
  );
}
