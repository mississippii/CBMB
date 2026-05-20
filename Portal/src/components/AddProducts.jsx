import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const initialForm = {
  supplierId: '',
  productId: '',
  categoryId: '',
  quantity: '',
  note: '',
};

const AddProducts = () => {
  const { suppliers, catalogProducts, addSupplierProduct } = useData();
  const [formData, setFormData] = useState(initialForm);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const selectedProduct = useMemo(
    () => catalogProducts.find((product) => Number(product.id) === Number(formData.productId)),
    [catalogProducts, formData.productId],
  );

  const categories = useMemo(() => selectedProduct?.categories || [], [selectedProduct]);
  const categoryRequired = categories.length > 0;

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
      const product = await addSupplierProduct(formData);
      setFeedback({
        type: 'success',
        message: `${product.productName}${product.category === 'No Category' ? '' : ` ${product.category}`} added. Quantity: ${product.quantity} ${product.unit}.`,
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
