import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

const Login = () => {
  const { login } = useAuth();
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
      setError('Please fill in all fields');
      return;
    }
    setIsSubmitting(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-split">
        {/* Brand panel — logo + name only */}
        <aside className="login-brand-panel">
          <div className="login-brand-glow" aria-hidden="true" />
          <div className="login-brand-content">
            <div className="login-brand-logo">CB</div>
            <h1 className="login-brand-title">{'CBTrading'}</h1>
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
                <label htmlFor="email">{'Email address'}</label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={'you@example.com'}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">{'Password'}</label>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={'Enter your password'}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="login-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
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
                <span>{isSubmitting ? 'Signing in…' : 'Sign In'}</span>
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
