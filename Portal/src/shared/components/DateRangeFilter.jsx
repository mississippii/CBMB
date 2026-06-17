import { Calendar, Filter } from 'lucide-react';

// Local calendar date (yyyy-mm-dd) — avoids toISOString()'s UTC day-shift, so the
// day always matches the user's wall clock.
export const isoLocalDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const todayLocalIso = () => isoLocalDate(new Date());
// The day after `iso` — use as an exclusive range end so the whole `iso` day is included.
export const nextDayLocalIso = (iso) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + 1); return isoLocalDate(d); };

/**
 * From → To calendar range with a "Today" reset. Controlled — the parent owns the
 * two yyyy-mm-dd strings. `from` can't exceed `to`; `to` can't exceed `max` (today).
 */
const DateRangeFilter = ({ from, to, setFrom, setTo, max = todayLocalIso() }) => (
  <div className="flex flex-wrap items-center gap-2">
    <div className="flex max-w-full items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm">
      <Filter size={13} className="shrink-0 text-blue-500" />
      <Calendar size={13} className="shrink-0 text-slate-400" />
      <input
        type="date"
        value={from}
        max={to}
        onChange={(e) => setFrom(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
        aria-label="From date"
      />
      <span className="shrink-0 text-slate-300">→</span>
      <input
        type="date"
        value={to}
        min={from}
        max={max}
        onChange={(e) => setTo(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-xs font-bold text-slate-700 outline-none"
        aria-label="To date"
      />
    </div>
    <button
      type="button"
      onClick={() => { const t = todayLocalIso(); setFrom(t); setTo(t); }}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
    >
      Today
    </button>
  </div>
);

export default DateRangeFilter;
