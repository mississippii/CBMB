import { useEffect, useState } from 'react';
import {
  Search, Plus, UserCheck, Phone, Building2, Percent, Wallet, MapPin, ArrowUpDown, Filter,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import { TablePager, usePagination } from '../../shared/components';
import { formatMoney } from '../../shared/utils/format';
import SupplierDetail from './SupplierDetail';

const EMPTY_FORM = {
  name: '',
  businessName: '',
  contact: '',
  location: '',
  commissionRate: '',
  openingDue: '',
};

const SuppliersList = ({ autoOpenId = null, onProfileOpened }) => {
  const { suppliers, supplierProducts, addSupplier, reloadSuppliers } = useData();
  const showToast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterDue, setFilterDue] = useState('all');
  const [showDisabled, setShowDisabled] = useState(false);

  useEffect(() => {
    reloadSuppliers(showDisabled);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [showDisabled]);

  // Auto-open profile when arriving from the Overview money strip.
  useEffect(() => {
    if (autoOpenId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedSupplierId(autoOpenId);
      onProfileOpened?.();
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [autoOpenId]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleField = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const handleAddSupplier = async () => {
    const name = formData.name.trim();
    const contact = formData.contact.trim();
    if (!name || !contact) {
      setFormError('Supplier name and phone number are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await addSupplier({
        ...formData,
        name,
        contact,
        businessName: formData.businessName.trim(),
        location: formData.location.trim(),
      });
      setFormData(EMPTY_FORM);
      setShowForm(false);
      showToast(`${name} added as supplier`, 'success');
    } catch (error) {
      setFormError(error.message || 'Failed to add supplier.');
    } finally {
      setIsSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError('');
    setFormData(EMPTY_FORM);
  };

  const normalizePhone = (v) => String(v ?? '').replace(/\D/g, '');
  const q = search.trim().toLowerCase();

  const filteredSuppliers = suppliers
    .filter((s) => {
      if (q) {
        const matches =
          s.name.toLowerCase().includes(q) ||
          (s.businessName || '').toLowerCase().includes(q) ||
          normalizePhone(s.contact).includes(normalizePhone(q));
        if (!matches) return false;
      }
      if (filterDue === 'with-due' && Number(s.amountDue || 0) <= 0) return false;
      if (filterDue === 'no-due' && Number(s.amountDue || 0) > 0) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':   return a.name.localeCompare(b.name);
        case 'name-desc':  return b.name.localeCompare(a.name);
        case 'due-desc':   return Number(b.amountDue || 0) - Number(a.amountDue || 0);
        case 'due-asc':    return Number(a.amountDue || 0) - Number(b.amountDue || 0);
        case 'comm-desc':  return Number(b.commissionRate || 0) - Number(a.commissionRate || 0);
        case 'comm-asc':   return Number(a.commissionRate || 0) - Number(b.commissionRate || 0);
        default:           return 0;
      }
    });

  const { pageItems: pagedSuppliers, ...supplierPager } = usePagination(
    filteredSuppliers, 15, [search, sortBy, filterDue, showDisabled],
  );

  if (selectedSupplierId) {
    return <SupplierDetail supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }

  const totalDue = suppliers.reduce((sum, s) => sum + Math.max(0, Number(s.amountDue) || 0), 0);
  const totalAdvance = suppliers.reduce((sum, s) => sum + Math.max(0, -(Number(s.amountDue) || 0)), 0);
  const totalCratesDue = suppliers.reduce((sum, s) => sum + (Number(s.totalCratesHolding) || 0), 0);

  return (
    <div className="profile-workspace">
      <main className="profile-main-stack">
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Add New Supplier</h2>
              </div>
              <button onClick={closeForm} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    <UserCheck size={13} /> Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleField('name')}
                    className="input-field"
                    placeholder="e.g. Rahman Hossain"
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Building2 size={13} /> Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={handleField('businessName')}
                    className="input-field"
                    placeholder="e.g. Rahman Trading"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Phone size={13} /> Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={handleField('contact')}
                    className="input-field"
                    placeholder="e.g. 01700000000"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <MapPin size={13} /> Location
                    <span className="form-label-hint">optional</span>
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={handleField('location')}
                    className="input-field"
                    placeholder="e.g. Karwan Bazar, Dhaka"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Percent size={13} /> Commission Rate
                    <span className="form-label-hint">optional</span>
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
                      placeholder="0"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Wallet size={13} /> Opening Due
                    <span className="form-label-hint">optional</span>
                  </label>
                  <div className="input-with-suffix">
                    <span className="input-prefix">৳</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.openingDue}
                      onChange={handleField('openingDue')}
                      className="input-field !pl-8"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <div className="status-error mt-4">
                  <span>!</span>
                  <span>{formError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button onClick={handleAddSupplier} disabled={isSaving} className="btn-primary flex items-center gap-2">
                {isSaving ? 'Saving…' : (<><Plus size={15} /> Add Supplier</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck size={18} className="text-blue-600" />
            Suppliers
          </h3>
          <span className="text-sm text-slate-500">
            {filteredSuppliers.length} of {suppliers.length}
          </span>
        </div>

        {suppliers.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={36} className="empty-state-icon" />
            <p className="empty-state-title">No suppliers yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 flex items-center gap-2 mx-auto">
              <Plus size={15} /> Add Supplier
            </button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-title">No results found</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              {pagedSuppliers.map((supplier) => {
                const categories = [...new Set(
                  supplierProducts.filter((p) => p.supplierId === supplier.id).map((p) => p.category)
                )];
                const net = Number(supplier.amountDue || 0);
                const advance = net < 0 ? -net : 0;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => setSelectedSupplierId(supplier.id)}
                    className="supplier-card cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="supplier-card-avatar">
                          {supplier.name?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{supplier.name}</p>
                          {supplier.businessName && (
                            <p className="text-xs text-blue-700 truncate">{supplier.businessName}</p>
                          )}
                          <p className="text-xs text-slate-500 truncate">{supplier.contact}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      {advance > 0 ? (
                        <div className="rounded-lg bg-emerald-50 px-2 py-2">
                          <p className="text-slate-500">Advance</p>
                          <p className="font-bold text-emerald-600">৳{advance.toLocaleString()}</p>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-red-50 px-2 py-2">
                          <p className="text-slate-500">Due</p>
                          <p className="font-bold text-red-600">৳{net.toLocaleString()}</p>
                        </div>
                      )}
                      <div className="rounded-lg bg-blue-50 px-2 py-2">
                        <p className="text-slate-500">Comm.</p>
                        <p className="font-bold text-blue-700">{supplier.commissionRate}%</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="text-slate-500">Crate Due</p>
                        <p className="font-bold text-slate-800">{supplier.totalCratesHolding}</p>
                      </div>
                    </div>
                    {categories.length > 0 && (
                      <p className="text-xs text-slate-400 mt-2 truncate">📦 {categories.join(', ')}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="party-table w-full text-sm min-w-[980px]">
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Business Name</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th className="text-right">Amount Due</th>
                    <th className="text-right">Advance Paid</th>
                    <th className="text-right">Crate Due</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSuppliers.map((supplier) => {
                    const net = Number(supplier.amountDue || 0);
                    const due = net > 0 ? net : 0;
                    const advance = net < 0 ? -net : 0;
                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => setSelectedSupplierId(supplier.id)}
                        className="cursor-pointer"
                      >
                        <td>
                          <div className="party-cell-main">
                            <span className="party-avatar">{supplier.name?.charAt(0).toUpperCase() || 'S'}</span>
                            <div className="flex flex-wrap items-center gap-2 min-w-0">
                              <span className="party-name">{supplier.name}</span>
                              {supplier.status === 'DISABLED' && <span className="badge badge-rose">Disabled</span>}
                            </div>
                          </div>
                        </td>
                        <td className="font-semibold text-slate-700">{supplier.businessName || '—'}</td>
                        <td>
                          <div className="party-contact">
                            <span>{supplier.contact || '—'}</span>
                          </div>
                        </td>
                        <td className="text-slate-600">{supplier.location || '—'}</td>
                        <td className={`text-right font-bold tabular-nums ${due > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {due > 0 ? formatMoney(due) : '—'}
                        </td>
                        <td className={`text-right font-bold tabular-nums ${advance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {advance > 0 ? formatMoney(advance) : '—'}
                        </td>
                        <td className={`text-right font-semibold tabular-nums ${Number(supplier.totalCratesHolding) > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                          {Number(supplier.totalCratesHolding) > 0 ? supplier.totalCratesHolding : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePager {...supplierPager} />
          </>
        )}
      </div>
      </main>

      <aside className="profile-side-stack">
        <div className="supplier-panel">
          <h3>Supplier Actions</h3>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Supplier
          </button>
        </div>
        <div className="supplier-panel">
          <h3 className="flex items-center gap-2"><Filter size={16} className="text-blue-600" /> Filters</h3>
          <div className="mt-3 space-y-2.5">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field !pl-9"
                placeholder="Search name, business or phone…"
              />
            </div>
            <div className="suppliers-toolbar-select">
              <Wallet size={14} className="suppliers-toolbar-select-icon" />
              <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} className="input-field !pl-8 w-full">
                <option value="all">All suppliers</option>
                <option value="with-due">With due</option>
                <option value="no-due">No due</option>
              </select>
            </div>
            <div className="suppliers-toolbar-select">
              <ArrowUpDown size={14} className="suppliers-toolbar-select-icon" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field !pl-8 w-full">
                <option value="name-asc">Name A → Z</option>
                <option value="name-desc">Name Z → A</option>
                <option value="due-desc">Due (high → low)</option>
                <option value="due-asc">Due (low → high)</option>
                <option value="comm-desc">Commission (high → low)</option>
                <option value="comm-asc">Commission (low → high)</option>
              </select>
            </div>
            <label className="toggle-pill w-full justify-center" title="Show disabled">
              <input
                type="checkbox"
                checked={showDisabled}
                onChange={(e) => setShowDisabled(e.target.checked)}
              />
              <span>Show disabled</span>
            </label>
          </div>
        </div>
        <div className="supplier-panel">
          <h3>Suppliers Summary</h3>
          <div className="mt-3 space-y-2">
            <div className="box-row"><span>Total suppliers</span><strong>{suppliers.length}</strong></div>
            <div className="box-row"><span>Total due</span><strong className="text-rose-700">{formatMoney(totalDue)}</strong></div>
            <div className="box-row"><span>Advance paid</span><strong className="text-emerald-700">{formatMoney(totalAdvance)}</strong></div>
            <div className="box-row total"><span>Crates due</span><strong>{totalCratesDue}</strong></div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default SuppliersList;
