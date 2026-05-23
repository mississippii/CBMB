import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Truck } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';

const WRITE_OFF_REASONS = ['Damaged', 'Spoiled / Rotten', 'Shortage', 'Other'];

// Friendly emoji per product name (fruit/veg shop). Falls back to a letter avatar.
const PRODUCT_EMOJI = [
  [/mango/i, '🥭'],
  [/onion/i, '🧅'],
  [/potato/i, '🥔'],
  [/garlic/i, '🧄'],
  [/tomato/i, '🍅'],
  [/chili|pepper/i, '🌶️'],
  [/apple/i, '🍎'],
  [/banana/i, '🍌'],
  [/grape/i, '🍇'],
  [/orange/i, '🍊'],
  [/lemon|lime/i, '🍋'],
  [/watermelon/i, '🍉'],
  [/melon/i, '🍈'],
  [/pineapple/i, '🍍'],
  [/strawberry/i, '🍓'],
  [/cherry/i, '🍒'],
  [/peach/i, '🍑'],
  [/pear/i, '🍐'],
  [/coconut/i, '🥥'],
  [/avocado/i, '🥑'],
  [/carrot/i, '🥕'],
  [/corn/i, '🌽'],
  [/eggplant|brinjal/i, '🍆'],
  [/cucumber/i, '🥒'],
  [/leaf|spinach/i, '🥬'],
  [/broccoli/i, '🥦'],
  [/rice|wheat|grain/i, '🌾'],
];
const emojiForProduct = (name) => {
  if (!name) return null;
  for (const [rx, e] of PRODUCT_EMOJI) if (rx.test(name)) return e;
  return null;
};

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

