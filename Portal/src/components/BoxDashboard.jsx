import React, { useState } from 'react';
import { useData } from '../context/DataContext';

const BoxDashboard = () => {
  const { boxInventory, addBoxes, markBoxesLost } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLossForm, setShowLossForm] = useState(false);
  const [formData, setFormData] = useState({
    boxType: 'wooden',
    quantity: 0,
    reason: 'lost',
    description: '',
  });

  const handleAddBoxes = () => {
    if (formData.quantity > 0) {
      addBoxes(formData.boxType, parseInt(formData.quantity));
      setFormData({ boxType: 'wooden', quantity: 0, reason: 'lost', description: '' });
      setShowAddForm(false);
    }
  };

  const handleMarkLost = () => {
    if (formData.quantity > 0) {
      markBoxesLost(formData.boxType, parseInt(formData.quantity));
      setFormData({ boxType: 'wooden', quantity: 0, reason: 'lost', description: '' });
      setShowLossForm(false);
    }
  };

  const boxesDue = boxInventory.boxesWithSuppliers + boxInventory.boxesWithCustomers;
  const boxesInHand = boxInventory.totalBoxesOwned - boxesDue;

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Boxes */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-semibold">TOTAL BOXES</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{boxInventory.totalBoxesOwned}</p>
              <p className="text-gray-500 text-xs mt-1">Fixed Inventory</p>
            </div>
            <span className="text-5xl">📦</span>
          </div>
        </div>

        {/* Boxes Due */}
        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-semibold">BOXES DUE</p>
              <p className="text-4xl font-bold text-orange-600 mt-2">{boxesDue}</p>
              <p className="text-gray-500 text-xs mt-1">Outstanding</p>
            </div>
            <span className="text-5xl">🔄</span>
          </div>
        </div>

        {/* Boxes In Hand */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-600">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-semibold">IN-HAND</p>
              <p className="text-4xl font-bold text-green-600 mt-2">{boxesInHand}</p>
              <p className="text-gray-500 text-xs mt-1">Available</p>
            </div>
            <span className="text-5xl">✓</span>
          </div>
        </div>
      </div>

      {/* Box Types Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Wooden Crates */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">🪵 Wooden Crates</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg">{boxInventory.wooden.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">In Shop:</span>
              <span className="font-bold text-green-600">{boxInventory.wooden.inShop}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">With Suppliers:</span>
              <span className="font-bold text-blue-600">{boxInventory.wooden.withSuppliers}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">With Customers:</span>
              <span className="font-bold text-indigo-600">{boxInventory.wooden.withCustomers}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Lost/Damaged:</span>
              <span className="font-bold text-red-600">{boxInventory.wooden.lost}</span>
            </div>
          </div>
        </div>

        {/* Plastic Crates */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-800 mb-4">♻️ Plastic Crates</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-lg">{boxInventory.plastic.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">In Shop:</span>
              <span className="font-bold text-green-600">{boxInventory.plastic.inShop}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">With Suppliers:</span>
              <span className="font-bold text-blue-600">{boxInventory.plastic.withSuppliers}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-gray-600">With Customers:</span>
              <span className="font-bold text-indigo-600">{boxInventory.plastic.withCustomers}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Lost/Damaged:</span>
              <span className="font-bold text-red-600">{boxInventory.plastic.lost}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
        >
          ➕ Add New Boxes
        </button>
        <button
          onClick={() => setShowLossForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
        >
          ❌ Mark Lost/Damaged
        </button>
      </div>

      {/* Add Boxes Modal */}
      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header">
              <h2>➕ Add New Boxes</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Box Type</label>
                  <select
                    value={formData.boxType}
                    onChange={(e) => setFormData({ ...formData, boxType: e.target.value })}
                    className="input-field"
                  >
                    <option value="wooden">Wooden</option>
                    <option value="plastic">Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowAddForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBoxes}
                className="btn-primary"
              >
                Add Boxes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Lost Modal */}
      {showLossForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header bg-gradient-to-r from-red-500 to-red-600">
              <h2>❌ Mark Boxes Lost/Damaged</h2>
              <button
                onClick={() => setShowLossForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Box Type</label>
                  <select
                    value={formData.boxType}
                    onChange={(e) => setFormData({ ...formData, boxType: e.target.value })}
                    className="input-field"
                  >
                    <option value="wooden">Wooden</option>
                    <option value="plastic">Plastic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="0"
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="input-field"
                  >
                    <option value="lost">Lost</option>
                    <option value="damaged">Damaged</option>
                    <option value="broken">Broken</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowLossForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkLost}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors font-semibold"
              >
                Mark Lost
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxDashboard;
