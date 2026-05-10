import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const CustomerDetail = ({ customerId }) => {
  const { customers } = useData();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [boxesReturn, setBoxesReturn] = useState({ wooden: '', plastic: '' });
  const customer = customers.find((c) => c.id === customerId);

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>;
  }

  const handlePayment = () => {
    if (paymentAmount && parseInt(paymentAmount) > 0) {
      alert(`✅ Payment of ৳${parseInt(paymentAmount).toLocaleString()} recorded from ${customer.name}`);
      setPaymentAmount('');
    }
  };

  const handleBoxReturn = () => {
    const wooden = parseInt(boxesReturn.wooden) || 0;
    const plastic = parseInt(boxesReturn.plastic) || 0;
    if (wooden > 0 || plastic > 0) {
      alert(`✅ Box return recorded from ${customer.name}:\n🪵 Wooden: ${wooden}\n♻️ Plastic: ${plastic}`);
      setBoxesReturn({ wooden: '', plastic: '' });
    }
  };

  const initials = customer.name.split(' ').map(n => n[0]).join('');
  const typeColor = customer.type === 'Permanent' ? 'from-blue-600 to-cyan-600' : 'from-green-600 to-emerald-600';

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start gap-4 mb-6">
          {/* Avatar */}
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <span className="text-2xl font-bold text-gray-700">{initials}</span>
          </div>
          
          {/* Profile Info */}
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{customer.name}</h2>
            <p className="text-gray-500 text-sm">Type: <span className="font-semibold text-gray-700">{customer.type}</span> • Owner: <span className="font-semibold text-gray-700">{customer.owner}</span></p>
          </div>
        </div>
        
        {/* Quick Info Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Address</p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2">{customer.address}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm font-medium text-gray-900">{customer.phone}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</p>
            <p className="text-sm font-medium text-gray-900">{customer.type}</p>
          </div>
        </div>
      </div>

      {/* Account Summary Stats */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Purchases */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Purchases</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.totalPurchases.toLocaleString()}</p>
          </div>

          {/* Amount Paid */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Amount Paid</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.totalPaid.toLocaleString()}</p>
          </div>

          {/* Cash Due */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Cash Due</p>
            <p className="text-2xl font-bold text-gray-900">৳ {customer.amountDue.toLocaleString()}</p>
          </div>

          {/* Boxes Due */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Boxes Due</p>
            <p className="text-2xl font-bold text-gray-900">{customer.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

      {/* Boxes Inventory */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Boxes Inventory</h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Wooden Boxes */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Wooden</p>
            <p className="text-4xl font-bold text-gray-900">{customer.boxesHoldingWooden}</p>
          </div>

          {/* Plastic Boxes */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Plastic</p>
            <p className="text-4xl font-bold text-gray-900">{customer.boxesHoldingPlastic}</p>
          </div>

          {/* Total Boxes */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-300 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Total</p>
            <p className="text-4xl font-bold text-gray-900">{customer.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Record Payment Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
          <p className="text-sm text-gray-600 mb-4">Log payment received from customer</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount Received</label>
              <input
                type="number"
                placeholder="Enter amount in ৳"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="input-field"
              />
            </div>
            <button
              onClick={handlePayment}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
            >
              Confirm Payment
            </button>
          </div>
        </div>

        {/* Record Box Return Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Record Box Return</h3>
          <p className="text-sm text-gray-600 mb-4">Log returned boxes from customer</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Wooden Boxes</label>
              <input
                type="number"
                placeholder="Quantity"
                value={boxesReturn.wooden}
                onChange={(e) => setBoxesReturn({ ...boxesReturn, wooden: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Plastic Boxes</label>
              <input
                type="number"
                placeholder="Quantity"
                value={boxesReturn.plastic}
                onChange={(e) => setBoxesReturn({ ...boxesReturn, plastic: e.target.value })}
                className="input-field"
              />
            </div>
            <button
              onClick={handleBoxReturn}
              className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors font-semibold"
            >
              Confirm Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;
