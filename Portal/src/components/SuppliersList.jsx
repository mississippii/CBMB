import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import SupplierDetail from './SupplierDetail';

const SuppliersList = () => {
  const { suppliers, addSupplier } = useData();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: '',
    bankDetails: '',
    commissionRate: 5,
  });

  const handleAddSupplier = () => {
    if (formData.name && formData.contact && formData.location) {
      addSupplier(formData);
      setFormData({
        name: '',
        contact: '',
        location: '',
        bankDetails: '',
        commissionRate: 5,
      });
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Button */}
      <button
        onClick={() => setShowForm(true)}
        className="btn-primary"
      >
        ➕ Add Supplier
      </button>

      {/* Add Supplier Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🏪 Add New Supplier</h2>
              <button
                onClick={() => setShowForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Supplier Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Bank Details"
                  value={formData.bankDetails}
                  onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Commission Rate (%)"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  className="input-field"
                />
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
                onClick={handleAddSupplier}
                className="btn-primary"
              >
                ✅ Add Supplier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Suppliers List</h3>
        {suppliers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No suppliers added yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Contact</th>
                <th className="px-4 py-2 text-left font-semibold text-gray-900">Location</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Commission</th>
                <th className="px-4 py-2 text-right font-semibold text-gray-900">Due Amount</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Boxes</th>
                <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-900">{supplier.name}</td>
                  <td className="px-4 py-2 text-gray-700">{supplier.contact}</td>
                  <td className="px-4 py-2 text-gray-700">{supplier.location}</td>
                  <td className="px-4 py-2 text-center text-gray-700">{supplier.commissionRate}%</td>
                  <td className="px-4 py-2 text-right font-bold text-red-600">
                    ৳ {supplier.amountDue.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-center font-semibold text-gray-900">
                    {supplier.totalBoxesHolding}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setSelectedSupplierId(supplier.id)}
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

      {/* Modal - Supplier Detail */}
      {selectedSupplierId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gradient-to-r from-indigo-50 via-white to-purple-50 border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Supplier Details
              </h2>
              <button
                onClick={() => setSelectedSupplierId(null)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              >
                <span className="text-2xl">✕</span>
              </button>
            </div>
            <div className="p-8">
              <SupplierDetail supplierId={selectedSupplierId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuppliersList;
