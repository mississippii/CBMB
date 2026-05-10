import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const TransactionForm = ({ onClose }) => {
  const { suppliers, customers, addTransaction, addCustomer, supplierProducts } = useData();
  const [formData, setFormData] = useState({
    customer: '',
    supplier: '',
    product: '',
    quantity: '',
    unitPrice: '',
    paymentType: 'Credit',
  });
  const [oneTimeCustomer, setOneTimeCustomer] = useState({
    name: '',
    phone: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const totalAmount = parseInt(formData.quantity || 0) * parseInt(formData.unitPrice || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check if it's a one-time customer
    let customerName = formData.customer;
    if (formData.customer === 'None') {
      if (!oneTimeCustomer.name || !oneTimeCustomer.phone) {
        alert('Please enter customer name and phone');
        return;
      }
      customerName = oneTimeCustomer.name;
    }

    if (
      customerName &&
      formData.supplier &&
      formData.product &&
      formData.quantity &&
      formData.unitPrice
    ) {
      addTransaction({
        customer: customerName,
        supplier: formData.supplier,
        product: formData.product,
        quantity: parseInt(formData.quantity),
        unitPrice: parseInt(formData.unitPrice),
        totalAmount: totalAmount,
        paymentType: formData.paymentType,
      });

      setFormData({
        customer: '',
        supplier: '',
        product: '',
        quantity: '',
        unitPrice: '',
        paymentType: 'Credit',
      });
      setOneTimeCustomer({ name: '', phone: '' });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        if (onClose) onClose();
      }, 2000);
    }
  };

  // Get products for selected supplier
  const getSupplierProducts = () => {
    if (!formData.supplier) return [];
    
    const supplier = suppliers.find(s => s.name === formData.supplier);
    if (!supplier) return [];
    
    return supplierProducts
      .filter(p => p.supplierId === supplier.id)
      .map(p => p.productName);
  };

  const availableProducts = getSupplierProducts();

  return (
    <div className={onClose ? 'space-y-4' : 'space-y-6'}>
      {/* Success Message */}
      {submitted && (
        <div className="status-success animate-fadeIn">
          <span>✅</span>
          <span>Transaction recorded successfully!</span>
        </div>
      )}

      {/* Transaction Form */}
      {onClose ? (
        // Modal mode - no card wrapper, no instructions
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>🚜 Select Supplier</label>
              <select
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value, product: '' })}
                className="input-field"
              >
                <option value="">Choose a supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>👥 Select Customer</label>
              <select
                value={formData.customer}
                onChange={(e) => {
                  setFormData({ 
                    ...formData, 
                    customer: e.target.value,
                    paymentType: e.target.value === 'None' ? 'Cash' : formData.paymentType
                  });
                  if (e.target.value === 'None') {
                    setOneTimeCustomer({ name: '', phone: '' });
                  }
                }}
                className="input-field"
              >
                <option value="">Choose a customer...</option>
                <option value="None">None (One-Time Customer)</option>
                {customers.filter(c => c.type === 'Permanent').map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* One-Time Customer Fields */}
          {formData.customer === 'None' && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border-2 border-indigo-200 space-y-3 animate-fadeIn">
              <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                <span>👤</span>
                One-Time Customer Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={oneTimeCustomer.name}
                  onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={oneTimeCustomer.phone}
                  onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, phone: e.target.value })}
                  className="input-field"
                />
              </div>
            </div>
          )}

          {/* Row 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>📦 Select Product</label>
              <select
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                disabled={!formData.supplier}
                className={`input-field ${!formData.supplier ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="">
                  {formData.supplier ? 'Choose a product...' : 'Select supplier first...'}
                </option>
                {availableProducts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>📊 Quantity (Unit)</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
                className="input-field"
              />
            </div>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>💲 Unit Price (৳)</label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                placeholder="0"
                className="input-field"
              />
            </div>

            <div>
              <label>💳 Payment Type</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                disabled={formData.customer === 'None'}
                className={`input-field ${formData.customer === 'None' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              >
                <option value="Credit">💼 Credit (Payable Later)</option>
                <option value="Cash">💵 Cash (Full Payment)</option>
                <option value="Partial">📝 Partial Payment</option>
              </select>
              {formData.customer === 'None' && (
                <p className="text-xs text-indigo-600 mt-2 font-medium">💰 One-time customers must pay in Cash</p>
              )}
            </div>
          </div>

          {/* Total Amount Summary */}
          <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600 text-sm font-medium">Quantity × Unit Price</p>
                <p className="text-gray-500 text-xs mt-1 font-mono">
                  {formData.quantity || 0} × ৳{formData.unitPrice || 0}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600 text-sm font-medium">TOTAL AMOUNT</p>
                <p className="text-3xl font-bold money money-income mt-1">
                  ৳ {totalAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn-primary w-full py-3 text-base font-semibold flex items-center justify-center gap-2"
          >
            <span>✅</span>
            Record Transaction
          </button>
        </form>
      ) : (
        // Page mode - with card wrapper and instructions
        <>
          <div className="card">
            <div className="mb-8">
              <h3 className="section-header">💰 Record New Sale</h3>
              <p className="text-sm text-gray-500">Fill in the transaction details below</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label>🚜 Select Supplier</label>
                  <select
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value, product: '' })}
                    className="input-field"
                  >
                    <option value="">Choose a supplier...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>👥 Select Customer</label>
                  <select
                    value={formData.customer}
                    onChange={(e) => {
                      setFormData({ 
                        ...formData, 
                        customer: e.target.value,
                        paymentType: e.target.value === 'None' ? 'Cash' : formData.paymentType
                      });
                      if (e.target.value === 'None') {
                        setOneTimeCustomer({ name: '', phone: '' });
                      }
                    }}
                    className="input-field"
                  >
                    <option value="">Choose a customer...</option>
                    <option value="None">None (One-Time Customer)</option>
                    {customers.filter(c => c.type === 'Permanent').map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* One-Time Customer Fields */}
              {formData.customer === 'None' && (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border-2 border-indigo-200 space-y-4 animate-fadeIn">
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <span>👤</span>
                    One-Time Customer Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={oneTimeCustomer.name}
                      onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, name: e.target.value })}
                      className="input-field"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={oneTimeCustomer.phone}
                      onChange={(e) => setOneTimeCustomer({ ...oneTimeCustomer, phone: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
              )}

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label>📦 Select Product</label>
                  <select
                    value={formData.product}
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    disabled={!formData.supplier}
                    className={`input-field ${!formData.supplier ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">
                      {formData.supplier ? 'Choose a product...' : 'Select supplier first...'}
                    </option>
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>📊 Quantity (Unit)</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="input-field"
                  />
                </div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label>💲 Unit Price (৳)</label>
                  <input
                    type="number"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    placeholder="0"
                    className="input-field"
                  />
                </div>

                <div>
                  <label>💳 Payment Type</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    disabled={formData.customer === 'None'}
                    className={`input-field ${formData.customer === 'None' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="Credit">💼 Credit (Payable Later)</option>
                    <option value="Cash">💵 Cash (Full Payment)</option>
                    <option value="Partial">📝 Partial Payment</option>
                  </select>
                  {formData.customer === 'None' && (
                    <p className="text-xs text-indigo-600 mt-2 font-medium">💰 One-time customers must pay in Cash</p>
                  )}
                </div>
              </div>

              {/* Total Amount Summary */}
              <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-6 rounded-xl border-2 border-green-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">Quantity × Unit Price</p>
                    <p className="text-gray-500 text-xs mt-2 font-mono">
                      {formData.quantity || 0} × ৳{formData.unitPrice || 0}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600 text-sm font-medium">TOTAL AMOUNT</p>
                    <p className="text-4xl font-bold money money-income mt-2">
                      ৳ {totalAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn-primary w-full py-4 text-lg font-semibold flex items-center justify-center gap-2 mt-8"
              >
                <span>✅</span>
                Record Transaction
              </button>
            </form>
          </div>

          {/* Instructions */}
          <div className="card highlight">
            <h4 className="section-header">📝 How to Record a Transaction</h4>
            <ol className="space-y-3">
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">1</span>
                <span className="text-gray-700 pt-1">Select the <strong>supplier</strong> from whom the products are coming</span>
              </li>
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">2</span>
                <span className="text-gray-700 pt-1">Select the <strong>customer</strong> to whom you are selling the product</span>
              </li>
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">3</span>
                <span className="text-gray-700 pt-1">Choose the <strong>product</strong> being sold</span>
              </li>
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">4</span>
                <span className="text-gray-700 pt-1">Enter the <strong>quantity</strong> and <strong>unit price</strong></span>
              </li>
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">5</span>
                <span className="text-gray-700 pt-1">Select <strong>payment type</strong> (Cash or Credit)</span>
              </li>
              <li className="flex gap-4 pb-3 border-b border-gray-200 last:border-0">
                <span className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-full flex-shrink-0 text-sm font-bold">6</span>
                <span className="text-gray-700 pt-1">Click <strong>Record Transaction</strong></span>
              </li>
            </ol>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionForm;
