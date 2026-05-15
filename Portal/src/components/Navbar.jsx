import { useAuth } from '../context/AuthContext';

const Navbar = ({ onHome }) => {
  const { logout } = useAuth();

  return (
    <nav className="app-navbar">
      <div className="app-navbar-inner">
        <button type="button" onClick={onHome} className="brand-pill brand-home-button">
          <div className="brand-icon">CB</div>
          <div>
            <h1 className="bg-gradient-to-r from-[#255f60] to-[#307D7E] bg-clip-text text-lg font-extrabold text-transparent md:text-xl">
              CBTrading
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Wholesaler Workspace</p>
          </div>
        </button>

        <div className="navbar-actions">
          <button onClick={logout} className="btn-danger navbar-logout">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
