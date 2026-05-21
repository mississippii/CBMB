/**
 * Strip everything except digits — used for phone search/comparison.
 */
export const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');

/**
 * Loose check: returns true if `value` contains the digits of `query`.
 */
export const phoneMatches = (value, query) => {
  const q = normalizePhone(query);
  if (!q) return true;
  return normalizePhone(value).includes(q);
};
