import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  LayoutGrid, Package, Truck, Users, UserCheck,
  ArrowLeftRight, CreditCard, ShoppingCart, BarChart3, Wallet, BookOpenCheck,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import Navbar from '../../shared/components/Navbar';
import CratesDashboard from '../crates/CratesDashboard';
import SuppliersList from '../suppliers/SuppliersList';
import CustomersList from '../customers/CustomersList';
import TransactionsList from '../transactions/TransactionsList';
import ShipmentsPage from '../shipments/ShipmentsPage';
import SalesPage from '../sales/SalesPage';
import PaymentsPage from '../payments/PaymentsPage';
import StoreInventory from '../inventory/StoreInventory';
import ReportsPage from '../reports/ReportsPage';
import ShopExpensesPage from '../expenses/ShopExpensesPage';
import CashBookPage from '../cashbook/CashBookPage';
import { useData } from '../../data/DataContext';

const tabs = [
  { id: 'inventory',     label: 'Inventory',     icon: LayoutGrid,     color: '#DC2626' }, // red
  { id: 'dashboard',     label: 'Crates',        icon: Package,        color: '#16A34A' }, // green
  { id: 'shipments',     label: 'Shipments',     icon: Truck,          color: '#CA8A04' }, // yellow
  { id: 'suppliers',     label: 'Suppliers',     icon: UserCheck,      color: '#2563EB' }, // blue
  { id: 'customers',     label: 'Customers',     icon: Users,          color: '#4F46E5' }, // indigo
  { id: 'sales',         label: 'Sales',         icon: ShoppingCart,   color: '#DC2626' }, // red
  { id: 'payment',       label: 'Payments',      icon: CreditCard,     color: '#16A34A' }, // green
  { id: 'transactions',  label: 'Transactions',  icon: ArrowLeftRight, color: '#CA8A04' }, // yellow
  { id: 'shopExpenses',  label: 'Shop Expenses', icon: Wallet,         color: '#2563EB' }, // blue
  { id: 'cashbook',      label: 'Cash Book',     icon: BookOpenCheck,  color: '#4F46E5' }, // indigo
  { id: 'reports',       label: 'Reports',       icon: BarChart3,      color: '#DC2626' }, // red
];

const TAB_IDS = tabs.map((t) => t.id);

const Dashboard = () => {
  const { admin: wholesaler } = useAuth();
  const { isLoading, dataError } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showLoadFallback, setShowLoadFallback] = useState(false);

  // The active section lives in the URL (?tab=…) so the browser back/forward
  // buttons move between sections instead of dropping out to login.
  const tabParam = searchParams.get('tab');
  const activeTab = TAB_IDS.includes(tabParam) ? tabParam : 'inventory';
  const setActiveTab = (id) => setSearchParams(id === 'inventory' ? {} : { tab: id });

  // Cross-tab profile opening: Overview's money strips set this; the destination list
  // reads it on render to auto-open the profile drawer, then clears it via onProfileOpened.
  const [pendingProfile, setPendingProfile] = useState(null); // { type: 'supplier'|'customer', id }
  const goToProfile = (type, id) => {
    if (!type || !id) return;
    setPendingProfile({ type, id });
    setActiveTab(type === 'supplier' ? 'suppliers' : 'customers');
  };
  const clearPendingProfile = () => setPendingProfile(null);

  useEffect(() => {
    if (!isLoading) {
      setShowLoadFallback(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setShowLoadFallback(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  return (
    <div className="min-h-screen">
      <Navbar onHome={() => setActiveTab('inventory')} />

      <div className="container-main">
        <div className="mb-5 welcome-banner">
          <div className="flex flex-col items-start gap-2">
            <div>
              <h2 className="mb-1 text-2xl font-extrabold text-slate-900 md:text-3xl">
                Welcome back, {wholesaler?.fullName || 'Wholesaler'}
              </h2>
              <p className="text-sm font-medium text-slate-600">
                {wholesaler?.email}
                {wholesaler?.wholesalerId ? ` • ID #${wholesaler.wholesalerId}` : ''}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">Active</span>
            </div>
          </div>
        </div>

        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <nav className="sidebar-nav">
              {tabs.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                >
                  <span
                    className="sidebar-nav-badge"
                    style={{ background: color, boxShadow: `0 4px 10px ${color}59` }}
                  >
                    <Icon size={13} strokeWidth={2.4} color="#ffffff" />
                  </span>
                  <span className="sidebar-nav-title">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="workspace-content">
            {isLoading ? (
              <div className="data-load-panel">
                {!showLoadFallback ? (
                  <>
                    <div className="windows-loader" aria-label="Loading data" />
                    <h3>Loading data</h3>
                  </>
                ) : (
                  <>
                    <div className="data-not-found-icon">!</div>
                    <h3>Taking longer than expected</h3>
                  </>
                )}
              </div>
            ) : (
              <div className="animate-fadeIn">
                {dataError && (
                  <div className="data-warning-banner">
                    <span>Some data could not be loaded.</span>
                    <small>{dataError}</small>
                  </div>
                )}
                {activeTab === 'sales'        && <SalesPage />}
                {activeTab === 'inventory'    && <StoreInventory onOpenProfile={goToProfile} />}
                {activeTab === 'dashboard'    && <CratesDashboard />}
                {activeTab === 'shipments'    && <ShipmentsPage />}
                {activeTab === 'suppliers'    && (
                  <SuppliersList
                    autoOpenId={pendingProfile?.type === 'supplier' ? pendingProfile.id : null}
                    onProfileOpened={clearPendingProfile}
                  />
                )}
                {activeTab === 'customers'    && (
                  <CustomersList
                    autoOpenId={pendingProfile?.type === 'customer' ? pendingProfile.id : null}
                    onProfileOpened={clearPendingProfile}
                  />
                )}
                {activeTab === 'transactions' && <TransactionsList />}
                {activeTab === 'payment'      && <PaymentsPage />}
                {activeTab === 'shopExpenses' && <ShopExpensesPage />}
                {activeTab === 'cashbook'     && <CashBookPage />}
                {activeTab === 'reports'      && <ReportsPage />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
