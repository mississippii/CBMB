import { useState } from 'react';
import { Search, Plus, UserCheck } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToast } from './Toast';
import SupplierDetail from './SupplierDetail';

const EMPTY_FORM = {
  name: '',
  contact: '',
  location: '',
  bankDetails: '',
  commissionRate: 5,
  openingDue: '',
};

const SuppliersList = () => {
  const { suppliers, supplierProducts, addSupplier } = useData();
  const showToast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);

  const handleAddSupplier = async () => {
    if (!formData.name.trim() || !formData.contact.trim() || !formData.location.trim()) {
      setFormError('Name, contact, and location are required.');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      await addSupplier(formData);
      setFormData(EMPTY_FORM);
      setShowForm(false);
      showToast(`${formData.name} added as supplier`, 'success');
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
  const filteredSuppliers = suppliers.filter((s) => {
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      normalizePhone(s.contact).includes(normalizePhone(q))
    );
  });

  if (selectedSupplierId) {
    return <SupplierDetail supplierId={selectedSupplierId} onBack={() => setSelectedSupplierId(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 w-full sm:w-auto">
          <Plus size={16} />
          Add Supplier
        </button>
        <div className="relative w-full sm:w-[320px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field !pl-9"
            placeholder="Search by name or phone…"
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Supplier</h2>
              <button onClick={closeForm} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label">Supplier Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Rahman Trading"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Contact Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                    className="input-field"
                    placeholder="e.g. 01700000000"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Location <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="input-field"
                    placeholder="e.g. Karwan Bazar, Dhaka"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">Bank Details</label>
                  <input
                    type="text"
                    value={formData.bankDetails}
                    onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                    className="input-field"
                    placeholder="Account number / bank name (optional)"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="form-field">
                    <label className="form-label">Commission Rate (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Opening Due (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.openingDue}
                      onChange={(e) => setFormData({ ...formData, openingDue: e.target.value })}
                      className="input-field"
                      placeholder="0"
                    />
                  </div>
                </div>
                {formError && (
                  <div className="status-error">
                    <span>!</span>
                    <span>{formError}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={closeForm} className="btn-secondary">Cancel</button>
              <button onClick={handleAddSupplier} disabled={isSaving} className="btn-primary">
                {isSaving ? 'Saving…' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <UserCheck size={18} className="text-teal-600" />
            Suppliers
          </h3>
          <span className="text-sm text-slate-500">{filteredSuppliers.length} of {suppliers.length}</span>
        </div>

        {suppliers.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={36} className="empty-state-icon" />
            <p className="empty-state-title">No suppliers yet</p>
            <p className="empty-state-sub">Add your first supplier to get started.</p>
            <button onClick={() => setShowForm(true)} className="btn-primary mt-3 flex items-center gap-2 mx-auto">
              <Plus size={15} /> Add Supplier
            </button>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="empty-state">
            <Search size={32} className="empty-state-icon" />
            <p className="empty-state-title">No results found</p>
            <p className="empty-state-sub">Try a different name or phone number.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredSuppliers.map((supplier) => {
                const categories = [...new Set(
                  supplierProducts.filter((p) => p.supplierId === supplier.id).map((p) => p.category)
                )];
                return (
                  <div key={supplier.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{supplier.name}</p>
                        <p className="text-sm text-slate-500">{supplier.contact}</p>
                        {categories.length > 0 && (
                          <p className="text-xs text-slate-400 mt-0.5">{categories.join(', ')}</p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedSupplierId(supplier.id)}
                        className="btn-secondary !py-1.5 !px-3 text-xs shrink-0"
                      >
                        Profile
                      </button>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="text-slate-500">Due</p>
                        <p className="font-bold text-red-600">৳{supplier.amountDue.toLocaleString()}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="text-slate-500">Commission</p>
                        <p className="font-bold text-slate-800">{supplier.commissionRate}%</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-2 py-2">
                        <p className="text-slate-500">Box Due</p>
                        <p className="font-bold text-slate-800">{supplier.totalBoxesHolding}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm min-w-[860px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Contact</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Products</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Amount Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Commission</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Box Due</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSuppliers.map((supplier) => {
                    const categories = [...new Set(
                      supplierProducts.filter((p) => p.supplierId === supplier.id).map((p) => p.category)
                    )];
                    return (
                      <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{supplier.name}</p>
                          <p className="text-xs text-slate-400">{supplier.location || '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{supplier.contact}</td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{categories.join(', ') || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">
                          ৳{supplier.amountDue.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">
                            {supplier.commissionRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-700">
                          {supplier.totalBoxesHolding}
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
                    );
                  })}
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
