import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import CustomerDetail from './CustomerDetail';

const CustomersList = () => {
  const { customers, addCustomer } = useData();
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    phone: '',
    address: '',
    type: 'Permanent',
  });

  const handleAddCustomer = () => {
    if (formData.name && formData.owner && formData.phone) {
      addCustomer(formData);
      setFormData({
        name: '',
        owner: '',
        phone: '',
        address: '',
        type: 'Permanent',
      });
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary flex items-center gap-2"
      >
        ➕ Add New Customer
      </button>

      {/* Add Customer Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header">
              <h2>➕ Add New Customer</h2>
              <button
                onClick={() => setShowForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Store/Business Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Owner Name"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="input-field"
                >
                  <option value="Permanent">Permanent Customer</option>
                  <option value="Cash">Cash Customer</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomer}
                className="btn-primary"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Customers Table */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Customers List</h3>
        {customers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No customers added yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Store Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Owner</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Phone</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Type</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">Amount Due</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Boxes</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-900">{customer.name}</td>
                  <td className="px-4 py-2 text-gray-700">{customer.owner}</td>
                  <td className="px-4 py-2 text-gray-700">{customer.phone}</td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        customer.type === 'Permanent'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {customer.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">
                    ৳ {customer.amountDue.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center font-semibold text-gray-900">
                    {customer.totalBoxesHolding}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomerId && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '54rem' }}>
            <div className="modal-header">
              <h2>👥 Customer Profile</h2>
              <button
                onClick={() => setSelectedCustomerId(null)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body max-h-[70vh] overflow-y-auto">
              <CustomerDetail customerId={selectedCustomerId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersList;
