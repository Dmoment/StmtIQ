import { useMemo } from 'react';
import { BusinessProfile, Client } from '../../../types/invoice';
import { formatAddress } from '../../../utils/formatters';

interface BillingSectionProps {
  businessProfile: BusinessProfile | null;
  client: Client | null;
  accentColor: string;
}

export function BillingSection({ businessProfile, client, accentColor }: BillingSectionProps) {
  const businessAddress = useMemo(
    () =>
      formatAddress([
        businessProfile?.address_line1,
        businessProfile?.address_line2,
        businessProfile?.city,
        businessProfile?.state,
        businessProfile?.pincode,
      ]),
    [businessProfile]
  );

  const clientAddress = useMemo(
    () =>
      formatAddress([
        client?.billing_address_line1,
        client?.billing_address_line2,
        client?.billing_city,
        client?.billing_state,
        client?.billing_pincode,
      ]),
    [client]
  );

  return (
    <div className="grid grid-cols-2 gap-8 mb-8">
      {/* Billed By */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: accentColor }}
        >
          Billed By
        </div>
        <div className="font-semibold text-slate-900 mb-1">
          {businessProfile?.business_name || 'Your Business Name'}
        </div>
        {businessAddress && <div className="text-sm text-slate-600 mb-2">{businessAddress}</div>}
        {businessProfile?.gstin && (
          <div className="text-sm">
            <span className="text-slate-500">GSTIN:</span>{' '}
            <span className="font-mono text-slate-700">{businessProfile.gstin}</span>
          </div>
        )}
        {businessProfile?.pan && (
          <div className="text-sm">
            <span className="text-slate-500">PAN:</span>{' '}
            <span className="font-mono text-slate-700">{businessProfile.pan}</span>
          </div>
        )}
      </div>

      {/* Billed To */}
      <div className="p-4 bg-slate-50 rounded-lg">
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: accentColor }}
        >
          Billed To
        </div>
        {client ? (
          <>
            <div className="font-semibold text-slate-900 mb-1">
              {client.display_name || client.company_name || client.name}
            </div>
            {clientAddress && <div className="text-sm text-slate-600 mb-2">{clientAddress}</div>}
            {client.gstin && (
              <div className="text-sm">
                <span className="text-slate-500">GSTIN:</span>{' '}
                <span className="font-mono text-slate-700">{client.gstin}</span>
              </div>
            )}
            {client.pan && (
              <div className="text-sm">
                <span className="text-slate-500">PAN:</span>{' '}
                <span className="font-mono text-slate-700">{client.pan}</span>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-slate-400 italic">No client selected</div>
        )}
      </div>
    </div>
  );
}
