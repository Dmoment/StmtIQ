import { useState } from 'react';
import {
  Archive,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Sparkles,
  Lock,
  Send,
} from 'lucide-react';
import { clsx } from 'clsx';
import type { Bucket } from '../../types/documents';
import { useBuckets, useFinalizeBucket, useAutoCollectBucket } from '../../queries/useDocuments';

interface BucketPanelProps {
  onSelectBucket: (bucket: Bucket) => void;
  onShareBucket: (bucket: Bucket) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const fyYear = month >= 3 ? year : year - 1; // April onwards is new FY
  return `${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'draft':
      return 'bg-slate-100 text-slate-600';
    case 'finalized':
      return 'bg-amber-100 text-amber-700';
    case 'shared':
      return 'bg-emerald-100 text-emerald-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'draft':
      return <Clock className="w-3.5 h-3.5" />;
    case 'finalized':
      return <Lock className="w-3.5 h-3.5" />;
    case 'shared':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    default:
      return <Clock className="w-3.5 h-3.5" />;
  }
}

export function BucketPanel({ onSelectBucket, onShareBucket }: BucketPanelProps) {
  const [selectedFY, setSelectedFY] = useState(getFinancialYear());
  const [expandedMonth, setExpandedMonth] = useState<number | null>(new Date().getMonth() + 1);

  const { data: buckets, isLoading } = useBuckets({
    financial_year: selectedFY,
    bucket_type: 'monthly',
  });

  const finalizeBucket = useFinalizeBucket();
  const autoCollect = useAutoCollectBucket();

  // Generate financial years (current and past 2)
  const currentFY = getFinancialYear();
  const financialYears = [
    currentFY,
    `${parseInt(currentFY.split('-')[0]) - 1}-${String(parseInt(currentFY.split('-')[0])).slice(-2)}`,
    `${parseInt(currentFY.split('-')[0]) - 2}-${String(parseInt(currentFY.split('-')[0]) - 1).slice(-2)}`,
  ];

  // Get bucket for a specific month
  const getBucketForMonth = (month: number): Bucket | undefined => {
    if (!buckets) return undefined;

    // Determine year based on financial year
    const [fyStartYear] = selectedFY.split('-').map(Number);
    const year = month >= 4 ? fyStartYear : fyStartYear + 1;

    return buckets.find((b) => b.month === month && b.year === year);
  };

  // Get months in financial year order (April to March)
  const fyMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  const handleAutoCollect = async (bucket: Bucket) => {
    try {
      await autoCollect.mutateAsync({ id: bucket.id });
    } catch (error) {
      console.error('Auto-collect failed:', error);
    }
  };

  const handleFinalize = async (bucket: Bucket) => {
    try {
      await finalizeBucket.mutateAsync(bucket.id);
    } catch (error) {
      console.error('Finalize failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <Archive className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-slate-900">Monthly Buckets</h3>
        </div>
        <p className="text-xs text-slate-500 mb-3">
          Organize documents by month and share with your CA
        </p>

        {/* Financial Year Selector */}
        <select
          value={selectedFY}
          onChange={(e) => setSelectedFY(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          {financialYears.map((fy) => (
            <option key={fy} value={fy}>
              FY {fy}
            </option>
          ))}
        </select>
      </div>

      {/* Month List */}
      <div className="flex-1 overflow-y-auto p-2">
        {fyMonths.map((month) => {
          const bucket = getBucketForMonth(month);
          const isExpanded = expandedMonth === month;
          const [fyStartYear] = selectedFY.split('-').map(Number);
          const year = month >= 4 ? fyStartYear : fyStartYear + 1;

          return (
            <div key={month} className="mb-2">
              {/* Month Header */}
              <button
                onClick={() => setExpandedMonth(isExpanded ? null : month)}
                className={clsx(
                  'w-full flex items-center justify-between p-3 rounded-xl transition-colors',
                  isExpanded ? 'bg-amber-50' : 'hover:bg-slate-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{MONTHS[month - 1]} {year}</span>
                </div>
                <div className="flex items-center gap-2">
                  {bucket && (
                    <>
                      <span className="text-xs text-slate-500">{bucket.document_count} docs</span>
                      <span className={clsx('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', getStatusColor(bucket.status))}>
                        {getStatusIcon(bucket.status)}
                        {bucket.status}
                      </span>
                    </>
                  )}
                  <ChevronRight className={clsx('w-4 h-4 text-slate-400 transition-transform', isExpanded && 'rotate-90')} />
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-2 ml-4 p-3 bg-slate-50 rounded-xl space-y-3">
                  {bucket ? (
                    <>
                      {/* Stats */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-slate-600">
                          <FileText className="w-4 h-4" />
                          {bucket.document_count} documents
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onSelectBucket(bucket)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          View Documents
                        </button>

                        {bucket.is_draft && (
                          <>
                            <button
                              onClick={() => handleAutoCollect(bucket)}
                              disabled={autoCollect.isPending}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-100 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                            >
                              {autoCollect.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                              )}
                              Auto-Collect
                            </button>

                            <button
                              onClick={() => handleFinalize(bucket)}
                              disabled={finalizeBucket.isPending || bucket.document_count === 0}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              {finalizeBucket.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Lock className="w-3.5 h-3.5" />
                              )}
                              Finalize
                            </button>
                          </>
                        )}

                        {(bucket.is_finalized || bucket.is_shared) && (
                          <button
                            onClick={() => onShareBucket(bucket)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Share with CA
                          </button>
                        )}
                      </div>

                      {bucket.shared_at && (
                        <p className="text-xs text-emerald-600">
                          Shared on {new Date(bucket.shared_at).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-sm text-slate-500 mb-2">No bucket created yet</p>
                      <p className="text-xs text-slate-400">
                        Upload documents dated in {MONTHS[month - 1]} to auto-create
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
