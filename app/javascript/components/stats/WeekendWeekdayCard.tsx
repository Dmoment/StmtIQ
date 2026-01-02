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
    <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg border border-slate-200 bg-slate-50">
            <Clock className="w-5 h-5 text-slate-700" strokeWidth={2} fill="none" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Weekend vs Weekday</h3>
            <p className="text-xs text-slate-500 mt-0.5">Spending patterns</p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-cyan-900 uppercase tracking-wide">Weekend</p>
            <p className="text-base font-semibold text-cyan-700">₹{data.weekend.total.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-xs text-cyan-600">
            {data.weekend.count} transactions • Avg: ₹{data.weekend.average}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
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

