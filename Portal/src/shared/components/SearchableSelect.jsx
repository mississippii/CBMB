import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Compact searchable dropdown.
 *
 *  options: [{ value, label }]
 *  value:   currently selected `value` (or '' / null)
 *  onChange(value)
 *
 * Behaviour:
 *  - Looks like a small input. Click/focus → opens popover with filterable list.
 *  - Type to filter. Enter selects the first match. Esc closes.
 *  - Click outside closes without changing the selection.
 */
const SearchableSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select…',
  className = 'input-mini',
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const selectedLabel = useMemo(() => {
    const m = options.find((o) => String(o.value) === String(value));
    return m ? m.label : '';
  }, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o.label).toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const pick = (val) => {
    onChange?.(val);
    setOpen(false);
    setQuery('');
  };

  const handleKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered.length > 0) pick(filtered[0].value);
    }
  };

  return (
    <div ref={wrapRef} className="relative inline-block">
      <input
        ref={inputRef}
        type="text"
        value={open ? query : selectedLabel}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { setQuery(''); setOpen(true); }}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={className}
        disabled={disabled}
      />
      {open && !disabled && (
        <div className="absolute left-0 right-auto z-20 mt-1 max-h-56 min-w-[10rem] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-slate-500">No matches</div>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={`block w-full px-2 py-1.5 text-left text-xs hover:bg-slate-50 ${
                  String(o.value) === String(value) ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-800'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
