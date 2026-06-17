import { useEffect, useMemo, useState } from 'react';
import {
  ShoppingCart, UserCheck, User, Package, Hash, DollarSign,
  CreditCard, Save, Tag, Scale, Boxes, Wallet,
  Plus, Trash2,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import SearchableSelect from '../../shared/components/SearchableSelect';
import ConfirmDialog from '../../shared/components/ConfirmDialog';

const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'OTHER'];
const cashRound = (v) => Math.ceil(Number(v) || 0);
const fmt = (v) => `৳ ${cashRound(v).toLocaleString()}`;
const titleCase = (s) => {
  const str = String(s || '').trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
};

const Section = ({ title }) => (
  <div className="flex items-center gap-2 mt-3.5 mb-1.5 first:mt-0">
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
  discount: '0',
};

const SaleForm = ({ onClose }) => {
  const { suppliers, customers, supplierProducts, shipments, crateInventory, recordMultiSale, refreshAll } = useData();

  // Always open the sale form with the latest server data — suppliers, customers, stock and
  // crate counts — so the dropdowns never show a stale in-memory copy (e.g. crate inventory
  // changed elsewhere). Runs once when the modal mounts (modals mount fresh on open).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refreshAll(); }, []);
  const showToast = useToast();
  const [saleLines, setSaleLines] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [shipmentKey, setShipmentKey] = useState('');
  const [oneTime, setOneTime] = useState({ name: '', phone: '' });
  const [method, setMethod] = useState('CASH');
  // Crate add-on: borrow (permanent customer) or sell (walk-in). One or more types.
  // Walk-in crate sale carries its own payment method, independent of the product payment.
  const [showCrate, setShowCrate] = useState(false);
  const [crateMethod, setCrateMethod] = useState('CASH');
  const [crateDraft, setCrateDraft] = useState({ crateType: '', quantity: '', unitPrice: '' });
  const [crateLines, setCrateLines] = useState([]);
  // Refundable deposit taken against borrowed crates (permanent customers only).
  const [crateDeposit, setCrateDeposit] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setCrate = (key, value) => setCrateDraft((prev) => ({ ...prev, [key]: value }));
  const addCrateLine = () => {
    setError('');
    if (!crateDraft.crateType) { setError('Choose a crate type.'); return; }
    if (!(Number(crateDraft.quantity) > 0)) { setError('Enter crate quantity.'); return; }
    if (isOneTime && !(Number(crateDraft.unitPrice) > 0)) { setError('Enter crate price.'); return; }

    setCrateLines((lines) => {
      const existing = lines.findIndex((line) => line.crateType === crateDraft.crateType);
      if (existing >= 0) {
        return lines.map((line, index) => (index === existing
          ? {
              ...line,
              quantity: String((Number(line.quantity) || 0) + (Number(crateDraft.quantity) || 0)),
              unitPrice: isOneTime ? crateDraft.unitPrice : line.unitPrice,
            }
          : line));
      }
      return [...lines, { ...crateDraft }];
    });
    setCrateDraft({ crateType: '', quantity: '', unitPrice: '' });
  };
  const removeCrateLine = (i) => setCrateLines((ls) => ls.filter((_, idx) => idx !== i));

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
  // Gross of the current draft line before it is added to the sale.
  const draftGross = Math.max(0, pricedByWeight ? saleWeightKg * unitPrice : quantity * unitPrice);
  const linesGross = saleLines.reduce((s, l) => s + (Number(l.lineGross) || 0), 0);
  const grossAmount = cashRound(linesGross);
  const discount = Math.min(cashRound(Math.max(0, Number(form.discount) || 0)), grossAmount);
  const netSale = cashRound(Math.max(0, grossAmount - discount));
  const isOneTime = form.customerId === 'ONE_TIME';
  const hasCustomer = Boolean(form.customerId);

  // Quantity already parked in the basket for the current draft's inventory — so the same item
  // added twice can't exceed stock before the backend even sees it.
  const addedQtyForProduct = useMemo(
    () => saleLines
      .filter((l) => Number(l.productId) === Number(form.productId))
      .reduce((s, l) => s + (Number(l.quantity) || 0), 0),
    [saleLines, form.productId],
  );
  const paymentReceived = isOneTime
    ? netSale
    : form.paymentType === 'FULL_PAY'
      ? netSale
      : form.paymentType === 'PARTIAL_PAY'
        ? cashRound(form.paymentAmount)
        : 0;
  const dueAfter = cashRound(Math.max(0, netSale - paymentReceived));
  const draftAvailable = selectedProduct ? selectedProduct.quantity - addedQtyForProduct : 0;
  const overStock = selectedProduct && quantity > draftAvailable;

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

  // Push the current draft (supplier → product → qty/price) into the basket, then clear the
  // product fields (supplier + shipment stay, so adding more from the same lot is quick).
  const addSaleLine = () => {
    setError('');
    if (!form.supplierId) { setError('Choose a supplier for this line.'); return; }
    if (!form.productId || !selectedProduct) { setError('Choose a product variant / lot.'); return; }
    if (!(quantity > 0)) { setError('Enter a quantity for this line.'); return; }
    if (!(unitPrice > 0)) { setError('Enter a unit price for this line.'); return; }
    if (overStock) { setError(`Quantity exceeds stock left for ${selectedProduct.productName} (${draftAvailable}).`); return; }

    const supplier = suppliers.find((s) => Number(s.id) === Number(form.supplierId));
    const group = shipmentGroups.find((g) => g.key === shipmentKey);
    const variety = selectedProduct.category || selectedProduct.productName;
    const lotName = selectedProduct.subCategoryName || group?.name || '';
    setSaleLines((prev) => [...prev, {
      supplierId: Number(form.supplierId),
      supplierName: supplier ? (supplier.businessName || supplier.name) : '',
      productId: Number(form.productId),
      productName: selectedProduct.productName,
      variety,
      lotName,
      unit: String(selectedProduct.unit || '').toUpperCase(),
      quantity,
      saleWeightKg: pricedByWeight ? saleWeightKg : null,
      unitPrice,
      lineGross: cashRound(draftGross),
    }]);
    // Keep supplier + shipment, clear the product line.
    setForm((prev) => ({ ...prev, productId: '', quantity: '', saleWeightKg: '', unitPrice: '' }));
  };

  const removeSaleLine = (i) => setSaleLines((ls) => ls.filter((_, idx) => idx !== i));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (saleLines.length === 0) { setError('Add at least one product to the sale.'); return; }
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
    const hasCrateLines = showCrate && validCrateLines.length > 0;

    const cratePayload = {
      crateLines: hasCrateLines
        ? validCrateLines.map((l) => ({
            crateType: l.crateType,
            quantity: Number(l.quantity),
            // Walk-in lines are sold (price required); permanent lines are borrowed (price ignored).
            unitSalePrice: isOneTime ? Number(l.unitPrice) : null,
          }))
        : null,
      crateDeposit: hasCrateLines && !isOneTime ? Number(crateDeposit) || 0 : null,
      cratePaymentMethod: hasCrateLines && isOneTime ? crateMethod : null,
    };

    setIsSaving(true);
    try {
      // One atomic call: the sale plus its crates (borrow for permanent / sell for walk-in)
      // are written in a single backend transaction — no partial state if a crate step fails.
      await recordMultiSale({
        customerId: form.customerId,
        customerName: isOneTime ? oneTime.name : undefined,
        customerPhone: isOneTime ? oneTime.phone : undefined,
        lines: saleLines.map((l) => ({
          inventoryId: l.productId,
          quantity: l.quantity,
          saleWeightKg: l.saleWeightKg,
          unitPrice: l.unitPrice,
        })),
        discountAmount: discount,
        paymentAmount: paymentReceived,
        paymentMethod: paymentReceived > 0 ? method : undefined,
        ...cratePayload,
      });
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
            <div><h2>Record Sale</h2></div>
          </div>
          <button type="button" onClick={() => onClose?.()} className="modal-close-btn">✕</button>
        </div>

        <div className="modal-body max-h-[72vh] overflow-y-auto text-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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

            {isOneTime && (
              <>
                <div className="form-field">
                  <label className="form-label">Name <span className="text-red-500">*</span></label>
                  <input type="text" value={oneTime.name} onChange={(e) => setOneTime((p) => ({ ...p, name: e.target.value }))} className="input-field" required />
                </div>
                <div className="form-field">
                  <label className="form-label">Phone <span className="text-red-500">*</span></label>
                  <input type="tel" value={oneTime.phone} onChange={(e) => setOneTime((p) => ({ ...p, phone: e.target.value }))} className="input-field" required />
                </div>
              </>
            )}
          </div>

          <Section title="Products" />
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="form-field">
                <label className="form-label"><UserCheck size={13} /> Supplier</label>
                <select value={form.supplierId} onChange={(e) => handleSupplierChange(e.target.value)} className="input-field min-w-0 text-sm">
                  <option value="">Choose supplier…</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.businessName || supplier.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label"><Package size={13} /> Shipment</label>
                <select value={shipmentKey} onChange={(e) => handleShipmentChange(e.target.value)} className="input-field min-w-0 text-sm" disabled={!form.supplierId}>
                  <option value="">{form.supplierId ? 'Choose shipment…' : 'Choose supplier first'}</option>
                  {shipmentGroups.map((group) => (
                    <option key={group.key} value={group.key}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label"><Tag size={13} /> Product / variant</label>
                <SearchableSelect
                  block
                  className="input-field min-w-0 text-sm"
                  disabled={!shipmentKey}
                  value={form.productId ? String(form.productId) : ''}
                  onChange={(val) => handleProductChange(val)}
                  options={variantOptions}
                  placeholder={shipmentKey ? 'Search product…' : 'Choose shipment first'}
                />
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
              <div className="form-field">
                <label className="form-label"><Hash size={13} /> Quantity <span className="form-label-hint">{selectedProduct ? String(selectedProduct.unit || '').toUpperCase() : ''}</span></label>
                <input type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} className="input-field min-w-0 text-sm" placeholder="0" />
              </div>
              <div className="form-field">
                <label className="form-label"><Scale size={13} /> Sale Weight <span className="form-label-hint">kg</span></label>
                <div className="input-with-suffix min-w-0">
                  <input type="number" min="0" step="0.001" value={form.saleWeightKg} onChange={(e) => set('saleWeightKg', e.target.value)} className="input-field text-sm" placeholder="0" />
                  <span className="input-suffix">kg</span>
                </div>
              </div>
              <div className="form-field">
                <label className="form-label"><DollarSign size={13} /> {pricedByWeight ? 'Price per kg' : 'Unit price'}</label>
                <div className="input-with-suffix min-w-0">
                  <input type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set('unitPrice', e.target.value)} className="input-field text-sm" placeholder="0" />
                  <span className="input-suffix">{pricedByWeight ? '৳/kg' : '৳'}</span>
                </div>
              </div>
              <button type="button" onClick={addSaleLine} className="btn-primary inline-flex h-10 items-center justify-center gap-1.5 px-4" title="Add product">
                <Plus size={15} /> Add
              </button>
            </div>

            {(selectedProduct || draftGross > 0 || overStock) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                <span>{selectedProduct ? `Stock left: ${Math.max(draftAvailable, 0).toLocaleString()} ${String(selectedProduct.unit || '').toUpperCase()}` : 'Product not selected'}</span>
                <span className={overStock ? 'text-rose-600' : 'text-slate-700'}>Line total: {fmt(draftGross)}</span>
              </div>
            )}
            {overStock && (
              <div className="status-error mt-2"><span>!</span><span>Quantity exceeds stock left ({draftAvailable}).</span></div>
            )}
          </div>

          {saleLines.length > 0 && (
            <div className="mt-3 rounded-xl border border-slate-200 bg-white">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Sale items</span>
                <strong className="text-sm text-slate-900">{fmt(linesGross)}</strong>
              </div>
              <div className="divide-y divide-slate-100">
                  {saleLines.map((line, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{line.variety}</p>
                        <p className="truncate text-xs text-slate-500">
                          {[
                            line.supplierName,
                            line.lotName,
                            `${Number(line.quantity).toLocaleString()} ${line.unit}`,
                            line.saleWeightKg ? `${Number(line.saleWeightKg).toLocaleString()} kg` : null,
                            `× ${fmt(line.unitPrice)}`,
                          ].filter(Boolean).join(' | ')}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-slate-900">{fmt(line.lineGross)}</span>
                      <button type="button" onClick={() => removeSaleLine(i)} className="icon-btn icon-btn-danger shrink-0" aria-label="Remove line">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* ③ CRATES (adaptive: borrow for permanent, sell for walk-in) */}
          <Section title="Crates" />
          {!hasCustomer ? (
            <p className="text-xs text-slate-400">Choose a customer first.</p>
          ) : (
            <>
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" className="h-4 w-4 shrink-0" checked={showCrate} onChange={(e) => setShowCrate(e.target.checked)} />
                <Boxes size={14} className="shrink-0 text-blue-600" />
                <span>{isOneTime ? 'Sell crates with this sale' : 'Customer borrows crates with this sale'}</span>
              </label>
              {showCrate && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className={`grid grid-cols-1 items-end gap-3 ${isOneTime ? 'md:grid-cols-[minmax(0,1fr)_7rem_9rem_auto]' : 'md:grid-cols-[minmax(0,1fr)_7rem_auto]'}`}>
                      <div className="form-field min-w-0">
                        <label className="form-label"><Boxes size={13} /> Crate type</label>
                        <select value={crateDraft.crateType} onChange={(e) => setCrate('crateType', e.target.value)} className="input-field min-w-0 text-sm">
                          <option value="">Choose crate</option>
                          {crateTypeOptions.map((t) => (
                            <option key={t} value={t}>{titleCase(t)} ({Number(crateInventory.byType?.[t]?.inShop || 0).toLocaleString()} in shop)</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-field min-w-0">
                        <label className="form-label"><Hash size={13} /> Qty</label>
                        <input type="number" min="1" value={crateDraft.quantity} onChange={(e) => setCrate('quantity', e.target.value)} className="input-field text-sm" placeholder="0" />
                      </div>
                      {isOneTime && (
                        <div className="form-field min-w-0">
                          <label className="form-label"><DollarSign size={13} /> Price</label>
                          <div className="input-with-suffix min-w-0">
                            <input type="number" min="0" step="0.01" value={crateDraft.unitPrice} onChange={(e) => setCrate('unitPrice', e.target.value)} className="input-field text-sm" placeholder="0" />
                            <span className="input-suffix">৳</span>
                          </div>
                        </div>
                      )}
                      <button type="button" onClick={addCrateLine} className="btn-primary inline-flex h-10 items-center justify-center gap-1.5 px-4">
                        <Plus size={15} /> Add
                      </button>
                    </div>
                    {(crateDraft.crateType || crateDraft.quantity || (isOneTime && crateDraft.unitPrice)) && (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                        <span>{crateDraft.crateType ? `In shop: ${Number(crateInventory.byType?.[crateDraft.crateType]?.inShop || 0).toLocaleString()}` : 'Crate not selected'}</span>
                        <span className="text-slate-700">{isOneTime ? `Line total: ${fmt((Number(crateDraft.quantity) || 0) * (Number(crateDraft.unitPrice) || 0))}` : 'Borrow line'}</span>
                      </div>
                    )}
                  </div>

                  {validCrateLines.length > 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Crate items</span>
                        <strong className="text-sm text-slate-900">{isOneTime ? fmt(crateSellTotal) : `${crateBorrowQty.toLocaleString()} crates`}</strong>
                      </div>
                      <div className="divide-y divide-slate-100">
                          {validCrateLines.map((line, i) => (
                            <div key={`${line.crateType}-${i}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-slate-900">{titleCase(line.crateType)}</p>
                                <p className="truncate text-xs text-slate-500">
                                  {[
                                    `${Number(line.quantity).toLocaleString()} crates`,
                                    isOneTime ? `x ${fmt(line.unitPrice)}` : 'Borrowed',
                                  ].join(' | ')}
                                </p>
                              </div>
                              <span className="shrink-0 font-semibold text-slate-900">{isOneTime ? fmt((Number(line.quantity) || 0) * (Number(line.unitPrice) || 0)) : Number(line.quantity).toLocaleString()}</span>
                              <button type="button" onClick={() => removeCrateLine(i)} className="icon-btn icon-btn-danger shrink-0" aria-label="Remove crate line">
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                    </div>
                  )}

                  {!isOneTime && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="form-field max-w-xs">
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
                    </div>
                  )}

                  {isOneTime && (
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="form-field max-w-xs">
                        <label className="form-label"><Wallet size={13} /> Crate paid with</label>
                        <select value={crateMethod} onChange={(e) => setCrateMethod(e.target.value)} className="input-field">
                          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ④ PAYMENT — Payment Type · Payment Received · Discount, equal thirds */}
          <Section title="Payment" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="form-field">
              <label className="form-label"><CreditCard size={13} /> Payment Type</label>
              <select
                value={form.paymentType}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentType: e.target.value, paymentAmount: e.target.value === 'PARTIAL_PAY' ? prev.paymentAmount : '' }))}
                className="input-field min-w-0"
                disabled={isOneTime}
              >
                <option value="FULL_DUE">Full Due</option>
                <option value="PARTIAL_PAY">Partial Pay</option>
                <option value="FULL_PAY">Full Pay</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label"><DollarSign size={13} /> Payment Received</label>
              <div className="input-with-suffix min-w-0">
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
            <div className="form-field">
              <label className="form-label"><Tag size={13} /> Discount</label>
              <div className="input-with-suffix min-w-0">
                <input type="number" min="0" step="1" max={grossAmount} value={form.discount} onChange={(e) => set('discount', e.target.value)} className="input-field" placeholder="0" />
                <span className="input-suffix">৳</span>
              </div>
            </div>
          </div>

          {paymentReceived > 0 && (
            <div className="form-field mt-3" style={{ maxWidth: '14rem' }}>
              <label className="form-label"><Wallet size={13} /> Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
              </select>
            </div>
          )}

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
          <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
            <Save size={15} /> Record Sale
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={showConfirm}
        title="Confirm sale"
        message="Save this sale?"
        confirmLabel="Confirm & Save"
        busy={isSaving}
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleConfirmSave}
      >
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Items</span><span className="font-semibold text-slate-900">{saleLines.length}</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-500">Sale</span><span className="font-semibold text-slate-900">{fmt(netSale)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-500">Paid</span><span className="font-semibold text-emerald-700">{fmt(paymentReceived)}{paymentReceived > 0 ? ` · ${titleCase(method)}` : ''}</span></div>
          {dueAfter > 0 && <div className="flex justify-between gap-4"><span className="text-slate-500">Due</span><span className="font-semibold text-rose-600">{fmt(dueAfter)}</span></div>}
          {showCrate && crateBorrowQty > 0 && <div className="flex justify-between gap-4"><span className="text-slate-500">Crates</span><span className="font-semibold text-slate-900">{crateBorrowQty} {isOneTime ? `sold · ${fmt(crateSellTotal)}` : 'borrowed'}</span></div>}
          {showCrate && !isOneTime && Number(crateDeposit) > 0 && <div className="flex justify-between gap-4"><span className="text-slate-500">Deposit</span><span className="font-semibold text-amber-700">{fmt(Number(crateDeposit))}</span></div>}
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-1.5"><span className="font-semibold text-slate-600">Total received</span><span className="font-bold text-emerald-700">{fmt(paymentReceived + crateSellTotal + (!isOneTime ? Number(crateDeposit) || 0 : 0))}</span></div>
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default SaleForm;
