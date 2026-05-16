import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('tanvir@admin.com');
  const [password, setPassword] = useState('Adm!n@123');
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
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email/username or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-layout">
        <section className="auth-hero">
          <div className="auth-brand-lockup">
            <div className="auth-brand-mark">CB</div>
            <div>
              <p>CBTrading</p>
              <span>Wholesaler Workspace</span>
            </div>
          </div>

          <div className="auth-hero-copy">
            <span className="auth-eyebrow">Stockist Portal</span>
            <h1>Control stock, due, payment, and box movement from one workspace.</h1>
            <p>
              A focused operating screen for wholesalers handling supplier products,
              permanent customer due, jamanot, and daily transaction reports.
            </p>
          </div>

          <div className="auth-feature-grid">
            <div>
              <strong>Box</strong>
              <span>Track in shop, customer, supplier, and lost boxes.</span>
            </div>
            <div>
              <strong>Due</strong>
              <span>Maintain customer and supplier balances automatically.</span>
            </div>
            <div>
              <strong>Payment</strong>
              <span>Receive cash, boxes, or both in one entry.</span>
            </div>
            <div>
              <strong>Report</strong>
              <span>Export sale and payment ledgers by date.</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-logo">
              CB
            </div>
            <div>
              <h2>Sign in</h2>
              <p>Access the assigned wholesaler account.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email or Username</label>
              <div className="auth-input-wrap">
                <span>
                  @
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="wholesaler@gmail.com"
                  className="input-field"
                />
              </div>
            </div>

            <div className="auth-field">
              <label>Password</label>
              <div className="auth-input-wrap">
                <span>
                  *
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="auth-password-toggle"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <div className="status-error">
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Login;
