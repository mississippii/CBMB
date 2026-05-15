import { useState } from 'react';
import { useData } from '../context/DataContext';

const BoxDashboard = () => {
  const { boxInventory, suppliers, customers, addBoxes, markBoxesLost } = useData();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLossForm, setShowLossForm] = useState(false);
  const [formData, setFormData] = useState({
    boxType: 'wooden',
    quantity: 0,
    reason: 'lost',
    description: '',
  });
  const [statusMessage, setStatusMessage] = useState('');

  const handleAddBoxes = () => {
    const quantity = Number(formData.quantity) || 0;
    if (quantity <= 0) {
      setStatusMessage('Please enter a valid quantity to add.');
      return;
    }

    addBoxes(formData.boxType, quantity);
    setFormData({ boxType: 'wooden', quantity: 0, reason: 'lost', description: '' });
    setShowAddForm(false);
    setStatusMessage(`Added ${quantity} ${formData.boxType} box(es) to inventory.`);
  };

  const handleMarkLost = () => {
    const quantity = Number(formData.quantity) || 0;
    if (quantity <= 0) {
      setStatusMessage('Please enter a valid quantity to mark as lost/damaged.');
      return;
    }

    const removed = markBoxesLost(formData.boxType, quantity);
    setFormData({ boxType: 'wooden', quantity: 0, reason: 'lost', description: '' });
    setShowLossForm(false);
    if (removed === 0) {
      setStatusMessage(`No ${formData.boxType} boxes available in shop storage to mark as lost.`);
      return;
    }
    setStatusMessage(`Marked ${removed} ${formData.boxType} box(es) as lost/damaged.`);
  };

  const boxesDue = boxInventory.boxesWithSuppliers + boxInventory.boxesWithCustomers;
  const boxesInHand = boxInventory.boxesInShop;
  const activeBoxes = Math.max(boxInventory.totalBoxesOwned, 1);
  const duePercent = Math.round((boxesDue / activeBoxes) * 100);
  const inShopPercent = Math.round((boxInventory.boxesInShop / activeBoxes) * 100);
  const supplierPercent = Math.round((boxInventory.boxesWithSuppliers / activeBoxes) * 100);
  const customerPercent = Math.round((boxInventory.boxesWithCustomers / activeBoxes) * 100);
  const lostPercent = Math.round((boxInventory.boxesLostDamaged / Math.max(boxInventory.totalBoxesOwned + boxInventory.boxesLostDamaged, 1)) * 100);
  const boxTypes = [
    { key: 'wooden', label: 'Wooden Boxes', shortLabel: 'Wooden', data: boxInventory.wooden },
    { key: 'plastic', label: 'Plastic Boxes', shortLabel: 'Plastic', data: boxInventory.plastic },
  ];
  const topCustomerHolders = customers
    .filter((customer) => Number(customer.totalBoxesHolding) > 0)
    .sort((a, b) => Number(b.totalBoxesHolding) - Number(a.totalBoxesHolding))
    .slice(0, 4);
  const topSupplierHolders = suppliers
    .filter((supplier) => Number(supplier.totalBoxesHolding) > 0)
    .sort((a, b) => Number(b.totalBoxesHolding) - Number(a.totalBoxesHolding))
    .slice(0, 4);

  return (
    <div className="box-dashboard">
      {statusMessage && (
        <div className="status-success">
          <span>i</span>
          <span>{statusMessage}</span>
        </div>
      )}

      <section className="box-overview">
        <div className="box-overview-copy">
          <span className="box-eyebrow">Box Control</span>
          <h3>Inventory accountability</h3>
          <p>
            Track boxes in shop, with customers, with suppliers, and lost/damaged from one place.
          </p>
        </div>
        <div className="box-action-row">
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary"
          >
            Add Boxes
          </button>
          <button
            onClick={() => setShowLossForm(true)}
            className="btn-danger"
          >
            Mark Lost/Damaged
          </button>
        </div>
      </section>

      <section className="box-kpi-grid">
        <div className="box-kpi primary">
          <span>Total Inventory</span>
          <strong>{boxInventory.totalBoxesOwned}</strong>
          <p>Boxes currently owned</p>
        </div>
        <div className="box-kpi success">
          <span>In Shop</span>
          <strong>{boxesInHand}</strong>
          <p>{inShopPercent}% ready for dispatch</p>
        </div>
        <div className="box-kpi warning">
          <span>Due Outside</span>
          <strong>{boxesDue}</strong>
          <p>{duePercent}% with parties</p>
        </div>
        <div className="box-kpi danger">
          <span>Lost/Damaged</span>
          <strong>{boxInventory.boxesLostDamaged}</strong>
          <p>{lostPercent}% lifetime loss</p>
        </div>
      </section>

      <section className="box-dashboard-grid">
        <div className="box-panel allocation-panel">
          <div className="box-panel-header">
            <div>
              <h3>Current Allocation</h3>
              <p>Where the boxes are right now.</p>
            </div>
            <span>{boxInventory.totalBoxesOwned} active</span>
          </div>

          <div className="allocation-track" aria-label="Box allocation">
            <span className="allocation-shop" style={{ width: `${inShopPercent}%` }} />
            <span className="allocation-suppliers" style={{ width: `${supplierPercent}%` }} />
            <span className="allocation-customers" style={{ width: `${customerPercent}%` }} />
          </div>

          <div className="allocation-list">
            <div className="allocation-item shop">
              <div>
                <span />
                <p>In Shop</p>
              </div>
              <strong>{boxInventory.boxesInShop}</strong>
            </div>
            <div className="allocation-item suppliers">
              <div>
                <span />
                <p>With Suppliers</p>
              </div>
              <strong>{boxInventory.boxesWithSuppliers}</strong>
            </div>
            <div className="allocation-item customers">
              <div>
                <span />
                <p>With Customers</p>
              </div>
              <strong>{boxInventory.boxesWithCustomers}</strong>
            </div>
          </div>
        </div>

        <div className="box-panel">
          <div className="box-panel-header">
            <div>
              <h3>Type Breakdown</h3>
              <p>Wooden and plastic box movement.</p>
            </div>
          </div>

          <div className="box-type-list">
            {boxTypes.map((type) => {
              const due = type.data.withSuppliers + type.data.withCustomers;
              const typeActive = Math.max(type.data.total, 1);

              return (
                <div key={type.key} className="box-type-card">
                  <div className="box-type-title">
                    <div>
                      <h4>{type.label}</h4>
                      <p>{due} outside</p>
                    </div>
                    <strong>{type.data.total}</strong>
                  </div>
                  <div className="box-type-meter">
                    <span style={{ width: `${Math.round((type.data.inShop / typeActive) * 100)}%` }} />
                  </div>
                  <div className="box-type-stats">
                    <span>Shop: {type.data.inShop}</span>
                    <span>Supplier: {type.data.withSuppliers}</span>
                    <span>Customer: {type.data.withCustomers}</span>
                    <span>Lost: {type.data.lost}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="box-holder-grid">
        <div className="box-panel">
          <div className="box-panel-header">
            <div>
              <h3>Customer Box Due</h3>
              <p>Highest customer holdings.</p>
            </div>
          </div>
          <div className="holder-list">
            {topCustomerHolders.length ? (
              topCustomerHolders.map((customer) => (
                <div key={customer.id} className="holder-row">
                  <div>
                    <h4>{customer.name}</h4>
                    <p>{customer.phone}</p>
                  </div>
                  <strong>{customer.totalBoxesHolding}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">No customer box due.</div>
            )}
          </div>
        </div>

        <div className="box-panel">
          <div className="box-panel-header">
            <div>
              <h3>Supplier Box Due</h3>
              <p>Highest supplier holdings.</p>
            </div>
          </div>
          <div className="holder-list">
            {topSupplierHolders.length ? (
              topSupplierHolders.map((supplier) => (
                <div key={supplier.id} className="holder-row">
                  <div>
                    <h4>{supplier.name}</h4>
                    <p>{supplier.contact}</p>
                  </div>
                  <strong>{supplier.totalBoxesHolding}</strong>
                </div>
              ))
            ) : (
              <div className="empty-state">No supplier box due.</div>
            )}
          </div>
        </div>
      </section>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header">
              <h2>Add New Boxes</h2>
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
                    min="1"
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

      {showLossForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header danger">
              <h2>Mark Boxes Lost/Damaged</h2>
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
                    min="1"
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
                className="btn-danger"
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
