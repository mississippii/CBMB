import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLang } from '../../shared/contexts/LanguageContext';
import LanguageToggle from '../../shared/components/LanguageToggle';

const Login = () => {
  const { login } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError(t('login.required'));
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || t('login.invalid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-lang-bar">
        <LanguageToggle className="dark" />
      </div>

      <div className="login-split">
        {/* Brand panel — logo + name only */}
        <aside className="login-brand-panel">
          <div className="login-brand-glow" aria-hidden="true" />
          <div className="login-brand-content">
            <div className="login-brand-logo">CB</div>
            <h1 className="login-brand-title">{t('brand.name')}</h1>
          </div>
        </aside>

        {/* RIGHT: Login form */}
        <section className="login-form-panel">
          <div className="login-form-card">
            <div className="login-form-header login-form-header-simple">
              <h2 className="login-form-title">Login</h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="email">{t('login.email')}</label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.email.placeholder')}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">{t('login.password')}</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('login.password.placeholder')}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="login-eye-btn"
                    aria-label={showPassword ? t('login.hide') : t('login.show')}
                    title={showPassword ? t('login.hide') : t('login.show')}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="login-error">
                  <span aria-hidden="true">!</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                <span>{isSubmitting ? t('login.submitting') : t('login.submit')}</span>
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
