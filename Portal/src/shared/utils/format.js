/**
 * Single source of truth for currency / date / quantity formatting.
 * Import these instead of writing local `fmt = (v) => …` in every file.
 */

const CURRENCY_SYMBOL = '৳';

export const roundMoney = (value) => Math.ceil(Number(value) || 0);

/**
 * Money formatter.
 * - Default: integer rendering ("৳ 1,250") — what we use for totals everywhere.
 * - Pass { decimals: 2 } when cents matter (commission rates, write-off amounts, etc).
 *
 * Handles null / undefined / NaN / negative numbers consistently:
 *   formatMoney(null)    → "৳ 0"
 *   formatMoney(1250)    → "৳ 1,250"
 *   formatMoney(-500)    → "− ৳ 500"
 *   formatMoney(1250.5, { decimals: 2 })  → "৳ 1,250.50"
 */
export const formatMoney = (value, { decimals = 0 } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return `${CURRENCY_SYMBOL} 0`;
  const rounded = decimals === 0 ? Math.ceil(num) : num;
  const sign = rounded < 0 ? '− ' : '';
  const abs = Math.abs(rounded);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${CURRENCY_SYMBOL} ${formatted}`;
};

/** Locale-agnostic alias kept for legacy callers (delete once they're migrated). */
export const formatCurrency = (value) => formatMoney(value);

/** Quantity (stock, qty fields) — no currency symbol, up to 3 decimals. */
export const formatQuantity = (value, { decimals = 3 } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

export const formatNumber = (value) => (Number(value) || 0).toLocaleString();

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(value);
};

/**
 * Date formatter — fixed app display format: "11 Jun 2026".
 *   formatDate('2026-06-11T08:00:00') → "11 Jun 2026"
 *   formatDate(null) → "—"
 */
export const formatDate = (value) => {
  const d = parseDateValue(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "11 Jun 2026, 08:15" */
export const formatDateTime = (value) => {
  const d = parseDateValue(value);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
};

/** "08:15" */
export const formatTime = (value) => {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** Local calendar date as yyyy-mm-dd. Unlike toISOString(), it never shifts the day
 *  across the UTC boundary — use this for "today" in date pickers and day filters. */
export const localDateIso = (value) => {
  const d = value == null ? new Date() : (value instanceof Date ? value : new Date(value));
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** ISO yyyy-mm-dd string (e.g. for storing in date pickers). */
export const dateOnly = (value) => (value ? localDateIso(value) : localDateIso());
