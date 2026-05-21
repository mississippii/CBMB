import { Languages } from 'lucide-react';
import { useLang } from '../contexts/LanguageContext';

const LanguageToggle = ({ className = '' }) => {
  const { lang, toggleLang, t } = useLang();

  return (
    <button
      type="button"
      onClick={toggleLang}
      title={t('lang.toggleHint')}
      className={`lang-toggle ${className}`}
      aria-label={t('lang.toggleHint')}
    >
      <Languages size={14} />
      <span className="lang-toggle-text">{t('lang.toggle')}</span>
      <span className="lang-toggle-dot">{lang === 'en' ? 'EN' : 'BN'}</span>
    </button>
  );
};

export default LanguageToggle;
