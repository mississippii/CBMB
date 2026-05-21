import { useEffect, useState } from 'react';
import {
  Search, Plus, Users, Phone, User, MapPin, Wallet, Boxes, ArrowUpDown,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import CustomerDetail from './CustomerDetail';

const EMPTY_FORM = {
  name: '',
  owner: '',
  phone: '',
  address: '',
  openingDue: '',
  boxJamanot: '',
};

const CustomersList = () => {
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
      if (filterDue === 'holding-crates' && Number(c.totalBoxesHolding || 0) <= 0) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':       return a.name.localeCompare(b.name);
        case 'name-desc':      return b.name.localeCompare(a.name);
        case 'due-desc':       return Number(b.amountDue || 0) - Number(a.amountDue || 0);
        case 'due-asc':        return Number(a.amountDue || 0) - Number(b.amountDue || 0);
        case 'crates-desc':    return Number(b.totalBoxesHolding || 0) - Number(a.totalBoxesHolding || 0);
        case 'jamanot-desc':   return Number(b.boxJamanot || 0) - Number(a.boxJamanot || 0);
        default: return 0;
      }
    });

  if (selectedCustomerId) {
    return <CustomerDetail customerId={selectedCustomerId} onBack={() => setSelectedCustomerId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="suppliers-toolbar">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Add Customer
        </button>
        <div className="suppliers-toolbar-controls">
          <div className="relative flex-1 min-w-[200px]">
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
            <select value={filterDue} onChange={(e) => setFilterDue(e.target.value)} className="input-field !pl-8">
              <option value="all">All customers</option>
              <option value="with-due">With due</option>
              <option value="no-due">No due</option>
              <option value="holding-crates">Holding crates</option>
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
              <option value="crates-desc">Crates held (high → low)</option>
              <option value="jamanot-desc">Jamanot (high → low)</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Add New Customer</h2>
                <p className="text-xs text-slate-500 mt-0.5">Only permanent customers can borrow crates</p>
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

                <div className="form-field">
                  <label className="form-label">
                    <Boxes size={13} /> Existing Jamanot
                    <span className="form-label-hint">optional</span>
                  </label>
                  <div className="input-with-suffix">
                    <span className="input-prefix">৳</span>
                    <input
                      type="number"
                      min="0"
                      value={formData.boxJamanot}
                      onChange={handleField('boxJamanot')}
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
            <p className="empty-state-sub">Add your first customer to start tracking sales and crates.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 flex items-center gap-2 mx-auto">
              <Plus size={15} /> Add Customer
            </button>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-title">No results found</p>
            <p className="empty-state-sub">Try a different name, owner or phone.</p>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-3 lg:hidden">
              {filteredCustomers.map((c) => (
                <div key={c.id} className="supplier-card">
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
                    <button
                      onClick={() => setSelectedCustomerId(c.id)}
                      className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                    >
                      Profile
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-red-50 px-2 py-2">
                      <p className="text-slate-500">Due</p>
                      <p className="font-bold text-red-600">৳{Number(c.amountDue || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 px-2 py-2">
                      <p className="text-slate-500">Jamanot</p>
                      <p className="font-bold text-blue-700">৳{Number(c.boxJamanot || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-2 py-2">
                      <p className="text-slate-500">Crates</p>
                      <p className="font-bold text-slate-800">{c.totalBoxesHolding || 0}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table view */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Owner</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Phone</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Crates Held</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Jamanot</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Payment Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="supplier-card-avatar !w-8 !h-8 !text-xs">
                            {c.name?.charAt(0).toUpperCase() || 'C'}
                          </div>
                          <p className="font-semibold text-slate-900">{c.name}</p>
                          {c.status === 'DISABLED' && (
                            <span className="badge badge-rose">Disabled</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {c.ownerName || c.owner || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.phone}</td>
                      <td className="px-4 py-3 text-center font-semibold text-slate-700">
                        {c.totalBoxesHolding || 0}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">
                        ৳{Number(c.boxJamanot || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-red-600">
                        ৳{Number(c.amountDue || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedCustomerId(c.id)}
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

export default CustomersList;
