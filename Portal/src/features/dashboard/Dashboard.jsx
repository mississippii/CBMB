import { useEffect, useState } from 'react';
import {
  LayoutGrid, Package, Truck, Users, UserCheck,
  ArrowLeftRight, CreditCard, ShoppingCart,
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
import { useData } from '../../data/DataContext';

const tabs = [
  { id: 'inventory',     label: 'Inventory',     icon: LayoutGrid },
  { id: 'dashboard',     label: 'Crates',        icon: Package },
  { id: 'shipments',     label: 'Shipments',     icon: Truck },
  { id: 'suppliers',     label: 'Suppliers',     icon: UserCheck },
  { id: 'customers',     label: 'Customers',     icon: Users },
  { id: 'sales',         label: 'Sales',         icon: ShoppingCart },
  { id: 'payment',       label: 'Payments',      icon: CreditCard },
  { id: 'transactions',  label: 'Transactions',  icon: ArrowLeftRight },
];

const Dashboard = () => {
  const { admin: wholesaler } = useAuth();
  const { isLoading, dataError } = useData();
  const [activeTab, setActiveTab] = useState('inventory');
  const [showLoadFallback, setShowLoadFallback] = useState(false);

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
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                >
                  <Icon size={16} className="sidebar-nav-icon" />
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
                    <p>Connecting to the server and preparing your records.</p>
                  </>
                ) : (
                  <>
                    <div className="data-not-found-icon">!</div>
                    <h3>Taking longer than expected</h3>
                    <p>The server may be slow or no records exist yet for this account.</p>
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
                {activeTab === 'inventory'    && <StoreInventory />}
                {activeTab === 'dashboard'    && <CratesDashboard />}
                {activeTab === 'shipments'    && <ShipmentsPage />}
                {activeTab === 'suppliers'    && <SuppliersList />}
                {activeTab === 'customers'    && <CustomersList />}
                {activeTab === 'transactions' && <TransactionsList />}
                {activeTab === 'payment'      && <PaymentsPage />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
