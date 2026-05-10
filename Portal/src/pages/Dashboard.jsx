import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import Navbar from '../components/Navbar';
import BoxDashboard from '../components/BoxDashboard';
import SuppliersList from '../components/SuppliersList';
import CustomersList from '../components/CustomersList';
import TransactionForm from '../components/TransactionForm';
import TransactionsList from '../components/TransactionsList';

const Dashboard = () => {
  const { admin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const tabs = [
    { id: 'dashboard', label: '📦 Box Dashboard', icon: '📊' },
    { id: 'suppliers', label: '🚜 Suppliers', icon: '📦' },
    { id: 'customers', label: '👥 Customers', icon: '👤' },
    { id: 'transactions', label: '📋 Transactions', icon: '📜' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar />

      <div className="container-main">
        {/* Welcome Section */}
        <div className="mb-8 card highlight">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                👋 Welcome back, {admin?.fullName || 'Admin'}!
              </h2>
              <p className="text-gray-600 text-sm">
                📧 {admin?.email} • 📱 {admin?.phone}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
              <div className="flex items-center gap-2 justify-end">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-600">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation & New Sale Button */}
        <div className="mb-8 tabs-container bg-white rounded-xl shadow-sm p-1 flex items-center justify-between">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowTransactionModal(true)}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            ➕ New Sale
          </button>
        </div>

        {/* New Transaction Modal */}
        {showTransactionModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '48rem' }}>
              <div className="modal-header">
                <h2>💰 Record New Sale</h2>
                <button
                  onClick={() => setShowTransactionModal(false)}
                  className="modal-close-btn"
                >
                  ✕
                </button>
              </div>
              <div className="modal-body max-h-[70vh] overflow-y-auto">
                <TransactionForm onClose={() => setShowTransactionModal(false)} />
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="animate-fadeIn">
          {activeTab === 'dashboard' && <BoxDashboard />}
          {activeTab === 'suppliers' && <SuppliersList />}
          {activeTab === 'customers' && <CustomersList />}
          {activeTab === 'transactions' && <TransactionsList />}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
