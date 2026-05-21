import { useEffect, useState } from 'react';

/**
 * Returns a debounced version of `value` that only updates after `delay` ms
 * of no changes. Useful for typed search inputs.
 */
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
