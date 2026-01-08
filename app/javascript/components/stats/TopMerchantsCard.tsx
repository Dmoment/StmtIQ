import { Building2, ArrowRightLeft } from 'lucide-react';

interface Merchant {
  name: string;
  amount: number;
  transaction_count: number;
}

interface TopMerchantsCardProps {
  merchants: Merchant[];
}

export function TopMerchantsCard({ merchants }: TopMerchantsCardProps) {
  if (!merchants || merchants.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <Building2 className="w-5 h-5 text-amber-500" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Top Merchants</h3>
            <p className="text-xs text-slate-500 mt-0.5">By total spend ({merchants.length})</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        {merchants.slice(0, 5).map((merchant, idx) => {
          const isTruncated = merchant.name.length > 35;
          return (
            <div 
              key={idx} 
              className="relative flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3 flex-[1.5] min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-medium text-slate-900 truncate text-sm mb-0.5">{merchant.name}</p>
                  <p className="text-xs text-slate-500">{merchant.transaction_count} transactions</p>
                </div>
              </div>
              <div className="flex items-center gap-6 ml-4 flex-shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-slate-900 text-sm">₹{merchant.amount.toLocaleString('en-IN')}</p>
                </div>
                <ArrowRightLeft className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0" />
              </div>
              
              {isTruncated && (
                <div className="absolute left-20 top-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <div className="bg-white/70 backdrop-blur-lg text-slate-900 text-xs rounded-lg px-3 py-2 shadow-2xl border border-slate-300/60 relative">
                    <div className="font-semibold mb-1.5 text-slate-900 text-sm">{merchant.name}</div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-600">{merchant.transaction_count}</span>
                        <span className="text-slate-600">transactions</span>
                      </div>
                      <div className="text-xs text-slate-500 pt-1 border-t border-slate-200/50">
                        Total: ₹{merchant.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full">
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-r-[5px] border-r-white/70 border-b-[5px] border-b-transparent"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

