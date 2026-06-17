/**
 * Shared form input validation.
 *
 * Phone numbers follow the Bangladeshi mobile format used across the system:
 * 11 digits starting with 01, third digit 3–9 (e.g. 01712345678). Spaces,
 * dashes and a +880 / 880 prefix are tolerated on input.
 */
export const normalizePhone = (value) => {
  let v = String(value ?? '').replace(/[\s()-]/g, '');
  if (v.startsWith('+880')) v = '0' + v.slice(4);
  else if (v.startsWith('880') && v.length > 11) v = '0' + v.slice(3);
  return v;
};

export const isValidPhone = (value) => /^01[3-9]\d{8}$/.test(normalizePhone(value));

export const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value ?? '').trim());

export const PHONE_HINT = 'Enter a valid 11-digit mobile number (e.g. 01712345678).';
export const EMAIL_HINT = 'Enter a valid email address (e.g. name@example.com).';

/** True when `value` parses to a finite number within [min, max]. */
export const numberInRange = (value, min, max = Infinity) => {
  const n = Number(value);
  return String(value).trim() !== '' && Number.isFinite(n) && n >= min && n <= max;
};
