import { useMemo, useState } from 'react';
import {
  Truck, UserCheck, Package, Tag, Hash, FileText, Save, RotateCcw, Calendar,
  DollarSign, Wallet, Percent,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';

const initialForm = {
  supplierId: '',
  productId: '',
  categoryId: '',
  quantity: '',
  estimatedValue: '',
  advancePaid: '',
  commissionRate: '',
  note: '',
};

const formatQuantity = (value, unit) =>
  `${(Number(value) || 0).toLocaleString()} ${String(unit || '').toUpperCase()}`.trim();

const AddProducts = () => {
  const { suppliers, catalogProducts, shipments, addSupplierProduct } = useData();
  const showToast = useToast();
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [Number(s.id), s])),
    [suppliers],
  );

  const selectedSupplier = supplierById.get(Number(formData.supplierId));
  const selectedProduct = useMemo(
    () => catalogProducts.find((p) => Number(p.id) === Number(formData.productId)),
    [catalogProducts, formData.productId],
  );

  const categories = useMemo(() => selectedProduct?.categories || [], [selectedProduct]);
  const categoryRequired = categories.length > 0;

  const selectedCategory = useMemo(
    () => categories.find((c) => Number(c.id) === Number(formData.categoryId)),
    [categories, formData.categoryId],
  );

  const latestShipments = useMemo(() => {
    return shipments
      .slice()
      .sort((a, b) => new Date(b.deliveryDate || b.date || 0) - new Date(a.deliveryDate || a.date || 0))
      .slice(0, 15);
  }, [shipments]);

  const handleField = (key) => (e) =>
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
      ...(key === 'productId' ? { categoryId: '' } : {}),
    }));

  const resetForm = () => {
    setFormData(initialForm);
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setIsSaving(true);
    try {
      await addSupplierProduct(formData);
      const itemLabel = selectedProduct
        ? `${selectedProduct.name}${selectedCategory ? ` / ${selectedCategory.name}` : ''}`
        : 'Shipment';
      showToast(`${itemLabel} received from ${selectedSupplier?.name || 'supplier'}`, 'success');
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to receive shipment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card shipment-form-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Truck size={18} className="text-blue-600" />
              Receive Shipment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Record incoming products from a supplier</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label">
                <UserCheck size={13} /> Supplier <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplierId}
                onChange={handleField('supplierId')}
                className="input-field"
                required
              >
                <option value="">Choose supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.businessName ? ` (${s.businessName})` : ''}</option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <Package size={13} /> Product <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.productId}
                onChange={handleField('productId')}
                className="input-field"
                required
              >
                <option value="">Choose product…</option>
                {catalogProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({String(p.defaultUnit || '').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <Tag size={13} /> Category
                {categoryRequired && <span className="text-red-500">*</span>}
              </label>
              <select
                value={formData.categoryId}
                onChange={handleField('categoryId')}
                className="input-field"
                disabled={!selectedProduct || !categoryRequired}
                required={categoryRequired}
              >
                <option value="">
                  {!selectedProduct
                    ? 'Select product first'
                    : categoryRequired
                    ? 'Choose category…'
                    : 'No category required'}
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.grade ? ` — ${c.grade}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label className="form-label">
                <Hash size={13} /> Quantity <span className="text-red-500">*</span>
                <span className="form-label-hint">
                  {selectedProduct ? String(selectedProduct.defaultUnit || '').toUpperCase() : ''}
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="0.001"
                value={formData.quantity}
                onChange={handleField('quantity')}
                className="input-field"
                placeholder="0"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                <DollarSign size={13} /> Estimated Value
                <span className="form-label-hint">of this shipment</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.estimatedValue}
                  onChange={handleField('estimatedValue')}
                  className="input-field"
                  placeholder="0"
                />
                <span className="input-suffix">৳</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">
                <Wallet size={13} /> Advance Paid
                <span className="form-label-hint">to supplier now</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.advancePaid}
                  onChange={handleField('advancePaid')}
                  className="input-field"
                  placeholder="0"
                />
                <span className="input-suffix">৳</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">
                <Percent size={13} /> Commission Rate
                <span className="form-label-hint">set later if unsure</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={formData.commissionRate}
                  onChange={handleField('commissionRate')}
                  className="input-field"
                  placeholder="negotiate after sell"
                />
                <span className="input-suffix">%</span>
              </div>
            </div>

            <div className="form-field form-field-full">
              <label className="form-label">
                <FileText size={13} /> Note
                <span className="form-label-hint">optional</span>
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={handleField('note')}
                placeholder="e.g. Truck #BD-1234, partial delivery"
                className="input-field"
              />
            </div>
          </div>

          {/* Live summary */}
          {(selectedSupplier || selectedProduct) && (
            <div className="shipment-summary">
              <div>
                <p className="shipment-summary-label">Summary</p>
                <p className="shipment-summary-text">
                  {selectedSupplier ? <><strong>{selectedSupplier.name}</strong> →</> : ''}{' '}
                  {selectedProduct ? selectedProduct.name : '—'}
                  {selectedCategory ? ` / ${selectedCategory.name}` : ''}
                  {formData.quantity ? ` — ${formData.quantity} ${String(selectedProduct?.defaultUnit || '').toUpperCase()}` : ''}
                </p>
              </div>
            </div>
          )}

          {formError && (
            <div className="status-error">
              <span>!</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={resetForm} className="btn-secondary flex items-center gap-2" disabled={isSaving}>
              <RotateCcw size={14} /> Clear
            </button>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
              <Save size={15} /> {isSaving ? 'Saving…' : 'Save Shipment'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="supplier-panel">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" /> Shipment History
            </h3>
            <p>Recent supplier deliveries</p>
          </div>
          <span className="badge badge-teal">Latest {latestShipments.length} of {shipments.length}</span>
        </div>

        {shipments.length === 0 ? (
          <div className="empty-state">
            <Truck size={32} className="empty-state-icon" />
            <p className="empty-state-title">No shipments yet</p>
            <p className="empty-state-sub">Receive your first delivery using the form above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Items</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Total Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Est. Value</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Advance</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Comm.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestShipments.map((shipment) => {
                  const supplier = supplierById.get(Number(shipment.supplierId));
                  return (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{shipment.date}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="supplier-card-avatar !w-8 !h-8 !text-xs">
                            {supplier?.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <span className="font-medium text-slate-800">{supplier?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {(shipment.items || []).map((item) => (
                          <div key={item.id} className="font-medium">
                            {item.productName}{item.categoryName && item.categoryName !== 'No Category' ? ` / ${item.categoryName}` : ''}
                            {' — '}
                            <span className="text-slate-500">{formatQuantity(item.quantity, item.unit)}</span>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">
                        {shipment.totalQuantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {shipment.estimatedValue ? `৳ ${shipment.estimatedValue.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {shipment.advancePaid ? `৳ ${shipment.advancePaid.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {shipment.commissionRate == null
                          ? <span className="badge badge-amber">Pending</span>
                          : <span className="font-semibold text-slate-800">{shipment.commissionRate}%</span>}
                      </td>
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