const StoreInventory = () => {
  const { supplierProducts, suppliers, transactions, shipments, writeOffStock } = useData();
  const shipmentNameById = useMemo(() => {
    const map = new Map();
    for (const s of shipments) map.set(Number(s.id), s.name || `Lot #${s.id}`);
    return map;
  }, [shipments]);
  const showToast = useToast();

  const [writeOff, setWriteOff] = useState(null); // { product }
  const [woForm, setWoForm] = useState({ quantity: '', reason: WRITE_OFF_REASONS[0], note: '' });
  const [woError, setWoError] = useState('');
  const [isSavingWo, setIsSavingWo] = useState(false);

  // Tree-expansion state — only the product level is expandable now.
  const [expandedProducts, setExpandedProducts] = useState(() => new Set());
  const toggle = (set, setSet, key) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSet(next);
  };

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

  // KPIs count distinct PRODUCTS (not lot rows). A product is "available" if any of
  // its lots has stock > 0; "stock out" if every lot is empty.
  const productGroups = useMemo(() => {
    const map = new Map();
    for (const row of products) {
      const key = row.productName || '(unknown)';
      const g = map.get(key) || { name: key, qty: 0 };
      g.qty += row.quantity;
      map.set(key, g);
    }
    return Array.from(map.values());
  }, [products]);

  const summary = {
    productCount: productGroups.length,
    availableCount: productGroups.filter((g) => g.qty > 0).length,
    stockOutCount: productGroups.filter((g) => g.qty <= 0).length,
    totalQuantity: products.reduce((sum, product) => sum + product.quantity, 0),
    todaySales: todaySales.reduce((sum, transaction) => sum + (Number(transaction.totalAmount) || 0), 0),
  };

  // Group only by Product. Each product carries:
  //   rows[]      — flat inventory rows belonging to it (sorted by variety, then lot)
  //   suppliers[] — supplier-name → qty breakdown chips
  //   varietyCount/hasLots — for the header summary
  const grouped = useMemo(() => {
    const addSupplier = (map, name, qty) => {
      map.set(name, (map.get(name) || 0) + qty);
    };
    const byProduct = new Map();
    for (const row of products) {
      const pKey = row.productName || '(unknown)';
      let p = byProduct.get(pKey);
      if (!p) {
        p = { name: pKey, qty: 0, unit: row.unit, rows: [], bySupplier: new Map(), varietySet: new Set(), hasLots: false };
        byProduct.set(pKey, p);
      }
      p.qty += row.quantity;
      addSupplier(p.bySupplier, row.supplierName || 'Unknown', row.quantity);
      if (row.category) p.varietySet.add(row.category);
      if (row.subCategoryName) p.hasLots = true;
      p.rows.push(row);
    }
    const lotNum = (name) => {
      const n = parseInt(String(name || '').replace(/^Lot/i, ''), 10);
      return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
    };
    return Array.from(byProduct.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => ({
        ...p,
        suppliers: Array.from(p.bySupplier.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([name, qty]) => ({ name, qty })),
        varietyCount: p.varietySet.size,
        rows: p.rows.slice().sort((a, b) => {
          const va = String(a.category || '').localeCompare(String(b.category || ''));
          if (va !== 0) return va;
          return lotNum(a.subCategoryName) - lotNum(b.subCategoryName);
        }),
      }));
  }, [products]);

  return (
    <div className="store-inventory">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Store Inventory</span>
          <h3>Available products</h3>
          <p>Current product stock by supplier, category, and quantity.</p>
        </div>
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
            No stock yet. Add a shipment from the Shipments tab to bring in stock.
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {grouped.map((p) => {
              const pOpen = expandedProducts.has(p.name);
              const unitU = String(p.unit || '').toUpperCase();
              const showVarietyCol = p.varietyCount > 0;
              const showLotCol = p.hasLots;
              return (
                <div key={p.name} className={`rounded-2xl border bg-white transition overflow-hidden ${pOpen ? 'border-blue-200 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}>
                  {/* PRODUCT HEADER */}
                  <button
                    type="button"
                    onClick={() => toggle(expandedProducts, setExpandedProducts, p.name)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left ${pOpen ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    {(() => {
                      const emoji = emojiForProduct(p.name);
                      return (
                        <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${pOpen ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-slate-100 ring-1 ring-slate-200'}`}>
                          {emoji ? (
                            <span className="text-3xl leading-none" aria-hidden>{emoji}</span>
                          ) : (
                            <span className="text-lg font-extrabold text-slate-600">
                              {p.name.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-base font-extrabold text-slate-900 truncate">{p.name}</h4>
                        <span className="text-xs text-slate-500">
                          {p.varietyCount > 0 && (
                            <>{p.varietyCount} variet{p.varietyCount === 1 ? 'y' : 'ies'} · </>
                          )}
                          {p.rows.length} row{p.rows.length === 1 ? '' : 's'} · {p.suppliers.length} supplier{p.suppliers.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {p.suppliers.map((s) => (
                          <span key={s.name} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            <Truck size={10} /> {s.name}
                            <span className="text-slate-500 font-medium">· {formatNumber(s.qty)} {unitU}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-extrabold text-slate-900 leading-none">{formatNumber(p.qty)}</div>
                      <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mt-0.5">{unitU} remaining</div>
                    </div>
                    <span className="ml-2 shrink-0 text-slate-400">
                      {pOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </span>
                  </button>

                  {/* ONE UNIFIED TABLE — Variety / Lot columns hidden when the product doesn't use them */}
                  {pOpen && (
                    <div className="border-t border-blue-100 bg-slate-50/40 px-4 py-3">
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                              {showVarietyCol && <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Variety</th>}
                              {showLotCol && <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Lot</th>}
                              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Qty</th>
                              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Supplier</th>
                              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Shipment</th>
                              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                              <th className="px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {p.rows.map((lot) => {
                              const isOut = lot.quantity <= 0;
                              const shipName = lot.deliveryId
                                ? (shipmentNameById.get(Number(lot.deliveryId)) || `Lot #${lot.deliveryId}`)
                                : '—';
                              return (
                                <tr key={lot.id} className="hover:bg-slate-50 transition">
                                  {showVarietyCol && (
                                    <td className="px-3 py-2 text-center text-slate-800">
                                      {lot.category || <span className="text-slate-300">—</span>}
                                    </td>
                                  )}
                                  {showLotCol && (
                                    <td className="px-3 py-2 text-center">
                                      {lot.subCategoryName ? (
                                        <span className={`font-bold ${isOut ? 'text-slate-400' : 'text-blue-700'}`}>{lot.subCategoryName}</span>
                                      ) : (
                                        <span className="text-slate-300">—</span>
                                      )}
                                    </td>
                                  )}
                                  <td className="px-3 py-2 text-center">
                                    <span className={isOut ? 'text-slate-400' : 'font-bold text-slate-800'}>
                                      {formatNumber(lot.quantity)}
                                    </span>
                                    <span className="ml-1 text-xs text-slate-500">{String(lot.unit || '').toUpperCase()}</span>
                                  </td>
                                  <td className="px-3 py-2 text-center text-slate-700">{lot.supplierName}</td>
                                  <td className="px-3 py-2 text-center text-slate-700">{shipName}</td>
                                  <td className="px-3 py-2 text-center">
                                    <span className={`stock-pill ${isOut ? 'out' : ''}`}>
                                      {isOut ? 'Out' : 'In stock'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      className="btn-compact"
                                      onClick={() => openWriteOff(lot)}
                                      disabled={isOut}
                                      title="Write off damaged / non-saleable stock"
                                    >
                                      <AlertTriangle size={12} /> Write off
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
