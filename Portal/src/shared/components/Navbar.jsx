import { useEffect, useRef, useState } from 'react';
import { LogOut, UserRound, Store, ShieldCheck, Cog } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';

// Low-importance secondary detail — label + value, laid out in a grid cell.
const DetailCell = ({ label, value, full }) => {
  if (!value) return null;
  return (
    <div className={`min-w-0 ${full ? 'col-span-2' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="truncate text-[13px] font-semibold text-slate-600">{value}</p>
    </div>
  );
};

const Navbar = ({ onHome, subtitle, onLogout }) => {
  const { admin, logout } = useAuth();
  const isAdmin = admin?.role === 'ADMIN';
  const isSupplier = admin?.role === 'SUPPLIER';
  const displaySubtitle = subtitle ?? (isAdmin ? 'Admin Console' : isSupplier ? 'Supplier Portal' : 'Wholesaler Workspace');
  const roleLabel = isAdmin ? 'Administrator' : isSupplier ? 'Supplier' : 'Wholesaler';
  const accountName = isSupplier
    ? (admin?.fullName || admin?.businessName || roleLabel)
    : (admin?.businessName || admin?.fullName || roleLabel);
  const HeaderIcon = isAdmin ? ShieldCheck : isSupplier ? UserRound : Store;
  const AccountButtonIcon = UserRound;

  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <nav className="app-navbar">
      <div className="app-navbar-inner">
        <button type="button" onClick={onHome} className="brand-pill brand-home-button">
          <div className="brand-icon"><Cog size={24} strokeWidth={2.2} /></div>
          <div>
            <h1 className="brand-wordmark bg-gradient-to-r from-[#1755c9] to-[#1d63ed] bg-clip-text text-xl text-transparent md:text-2xl">
              {'CBTrading'}
            </h1>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{displaySubtitle}</p>
          </div>
        </button>

        <div className="navbar-actions flex items-center gap-2.5" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              aria-label="Account"
              aria-expanded={open}
            >
              <AccountButtonIcon size={19} />
            </button>

            {open && (
              <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                {/* Identity header — business name is the title */}
                <div className="flex items-center gap-3.5 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/60 px-5 py-4">
                  <span className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
                    <HeaderIcon size={26} />
                    <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-extrabold leading-tight text-slate-900">{accountName}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ring-1 ring-slate-200">
                        {roleLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 ring-1 ring-emerald-100">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Active
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary details — oriented in a 2-column grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 px-5 py-4">
                  {isSupplier ? (
                    <>
                      <DetailCell label="Phone" value={admin?.phone} />
                      <DetailCell label="Business" value={admin?.businessName} />
                      <DetailCell label="Location" value={admin?.address} full />
                      <DetailCell label="Portal" value="Read-only account view" full />
                    </>
                  ) : (
                    <>
                      <DetailCell label="Owner" value={admin?.businessName ? admin?.fullName : null} />
                      <DetailCell label="Phone" value={admin?.phone} />
                      <DetailCell label="Location" value={admin?.address} full />
                      <DetailCell label="Email" value={admin?.email} full />
                    </>
                  )}
                </div>

                {/* Footer action — finishes the card */}
                <div className="border-t border-slate-100 bg-slate-50/60 px-2.5 py-2">
                  <button
                    type="button"
                    onClick={onLogout || logout}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout || logout}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
