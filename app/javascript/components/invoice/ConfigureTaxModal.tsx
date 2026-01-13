import { useState, useEffect } from 'react';
import { X, Percent, Plus } from 'lucide-react';
import { clsx } from 'clsx';

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

const TAX_TYPES = [
  { value: 'gst_india', label: 'GST (India)' },
  { value: 'none', label: 'No Tax' },
];

export interface TaxConfig {
  taxType: 'gst_india' | 'none';
  placeOfSupply: string;
  gstType: 'igst' | 'cgst_sgst';
  cessRate: number;
  isReverseCharge: boolean;
}

interface ConfigureTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: TaxConfig;
  onSave: (config: TaxConfig) => void;
  businessStateCode?: string;
}

export function ConfigureTaxModal({
  isOpen,
  onClose,
  config,
  onSave,
  businessStateCode,
}: ConfigureTaxModalProps) {
  const [localConfig, setLocalConfig] = useState<TaxConfig>(config);
  const [showCess, setShowCess] = useState(config.cessRate > 0);

  useEffect(() => {
    setLocalConfig(config);
    setShowCess(config.cessRate > 0);
  }, [config]);

  // Auto-detect GST type based on place of supply
  useEffect(() => {
    if (businessStateCode && localConfig.placeOfSupply) {
      const isSameState = businessStateCode === localConfig.placeOfSupply;
      setLocalConfig((prev) => ({
        ...prev,
        gstType: isSameState ? 'cgst_sgst' : 'igst',
      }));
    }
  }, [businessStateCode, localConfig.placeOfSupply]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...localConfig,
      cessRate: showCess ? localConfig.cessRate : 0,
    });
    onClose();
  };

  const selectedStateName = INDIAN_STATES.find(
    (s) => s.code === localConfig.placeOfSupply
  )?.name;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Percent className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">Configure Tax</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* 1. Select Tax Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              1. Select Tax Type<span className="text-red-500">*</span>
            </label>
            <select
              value={localConfig.taxType}
              onChange={(e) =>
                setLocalConfig((prev) => ({
                  ...prev,
                  taxType: e.target.value as TaxConfig['taxType'],
                }))
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {TAX_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {localConfig.taxType === 'gst_india' && (
            <>
              {/* 2. Place of Supply */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  2. Place of Supply<span className="text-red-500">*</span>
                </label>
                <select
                  value={localConfig.placeOfSupply}
                  onChange={(e) =>
                    setLocalConfig((prev) => ({
                      ...prev,
                      placeOfSupply: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                {businessStateCode && selectedStateName && (
                  <p className="mt-1.5 text-xs text-slate-500">
                    {businessStateCode === localConfig.placeOfSupply
                      ? 'Same state as your business - CGST & SGST applies'
                      : 'Different state - IGST applies'}
                  </p>
                )}
              </div>

              {/* 3. GST Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  3. GST Type<span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gstType"
                      value="igst"
                      checked={localConfig.gstType === 'igst'}
                      onChange={() =>
                        setLocalConfig((prev) => ({ ...prev, gstType: 'igst' }))
                      }
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">IGST</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gstType"
                      value="cgst_sgst"
                      checked={localConfig.gstType === 'cgst_sgst'}
                      onChange={() =>
                        setLocalConfig((prev) => ({ ...prev, gstType: 'cgst_sgst' }))
                      }
                      className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-slate-700">CGST & SGST</span>
                  </label>
                </div>

                {/* Add Cess */}
                {!showCess ? (
                  <button
                    onClick={() => setShowCess(true)}
                    className="mt-3 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Cess
                  </button>
                ) : (
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-sm text-slate-600">Cess Rate:</label>
                    <input
                      type="number"
                      value={localConfig.cessRate || ''}
                      onChange={(e) =>
                        setLocalConfig((prev) => ({
                          ...prev,
                          cessRate: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="0"
                      min="0"
                      step="0.5"
                    />
                    <span className="text-sm text-slate-500">%</span>
                    <button
                      onClick={() => {
                        setShowCess(false);
                        setLocalConfig((prev) => ({ ...prev, cessRate: 0 }));
                      }}
                      className="ml-2 p-1 hover:bg-slate-100 rounded"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                )}
              </div>

              {/* 4. Other Options */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  4. Other Options
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localConfig.isReverseCharge}
                    onChange={(e) =>
                      setLocalConfig((prev) => ({
                        ...prev,
                        isReverseCharge: e.target.checked,
                      }))
                    }
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-sm text-slate-700">
                    Is Reverse Charge Applicable?
                  </span>
                </label>
                {localConfig.isReverseCharge && (
                  <p className="mt-1.5 ml-6 text-xs text-slate-500">
                    Tax liability will be on the recipient
                  </p>
                )}
              </div>
            </>
          )}

          {localConfig.taxType === 'none' && (
            <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl">
              No tax will be applied to this invoice. Use this for exempt supplies
              or exports.
            </p>
          )}

          {/* Info Banner */}
          {localConfig.taxType === 'gst_india' && localConfig.placeOfSupply && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                You are billing to a{' '}
                <strong>
                  {businessStateCode === localConfig.placeOfSupply
                    ? 'Regular B2B client (Same State)'
                    : 'Regular B2B client (Different State)'}
                </strong>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-medium bg-amber-200 text-slate-900 hover:bg-amber-300 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
