import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import BoxDashboard from '../components/BoxDashboard';
import SuppliersList from '../components/SuppliersList';
import CustomersList from '../components/CustomersList';
import TransactionForm from '../components/TransactionForm';
import TransactionsList from '../components/TransactionsList';
import AddProducts from '../components/AddProducts';
import StoreInventory from '../components/StoreInventory';
import { useData } from '../context/DataContext';

const Dashboard = () => {
  const { admin: wholesaler } = useAuth();
  const { isLoading, dataError } = useData();
  const [activeTab, setActiveTab] = useState('inventory');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showLoadFallback, setShowLoadFallback] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowLoadFallback(false);
      return undefined;
    }

    const timer = window.setTimeout(() => setShowLoadFallback(true), 8000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  const tabs = [
    { id: 'dashboard', label: 'Crate Dashboard' },
    { id: 'add-products', label: 'Shipment' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'customers', label: 'Customers' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'payment', label: 'Payments' },
  ];

  return (
    <div className="min-h-screen">
      <Navbar onHome={() => setActiveTab('inventory')} />

      <div className="container-main">
        <div className="mb-5 welcome-banner">
          <div className="flex flex-col items-start gap-2">
            <div>
              <h2 className="mb-1 bg-gradient-to-r from-[#255f60] to-[#307D7E] bg-clip-text text-2xl font-extrabold text-transparent md:text-3xl">
                Welcome back, {wholesaler?.fullName || 'Wholesaler'}
              </h2>
              <p className="text-sm font-medium text-slate-600">
                {wholesaler?.email}
                {wholesaler?.wholesalerId ? ` • Wholesaler #${wholesaler.wholesalerId}` : ''}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-sm font-semibold text-emerald-700">Active session</span>
            </div>
          </div>
        </div>

        {showTransactionModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '48rem' }}>
              <div className="modal-header">
                <h2>Record New Sale</h2>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body max-h-[70vh] overflow-y-auto">
                <TransactionForm entryMode="sale" onClose={() => setShowTransactionModal(false)} />
              </div>
            </div>
          </div>
        )}


        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <div className="sidebar-header">
              <button
                onClick={() => setShowTransactionModal(true)}
                className="btn-primary w-full"
              >
                +New Sale
              </button>
            </div>

            <nav className="sidebar-nav">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`sidebar-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <span className="sidebar-nav-title">{tab.label}</span>
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
                    <p>Connecting to the server and preparing wholesaler records.</p>
                  </>
                ) : (
                  <>
                    <div className="data-not-found-icon">!</div>
                    <h3>Data not found yet</h3>
                    <p>The server is taking longer than expected or no records are available for this wholesaler.</p>
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
                {activeTab === 'inventory' && <StoreInventory onAddProducts={() => setActiveTab('add-products')} />}
                {activeTab === 'dashboard' && <BoxDashboard />}
                {activeTab === 'add-products' && <AddProducts />}
                {activeTab === 'suppliers' && <SuppliersList />}
                {activeTab === 'customers' && <CustomersList />}
                {activeTab === 'transactions' && <TransactionsList />}
                {activeTab === 'payment' && <TransactionForm entryMode="payment" />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
