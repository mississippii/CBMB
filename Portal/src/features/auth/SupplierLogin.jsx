import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, UserRound } from 'lucide-react';
import { useAuth } from './AuthContext';
import { isValidPhone, normalizePhone, PHONE_HINT } from '../../shared/utils/validation';

/**
 * Dedicated supplier sign-in at /supplier-login (not linked from the main
 * login card by design — the wholesaler shares this URL with suppliers).
 * Phone number only, no password: the portal is read-only.
 */
const SupplierLogin = () => {
  const { supplierLogin } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!phone.trim()) {
      setError('Please enter your phone number');
      return;
    }
    if (!isValidPhone(phone)) {
      setError(PHONE_HINT);
      return;
    }
    setIsSubmitting(true);
    try {
      await supplierLogin(normalizePhone(phone));
      navigate('/supplier', { replace: true });
    } catch (err) {
      setError(err.message || 'No supplier found with this phone number');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-split">
        {/* Brand panel — same shell as the main login */}
        <aside className="login-brand-panel">
          <div className="login-brand-glow" aria-hidden="true" />
          <div className="login-brand-content">
            <div className="login-brand-logo">CB</div>
            <h1 className="login-brand-title">{'CBTrading'}</h1>
          </div>
        </aside>

        <section className="login-form-panel">
          <div className="login-form-card">
            <div className="login-form-header login-form-header-simple">
              <h2 className="login-form-title flex items-center gap-2">
                <UserRound size={20} className="text-slate-500" /> Supplier Login
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field">
                <label htmlFor="supplier-phone">{'Phone number'}</label>
                <div className="login-input-wrap">
                  <Phone size={16} className="login-input-icon" />
                  <input
                    id="supplier-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={'01XXXXXXXXX'}
                    autoComplete="tel"
                    autoFocus
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Enter the phone number your wholesaler has on file — no password needed.
                </p>
              </div>

              {error && (
                <div className="login-error">
                  <span aria-hidden="true">!</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" className="login-submit" disabled={isSubmitting}>
                <span>{isSubmitting ? 'Signing in…' : 'View My Account'}</span>
                {!isSubmitting && <ArrowRight size={16} />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SupplierLogin;
