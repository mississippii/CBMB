import { useEffect, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const initialForm = {
  supplierId: '',
  productId: '',
  categoryId: '',
  quantity: '',
  note: '',
};

const formatQuantity = (value, unit) => `${(Number(value) || 0).toLocaleString()} ${String(unit || '').toUpperCase()}`.trim();

const AddProducts = () => {
  const { suppliers, catalogProducts, shipments, addSupplierProduct } = useData();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    if (feedback.type !== 'success') return undefined;
    const timer = window.setTimeout(() => setFeedback({ type: '', message: '' }), 1500);
    return () => window.clearTimeout(timer);
  }, [feedback.type]);

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [Number(supplier.id), supplier])),
    [suppliers],
  );

  const selectedProduct = useMemo(
    () => catalogProducts.find((product) => Number(product.id) === Number(formData.productId)),
    [catalogProducts, formData.productId],
  );

  const categories = useMemo(() => selectedProduct?.categories || [], [selectedProduct]);
  const categoryRequired = categories.length > 0;

  const latestShipments = useMemo(() => {
    return shipments
      .slice()
      .sort((a, b) => new Date(b.deliveryDate || b.date || 0) - new Date(a.deliveryDate || a.date || 0))
      .slice(0, 15);
  }, [shipments]);

  const selectedCategory = useMemo(
    () => categories.find((category) => Number(category.id) === Number(formData.categoryId)),
    [categories, formData.categoryId],
  );

  const resetForm = () => {
    setFormData(initialForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      await addSupplierProduct(formData);
      setFeedback({ type: 'success', message: '' });
      resetForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to receive shipment.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="card shipment-form-card">
        <h3 className="section-header">Shipment</h3>

        {feedback.type === 'success' && (
          <div className="success-splash" role="status" aria-label="Saved">
            <span>✓</span>
          </div>
        )}

        {feedback.type === 'error' && feedback.message && (
          <div className="status-error mb-4">
            <span>!</span>
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="shipment-form-compact">
          <div className="shipment-form-grid">
            <div>
              <label>Supplier</label>
              <select
                value={formData.supplierId}
                onChange={(event) => setFormData((prev) => ({ ...prev, supplierId: event.target.value }))}
                className="input-field"
                required
              >
                <option value="">Choose supplier...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Product</label>
              <select
                value={formData.productId}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, productId: event.target.value, categoryId: '' }))
                }
                className="input-field"
                required
              >
                <option value="">Choose product...</option>
                {catalogProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({String(product.defaultUnit || '').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="shipment-form-grid">
            <div>
              <label>Category</label>
              <select
                value={formData.categoryId}
                onChange={(event) => setFormData((prev) => ({ ...prev, categoryId: event.target.value }))}
                className="input-field"
                disabled={!selectedProduct || !categoryRequired}
                required={categoryRequired}
              >
                <option value="">
                  {!selectedProduct ? 'Select product first' : categoryRequired ? 'Choose category...' : 'No category required'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}{category.grade ? ` - ${category.grade}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Unit</label>
              <input
                type="text"
                value={selectedProduct?.defaultUnit || ''}
                placeholder="Auto selected"
                className="input-field"
                readOnly
              />
            </div>
          </div>

          <div className="shipment-form-grid">
            <div>
              <label>Quantity</label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.quantity}
                onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label>Selected Item</label>
              <input
                type="text"
                value={selectedProduct ? (selectedCategory ? `${selectedProduct.name} / ${selectedCategory.name}` : selectedProduct.name) : ''}
                placeholder="Product selection"
                className="input-field"
                readOnly
              />
            </div>
            <div>
              <label>Note</label>
              <input
                type="text"
                value={formData.note}
                onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Optional note"
                className="input-field"
              />
            </div>
          </div>

          <div className="shipment-action-row">
            <button type="button" onClick={resetForm} className="btn-secondary">
              Clear
            </button>
            <button type="submit" className="btn-primary">
              Save Shipment
            </button>
          </div>
        </form>
      </div>

      <div className="supplier-panel">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3>Shipment History</h3>
            <p className="text-sm font-medium text-slate-500">Recent supplier product receipts.</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#307D7E]">
            Latest {latestShipments.length} of {shipments.length}
          </span>
        </div>

        {shipments.length === 0 ? (
          <div className="empty-state">No shipments received yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th>Items</th>
                  <th className="text-right">Total Quantity</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {latestShipments.map((shipment) => {
                  const supplier = supplierById.get(Number(shipment.supplierId));
                  return (
                    <tr key={shipment.id}>
                      <td className="font-semibold text-slate-900">{shipment.date}</td>
                      <td className="font-medium text-slate-700">{supplier?.name || '-'}</td>
                      <td className="text-slate-700">
                        {(shipment.items || []).map((item) => (
                          <div key={item.id} className="font-medium">
                            {item.productName}{item.categoryName && item.categoryName !== 'No Category' ? ` / ${item.categoryName}` : ''} - {formatQuantity(item.quantity, item.unit)}
                          </div>
                        ))}
                      </td>
                      <td className="text-right font-extrabold text-slate-900">{shipment.totalQuantity.toLocaleString()}</td>
                      <td className="text-slate-600">{shipment.note || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddProducts;
