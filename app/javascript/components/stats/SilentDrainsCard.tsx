import { AlertCircle } from 'lucide-react';

interface SilentDrain {
  label: string;
  max_amount: number;
  total_amount: number;
  transaction_count: number;
  average_per_transaction: number;
}

interface SilentDrainsCardProps {
  drains: SilentDrain[];
}

export function SilentDrainsCard({ drains }: SilentDrainsCardProps) {
  if (!drains || drains.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <AlertCircle className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Silent Drains</h3>
            <p className="text-xs text-slate-500 mt-0.5">Small but frequent expenses</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {drains.map((drain, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-red-50 border border-red-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-red-900 uppercase tracking-wide">{drain.label}</p>
              <p className="text-base font-semibold text-red-700">₹{drain.total_amount.toLocaleString('en-IN')}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-red-600">
              <span>{drain.transaction_count} transactions</span>
              <span>Avg: ₹{drain.average_per_transaction}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

