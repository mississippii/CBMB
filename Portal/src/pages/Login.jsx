import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('wholesaler@gmail.com');
  const [password, setPassword] = useState('Admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    const success = login(email, password);
    if (!success) {
      setError('Invalid email/username or password');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="auth-shell">
      <div className="w-full max-w-md">
        <div className="auth-card relative overflow-hidden border-slate-200/90">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#255f60] via-[#307D7E] to-[#4f9899]" />

          <div className="mb-7 text-center pt-2">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#307D7E] to-[#255f60] text-xl font-bold text-white shadow-lg shadow-emerald-200/70">
              CB
            </div>
            <h1 className="mb-1 bg-gradient-to-r from-[#255f60] to-[#307D7E] bg-clip-text text-3xl font-extrabold text-transparent">
              CBTrading
            </h1>
            <p className="text-sm font-medium text-slate-500">Sign in to manage your wholesaler workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Email or Username</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  @
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="wholesaler@gmail.com"
                  className="input-field pl-9"
                />
              </div>
            </div>

            <div>
              <label>Password</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                  *
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pl-9 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Private access for the assigned stockist only.</p>
            </div>

            {error && (
              <div className="status-error">
                <span>!</span>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary mt-4 w-full py-3">
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
