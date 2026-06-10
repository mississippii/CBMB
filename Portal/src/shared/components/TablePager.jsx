import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Client-side pagination for any in-memory list.
 *
 *   const { pageItems, ...pager } = usePagination(rows, 15, [filterA, filterB]);
 *   …render pageItems…
 *   <TablePager {...pager} />
 *
 * `resetDeps` (optional) sends the view back to page 1 whenever those values
 * change — pass your filter/search state so a new filter starts at the top.
 */
export const usePagination = (items = [], initialPageSize = 15, resetDeps = []) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, resetDeps);

  // Changing how many rows show per page returns to the first page.
  const changePageSize = (size) => { setPageSize(size); setPage(1); };

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return {
    pageItems,
    page: safePage,
    setPage,
    pageSize,
    setPageSize: changePageSize,
    totalPages,
    total,
    rangeStart: total === 0 ? 0 : (safePage - 1) * pageSize + 1,
    rangeEnd: Math.min(safePage * pageSize, total),
  };
};

// Compact page list with ellipses: 1 … 4 5 6 … 12
const buildPageList = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push('…');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push('…');
  pages.push(total);
  return pages;
};

/** Centered arrow + numbered page controls, rendered under a table. */
const TablePager = ({
  page, totalPages, setPage, total, rangeStart, rangeEnd,
  pageSize, setPageSize, pageSizeOptions = [15, 50, 100],
  actions,
}) => {
  if (!total) return null;
  const pages = buildPageList(page, totalPages);
  const showSizePicker = setPageSize && total > Math.min(...pageSizeOptions);

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:grid sm:grid-cols-3 sm:items-center">
      {/* Left — row info + page-size picker */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:justify-start">
        {showSizePicker && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <span>per page</span>
          </label>
        )}
        <p className="text-xs font-semibold text-slate-500">
          Showing <span className="text-slate-800">{rangeStart}–{rangeEnd}</span> of{' '}
          <span className="text-slate-800">{total}</span>
        </p>
      </div>

      {/* Center — page navigation */}
      <div className="flex justify-center">
        {totalPages > 1 && (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            {pages.map((p, i) => (p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-slate-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-bold transition ${
                  p === page
                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {p}
              </button>
            )))}
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Right — optional actions (e.g. Export) */}
      <div className="flex justify-center sm:justify-end">
        {actions}
      </div>
    </div>
  );
};

export default TablePager;
