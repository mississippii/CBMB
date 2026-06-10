import { LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

const Navbar = ({ onHome, subtitle }) => {
  const { logout } = useAuth();
  const displaySubtitle = subtitle ?? 'Wholesaler Workspace';

  return (
    <nav className="app-navbar">
      <div className="app-navbar-inner">
        <button type="button" onClick={onHome} className="brand-pill brand-home-button">
          <div className="brand-icon">CB</div>
          <div>
            <h1 className="bg-gradient-to-r from-[#1755c9] to-[#1d63ed] bg-clip-text text-lg font-extrabold text-transparent md:text-xl">
              {'CBTrading'}
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{displaySubtitle}</p>
          </div>
        </button>

        <div className="navbar-actions flex items-center gap-2">
          <button onClick={logout} className="btn-secondary flex items-center gap-2">
            <LogOut size={14} />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
