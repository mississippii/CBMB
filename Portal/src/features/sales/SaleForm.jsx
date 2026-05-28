import { useMemo, useState } from 'react';
import {
  ShoppingCart, UserCheck, User, Package, Hash, DollarSign,
  CreditCard, Save, Tag, X, Scale,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';

const fmt = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;

const initialForm = {
  supplierId: '',
  customerId: '',
  productId: '',
  quantity: '',
  saleWeightKg: '',
  unitPrice: '',
  paymentType: 'FULL_DUE',
  paymentAmount: '',
  discount: '',
};

const SaleForm = ({ onClose }) => {
  const { suppliers, customers, supplierProducts, recordSale } = useData();
  const showToast = useToast();
  const [form, setForm] = useState(initialForm);
  const [oneTime, setOneTime] = useState({ name: '', phone: '' });
  const [showDiscount, setShowDiscount] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const availableProducts = useMemo(() => {
    const supplierId = Number(form.supplierId);
    if (!supplierId) return [];
    return supplierProducts.filter((p) => p.supplierId === supplierId && p.quantity > 0);
  }, [supplierProducts, form.supplierId]);

  const selectedProduct = useMemo(
    () => availableProducts.find((p) => p.id === Number(form.productId)),
    [availableProducts, form.productId],
  );
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === Number(form.customerId)),
    [customers, form.customerId],
  );

  const quantity = Number(form.quantity) || 0;
  const saleWeightKg = Number(form.saleWeightKg) || 0;
  const unitPrice = Number(form.unitPrice) || 0;
  // Weight set → priced per kg; otherwise priced per pack-unit (matches shipment unit).
  const pricedByWeight = saleWeightKg > 0;
  const grossAmount = Math.max(0, pricedByWeight ? saleWeightKg * unitPrice : quantity * unitPrice);
  const discount = showDiscount ? Math.min(Math.max(0, Number(form.discount) || 0), grossAmount) : 0;
  const netSale = Math.max(0, grossAmount - discount);
  const isOneTime = form.customerId === 'ONE_TIME';
  const previousDue = selectedCustomer ? Number(selectedCustomer.amountDue || 0) : 0;
  // A sale collects payment for THIS sale only (max = netSale). Prior due is settled separately.
  const paymentReceived = isOneTime
    ? netSale
    : form.paymentType === 'FULL_PAY'
      ? netSale
      : form.paymentType === 'PARTIAL_PAY'
        ? Number(form.paymentAmount) || 0
        : 0;
  const dueAfter = Math.max(0, previousDue + netSale - paymentReceived);
  const overStock = selectedProduct && quantity > selectedProduct.quantity;

  const handleSupplierChange = (supplierId) =>
    setForm((prev) => ({ ...prev, supplierId, productId: '', unitPrice: '', quantity: '', saleWeightKg: '' }));

  const handleProductChange = (productId) => {
    const product = availableProducts.find((p) => p.id === Number(productId));
    setForm((prev) => ({
      ...prev,
      productId,
      unitPrice: product ? String(product.unitPrice || '') : '',
      saleWeightKg: '',
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (overStock) {
      setError(`Quantity exceeds stock for ${selectedProduct.productName} (available ${selectedProduct.quantity}).`);
      return;
    }
    if (form.paymentType === 'PARTIAL_PAY' && paymentReceived <= 0) {
      setError('Enter the partial payment amount.');
      return;
    }
    if (form.paymentType === 'PARTIAL_PAY' && paymentReceived >= netSale) {
      setError('Partial payment must be less than this sale amount.');
      return;
    }
    if (paymentReceived > netSale) {
      setError('Payment for a sale cannot exceed the sale amount. Settle prior due separately.');
      return;
    }

    setIsSaving(true);
    try {
      await recordSale({
        supplierId: Number(form.supplierId),
        customerId: form.customerId,
        productId: Number(form.productId),
        quantity,
        saleWeightKg: pricedByWeight ? saleWeightKg : null,
        unitPrice,
        discountAmount: discount,
        paymentAmount: paymentReceived,
        customerName: isOneTime ? oneTime.name : undefined,
        customerPhone: isOneTime ? oneTime.phone : undefined,
      });
      showToast('Sale recorded', 'success');
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record sale.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <form onSubmit={handleSubmit} className="modal-content" style={{ maxWidth: '46rem' }}>
        <div className="modal-header">
          <div className="flex items-center gap-2.5">
            <div className="modal-icon-circle bg-blue-100 text-blue-700"><ShoppingCart size={18} /></div>
            <div>
              <h2>Record New Sale</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sell stock from a supplier lot to a customer</p>
            </div>
          </div>
          <button type="button" onClick={() => onClose?.()} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body max-h-[72vh] overflow-y-auto">
          <div className="form-grid">
            <div className="form-field">
              <label className="form-label"><UserCheck size={13} /> Supplier <span className="text-red-500">*</span></label>
              <select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="input-field" required autoFocus>
                <option value="">Choose supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}{s.businessName ? ` (${s.businessName})` : ''}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label"><User size={13} /> Customer <span className="text-red-500">*</span></label>
              <select
                value={form.customerId}
                onChange={(e) => setForm((prev) => ({
                  ...prev,
                  customerId: e.target.value,
                  paymentType: e.target.value === 'ONE_TIME' ? 'FULL_PAY' : prev.paymentType,
                  paymentAmount: e.target.value === 'ONE_TIME' ? '' : prev.paymentAmount,
                }))}
                className="input-field"
                required
              >
                <option value="">Choose customer…</option>
                <option value="ONE_TIME">One-time customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                ))}
              </select>
            </div>
          </div>

          {isOneTime && (
            <div className="form-grid mt-3">
              <div className="form-field">
                <label className="form-label">One-time Name <span className="text-red-500">*</span></label>
                <input type="text" value={oneTime.name} onChange={(e) => setOneTime((p) => ({ ...p, name: e.target.value }))} className="input-field" required />
              </div>
              <div className="form-field">
                <label className="form-label">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={oneTime.phone} onChange={(e) => setOneTime((p) => ({ ...p, phone: e.target.value }))} className="input-field" required />
              </div>
            </div>
          )}

          <div className="form-grid mt-3">
            <div className="form-field form-field-full">
              <label className="form-label"><Package size={13} /> Product (lot) <span className="text-red-500">*</span></label>
              <select value={form.productId} onChange={(e) => handleProductChange(e.target.value)} className="input-field" disabled={!form.supplierId} required>
                <option value="">{form.supplierId ? 'Choose product lot…' : 'Select supplier first'}</option>
                {availableProducts.map((p) => {
                  const lot = p.deliveryId
                    ? ` • lot #${p.deliveryId}${p.deliveryDate ? ` (${String(p.deliveryDate).split('T')[0]})` : ''}`
                    : '';
                  return (
                    <option key={p.id} value={p.id}>
                      {p.productName}
                      {(() => {
                        const tail = [p.category, p.subCategoryName].filter(Boolean).join(' › ');
                        return tail ? ` · ${tail}` : '';
                      })()} • stock {p.quantity} {String(p.unit || '').toUpperCase()}{lot}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label"><Hash size={13} /> Quantity <span className="text-red-500">*</span>
                <span className="form-label-hint">{selectedProduct ? String(selectedProduct.unit || '').toUpperCase() : ''}</span>
              </label>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="input-field" placeholder="0" required />
            </div>
            <div className="form-field">
              <label className="form-label">
                <Scale size={13} /> Sale Weight
                <span className="form-label-hint">kg · optional</span>
              </label>
              <div className="input-with-suffix">
                <input
                  type="number" min="0" step="0.001" value={form.saleWeightKg}
                  onChange={(e) => set('saleWeightKg', e.target.value)}
                  className="input-field" placeholder="0"
                />
                <span className="input-suffix">kg</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">
                <DollarSign size={13} /> Price per kg <span className="text-red-500">*</span>
              </label>
              <div className="input-with-suffix">
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} className="input-field" placeholder="0" required />
                <span className="input-suffix">৳/kg</span>
              </div>
            </div>
          </div>

          {/* Pricing hint — confirm formula at a glance. */}
          {selectedProduct && unitPrice > 0 && (quantity > 0 || saleWeightKg > 0) && (
            <p className="mt-1 text-[11px] text-slate-500">
              {pricedByWeight ? (
                <>Sale total: <strong>{saleWeightKg} kg × ৳{unitPrice}/kg = ৳{grossAmount.toLocaleString()}</strong>. Inventory will decrement <strong>{quantity} {String(selectedProduct.unit || '').toLowerCase()}</strong>.</>
              ) : (
                <>Enter weight to price by kg. Without weight, falling back to <strong>{quantity} × ৳{unitPrice} = ৳{grossAmount.toLocaleString()}</strong>.</>
              )}
            </p>
          )}

          {overStock && (
            <div className="status-error mt-3"><span>!</span><span>Quantity exceeds available stock ({selectedProduct.quantity}).</span></div>
          )}

          <div className="form-grid mt-3">
            <div className="form-field">
              <label className="form-label"><CreditCard size={13} /> Payment Type</label>
              <select
                value={form.paymentType}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentType: e.target.value, paymentAmount: e.target.value === 'PARTIAL_PAY' ? prev.paymentAmount : '' }))}
                className="input-field"
                disabled={isOneTime}
              >
                <option value="FULL_DUE">Full Due</option>
                <option value="PARTIAL_PAY">Partial Pay</option>
                <option value="FULL_PAY">Full Pay</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label">Payment Received</label>
              <div className="input-with-suffix">
                <input
                  type="number" min="0" step="0.01"
                  value={isOneTime ? netSale : form.paymentType === 'FULL_PAY' ? netSale : form.paymentAmount}
                  onChange={(e) => set('paymentAmount', e.target.value)}
                  className="input-field" placeholder="0"
                  disabled={form.paymentType !== 'PARTIAL_PAY' || isOneTime}
                  required={form.paymentType === 'PARTIAL_PAY'}
                />
                <span className="input-suffix">৳</span>
              </div>
            </div>
          </div>

          {/* Discount */}
          <div className="mt-3">
            {!showDiscount ? (
              <button type="button" className="btn-secondary inline-flex items-center gap-1.5" onClick={() => setShowDiscount(true)} disabled={!grossAmount}>
                <Tag size={14} /> Add Discount
              </button>
            ) : (
              <div className="flex items-end gap-3">
                <div className="form-field" style={{ maxWidth: '14rem' }}>
                  <label className="form-label"><Tag size={13} /> Discount</label>
                  <div className="input-with-suffix">
                    <input
                      type="number" min="0" step="1" max={grossAmount}
                      value={form.discount}
                      onChange={(e) => set('discount', e.target.value)}
                      className="input-field" placeholder="0" autoFocus
                    />
                    <span className="input-suffix">৳</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-1.5 mb-[2px]"
                  onClick={() => { setShowDiscount(false); set('discount', ''); }}
                >
                  <X size={14} /> Remove
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
            <div className="balance-pill">
              <p>Sale Amount</p><p>{fmt(grossAmount)}</p>
            </div>
            <div className="balance-pill balance-pill-amber">
              <p>Discount</p><p>− {fmt(discount)}</p>
            </div>
            <div className="balance-pill balance-pill-emerald">
              <p>Net Sale</p><p>{fmt(netSale)}</p>
            </div>
            <div className="balance-pill">
              <p>Previous Due</p><p>{fmt(previousDue)}</p>
            </div>
            <div className="balance-pill">
              <p>Paying Now</p><p>{fmt(paymentReceived)}</p>
            </div>
            <div className="balance-pill balance-pill-rose">
              <p>Due After</p><p>{fmt(dueAfter)}</p>
            </div>
          </div>

          {error && (
            <div className="status-error mt-4"><span>!</span><span>{error}</span></div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" onClick={() => onClose?.()} className="btn-secondary" disabled={isSaving}>Cancel</button>
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving || overStock}>
            <Save size={15} /> {isSaving ? 'Saving…' : 'Record Sale'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SaleForm;
