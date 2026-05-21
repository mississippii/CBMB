import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Pagination controls with prev/next + page size selector + showing-N-of-M.
 * Pass plain numbers and a callback; the parent owns the state.
 */
const Pagination = ({
  page, totalPages, pageSize, total, isLoading,
  onPageChange, onPageSizeChange,
  pageSizes = [10, 20, 50, 100],
  formatNumber = (v) => Number(v).toLocaleString(),
  labels = { prev: 'Previous', next: 'Next', perPage: 'per page', showing: 'Showing {from}–{to} of {total}' },
}) => {
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  const showingText = labels.showing
    .replace('{from}', formatNumber(from))
    .replace('{to}', formatNumber(to))
    .replace('{total}', formatNumber(total));

  return (
    <div className="data-card-footer">
      <div className="text-xs text-slate-500">{showingText}</div>
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="data-card-select">
              {pageSizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>{labels.perPage}</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={page === 0 || isLoading}
            className="page-btn"
            aria-label={labels.prev}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-semibold text-slate-700 px-2">
            {formatNumber(page + 1)} / {formatNumber(Math.max(1, totalPages))}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1 || isLoading}
            className="page-btn"
            aria-label={labels.next}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
