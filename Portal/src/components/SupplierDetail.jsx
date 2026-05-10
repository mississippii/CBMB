import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const SupplierDetail = ({ supplierId }) => {
  const { suppliers, supplierProducts } = useData();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [boxesReturn, setBoxesReturn] = useState({ wooden: '', plastic: '' });
  const supplier = suppliers.find((s) => s.id === supplierId);
  const products = supplierProducts.filter((p) => p.supplierId === supplierId);

  if (!supplier) {
    return <div className="text-gray-600">Supplier not found</div>;
  }

  const totalProductValue = products.reduce((sum, p) => sum + p.totalValue, 0);

  const handlePayment = () => {
    if (paymentAmount && parseInt(paymentAmount) > 0) {
      alert(`✅ Payment of ৳${parseInt(paymentAmount).toLocaleString()} recorded to ${supplier.name}`);
      setPaymentAmount('');
    }
  };

  const handleBoxReturn = () => {
    const wooden = parseInt(boxesReturn.wooden) || 0;
    const plastic = parseInt(boxesReturn.plastic) || 0;
    if (wooden > 0 || plastic > 0) {
      alert(`✅ Box return recorded:\n🪵 Wooden: ${wooden}\n♻️ Plastic: ${plastic}`);
      setBoxesReturn({ wooden: '', plastic: '' });
    }
  };

  const initials = supplier.name.split(' ').map(n => n[0]).join('');

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
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{supplier.name}</h2>
            <p className="text-gray-500 text-sm">Commission Rate: <span className="font-semibold text-gray-700">{supplier.commissionRate}%</span></p>
          </div>
        </div>
        
        {/* Quick Info Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-medium text-gray-900">{supplier.location}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm font-medium text-gray-900">{supplier.contact}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Settlement</p>
            <p className="text-sm font-medium text-gray-900">{supplier.lastSettlementDate}</p>
          </div>
        </div>
      </div>

      {/* Account Summary Stats */}
      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Sales */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.totalSales.toLocaleString()}</p>
          </div>

          {/* Commission Earned */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Commission Earned</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.totalCommissionEarned.toLocaleString()}</p>
          </div>

          {/* Advance Paid */}
          <div className="bg-white rounded-lg p-5 border border-gray-200 hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Advance Paid</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.advancePaymentsMade.toLocaleString()}</p>
          </div>

          {/* Amount Due */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">Amount Due to Me</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.amountDue.toLocaleString()}</p>
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
            <p className="text-4xl font-bold text-gray-900">{supplier.boxesHoldingWooden}</p>
          </div>

          {/* Plastic Boxes */}
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center hover:border-gray-300 transition">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Plastic</p>
            <p className="text-4xl font-bold text-gray-900">{supplier.boxesHoldingPlastic}</p>
          </div>

          {/* Total Boxes */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-300 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Total</p>
            <p className="text-4xl font-bold text-gray-900">{supplier.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Record Payment Card */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 hover:border-gray-300 transition">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
          <p className="text-sm text-gray-600 mb-4">Pay the supplier for services rendered</p>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount to Pay</label>
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
          <p className="text-sm text-gray-600 mb-4">Log returned boxes from supplier</p>
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

      {/* Products */}
      {products.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🛒</span>Products Sent (Yet to Sell)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-800 font-medium">{product.productName}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{product.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-700">৳ {product.unitPrice}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="money money-income font-bold">৳ {product.totalValue.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="text-right">
              <p className="text-gray-700 text-sm mb-1">Total Product Value:</p>
              <p className="text-2xl font-bold money money-income">৳ {totalProductValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetail;
