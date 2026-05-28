import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, UserCheck, Package, Tag, FileText, Save, Plus, X,
  DollarSign, Wallet, Percent,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../shared/components/Toast';
import SearchableSelect from '../../shared/components/SearchableSelect';
import { queryKeys } from '../../services/queryKeys';

const UNITS = ['KG', 'PCS', 'CRATE', 'DOZEN', 'BAG', 'MOUND'];

const newLine = () => ({ categoryId: '', subCategoryId: '', quantity: '' });

const initialForm = {
  name: '',
  supplierId: '',
  productId: '',
  unit: '',
  lines: [newLine()],   // each line: { categoryPath: [..], quantity: '..' }
  estimatedValue: '',
  advancePaid: '',
  commissionRate: '',
  note: '',
};


const formatQuantity = (value, unit) =>
  `${(Number(value) || 0).toLocaleString()} ${String(unit || '').toUpperCase()}`.trim();

const ShipmentsPage = () => {
  const { suppliers, catalogProducts, subCategories, addSupplierProduct, fetchShipments } = useData();
  const { admin } = useAuth();
  const { data: shipments = [] } = useQuery({
    queryKey: queryKeys.shipments.list(admin?.wholesalerId),
    queryFn: () => fetchShipments(),
    enabled: Boolean(admin?.wholesalerId),
  });
  const showToast = useToast();
  const [formData, setFormData] = useState(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showModal, setShowModal] = useState(false);

  const supplierById = useMemo(
    () => new Map(suppliers.map((s) => [Number(s.id), s])),
    [suppliers],
  );

  const selectedSupplier = supplierById.get(Number(formData.supplierId));
  const selectedProduct = useMemo(
    () => catalogProducts.find((p) => Number(p.id) === Number(formData.productId)),
    [catalogProducts, formData.productId],
  );

  // Flat list of varieties for the selected product.
  const varieties = useMemo(() => selectedProduct?.categories || [], [selectedProduct]);
  const varietyOptions = useMemo(
    () => varieties.map((v) => ({ value: v.id, label: v.usesLots ? `${v.name} (lots)` : v.name })),
    [varieties],
  );
  const lotOptions = useMemo(
    () => (subCategories || []).map((s) => ({ value: s.id, label: s.name })),
    [subCategories],
  );

  const totalQuantity = useMemo(
    () => formData.lines.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0),
    [formData.lines],
  );

  const updateLine = (idx, patch) =>
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    }));

  const addLine = () => setFormData((prev) => ({ ...prev, lines: [...prev.lines, newLine()] }));
  const removeLine = (idx) =>
    setFormData((prev) => ({
      ...prev,
      lines: prev.lines.length > 1 ? prev.lines.filter((_, i) => i !== idx) : prev.lines,
    }));

  const allShipments = useMemo(() => {
    return shipments
      .slice()
      .sort((a, b) => new Date(b.deliveryDate || b.date || 0) - new Date(a.deliveryDate || a.date || 0));
  }, [shipments]);

  const handleField = (key) => (e) =>
    setFormData((prev) => ({
      ...prev,
      [key]: e.target.value,
      ...(key === 'productId' ? { lines: [newLine()] } : {}),
    }));

  // Pattern: <Product><TotalQty>Lot  →  e.g. "Mango300Lot"
  const suggestedName = useMemo(() => {
    const productLabel = selectedProduct?.name || '';
    const cleanBase = productLabel.replace(/\s+/g, '').slice(0, 30);
    if (!cleanBase || !totalQuantity) return '';
    return `${cleanBase}${totalQuantity}Lot`;
  }, [selectedProduct, totalQuantity]);

  // Always keep the name in sync with the auto-generated pattern.
  useEffect(() => {
    if (!suggestedName) return;
    setFormData((prev) => (prev.name === suggestedName ? prev : { ...prev, name: suggestedName }));
  }, [suggestedName]);

  const openModal = () => {
    setFormData(initialForm);
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    // Each line must have a quantity > 0; category path may be empty.
    const validLines = formData.lines.filter((l) => Number(l.quantity) > 0);
    if (validLines.length === 0) {
      setFormError('Add at least one line with a quantity.');
      return;
    }
    setIsSaving(true);
    try {
      await addSupplierProduct({ ...formData, lines: validLines });
      const productLabel = selectedProduct?.name || 'Shipment';
      showToast(`${productLabel} ${totalQuantity} ${formData.unit} received from ${selectedSupplier?.name || 'supplier'} (${validLines.length} line${validLines.length === 1 ? '' : 's'})`, 'success');
      setShowModal(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to add shipment.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Shipments</span>
          <h3>Supplier shipments</h3>
          <p>Every lot received from suppliers. Each is tracked and settled separately.</p>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={openModal}>
          <Plus size={16} /> Add Shipment
        </button>
      </section>

      {/* All shipments table */}
      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Truck size={18} className="text-blue-600" /> All Shipments</h3>
            <p>Sorted by most recent</p>
          </div>
          <span className="badge badge-teal">{shipments.length} total</span>
        </div>

        {shipments.length === 0 ? (
          <div className="empty-state">
            <Truck size={32} className="empty-state-icon" />
            <p className="empty-state-title">No shipments yet</p>
            <p className="empty-state-sub">Click “Add Shipment” to record your first supplier delivery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Lot</th>
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
                {allShipments.map((shipment) => {
                  const supplier = supplierById.get(Number(shipment.supplierId));
                  return (
                    <tr key={shipment.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-blue-700">{shipment.name || `Lot #${shipment.id}`}</div>
                        {shipment.name && <div className="text-xs text-slate-400">#{shipment.id}</div>}
                      </td>
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
                        {(() => {
                          // Group items by variety so a shipment with many lots reads compactly.
                          const groups = new Map();
                          for (const it of (shipment.items || [])) {
                            const key = it.categoryName || '(no variety)';
                            const g = groups.get(key) || { name: key, qty: 0, unit: it.unit, lots: [], productName: it.productName };
                            g.qty += Number(it.quantity) || 0;
                            if (it.subCategoryName) g.lots.push({ name: it.subCategoryName, qty: Number(it.quantity) || 0 });
                            groups.set(key, g);
                          }
                          return Array.from(groups.values()).map((g, idx) => (
                            <div key={idx} className="font-medium">
                              <span className="text-slate-900">{g.name}</span>
                              <span className="ml-2 text-xs text-slate-500">{formatQuantity(g.qty, g.unit)}</span>
                              {g.lots.length > 0 && (
                                <span className="ml-2 text-xs text-slate-500">
                                  · {g.lots.map((l) => `${l.name} ${Math.round(l.qty)}`).join(' · ')}
                                </span>
                              )}
                            </div>
                          ));
                        })()}
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

      {/* Add Shipment modal */}
      {showModal && (
        <div className="modal-overlay">
          <form onSubmit={handleSubmit} className="modal-content" style={{ maxWidth: '46rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700">
                  <Truck size={18} />
                </div>
                <div>
                  <h2>Add Shipment</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Record an incoming lot from a supplier</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowModal(false)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body max-h-[70vh] overflow-y-auto">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    <UserCheck size={13} /> Supplier <span className="text-red-500">*</span>
                  </label>
                  <select value={formData.supplierId} onChange={handleField('supplierId')} className="input-field" required autoFocus>
                    <option value="">Choose supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}{s.businessName ? ` (${s.businessName})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Package size={13} /> Product <span className="text-red-500">*</span>
                    <span className="form-label-hint">from catalog · admin manages this</span>
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData((p) => ({ ...p, productId: v, categoryPath: [] }));
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Choose product…</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {catalogProducts.length === 0 && (
                    <p className="mt-1 text-xs text-slate-500">No products yet. Ask the admin to add one to the catalog.</p>
                  )}
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Package size={13} /> Unit <span className="text-red-500">*</span>
                  </label>
                  <select value={formData.unit} onChange={handleField('unit')} className="input-field" required>
                    <option value="">Pick unit…</option>
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>

                {/* Multi-line breakdown: one product → many category × qty lines */}
                <div className="form-field form-field-full">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <label className="form-label !mb-0">
                      <Tag size={13} /> Lines (category × quantity)
                      <span className="form-label-hint">one product, many sub-categories</span>
                    </label>
                    <span className="text-xs font-semibold text-slate-600">
                      Total: <span className="text-slate-900">{totalQuantity}</span> {formData.unit || ''}
                      {' · '}{formData.lines.filter((l) => Number(l.quantity) > 0).length} line(s)
                    </span>
                  </div>

                  <div className="space-y-1.5 rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                    {formData.lines.map((line, idx) => {
                      const variety = varieties.find((v) => String(v.id) === String(line.categoryId));
                      const needsLot = !!variety?.usesLots;
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                          <span className="text-[10px] font-bold text-slate-400 w-5">#{idx + 1}</span>
                          <SearchableSelect
                            value={line.categoryId}
                            onChange={(v) => updateLine(idx, { categoryId: v, subCategoryId: '' })}
                            options={varietyOptions}
                            placeholder="Variety…"
                            disabled={!selectedProduct}
                          />
                          {needsLot && (
                            <SearchableSelect
                              value={line.subCategoryId}
                              onChange={(v) => updateLine(idx, { subCategoryId: v })}
                              options={lotOptions}
                              placeholder="Lot…"
                            />
                          )}
                          <span className="flex-1" />
                          <input
                            type="number" min="0" step="0.001"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                            className="input-mini text-right" style={{ width: '6rem' }}
                            placeholder="qty"
                          />
                          <span className="text-[11px] font-semibold text-slate-500 w-9">{formData.unit || ''}</span>
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="icon-btn !w-7 !h-7"
                            title="Remove line"
                            disabled={formData.lines.length === 1}
                          ><X size={12} /></button>
                        </div>
                      );
                    })}
                    <button type="button" onClick={addLine} className="btn-compact" disabled={!selectedProduct}>
                      <Plus size={12} /> Add line
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <DollarSign size={13} /> Estimated Value
                    <span className="form-label-hint">of this shipment</span>
                  </label>
                  <div className="input-with-suffix">
                    <input type="number" min="0" step="1" value={formData.estimatedValue} onChange={handleField('estimatedValue')} className="input-field" placeholder="0" />
                    <span className="input-suffix">৳</span>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Wallet size={13} /> Advance Paid
                    <span className="form-label-hint">to supplier now</span>
                  </label>
                  <div className="input-with-suffix">
                    <input type="number" min="0" step="1" value={formData.advancePaid} onChange={handleField('advancePaid')} className="input-field" placeholder="0" />
                    <span className="input-suffix">৳</span>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Percent size={13} /> Commission Rate
                    <span className="form-label-hint">set later if unsure</span>
                  </label>
                  <div className="input-with-suffix">
                    <input type="number" min="0" max="100" step="0.5" value={formData.commissionRate} onChange={handleField('commissionRate')} className="input-field" placeholder="negotiate after sell" />
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
                <div className="shipment-summary mt-4">
                  <div>
                    <p className="shipment-summary-label">Summary</p>
                    <p className="shipment-summary-text">
                      {selectedSupplier ? <><strong>{selectedSupplier.name}</strong> →</> : ''}{' '}
                      {selectedProduct?.name || '—'}
                      {totalQuantity ? ` — ${totalQuantity} ${formData.unit || ''}` : ''}
                      {' · '}{formData.lines.filter((l) => Number(l.quantity) > 0).length} line(s)
                    </p>
                    <p className="shipment-summary-text mt-1 text-slate-500">
                      Est. value ৳{(Number(formData.estimatedValue) || 0).toLocaleString()}
                      {' · '}Advance ৳{(Number(formData.advancePaid) || 0).toLocaleString()}
                      {' · '}Commission {formData.commissionRate === '' || formData.commissionRate == null
                        ? 'to negotiate'
                        : `${formData.commissionRate}%`}
                    </p>
                  </div>
                </div>
              )}

              {formError && (
                <div className="status-error mt-4">
                  <span>!</span>
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                <Save size={15} /> {isSaving ? 'Saving…' : 'Save Shipment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ShipmentsPage;
