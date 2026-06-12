import { useEffect, useState } from 'react';
import {
  Search, Plus, Users, Phone, User, MapPin, Wallet, ArrowUpDown, Filter,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import { TablePager, usePagination } from '../../shared/components';
import { formatMoney } from '../../shared/utils/format';
import CustomerDetail from './CustomerDetail';

const EMPTY_FORM = {
  name: '',
  owner: '',
  phone: '',
  address: '',
  openingDue: '',
};

const CustomersList = ({ autoOpenId = null, onProfileOpened }) => {
  const { customers, addCustomer, reloadCustomers } = useData();
  const showToast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterDue, setFilterDue] = useState('all');
  const [showDisabled, setShowDisabled] = useState(false);

  useEffect(() => {
    reloadCustomers(showDisabled);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [showDisabled]);

  // Auto-open profile when arriving from the Overview money strip.
  useEffect(() => {
    if (autoOpenId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCustomerId(autoOpenId);
      onProfileOpened?.();
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [autoOpenId]);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleField = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleAddCustomer = async () => {
    const name = formData.name.trim();
    const phone = formData.phone.trim();
    if (!name || !phone) {
      setFormError('Customer name and phone are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await addCustomer({
        ...formData,
        name,
        phone,
        owner: formData.owner.trim(),
        address: formData.address.trim(),
      });
      setFormData(EMPTY_FORM);
      setShowForm(false);
      showToast(`${name} added as customer`, 'success');
    } catch (error) {
      setFormError(error.message || 'Failed to add customer.');
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

  const filteredCustomers = customers
    .filter((c) => {
      if (q) {
        const matches =
          c.name.toLowerCase().includes(q) ||
          (c.ownerName || c.owner || '').toLowerCase().includes(q) ||
          normalizePhone(c.phone).includes(normalizePhone(q));
        if (!matches) return false;
      }
      if (filterDue === 'with-due' && Number(c.amountDue || 0) <= 0) return false;
      if (filterDue === 'no-due' && Number(c.amountDue || 0) > 0) return false;
      if (filterDue === 'holding-crates' && Number(c.totalCratesHolding || 0) <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':       return a.name.localeCompare(b.name);
        case 'name-desc':      return b.name.localeCompare(a.name);
        case 'due-desc':       return Number(b.amountDue || 0) - Number(a.amountDue || 0);
        case 'due-asc':        return Number(a.amountDue || 0) - Number(b.amountDue || 0);
        case 'crates-desc':    return Number(b.totalCratesHolding || 0) - Number(a.totalCratesHolding || 0);
        default: return 0;
      }
    });

  const { pageItems: pagedCustomers, ...customerPager } = usePagination(
    filteredCustomers, 15, [search, sortBy, filterDue, showDisabled],
  );

  if (selectedCustomerId) {
    return <CustomerDetail customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
  }

  const totalDue = customers.reduce((sum, c) => sum + Math.max(0, Number(c.amountDue) || 0), 0);
  const withDueCount = customers.filter((c) => Number(c.amountDue) > 0).length;
  const totalCratesHeld = customers.reduce((sum, c) => sum + (Number(c.totalCratesHolding) || 0), 0);

  return (
    <div className="profile-workspace">
      <main className="profile-main-stack">
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Add New Customer</h2>
              </div>
              <button onClick={closeForm} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    <Users size={13} /> Store / Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleField('name')}
                    className="input-field"
                    placeholder="e.g. Karim Store"
                    autoFocus
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <User size={13} /> Owner Name
                  </label>
                  <input
                    type="text"
                    value={formData.owner}
                    onChange={handleField('owner')}
                    className="input-field"
                    placeholder="e.g. Karim Hossain"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Phone size={13} /> Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={handleField('phone')}
                    className="input-field"
                    placeholder="e.g. 01700000000"
                  />
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <MapPin size={13} /> Address
                    <span className="form-label-hint">optional</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={handleField('address')}
                    className="input-field"
                    placeholder="e.g. Karwan Bazar, Dhaka"
                  />
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
              <button onClick={handleAddCustomer} disabled={isSaving} className="btn-primary flex items-center gap-2">
                {isSaving ? 'Saving…' : (<><Plus size={15} /> Add Customer</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Customers
          </h3>
          <span className="text-sm text-slate-500">{filteredCustomers.length} of {customers.length}</span>
        </div>

        {customers.length === 0 ? (
          <div className="empty-state">
            <Users size={36} className="empty-state-icon" />
            <p className="empty-state-title">No customers yet</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 flex items-center gap-2 mx-auto">
              <Plus size={15} /> Add Customer
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-title">No results found</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              {pagedCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className="supplier-card cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="supplier-card-avatar">
                        {c.name?.charAt(0).toUpperCase() || 'C'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{c.name}</p>
                        {(c.ownerName || c.owner) && (
                          <p className="text-xs text-slate-500 truncate">{c.ownerName || c.owner}</p>
                        )}
                        <p className="text-xs text-slate-500 truncate">{c.phone}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-red-50 px-2 py-2">
                      <p className="text-slate-500">Due</p>
                      <p className="font-bold text-red-600">৳{Number(c.amountDue || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Crates</p>
                      <p className="font-bold text-slate-800">{c.totalCratesHolding || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="party-table w-full text-sm min-w-[880px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Owner Name</th>
                    <th>Contact</th>
                    <th>Location</th>
                    <th className="text-right">Amount Due</th>
                    <th className="text-right">Crate Due</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCustomers.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="cursor-pointer"
                    >
                      <td>
                        <div className="party-cell-main">
                          <span className="party-avatar">{c.name?.charAt(0).toUpperCase() || 'C'}</span>
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="party-name">{c.name}</span>
                            {c.status === 'DISABLED' && <span className="badge badge-rose">Disabled</span>}
                          </div>
                        </div>
                      </td>
                      <td className="font-semibold text-slate-700">{c.ownerName || c.owner || '—'}</td>
                      <td>
                        <div className="party-contact">
                          <span>{c.phone || '—'}</span>
                        </div>
                      </td>
                      <td className="text-slate-600">{c.address || '—'}</td>
                      <td className={`text-right font-bold tabular-nums ${Number(c.amountDue) > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {Number(c.amountDue) > 0 ? formatMoney(c.amountDue) : '—'}
                      </td>
                      <td className={`text-right font-semibold tabular-nums ${Number(c.totalCratesHolding) > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                        {Number(c.totalCratesHolding) > 0 ? c.totalCratesHolding : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <TablePager {...customerPager} />
          </>
        )}
      </div>
      </main>

      <aside className="profile-side-stack">
        <div className="supplier-panel">
          <h3>Customer Actions</h3>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Customer
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
                placeholder="Search name, owner or phone…"
              />
            </div>
            <div className="suppliers-toolbar-select">
              <Wallet size={14} className="suppliers-toolbar-select-icon" />
              <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} className="input-field !pl-8 w-full">
                <option value="all">All customers</option>
                <option value="with-due">With due</option>
                <option value="no-due">No due</option>
                <option value="holding-crates">Holding crates</option>
              </select>
            </div>
            <div className="suppliers-toolbar-select">
              <ArrowUpDown size={14} className="suppliers-toolbar-select-icon" />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-field !pl-8 w-full">
                <option value="name-asc">Name A → Z</option>
                <option value="name-desc">Name Z → A</option>
                <option value="due-desc">Due (high → low)</option>
                <option value="due-asc">Due (low → high)</option>
                <option value="crates-desc">Crates held (high → low)</option>
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
          <h3>Customers Summary</h3>
          <div className="mt-3 space-y-2">
            <div className="box-row"><span>Total customers</span><strong>{customers.length}</strong></div>
            <div className="box-row"><span>With due</span><strong>{withDueCount}</strong></div>
            <div className="box-row"><span>Total due</span><strong className="text-rose-700">{formatMoney(totalDue)}</strong></div>
            <div className="box-row total"><span>Crates held</span><strong>{totalCratesHeld}</strong></div>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CustomersList;
