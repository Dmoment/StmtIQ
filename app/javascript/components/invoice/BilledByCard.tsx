import { useState } from 'react';
import { ChevronDown, Pencil, Building2 } from 'lucide-react';
import { clsx } from 'clsx';
import { BusinessProfile } from '../../types/invoice';
import { AddBusinessModal } from '../business/AddBusinessModal';
import { InfoTooltip } from '../ui/InfoTooltip';

interface BilledByCardProps {
  profile: BusinessProfile | null;
  onEdit?: () => void;
  onProfileChange?: (profile: BusinessProfile) => void;
  editable?: boolean;
}

export function BilledByCard({ profile, onEdit, onProfileChange, editable = true }: BilledByCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  const fullAddress = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.city,
    profile?.state,
    profile?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const handleEditClick = () => {
    if (onEdit) {
      onEdit();
    } else {
      setShowEditModal(true);
    }
  };

  const handleProfileSaved = () => {
    // Profile is automatically refreshed via React Query
    setShowEditModal(false);
  };

  return (
    <>
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900">Billed By</span>
              <span className="text-xs text-slate-500">Your Details</span>
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

        {/* Dropdown - Business Name */}
        <div
          onClick={handleEditClick}
          className="px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <span className="flex-1 font-medium text-slate-900">
              {profile?.business_name || 'Add Your Business'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </div>
        </div>

        {/* Expandable Details */}
        {isExpanded && profile && (
          <div className="px-4 py-4 bg-white">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                Business details
              </span>
              {editable && (
                <button
                  onClick={handleEditClick}
                  className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                  Edit
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Business Name */}
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                <span className="text-slate-500 pt-1">Business Name</span>
                <span className="text-slate-900 font-medium">
                  {profile?.business_name || '-'}
                </span>
              </div>

              {/* Address */}
              {fullAddress && (
                <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                  <span className="text-slate-500 pt-1">Address</span>
                  <span className="text-slate-900">{fullAddress}</span>
                </div>
              )}

              {/* GSTIN */}
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                <span className="text-slate-500 pt-1 flex items-center gap-1">
                  GSTIN
                  <InfoTooltip
                    content={
                      <>
                        Your GST Identification Number (15 digits).
                        <br /><br />
                        Mandatory on all tax invoices. First 2 digits indicate state code.
                      </>
                    }
                    position="right"
                  />
                </span>
                <span className="text-slate-900 font-mono">
                  {profile?.gstin || '-'}
                </span>
              </div>

              {/* PAN */}
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
                <span className="text-slate-500 pt-1 flex items-center gap-1">
                  PAN
                  <InfoTooltip
                    content={
                      <>
                        Your Permanent Account Number (10 characters).
                        <br /><br />
                        Required for tax filing and embedded in your GSTIN (chars 3-12).
                      </>
                    }
                    position="right"
                  />
                </span>
                <span className="text-slate-900 font-mono">
                  {profile?.pan || '-'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {isExpanded && !profile && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-slate-500 mb-2">
              Set up your business profile
            </p>
            <button
              onClick={handleEditClick}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              Add Business Details
            </button>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AddBusinessModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={handleProfileSaved}
      />
    </>
  );
}
