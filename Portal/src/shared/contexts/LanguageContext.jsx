import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from '../../i18n/translations';

const LanguageContext = createContext(null);
const STORAGE_KEY = 'cbtrading-lang-v1';
const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BN_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

const toBnDigits = (str) => String(str).replace(/[0-9]/g, (d) => BN_DIGITS[d]);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || 'en'; }
    catch { return 'en'; }
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
  }, [lang]);

  const setLang = useCallback((next) => setLangState(next === 'bn' ? 'bn' : 'en'), []);
  const toggleLang = useCallback(() => setLangState((p) => (p === 'en' ? 'bn' : 'en')), []);

  const t = useCallback((key, fallback) => {
    const dict = translations[lang] || translations.en;
    return dict[key] ?? translations.en[key] ?? fallback ?? key;
  }, [lang]);

  const formatNumber = useCallback((value) => {
    const formatted = Number(value || 0).toLocaleString('en-US');
    return lang === 'bn' ? toBnDigits(formatted) : formatted;
  }, [lang]);

  const formatCurrency = useCallback((value) => {
    return `৳${formatNumber(value)}`;
  }, [formatNumber]);

  const formatDate = useCallback((value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    if (lang === 'bn') {
      return `${toBnDigits(d.getDate())} ${BN_MONTHS[d.getMonth()]}, ${toBnDigits(d.getFullYear())}`;
    }
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, toggleLang, t, formatNumber, formatCurrency, formatDate }),
    [lang, setLang, toggleLang, t, formatNumber, formatCurrency, formatDate],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
