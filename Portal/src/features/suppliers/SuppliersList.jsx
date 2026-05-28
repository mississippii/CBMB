import { useEffect, useState } from 'react';
import {
  Search, Plus, UserCheck, Phone, Building2, Percent, Wallet, MapPin, ArrowUpDown,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
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

  if (selectedSupplierId) {
    return <SupplierDetail supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="suppliers-toolbar">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Supplier
        </button>
        <div className="suppliers-toolbar-controls">
          <div className="relative flex-1 min-w-[200px]">
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
            <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} className="input-field !pl-8">
              <option value="all">All suppliers</option>
              <option value="with-due">With due</option>
              <option value="no-due">No due</option>
            </select>
          </div>
          <label className="toggle-pill" title="Show disabled">
            <input
              type="checkbox"
              checked={showDisabled}
              onChange={(e) => setShowDisabled(e.target.checked)}
            />
            <span>Show disabled</span>
          </label>
          <div className="suppliers-toolbar-select">
            <ArrowUpDown size={14} className="suppliers-toolbar-select-icon" />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field !pl-8">
              <option value="name-asc">Name A → Z</option>
              <option value="name-desc">Name Z → A</option>
              <option value="due-desc">Due (high → low)</option>
              <option value="due-asc">Due (low → high)</option>
              <option value="comm-desc">Commission (high → low)</option>
              <option value="comm-asc">Commission (low → high)</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Add New Supplier</h2>
                <p className="text-xs text-slate-500 mt-0.5">Fill in supplier details below</p>
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
            <p className="empty-state-sub">Add your first supplier to start receiving shipments.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 flex items-center gap-2 mx-auto">
              <Plus size={15} /> Add Supplier
            </button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-title">No results found</p>
            <p className="empty-state-sub">Try a different name, business or phone.</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              {filteredSuppliers.map((supplier) => {
                const categories = [...new Set(
                  supplierProducts.filter((p) => p.supplierId === supplier.id).map((p) => p.category)
                )];
                return (
                  <div key={supplier.id} className="supplier-card">
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
                      <button
                        onClick={() => setSelectedSupplierId(supplier.id)}
                        className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                      >
                        Profile
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-red-50 px-2 py-2">
                        <p className="text-slate-500">Due</p>
                        <p className="font-bold text-red-600">৳{supplier.amountDue.toLocaleString()}</p>
                      </div>
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
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Business</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Amount Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Commission</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Crate Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="supplier-card-avatar !w-8 !h-8 !text-xs">
                            {supplier.name?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <p className="font-semibold text-slate-900">{supplier.name}</p>
                          {supplier.status === 'DISABLED' && (
                            <span className="badge badge-rose">Disabled</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {supplier.businessName || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{supplier.contact}</td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        ৳{supplier.amountDue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          {supplier.commissionRate}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {supplier.totalCratesHolding}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedSupplierId(supplier.id)}
                          className="btn-secondary !py-1 !px-3 text-xs"
                        >
                          Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SuppliersList;
