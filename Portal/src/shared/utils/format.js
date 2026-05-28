/**
 * Single source of truth for currency / date / quantity formatting.
 * Import these instead of writing local `fmt = (v) => …` in every file.
 */

const CURRENCY_SYMBOL = '৳';

export const roundMoney = (value) => {
  const n = Number(value) || 0;
  return Math.round(n * 100) / 100;
};

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
  const sign = num < 0 ? '− ' : '';
  const abs = Math.abs(num);
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

/**
 * Date formatter — short locale date ("26/05/2026" in en-GB).
 *   formatDate('2026-05-26T08:00:00') → "26/05/2026"
 *   formatDate(null) → "—"
 */
export const formatDate = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** "26/05/2026, 08:15" */
export const formatDateTime = (value) => {
  if (!value) return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
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

/** ISO yyyy-mm-dd string (e.g. for storing in date pickers). */
export const dateOnly = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];
  return new Date(value).toISOString().split('T')[0];
};
