/**
 * Number/currency/date formatting helpers.
 * For language-aware variants, use the formatNumber / formatCurrency / formatDate
 * from useLang(). These are language-agnostic fallbacks.
 */

export const roundMoney = (value) => {
  const n = Number(value) || 0;
  return Math.round(n * 100) / 100;
};

export const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;

export const formatNumber = (value) => (Number(value) || 0).toLocaleString();

export const formatDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const dateOnly = (value) => {
  if (!value) return new Date().toISOString().split('T')[0];
  return new Date(value).toISOString().split('T')[0];
};
