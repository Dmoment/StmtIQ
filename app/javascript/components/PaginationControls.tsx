import { memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface PaginationControlsProps {
  currentPage: number;
  perPage: number;
  totalItems: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

export const PaginationControls = memo(function PaginationControls({
  currentPage,
  perPage,
  totalItems,
  hasMore,
  onPageChange,
  onPerPageChange,
}: PaginationControlsProps) {
  const startItem = (currentPage - 1) * perPage + 1;
  const endItem = (currentPage - 1) * perPage + totalItems;

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500">
          Showing {startItem} - {endItem} transactions
        </span>

        <div className="flex items-center gap-2">
          <label htmlFor="per-page-select" className="text-sm text-slate-500">
            Per page:
          </label>
          <select
            id="per-page-select"
            value={perPage}
            onChange={(e) => {
              onPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-9 bg-white border border-slate-200 rounded-xl px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 shadow-sm"
            aria-label="Items per page"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      <nav className="flex items-center gap-1" aria-label="Pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
          title="First page"
          aria-label="Go to first page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
          title="Previous page"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span
          className="h-9 px-4 text-sm font-medium text-slate-700 bg-slate-50 rounded-xl border border-slate-200 flex items-center"
          aria-current="page"
        >
          Page {currentPage}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasMore}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
          title="Next page"
          aria-label="Go to next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={() => onPageChange(currentPage + 10)}
          disabled={!hasMore}
          className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm flex items-center justify-center"
          title="Jump ahead"
          aria-label="Jump 10 pages ahead"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
});
