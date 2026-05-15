import { useState } from 'react';
import { useData } from '../context/DataContext';

const initialForm = {
  supplierId: '',
  productName: '',
  category: '',
  quantity: '',
  unit: 'pcs',
  unitPrice: '',
  note: '',
};

const AddProducts = () => {
  const { suppliers, addSupplierProduct } = useData();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const resetForm = () => {
    setFormData(initialForm);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    try {
      const product = addSupplierProduct(formData);
      setFeedback({
        type: 'success',
        message: `${product.productName} added to stock. Quantity: ${product.quantity} ${product.unit}.`,
      });
      resetForm();
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to add product.',
      });
    }
  };

  return (
    <div className="card">
      <h3 className="section-header">Add Products</h3>

      {feedback.message && (
        <div className={feedback.type === 'error' ? 'status-error mb-4' : 'status-success mb-4'}>
          <span>{feedback.type === 'error' ? '!' : '✓'}</span>
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
            <label>Product Name</label>
            <input
              type="text"
              value={formData.productName}
              onChange={(event) => setFormData((prev) => ({ ...prev, productName: event.target.value }))}
              placeholder="Himsagar Mango"
              className="input-field"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label>Category</label>
            <input
              type="text"
              value={formData.category}
              onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="Mango"
              className="input-field"
              required
            />
          </div>
          <div>
            <label>Unit</label>
            <select
              value={formData.unit}
              onChange={(event) => setFormData((prev) => ({ ...prev, unit: event.target.value }))}
              className="input-field"
            >
              <option value="pcs">Pieces</option>
              <option value="kg">KG</option>
              <option value="dozen">Dozen</option>
              <option value="box">Box</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label>Quantity</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.quantity}
              onChange={(event) => setFormData((prev) => ({ ...prev, quantity: event.target.value }))}
              className="input-field"
              required
            />
          </div>
          <div>
            <label>Unit Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unitPrice}
              onChange={(event) => setFormData((prev) => ({ ...prev, unitPrice: event.target.value }))}
              className="input-field"
              required
            />
          </div>
        </div>

        <div>
          <label>Note</label>
          <input
            type="text"
            value={formData.note}
            onChange={(event) => setFormData((prev) => ({ ...prev, note: event.target.value }))}
            placeholder="Optional delivery note"
            className="input-field"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={resetForm} className="btn-secondary">
            Clear
          </button>
          <button type="submit" className="btn-primary">
            Add Product
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProducts;
