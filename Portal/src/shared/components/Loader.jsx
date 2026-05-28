/**
 * Consistent loading + error placeholders.
 * Replace ad-hoc "Loading…" text / inline spinners with these.
 */

/** Inline loading row — for inside cards/sections. */
export const Loader = ({ label = 'Loading…' }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
    <span className="inline-flex items-center gap-2">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      {label}
    </span>
  </div>
);

/** Empty state — when a query succeeded but returned no rows. */
export const EmptyRow = ({ label = 'No records yet.' }) => (
  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
    {label}
  </div>
);

/** Error banner — for inline display under a failed fetch. */
export const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
      {message}
    </div>
  );
};

export default Loader;
