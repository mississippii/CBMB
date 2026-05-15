import { useState } from 'react';
import { useData } from '../context/DataContext';
import CustomerDetail from './CustomerDetail';

const CustomersList = () => {
  const { customers, addCustomer } = useData();
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [phoneSearch, setPhoneSearch] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    owner: '',
    phone: '',
    address: '',
    boxJamanot: '',
  });

  const handleAddCustomer = () => {
    if (formData.name && formData.owner && formData.phone) {
      addCustomer(formData);
      setFormData({
        name: '',
        owner: '',
        phone: '',
        address: '',
        boxJamanot: '',
      });
      setShowForm(false);
    }
  };

  const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');
  const normalizedSearchPhone = normalizePhone(phoneSearch);
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedSearchPhone) return true;
    return normalizePhone(customer.phone).includes(normalizedSearchPhone);
  });

  if (selectedCustomerId) {
    return (
      <CustomerDetail
        customerId={selectedCustomerId}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          Add Customer
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
          <div className="modal-content" style={{ maxWidth: '42rem' }}>
            <div className="modal-header">
              <h2>Add New Customer</h2>
              <button
                onClick={() => setShowForm(false)}
                className="modal-close-btn"
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Store/Business Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Owner Name"
                  value={formData.owner}
                  onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
                <input
                  type="number"
                  placeholder="Box জামানত"
                  value={formData.boxJamanot}
                  onChange={(e) => setFormData({ ...formData, boxJamanot: e.target.value })}
                  className="input-field"
                />
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
                onClick={handleAddCustomer}
                className="btn-primary"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Customers List</h3>
        {customers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">No customers added yet</div>
        ) : (
          <>
            <div className="mb-4 text-sm font-semibold text-slate-600">
              {filteredCustomers.length} result{filteredCustomers.length === 1 ? '' : 's'}
            </div>

            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No customer found for this phone number.</div>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {filteredCustomers.map((customer) => (
                    <div key={customer.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{customer.name}</p>
                          <p className="text-sm text-slate-500">{customer.phone}</p>
                        </div>
                        <button
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className="btn-secondary !py-1.5 !px-3 text-xs"
                        >
                          Profile
                        </button>
                      </div>
                      <div className="mt-3 space-y-1.5 text-sm">
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Box Due:</span> {customer.totalBoxesHolding}
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Box জামানত:</span>{' '}
                          <span className="font-semibold text-[#307D7E]">
                            ৳ {(customer.boxJamanot || 0).toLocaleString()}
                          </span>
                        </p>
                        <p className="text-slate-600">
                          <span className="font-semibold text-slate-800">Payment Due:</span>{' '}
                          <span className="font-bold text-red-600">৳ {customer.amountDue.toLocaleString()}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900">Name</th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-900">Contact</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900">Box Due</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-900">Box জামানত</th>
                        <th className="px-4 py-2 text-right font-semibold text-gray-900">Payment Due</th>
                        <th className="px-4 py-2 text-center font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((customer) => (
                        <tr key={customer.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 font-semibold text-gray-900">{customer.name}</td>
                          <td className="px-4 py-2 text-gray-700">{customer.phone}</td>
                          <td className="px-4 py-2 text-center font-semibold text-gray-900">
                            {customer.totalBoxesHolding}
                          </td>
                          <td className="px-4 py-2 text-right font-semibold text-[#307D7E]">
                            ৳ {(customer.boxJamanot || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-right font-bold text-red-600">
                            ৳ {customer.amountDue.toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => setSelectedCustomerId(customer.id)}
                              className="text-blue-600 hover:text-blue-800 font-semibold"
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
          </>
        )}
      </div>
    </div>
  );
};

export default CustomersList;
