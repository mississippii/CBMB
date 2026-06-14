import { useMemo, useState } from 'react';
import {
  ShoppingCart, UserCheck, User, Package, Hash, DollarSign,
  CreditCard, Save, Tag, X, Scale, Boxes, Wallet, AlertTriangle,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import SearchableSelect from '../../shared/components/SearchableSelect';

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'OTHER'];
const cashRound = (v) => Math.ceil(Number(v) || 0);
const fmt = (v) => `৳ ${cashRound(v).toLocaleString()}`;
const titleCase = (s) => {
  const str = String(s || '').trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
};

const Section = ({ n, title }) => (
  <div className="flex items-center gap-2 mt-3.5 mb-1.5 first:mt-0">
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">{n}</span>
    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{title}</span>
  </div>
);

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
  const { suppliers, customers, supplierProducts, shipments, crateInventory, recordSale, sellCrates, borrowCustomerCrates, reloadCustomers } = useData();
  const showToast = useToast();
  const [form, setForm] = useState(initialForm);
  const [shipmentKey, setShipmentKey] = useState('');
  const [oneTime, setOneTime] = useState({ name: '', phone: '' });
  const [showDiscount, setShowDiscount] = useState(false);
  const [method, setMethod] = useState('CASH');
  // Crate add-on: borrow (permanent customer) or sell (walk-in / cash). One or more types.
  const [showCrate, setShowCrate] = useState(false);
  const [crateLines, setCrateLines] = useState([{ crateType: '', quantity: '', unitPrice: '' }]);
  // Refundable deposit taken against borrowed crates (permanent customers only).
  const [crateDeposit, setCrateDeposit] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const updateCrateLine = (i, patch) => setCrateLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addCrateLine = () => setCrateLines((ls) => [...ls, { crateType: '', quantity: '', unitPrice: '' }]);
  const removeCrateLine = (i) => setCrateLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));

  const crateTypeOptions = useMemo(() => Object.keys(crateInventory?.byType || {}), [crateInventory]);

  const availableProducts = useMemo(() => {
    const supplierId = Number(form.supplierId);
    if (!supplierId) return [];
    return supplierProducts.filter((p) => p.supplierId === supplierId && p.quantity > 0);
  }, [supplierProducts, form.supplierId]);

  const shipmentById = useMemo(() => {
    const m = new Map();
    for (const s of shipments) m.set(String(s.id), s);
    return m;
  }, [shipments]);

  // Shipments (lots) the supplier has in stock, newest first.
  const shipmentGroups = useMemo(() => {
    const map = new Map();
    for (const p of availableProducts) {
      const key = p.deliveryId != null ? String(p.deliveryId) : 'none';
      if (!map.has(key)) {
        const ship = shipmentById.get(key);
        const date = ship?.date || (p.deliveryDate ? String(p.deliveryDate).split('T')[0] : '');
        const name = ship?.name || (p.deliveryId != null ? `Lot #${p.deliveryId}` : 'No shipment');
        map.set(key, { key, name, date, deliveryDate: p.deliveryDate, rows: [] });
      }
      map.get(key).rows.push(p);
    }
    return [...map.values()].sort((a, b) => new Date(b.deliveryDate || 0) - new Date(a.deliveryDate || 0));
  }, [availableProducts, shipmentById]);

  // Products/variants inside the chosen shipment, each with remaining quantity.
  const variantOptions = useMemo(() => {
    const group = shipmentGroups.find((g) => g.key === shipmentKey);
    if (!group) return [];
    return group.rows
      .slice()
      .sort((a, b) => {
        const av = [a.productName, a.category, a.subCategoryName].filter(Boolean).join(' ');
        const bv = [b.productName, b.category, b.subCategoryName].filter(Boolean).join(' ');
        return av.localeCompare(bv);
      })
      .map((p) => {
        const variant = [p.category, p.subCategoryName].filter(Boolean).join(' › ') || p.productName;
        return {
          value: String(p.id),
          label: `${variant} — ${p.quantity} ${String(p.unit || '').toUpperCase()} left`,
        };
      });
  }, [shipmentGroups, shipmentKey]);

  const selectedProduct = useMemo(
    () => availableProducts.find((p) => p.id === Number(form.productId)),
    [availableProducts, form.productId],
  );

  const quantity = Number(form.quantity) || 0;
  const saleWeightKg = Number(form.saleWeightKg) || 0;
  const unitPrice = Number(form.unitPrice) || 0;
  const pricedByWeight = saleWeightKg > 0;
  const preciseGrossAmount = Math.max(0, pricedByWeight ? saleWeightKg * unitPrice : quantity * unitPrice);
  const grossAmount = cashRound(preciseGrossAmount);
  const discount = showDiscount ? Math.min(cashRound(Math.max(0, Number(form.discount) || 0)), grossAmount) : 0;
  const netSale = cashRound(Math.max(0, grossAmount - discount));
  const isOneTime = form.customerId === 'ONE_TIME';
  const hasCustomer = Boolean(form.customerId);
  const paymentReceived = isOneTime
    ? netSale
    : form.paymentType === 'FULL_PAY'
      ? netSale
      : form.paymentType === 'PARTIAL_PAY'
        ? cashRound(form.paymentAmount)
        : 0;
  const dueAfter = cashRound(Math.max(0, netSale - paymentReceived));
  const overStock = selectedProduct && quantity > selectedProduct.quantity;

  // Crate add-on derived figures
  const validCrateLines = crateLines.filter((l) => l.crateType && Number(l.quantity) > 0);
  const crateBorrowQty = validCrateLines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
  const crateSellTotal = isOneTime
    ? cashRound(validCrateLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0))
    : 0;

  const handleSupplierChange = (supplierId) => {
    setShipmentKey('');
    setForm((prev) => ({ ...prev, supplierId, productId: '', unitPrice: '', quantity: '', saleWeightKg: '' }));
  };

  const handleShipmentChange = (key) => {
    setShipmentKey(key);
    setForm((prev) => ({ ...prev, productId: '', unitPrice: '', quantity: '', saleWeightKg: '' }));
  };

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

    if (!form.productId) { setError('Select a product variant / lot to sell.'); return; }
    if (overStock) {
      setError(`Quantity exceeds stock for ${selectedProduct.productName} (available ${selectedProduct.quantity}).`);
      return;
    }
    if (form.paymentType === 'PARTIAL_PAY' && paymentReceived <= 0) { setError('Enter the partial payment amount.'); return; }
    if (form.paymentType === 'PARTIAL_PAY' && paymentReceived >= netSale) { setError('Partial payment must be less than this sale amount.'); return; }
    if (paymentReceived > netSale) { setError('Payment for a sale cannot exceed the sale amount. Settle prior due separately.'); return; }

    if (showCrate) {
      if (validCrateLines.length === 0) { setError('Add at least one crate line (type + quantity).'); return; }
      const dupes = new Set();
      for (const l of validCrateLines) {
        if (dupes.has(l.crateType)) { setError('Each crate type can appear only once — merge the quantities.'); return; }
        dupes.add(l.crateType);
      }
      if (isOneTime && validCrateLines.some((l) => !(Number(l.unitPrice) > 0))) {
        setError('Enter a sale price for each crate line.'); return;
      }
    }

    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    const borrowCrates = showCrate && !isOneTime && validCrateLines.length > 0;
    const sellCrate = showCrate && isOneTime && validCrateLines.length > 0;

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
        paymentMethod: paymentReceived > 0 ? method : undefined,
        customerName: isOneTime ? oneTime.name : undefined,
        customerPhone: isOneTime ? oneTime.phone : undefined,
      });
      // Permanent customer: borrow all crate types in one record (adds to crate due).
      if (borrowCrates) {
        await borrowCustomerCrates(
          form.customerId,
          validCrateLines.map((l) => ({ crateType: l.crateType, quantity: Number(l.quantity) })),
          'Borrowed with sale',
          Number(crateDeposit) || 0,
        );
        await reloadCustomers();
      }
      // Walk-in: each crate type sold for cash — the wholesaler's money (P&L), per type.
      if (sellCrate) {
        for (const l of validCrateLines) {
          await sellCrates({
            crateType: l.crateType,
            quantity: Number(l.quantity),
            unitSalePrice: Number(l.unitPrice),
            customerAccountId: null,
            note: 'Sold with sale',
          });
        }
      }
      showToast('Sale recorded', 'success');
      onClose?.();
    } catch (err) {
      setShowConfirm(false);
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
            <div><h2>Record New Sale</h2></div>
          </div>
          <button type="button" onClick={() => onClose?.()} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body max-h-[72vh] overflow-y-auto">
          {/* ① PARTIES */}
          <Section n="1" title="Parties" />
          <div className="form-grid">
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
                autoFocus
              >
                <option value="">Choose customer…</option>
                <option value="ONE_TIME">Walk-in (one-time)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label"><UserCheck size={13} /> Supplier <span className="text-red-500">*</span></label>
              <select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="input-field" required>
                <option value="">Choose supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.businessName || s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {isOneTime && (
            <div className="form-grid mt-3">
              <div className="form-field">
                <label className="form-label">Name <span className="text-red-500">*</span></label>
                <input type="text" value={oneTime.name} onChange={(e) => setOneTime((p) => ({ ...p, name: e.target.value }))} className="input-field" required />
              </div>
              <div className="form-field">
                <label className="form-label">Phone <span className="text-red-500">*</span></label>
                <input type="tel" value={oneTime.phone} onChange={(e) => setOneTime((p) => ({ ...p, phone: e.target.value }))} className="input-field" required />
              </div>
            </div>
          )}

          {/* ② PRODUCT */}
          <Section n="2" title="Product" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="form-field">
              <label className="form-label"><Package size={13} /> Shipment <span className="text-red-500">*</span></label>
              <select value={shipmentKey} onChange={(e) => handleShipmentChange(e.target.value)} className="input-field" disabled={!form.supplierId} required>
                <option value="">{form.supplierId ? 'Choose shipment…' : 'Select supplier first'}</option>
                {shipmentGroups.map((g) => (
                  <option key={g.key} value={g.key}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label"><Tag size={13} /> Product / variant <span className="text-red-500">*</span></label>
              <SearchableSelect
                block
                className="input-field"
                disabled={!shipmentKey}
                value={form.productId ? String(form.productId) : ''}
                onChange={(val) => handleProductChange(val)}
                options={variantOptions}
                placeholder={shipmentKey ? 'Search product…' : 'Choose shipment first'}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="form-field">
              <label className="form-label"><Hash size={13} /> Quantity <span className="text-red-500">*</span>
                <span className="form-label-hint">{selectedProduct ? String(selectedProduct.unit || '').toUpperCase() : ''}</span>
              </label>
              <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="input-field" placeholder="0" required />
            </div>
            <div className="form-field">
              <label className="form-label"><Scale size={13} /> Sale Weight <span className="form-label-hint">kg · optional</span></label>
              <div className="input-with-suffix">
                <input type="number" min="0" step="0.001" value={form.saleWeightKg} onChange={(e) => set('saleWeightKg', e.target.value)} className="input-field" placeholder="0" />
                <span className="input-suffix">kg</span>
              </div>
            </div>
            <div className="form-field">
              <label className="form-label"><DollarSign size={13} /> {pricedByWeight ? 'Price per kg' : 'Unit price'} <span className="text-red-500">*</span></label>
              <div className="input-with-suffix">
                <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} className="input-field" placeholder="0" required />
                <span className="input-suffix">{pricedByWeight ? '৳/kg' : (selectedProduct ? `৳/${String(selectedProduct.unit || 'unit').toLowerCase()}` : '৳')}</span>
              </div>
            </div>
          </div>
          {overStock && (
            <div className="status-error mt-3"><span>!</span><span>Quantity exceeds available stock ({selectedProduct.quantity}).</span></div>
          )}

          {/* ③ CRATES (adaptive: borrow for permanent, sell for walk-in) */}
          <Section n="3" title="Crates" />
          {!hasCustomer ? (
            <p className="text-xs text-slate-400">Choose a customer first.</p>
          ) : (
            <>
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-semibold text-slate-700">
                <input type="checkbox" className="h-4 w-4 shrink-0" checked={showCrate} onChange={(e) => setShowCrate(e.target.checked)} />
                <Boxes size={14} className="shrink-0 text-blue-600" />
                <span>{isOneTime ? 'Sell crates with this sale (cash)' : 'Customer borrows crates with this sale'}</span>
              </label>
              {showCrate && (
                <div className="mt-3 space-y-2">
                  {crateLines.map((line, i) => (
                    <div key={i} className="flex items-end gap-2">
                      <div className="form-field flex-1">
                        {i === 0 && <label className="form-label"><Boxes size={13} /> Crate type</label>}
                        <select value={line.crateType} onChange={(e) => updateCrateLine(i, { crateType: e.target.value })} className="input-field">
                          <option value="">Choose crate…</option>
                          {crateTypeOptions.map((t) => (
                            <option key={t} value={t}>{titleCase(t)} ({(crateInventory.byType[t]?.inShop || 0)} in shop)</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field" style={{ maxWidth: '6.5rem' }}>
                        {i === 0 && <label className="form-label"><Hash size={13} /> Qty</label>}
                        <input type="number" min="1" value={line.quantity} onChange={(e) => updateCrateLine(i, { quantity: e.target.value })} className="input-field" placeholder="0" />
                      </div>
                      {isOneTime && (
                        <div className="form-field" style={{ maxWidth: '8rem' }}>
                          {i === 0 && <label className="form-label"><DollarSign size={13} /> ৳ / crate</label>}
                          <input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(e) => updateCrateLine(i, { unitPrice: e.target.value })} className="input-field" placeholder="0" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeCrateLine(i)}
                        className="icon-btn mb-[2px]"
                        disabled={crateLines.length === 1}
                        aria-label="Remove crate line"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={addCrateLine} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                  {/* Refundable crate deposit — permanent customers only. Returned when crates come back. */}
                  {!isOneTime && (
                    <div className="flex items-end gap-3 pt-1">
                      <div className="form-field" style={{ maxWidth: '12rem' }}>
                        <label className="form-label"><DollarSign size={13} /> Deposit taken <span className="form-label-hint">refundable</span></label>
                        <div className="input-with-suffix">
                          <span className="input-prefix">৳</span>
                          <input
                            type="number" min="0" step="1"
                            value={crateDeposit}
                            onChange={(e) => setCrateDeposit(e.target.value)}
                            className="input-field !pl-8"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      <p className="mb-2 text-[11px] text-slate-400">Security money — returned when crates come back.</p>
                    </div>
                  )}
                  {isOneTime && crateSellTotal > 0 && (
                    <div className="flex justify-end text-sm font-semibold text-slate-700">
                      Total crate price:&nbsp;<span className="text-blue-700">{fmt(crateSellTotal)}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ④ PAYMENT */}
          <Section n="4" title="Payment" />
          <div className="form-grid">
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
            {paymentReceived > 0 && (
              <div className="form-field">
                <label className="form-label"><Wallet size={13} /> Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field">
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
                </select>
              </div>
            )}
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
                    <input type="number" min="0" step="1" max={grossAmount} value={form.discount} onChange={(e) => set('discount', e.target.value)} className="input-field" placeholder="0" autoFocus />
                    <span className="input-suffix">৳</span>
                  </div>
                </div>
                <button type="button" className="btn-secondary inline-flex items-center gap-1.5 mb-[2px]" onClick={() => { setShowDiscount(false); set('discount', ''); }}>
                  <X size={14} /> Remove
                </button>
              </div>
            )}
          </div>

          {/* Live summary */}
          {(netSale > 0 || crateSellTotal > 0) && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
                <span>Sale <strong className="text-slate-900">{fmt(netSale)}</strong></span>
                <span>Paid <strong className="text-emerald-700">{fmt(paymentReceived)}</strong></span>
                <span>Due <strong className="text-rose-700">{fmt(dueAfter)}</strong></span>
                {showCrate && crateBorrowQty > 0 && (
                  isOneTime
                    ? <span>Crates sold <strong className="text-blue-700">{crateBorrowQty} · {fmt(crateSellTotal)}</strong></span>
                    : <span>Crates borrowed <strong className="text-amber-700">{crateBorrowQty}</strong></span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-semibold text-slate-700">Total money received</span>
                <strong className="text-lg font-extrabold text-emerald-700">{fmt(paymentReceived + crateSellTotal)}</strong>
              </div>
            </div>
          )}

          {error && (
            <div className="status-error mt-4"><span>!</span><span>{error}</span></div>
          )}
        </div>

        <div className="modal-footer">
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving || overStock}>
            <Save size={15} /> Record Sale
          </button>
        </div>
      </form>

      {showConfirm && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-amber-100 text-amber-700"><AlertTriangle size={18} /></div>
                <div><h2>Confirm sale</h2></div>
              </div>
            </div>
            <div className="px-1 py-1 space-y-3">
              <p className="text-sm text-slate-600">
                A recorded sale <span className="font-semibold text-slate-800">cannot be undone</span>. Please review before saving.
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500">Sale amount</span><span className="font-semibold text-slate-800">{fmt(netSale)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Paid now</span><span className="font-semibold text-slate-800">{fmt(paymentReceived)}{paymentReceived > 0 ? ` · ${titleCase(method)}` : ''}</span></div>
                {dueAfter > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Due</span><span className="font-semibold text-rose-600">{fmt(dueAfter)}</span></div>
                )}
                {showCrate && crateBorrowQty > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Crates</span><span className="font-semibold text-slate-800">{crateBorrowQty} {isOneTime ? `sold · ${fmt(crateSellTotal)}` : 'borrowed'}</span></div>
                )}
                {showCrate && !isOneTime && Number(crateDeposit) > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Crate deposit (refundable)</span><span className="font-semibold text-amber-700">{fmt(Number(crateDeposit))}</span></div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                  <span className="font-semibold text-slate-600">Total received</span>
                  <span className="font-bold text-emerald-600">{fmt(paymentReceived + crateSellTotal + (!isOneTime ? Number(crateDeposit) || 0 : 0))}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowConfirm(false)} className="btn-secondary" disabled={isSaving}>Back</button>
              <button type="button" onClick={handleConfirmSave} className="btn-primary flex items-center gap-2" disabled={isSaving}>
                <Save size={15} /> {isSaving ? 'Saving…' : 'Confirm & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SaleForm;
