import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Truck, UserCheck, Package, Tag, FileText, Save, Plus, X, MoreVertical, Pencil,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../shared/components/Toast';
import SearchableSelect from '../../shared/components/SearchableSelect';
import { queryKeys } from '../../services/queryKeys';

const UNITS = ['KG', 'PCS', 'CRATE', 'DOZEN', 'BAG', 'MOUND'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Title-case a unit for the shipment name: "CRATE" → "Crate".
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

const newLine = () => ({ categoryId: '', subCategoryId: '', quantity: '' });

const initialForm = {
  name: '',
  supplierId: '',
  productId: '',
  unit: '',
  lines: [newLine()],   // each line: { categoryPath: [..], quantity: '..' }
  note: '',
};


const ShipmentsPage = () => {
  const { suppliers, catalogProducts, subCategories, addSupplierProduct, fetchShipments, updateShipment } = useData();
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [detailShipment, setDetailShipment] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', note: '' });
  const [editError, setEditError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  // Pattern: <Product>_<TotalQty><Unit>_<Month><Day>  →  e.g. "Mango_215Crate_June6"
  const suggestedName = useMemo(() => {
    const productLabel = selectedProduct?.name || '';
    const cleanBase = productLabel.replace(/\s+/g, '').slice(0, 30);
    if (!cleanBase || !totalQuantity) return '';
    const now = new Date();
    return `${cleanBase}_${totalQuantity}${titleCase(formData.unit)}_${MONTHS[now.getMonth()]}${now.getDate()}`;
  }, [selectedProduct, totalQuantity, formData.unit]);

  // Always keep the name in sync with the auto-generated pattern.
  useEffect(() => {
    if (!suggestedName) return;
    setFormData((prev) => (prev.name === suggestedName ? prev : { ...prev, name: suggestedName }));
  }, [suggestedName]);

  const openModal = () => {
    setFormData(initialForm);
    setFormError('');
    setShowConfirm(false);
    setShowModal(true);
  };

  // Submitting the form opens a confirmation first — a shipment is significant.
  const handleReview = (event) => {
    event.preventDefault();
    setFormError('');
    if (!formData.supplierId) { setFormError('Select a supplier.'); return; }
    if (!formData.productId) { setFormError('Select a product.'); return; }
    if (!formData.unit) { setFormError('Select a unit.'); return; }
    if (formData.lines.filter((l) => Number(l.quantity) > 0).length === 0) {
      setFormError('Add at least one line with a quantity.');
      return;
    }
    setShowConfirm(true);
  };

  const openEdit = (shipment) => {
    setOpenMenuId(null);
    setEditTarget(shipment);
    setEditForm({ name: shipment.name || '', note: shipment.note || '' });
    setEditError('');
  };

  const handleEditSave = async () => {
    if (!editForm.name.trim()) { setEditError('Shipment name is required.'); return; }
    setIsEditing(true);
    setEditError('');
    try {
      await updateShipment(editTarget.id, { name: editForm.name.trim(), note: editForm.note.trim() });
      showToast('Shipment updated', 'success');
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update shipment.');
    } finally {
      setIsEditing(false);
    }
  };

  const handleConfirmCreate = async () => {
    setFormError('');
    setIsSaving(true);
    try {
      const validLines = formData.lines.filter((l) => Number(l.quantity) > 0);
      await addSupplierProduct({ ...formData, lines: validLines });
      const productLabel = selectedProduct?.name || 'Shipment';
      showToast(`${productLabel} ${totalQuantity} ${formData.unit} received from ${selectedSupplier?.name || 'supplier'} (${validLines.length} line${validLines.length === 1 ? '' : 's'})`, 'success');
      setShowConfirm(false);
      setShowModal(false);
    } catch (error) {
      setShowConfirm(false);
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
          </div>
          <span className="badge badge-teal">{shipments.length} total</span>
        </div>

        {shipments.length === 0 ? (
          <div className="empty-state">
            <Truck size={32} className="empty-state-icon" />
            <p className="empty-state-title">No shipments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Shipment Name</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Supplier</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Total Quantity</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allShipments.map((shipment) => {
                  const supplier = supplierById.get(Number(shipment.supplierId));
                  const products = [...new Set((shipment.items || []).map((it) => it.productName).filter(Boolean))];
                  return (
                    <tr
                      key={shipment.id}
                      onClick={() => setDetailShipment(shipment)}
                      className="cursor-pointer hover:bg-slate-50 transition text-center"
                      title="Click to view shipment details"
                    >
                      <td className="px-4 py-3 text-center whitespace-nowrap font-bold text-blue-700">
                        {shipment.name || '—'}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-900 whitespace-nowrap">{shipment.date}</td>
                      <td className="px-4 py-3 text-center font-medium text-slate-800">{supplier?.name || '—'}</td>
                      <td className="px-4 py-3 text-center font-extrabold text-slate-900">
                        {shipment.totalQuantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-800">{products.length ? products.join(', ') : '—'}</td>
                      <td className="px-4 py-3 text-center relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenMenuId(openMenuId === shipment.id ? null : shipment.id)}
                          className="row-menu-btn"
                          aria-label="Actions"
                        >
                          <MoreVertical size={15} />
                        </button>
                        {openMenuId === shipment.id && (
                          <>
                            <div className="row-menu-backdrop" onClick={() => setOpenMenuId(null)} />
                            <div className="row-menu">
                              <button type="button" onClick={() => openEdit(shipment)} className="row-menu-item">
                                <Pencil size={13} /> Edit
                              </button>
                            </div>
                          </>
                        )}
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
          <form onSubmit={handleReview} className="modal-content" style={{ maxWidth: '46rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700">
                  <Truck size={18} />
                </div>
                <div>
                  <h2>Add Shipment</h2>
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
                <Save size={15} /> Save Shipment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Confirm before creating a shipment */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '28rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-amber-100 text-amber-700"><Truck size={18} /></div>
                <div><h2>Add this shipment?</h2></div>
              </div>
              <button type="button" onClick={() => setShowConfirm(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-slate-600">
                Please review — adding a shipment updates stock and can only be reversed by settling or adjusting it.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="balance-pill"><p>Supplier</p><p>{selectedSupplier?.name || '—'}</p></div>
                <div className="balance-pill"><p>Product</p><p>{selectedProduct?.name || '—'}</p></div>
                <div className="balance-pill"><p>Total Quantity</p><p>{totalQuantity} {formData.unit}</p></div>
                <div className="balance-pill"><p>Lines</p><p>{formData.lines.filter((l) => Number(l.quantity) > 0).length}</p></div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Name: <span className="font-semibold text-slate-700">{formData.name || '—'}</span></p>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowConfirm(false)} className="btn-secondary" disabled={isSaving}>Back</button>
              <button type="button" onClick={handleConfirmCreate} className="btn-primary flex items-center gap-2" disabled={isSaving}>
                <Save size={15} /> {isSaving ? 'Saving…' : 'Confirm & Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit shipment (name / note only) */}
      {editTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditTarget(null)}>
          <div className="modal-content" style={{ maxWidth: '28rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Pencil size={18} /></div>
                <div><h2>Edit Shipment</h2></div>
              </div>
              <button type="button" onClick={() => setEditTarget(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label className="form-label"><Truck size={13} /> Shipment name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="input-field"
                  autoFocus
                />
              </div>
              <div className="form-field mt-3">
                <label className="form-label"><FileText size={13} /> Note <span className="form-label-hint">optional</span></label>
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
                  className="input-field"
                />
              </div>
              <p className="mt-3 text-xs text-slate-500">Quantities and items can&apos;t be changed after a shipment is created.</p>
              {editError && <div className="status-error mt-3"><span>!</span><span>{editError}</span></div>}
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary" disabled={isEditing}>Cancel</button>
              <button type="button" onClick={handleEditSave} className="btn-primary flex items-center gap-2" disabled={isEditing}>
                <Save size={15} /> {isEditing ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipment detail modal */}
      {detailShipment && (() => {
        const supplier = supplierById.get(Number(detailShipment.supplierId));
        const items = detailShipment.items || [];
        return (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailShipment(null)}>
            <div className="modal-content" style={{ maxWidth: '40rem' }}>
              <div className="modal-header">
                <div className="flex items-center gap-2.5">
                  <div className="modal-icon-circle bg-blue-100 text-blue-700"><Truck size={18} /></div>
                  <div>
                    <h2 className="flex items-center gap-2">
                      {detailShipment.name || '—'}
                      {detailShipment.commissionRate != null && (
                        <span className="badge badge-teal">{detailShipment.commissionRate}% commission</span>
                      )}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">#{detailShipment.id} · {detailShipment.date}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setDetailShipment(null)} className="modal-close-btn">✕</button>
              </div>
              <div className="modal-body max-h-[72vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <div className="balance-pill"><p>Supplier</p><p>{supplier?.name || '—'}</p></div>
                  <div className="balance-pill"><p>Date</p><p>{detailShipment.date}</p></div>
                  <div className="balance-pill"><p>Total Quantity</p><p>{detailShipment.totalQuantity.toLocaleString()}</p></div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                  <table className="center-table w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-4 py-2 font-semibold text-slate-700">Variety</th>
                        <th className="px-4 py-2 font-semibold text-slate-700">Lot</th>
                        <th className="px-4 py-2 font-semibold text-slate-700">Quantity</th>
                        <th className="px-4 py-2 font-semibold text-slate-700">Total Sold</th>
                        <th className="px-4 py-2 font-semibold text-slate-700">Left</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-4 text-slate-500">No items</td></tr>
                      ) : items.map((it, i) => {
                        const left = Number(it.remaining) || 0;
                        const sold = Math.max(0, (Number(it.quantity) || 0) - left);
                        return (
                          <tr key={i}>
                            <td className="px-4 py-2 font-medium text-slate-900">{it.categoryName || '—'}</td>
                            <td className="px-4 py-2 text-slate-700">{it.subCategoryName || '—'}</td>
                            <td className="px-4 py-2 font-semibold text-slate-800">{(Number(it.quantity) || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-slate-700">{sold.toLocaleString()}</td>
                            <td className="px-4 py-2 font-semibold text-emerald-700">{left.toLocaleString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {detailShipment.note && (
                  <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Note:</span> {detailShipment.note}</p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setDetailShipment(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default ShipmentsPage;
