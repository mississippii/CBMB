import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { apiPaths, postJson } from '../services/apiClient';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  businessName: '',
  phone: '',
  address: '',
};

const AdminDashboard = () => {
  const { admin } = useAuth();
  const [wholesalers, setWholesalers] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 1500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let isMounted = true;

    postJson(apiPaths.adminWholesalersList)
      .then((data) => {
        if (isMounted) setWholesalers(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || 'Unable to load wholesalers.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSaving(true);

    try {
      const payload = await postJson(apiPaths.adminWholesalersCreate, formData);

      setWholesalers((prev) => [payload, ...prev]);
      setFormData(emptyForm);
      setShowForm(false);
      setNotice('success');
    } catch (err) {
      setError(err.message || 'Unable to create wholesaler.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar subtitle="Admin Console" />

      <main className="container-main">
        <section className="admin-shell">
          <div className="admin-hero">
            <div>
              <span className="box-eyebrow">Admin</span>
              <h2>{admin?.fullName || 'Admin'}</h2>
              <p>{admin?.email}</p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setError('');
                setNotice('');
                setShowForm(true);
              }}
            >
              Add Wholesaler
            </button>
          </div>

          {notice && (
            <div className="success-splash" role="status" aria-label="Saved">
              <span>✓</span>
            </div>
          )}

          {error && (
            <div className="status-error">
              <span>!</span>
              <span>{error}</span>
            </div>
          )}

          <div className="admin-grid">
            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>Admin Info</h3>
                  <p>Current logged-in administrator.</p>
                </div>
              </div>

              <div className="admin-info-list">
                <div>
                  <span>Name</span>
                  <strong>{admin?.fullName || '-'}</strong>
                </div>
                <div>
                  <span>Email</span>
                  <strong>{admin?.email || '-'}</strong>
                </div>
                <div>
                  <span>Role</span>
                  <strong>{admin?.role || '-'}</strong>
                </div>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-header">
                <div>
                  <h3>Wholesalers</h3>
                  <p>Businesses created under this admin.</p>
                </div>
                <span>{wholesalers.length}</span>
              </div>

              {isLoading ? (
                <div className="empty-state">
                  Loading wholesalers...
                </div>
              ) : wholesalers.length === 0 ? (
                <div className="empty-state">
                  No wholesaler is created yet.
                </div>
              ) : (
                <div className="holder-list">
                  {wholesalers.map((wholesaler) => (
                    <div key={wholesaler.id} className="holder-row">
                      <div>
                        <h4>{wholesaler.businessName}</h4>
                        <p>{wholesaler.name} • {wholesaler.email} • {wholesaler.phone}</p>
                      </div>
                      <span className={`presence-dot ${wholesaler.status === 'ACTIVE' ? 'active' : 'disabled'}`}>
                        <i />
                        {wholesaler.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '46rem' }}>
            <div className="modal-header">
              <h2>Add Wholesaler</h2>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="modal-close-btn"
              >
                x
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label>User Name</label>
                    <input
                      className="input-field"
                      value={formData.name}
                      onChange={(event) => handleChange('name', event.target.value)}
                      placeholder="Wholesaler user name"
                    />
                  </div>
                  <div>
                    <label>Email</label>
                    <input
                      className="input-field"
                      type="email"
                      value={formData.email}
                      onChange={(event) => handleChange('email', event.target.value)}
                      placeholder="owner@example.com"
                    />
                  </div>
                  <div>
                    <label>Password</label>
                    <input
                      className="input-field"
                      type="password"
                      value={formData.password}
                      onChange={(event) => handleChange('password', event.target.value)}
                      placeholder="Set login password"
                    />
                  </div>
                  <div>
                    <label>Business Name</label>
                    <input
                      className="input-field"
                      value={formData.businessName}
                      onChange={(event) => handleChange('businessName', event.target.value)}
                      placeholder="Business name"
                    />
                  </div>
                  <div>
                    <label>Phone</label>
                    <input
                      className="input-field"
                      value={formData.phone}
                      onChange={(event) => handleChange('phone', event.target.value)}
                      placeholder="017XXXXXXXX"
                    />
                  </div>
                  <div>
                    <label>Address</label>
                    <input
                      className="input-field"
                      value={formData.address}
                      onChange={(event) => handleChange('address', event.target.value)}
                      placeholder="Business address"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
