import { useState } from 'react';
import { useData } from '../context/DataContext';
import SupplierDetail from './SupplierDetail';

const SuppliersList = () => {
  const { suppliers, supplierProducts, addSupplier } = useData();
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    location: '',
    bankDetails: '',
    commissionRate: 5,
    openingDue: '',
  });

  const handleAddSupplier = async () => {
    if (formData.name && formData.contact && formData.location) {
      setIsSaving(true);
      setFormError('');
      try {
        await addSupplier(formData);
        setFormData({
          name: '',
          contact: '',
          location: '',
          bankDetails: '',
          commissionRate: 5,
          openingDue: '',
        });
        setShowForm(false);
      } catch (error) {
        setFormError(error.message || 'Failed to add supplier.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');
  const normalizedSearchPhone = normalizePhone(phoneSearch);
  const filteredSuppliers = suppliers.filter((supplier) => {
    if (!normalizedSearchPhone) return true;
    return normalizePhone(supplier.contact).includes(normalizedSearchPhone);
  });

  if (selectedSupplierId) {
    return (
      <SupplierDetail
        supplierId={selectedSupplierId}
        onBack={() => setSelectedSupplierId(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary w-full sm:w-auto"
        >
          Add Supplier
        </button>
        <div className="w-full sm:w-[340px]">
          <label>Search by phone number</label>
          <input
            type="text"
            value={phoneSearch}
            onChange={(event) => setPhoneSearch(event.target.value)}
            className="input-field"
            placeholder="e.g. 017XXXXXXXX"
          />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add New Supplier</h2>
              <button
                onClick={() => setShowForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Supplier Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Contact Number"
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Bank Details"
                  value={formData.bankDetails}
                  onChange={(e) => setFormData({ ...formData, bankDetails: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Commission Rate (%)"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Opening Due"
                  value={formData.openingDue}
                  onChange={(e) => setFormData({ ...formData, openingDue: e.target.value })}
                  className="input-field"
                />
                {formError && <p className="text-sm font-semibold text-red-600">{formError}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSupplier}
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? 'Saving...' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Suppliers List</h3>
        {suppliers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No suppliers added yet</div>
        ) : (
          <>
            <div className="mb-4 text-sm font-semibold text-slate-600">
              {filteredSuppliers.length} result{filteredSuppliers.length === 1 ? '' : 's'}
            </div>

            {filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No supplier found for this phone number.</div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {filteredSuppliers.map((supplier) => {
                    const categories = [
                      ...new Set(
                        supplierProducts
                          .filter((product) => product.supplierId === supplier.id)
                          .map((product) => product.category),
                      ),
                    ];
                    return (
                      <div key={supplier.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                            <p className="text-sm text-slate-500">{supplier.contact}</p>
                          </div>
                          <button
                            onClick={() => setSelectedSupplierId(supplier.id)}
                            className="btn-secondary !py-1.5 !px-3 text-xs"
                          >
                            Profile
                          </button>
                        </div>
                        <div className="mt-3 space-y-1.5 text-sm">
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">Categories:</span>{' '}
                            {categories.join(', ') || 'N/A'}
                          </p>
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">Amount Due:</span>{' '}
                            <span className="font-bold text-red-600">৳ {supplier.amountDue.toLocaleString()}</span>
                          </p>
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">Commission:</span>{' '}
                            {supplier.commissionRate}% (৳ {supplier.totalCommissionEarned.toLocaleString()})
                          </p>
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">Box Due:</span> {supplier.totalBoxesHolding}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900">Contact</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900">Product Categories</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-900">Amount Due</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900">Commission</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900">Box Due</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.map((supplier) => {
                        const categories = [
                          ...new Set(
                            supplierProducts
                              .filter((product) => product.supplierId === supplier.id)
                              .map((product) => product.category),
                          ),
                        ];

                        return (
                          <tr key={supplier.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2 font-semibold text-gray-900">{supplier.name}</td>
                            <td className="px-4 py-2 text-gray-700">{supplier.contact}</td>
                            <td className="px-4 py-2 text-gray-700">{categories.join(', ') || 'N/A'}</td>
                            <td className="px-4 py-2 text-right font-bold text-red-600">
                              ৳ {supplier.amountDue.toLocaleString()}
                            </td>
                            <td className="px-4 py-2 text-center text-gray-700">
                              {supplier.commissionRate}% (৳ {supplier.totalCommissionEarned.toLocaleString()})
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-gray-900">
                              {supplier.totalBoxesHolding}
                            </td>
                            <td className="px-4 py-2 text-center">
                              <button
                                onClick={() => setSelectedSupplierId(supplier.id)}
                                className="text-blue-600 hover:text-blue-800 font-semibold"
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
          </>
        )}
      </div>
    </div>
  );
};

export default SuppliersList;
