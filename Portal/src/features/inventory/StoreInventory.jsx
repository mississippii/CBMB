import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';

const WRITE_OFF_REASONS = ['Damaged', 'Spoiled / Rotten', 'Shortage', 'Other'];

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getDateOnly = (dateValue) => {
  if (!dateValue) return '-';
  return String(dateValue).split('T')[0];
};

const StoreInventory = ({ onAddProducts }) => {
  const { supplierProducts, suppliers, transactions, writeOffStock } = useData();
  const showToast = useToast();

  const [writeOff, setWriteOff] = useState(null); // { product }
  const [woForm, setWoForm] = useState({ quantity: '', reason: WRITE_OFF_REASONS[0], note: '' });
  const [woError, setWoError] = useState('');
  const [isSavingWo, setIsSavingWo] = useState(false);

  const openWriteOff = (product) => {
    setWriteOff({ product });
    setWoForm({ quantity: '', reason: WRITE_OFF_REASONS[0], note: '' });
    setWoError('');
  };

  const handleWriteOffSave = async () => {
    const qty = Number(woForm.quantity);
    const max = Number(writeOff?.product?.quantity) || 0;
    if (!qty || qty <= 0) { setWoError('Enter a quantity greater than zero.'); return; }
    if (qty > max) { setWoError(`Cannot exceed available stock (${max}).`); return; }
    setIsSavingWo(true);
    setWoError('');
    try {
      await writeOffStock({
        inventoryId: writeOff.product.id,
        quantity: qty,
        reason: woForm.reason,
        note: woForm.note,
      });
      showToast(`Wrote off ${qty} ${String(writeOff.product.unit || '').toUpperCase()} of ${writeOff.product.productName}`, 'success');
      setWriteOff(null);
    } catch (error) {
      setWoError(error.message || 'Failed to write off stock.');
    } finally {
      setIsSavingWo(false);
    }
  };

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );

  const products = useMemo(
    () =>
      [...supplierProducts]
        .map((product) => {
          const quantity = Number(product.quantity) || 0;
          const supplier = supplierById.get(product.supplierId);
          return {
            ...product,
            quantity,
            supplierName: supplier?.name || 'Unknown supplier',
            supplierPhone: supplier?.contact || supplier?.phone || '',
            stockStatus: quantity <= 0 ? 'Stock out' : quantity <= 10 ? 'Low stock' : 'Available',
          };
        })
        .sort((a, b) => {
          if (a.quantity <= 0 && b.quantity > 0) return 1;
          if (a.quantity > 0 && b.quantity <= 0) return -1;
          return String(a.productName).localeCompare(String(b.productName));
        }),
    [supplierById, supplierProducts],
  );

  const today = new Date().toISOString().split('T')[0];
  const todaySales = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'Sale' && getDateOnly(transaction.createdAt || transaction.date) === today,
  );

  const summary = {
    productCount: products.length,
    availableCount: products.filter((product) => product.quantity > 0).length,
    stockOutCount: products.filter((product) => product.quantity <= 0).length,
    totalQuantity: products.reduce((sum, product) => sum + product.quantity, 0),
    todaySales: todaySales.reduce((sum, transaction) => sum + (Number(transaction.totalAmount) || 0), 0),
  };

  return (
    <div className="store-inventory">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Store Inventory</span>
          <h3>Available products</h3>
          <p>Current product stock by supplier, category, and quantity.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onAddProducts}>
          Add Product
        </button>
      </section>

      <section className="inventory-kpi-grid">
        <div className="metric-tile">
          <p>Total Products</p>
          <strong>{summary.productCount}</strong>
        </div>
        <div className="metric-tile">
          <p>Available</p>
          <strong>{summary.availableCount}</strong>
        </div>
        <div className="metric-tile danger">
          <p>Stock Out</p>
          <strong>{summary.stockOutCount}</strong>
        </div>
        <div className="metric-tile">
          <p>Total Quantity</p>
          <strong>{formatNumber(summary.totalQuantity)}</strong>
        </div>
        <div className="metric-tile">
          <p>Today Sales</p>
          <strong>{formatCurrency(summary.todaySales)}</strong>
        </div>
      </section>

      <section className="supplier-panel inventory-panel">
        <div className="inventory-panel-header">
          <div>
            <h3>Products In Store</h3>
            <p>Stock out products stay visible so the wholesaler can restock them.</p>
          </div>
          <span>{summary.availableCount} available</span>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            No products added yet. Add product stock after receiving from suppliers.
          </div>
        ) : (
          <>
            <div className="table-scroll inventory-table">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Supplier</th>
                    <th className="px-4 py-3 text-left">Lot</th>
                    <th className="px-4 py-3" style={{ textAlign: 'center' }}>Quantity</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Last Received</th>
                    <th className="px-4 py-3" style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{product.productName}</td>
                      <td className="px-4 py-3 text-slate-700">{product.category}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{product.supplierName}</div>
                        <div className="text-xs text-slate-500">{product.supplierPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {product.deliveryId ? (
                          <>
                            <div className="font-semibold">#{product.deliveryId}</div>
                            <div className="text-xs text-slate-500">{getDateOnly(product.deliveryDate)}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900" style={{ textAlign: 'center' }}>
                        {formatNumber(product.quantity)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{String(product.unit || '').toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <span className={`stock-pill ${product.quantity <= 0 ? 'out' : product.quantity <= 10 ? 'low' : ''}`}>
                          {product.stockStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{getDateOnly(product.dateReceived)}</td>
                      <td className="px-4 py-3" style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-secondary !py-1 !px-2 inline-flex items-center gap-1.5 text-xs"
                          onClick={() => openWriteOff(product)}
                          disabled={product.quantity <= 0}
                          title="Write off damaged / non-saleable stock"
                        >
                          <AlertTriangle size={13} /> Write off
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {writeOff && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '30rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-amber-100 text-amber-700">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h2>Write off stock</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {writeOff.product.productName}
                    {writeOff.product.deliveryId ? ` · lot #${writeOff.product.deliveryId}` : ''} · {formatNumber(writeOff.product.quantity)} {String(writeOff.product.unit || '').toUpperCase()} available
                  </p>
                </div>
              </div>
              <button onClick={() => setWriteOff(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">Quantity <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    max={writeOff.product.quantity}
                    value={woForm.quantity}
                    onChange={(e) => setWoForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="input-field"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Reason</label>
                  <select
                    value={woForm.reason}
                    onChange={(e) => setWoForm((p) => ({ ...p, reason: e.target.value }))}
                    className="input-field"
                  >
                    {WRITE_OFF_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="form-field form-field-full">
                  <label className="form-label">Note <span className="form-label-hint">optional</span></label>
                  <input
                    type="text"
                    value={woForm.note}
                    onChange={(e) => setWoForm((p) => ({ ...p, note: e.target.value }))}
                    className="input-field"
                    placeholder="e.g. water-damaged sacks"
                  />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Consignment: damaged stock is removed only — the supplier bears the loss, so there is no charge or balance change.
              </p>
              {woError && (
                <div className="status-error mt-3"><span>!</span><span>{woError}</span></div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setWriteOff(null)} className="btn-secondary" disabled={isSavingWo}>Cancel</button>
              <button onClick={handleWriteOffSave} disabled={isSavingWo} className="btn-danger flex items-center gap-2">
                <AlertTriangle size={14} /> {isSavingWo ? 'Saving…' : 'Write off'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreInventory;
