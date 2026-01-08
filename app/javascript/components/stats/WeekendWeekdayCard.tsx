import { Clock } from 'lucide-react';

interface WeekendWeekdayCardProps {
  data: {
    weekend: {
      total: number;
      count: number;
      average: number;
    };
    weekday: {
      total: number;
      count: number;
      average: number;
    };
  };
}

export function WeekendWeekdayCard({ data }: WeekendWeekdayCardProps) {
  if (!data) return null;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Weekend vs Weekday</h3>
            <p className="text-xs text-slate-500 mt-0.5">Spending patterns</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cyan-900 uppercase tracking-wide">Weekend</p>
            <p className="text-base font-semibold text-cyan-700">₹{data.weekend.total.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs text-cyan-600">
            {data.weekend.count} transactions • Avg: ₹{data.weekend.average}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-900 uppercase tracking-wide">Weekday</p>
            <p className="text-base font-semibold text-slate-700">₹{data.weekday.total.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs text-slate-600">
            {data.weekday.count} transactions • Avg: ₹{data.weekday.average}
          </p>
        </div>
      </div>
    </div>
  );
}

