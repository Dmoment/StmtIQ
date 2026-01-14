import { useState } from 'react';
import { X, Archive, Calendar, Loader2, Check, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { useBuckets, useCreateBucket, useAddDocumentToBucket } from '../../queries/useDocuments';

interface AddToBucketModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentIds: number[];
  onSuccess?: () => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth();
  const year = date.getFullYear();
  const fyYear = month >= 3 ? year : year - 1;
  return `${fyYear}-${String(fyYear + 1).slice(-2)}`;
}

export function AddToBucketModal({ isOpen, onClose, documentIds, onSuccess }: AddToBucketModalProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [isAdding, setIsAdding] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  const { data: buckets = [] } = useBuckets({ bucket_type: 'monthly' });
  const createBucket = useCreateBucket();
  const addDocumentToBucket = useAddDocumentToBucket();

  // Generate years
  const currentYear = currentDate.getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  // Financial year months order (April to March)
  const fyMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

  // Find existing bucket for selected month/year
  const existingBucket = buckets.find(b => b.month === selectedMonth && b.year === selectedYear);

  const handleAddToBucket = async () => {
    if (documentIds.length === 0) return;

    setIsAdding(true);
    setAddedCount(0);

    try {
      // Get or create bucket
      let bucketId: number;

      if (existingBucket) {
        bucketId = existingBucket.id;
      } else {
        const newBucket = await createBucket.mutateAsync({
          month: selectedMonth,
          year: selectedYear,
          bucket_type: 'monthly',
        });
        bucketId = newBucket.id;
      }

      // Add each document to the bucket
      for (const docId of documentIds) {
        try {
          await addDocumentToBucket.mutateAsync({
            bucket_id: bucketId,
            document_id: docId,
          });
          setAddedCount(prev => prev + 1);
        } catch (error) {
          console.error(`Failed to add document ${docId}:`, error);
        }
      }

      setCompleted(true);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to add to bucket:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleClose = () => {
    setSelectedMonth(currentDate.getMonth() + 1);
    setSelectedYear(currentDate.getFullYear());
    setIsAdding(false);
    setAddedCount(0);
    setCompleted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Archive className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Add to Bucket</h2>
              <p className="text-sm text-slate-500">
                {documentIds.length} document{documentIds.length !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors" aria-label="Close modal">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {completed ? (
            // Success State
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Added Successfully!</h3>
              <p className="text-sm text-slate-500 mb-4">
                {addedCount} document{addedCount !== 1 ? 's' : ''} added to{' '}
                <strong>{MONTHS[selectedMonth - 1]} {selectedYear}</strong> bucket
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-2.5 bg-amber-200 hover:bg-amber-300 text-slate-900 rounded-xl font-medium transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-4">
                Select the month to organize these documents for your CA
              </p>

              {/* Month/Year Selection */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={isAdding}
                  >
                    {fyMonths.map((month) => (
                      <option key={month} value={month}>
                        {MONTHS[month - 1]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={isAdding}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bucket Info */}
              <div className={clsx(
                'p-4 rounded-xl border-2 border-dashed mb-6',
                existingBucket ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'
              )}>
                <div className="flex items-center gap-3">
                  <Calendar className={clsx('w-5 h-5', existingBucket ? 'text-amber-600' : 'text-slate-400')} />
                  <div>
                    <p className="font-medium text-slate-900">
                      {MONTHS[selectedMonth - 1]} {selectedYear}
                    </p>
                    {existingBucket ? (
                      <p className="text-sm text-slate-500">
                        Existing bucket with {existingBucket.document_count} documents
                      </p>
                    ) : (
                      <p className="text-sm text-slate-500">
                        New bucket will be created
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress */}
              {isAdding && (
                <div className="mb-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Adding documents...</span>
                    <span className="text-slate-900 font-medium" aria-live="polite">
                      {addedCount} / {documentIds.length}
                    </span>
                  </div>
                  <div
                    className="h-2 bg-slate-200 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={Math.round((addedCount / documentIds.length) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Document upload progress"
                  >
                    <div
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${(addedCount / documentIds.length) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!completed && (
          <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={handleClose}
              disabled={isAdding}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToBucket}
              disabled={isAdding || documentIds.length === 0}
              className="px-4 py-2 text-sm font-medium text-slate-900 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isAdding ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Add to Bucket
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
