import { useState, useEffect } from 'react';
import { ChevronDown, Pencil, Building2, Check, X } from 'lucide-react';
import { clsx } from 'clsx';
import { BusinessProfile } from '../../types/invoice';

interface BilledByCardProps {
  profile: BusinessProfile | null;
  onEdit?: () => void;
  onProfileChange?: (profile: BusinessProfile) => void;
  editable?: boolean;
}

export function BilledByCard({ profile, onEdit, onProfileChange, editable = true }: BilledByCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<BusinessProfile>({});

  useEffect(() => {
    if (profile) {
      setEditedProfile(profile);
    }
  }, [profile]);

  const fullAddress = [
    profile?.address_line1,
    profile?.address_line2,
    profile?.city,
    profile?.state,
    profile?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const handleSave = () => {
    if (onProfileChange) {
      onProfileChange(editedProfile);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof BusinessProfile, value: string) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
  };

  return (
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
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editedProfile.business_name || ''}
              onChange={(e) => handleFieldChange('business_name', e.target.value)}
              className="flex-1 font-medium text-slate-900 px-2 py-1 rounded border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Business Name"
            />
          ) : (
            <span className="flex-1 font-medium text-slate-900">
              {profile?.business_name || 'Your Business Name'}
            </span>
          )}
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="px-4 py-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Business details
            </span>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            ) : editable ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            ) : onEdit ? (
              <button
                onClick={onEdit}
                className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                Edit
              </button>
            ) : null}
          </div>

          <div className="space-y-2.5">
            {/* Business Name */}
            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
              <span className="text-slate-500 pt-1">Business Name</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.business_name || ''}
                  onChange={(e) => handleFieldChange('business_name', e.target.value)}
                  className="text-slate-900 font-medium px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter business name"
                />
              ) : (
                <span className="text-slate-900 font-medium">
                  {profile?.business_name || '-'}
                </span>
              )}
            </div>

            {/* Address */}
            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
              <span className="text-slate-500 pt-1">Address</span>
              {isEditing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editedProfile.address_line1 || ''}
                    onChange={(e) => handleFieldChange('address_line1', e.target.value)}
                    className="w-full text-slate-900 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    placeholder="Address Line 1"
                  />
                  <input
                    type="text"
                    value={editedProfile.address_line2 || ''}
                    onChange={(e) => handleFieldChange('address_line2', e.target.value)}
                    className="w-full text-slate-900 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                    placeholder="Address Line 2"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={editedProfile.city || ''}
                      onChange={(e) => handleFieldChange('city', e.target.value)}
                      className="text-slate-900 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      placeholder="City"
                    />
                    <input
                      type="text"
                      value={editedProfile.state || ''}
                      onChange={(e) => handleFieldChange('state', e.target.value)}
                      className="text-slate-900 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      placeholder="State"
                    />
                    <input
                      type="text"
                      value={editedProfile.pincode || ''}
                      onChange={(e) => handleFieldChange('pincode', e.target.value)}
                      className="text-slate-900 px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      placeholder="Pincode"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-slate-900">{fullAddress || '-'}</span>
              )}
            </div>

            {/* GSTIN */}
            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
              <span className="text-slate-500 pt-1">GSTIN</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.gstin || ''}
                  onChange={(e) => handleFieldChange('gstin', e.target.value.toUpperCase())}
                  className="text-slate-900 font-mono px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
                  placeholder="22AAAAA0000A1Z5"
                  maxLength={15}
                />
              ) : (
                <span className="text-slate-900 font-mono">
                  {profile?.gstin || '-'}
                </span>
              )}
            </div>

            {/* PAN */}
            <div className="grid grid-cols-[100px_1fr] gap-2 text-sm items-start">
              <span className="text-slate-500 pt-1">PAN</span>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.pan || ''}
                  onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                  className="text-slate-900 font-mono px-2 py-1 rounded border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent uppercase"
                  placeholder="AAAAA0000A"
                  maxLength={10}
                />
              ) : (
                <span className="text-slate-900 font-mono">
                  {profile?.pan || '-'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
