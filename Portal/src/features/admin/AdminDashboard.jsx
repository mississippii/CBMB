import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, ShieldCheck, ShieldOff, Calendar, Plus, Search, KeyRound,
  Building2, User, Mail, Phone, MapPin, Lock, Database,
  ChevronLeft, ChevronRight, MoreVertical, X, LifeBuoy,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLang } from '../../shared/contexts/LanguageContext';
import { useToast } from '../../shared/components/Toast';
import Navbar from '../../shared/components/Navbar';
import { apiPaths, postJson } from '../../services/apiClient';

const emptyForm = {
  name: '', email: '', password: '', businessName: '', phone: '', address: '',
};

const Field = ({ icon: Icon, label, required, children, hint }) => (
  <div className="form-field">
    <label className="form-label">
      <Icon size={13} /> {label}
      {required && <span className="text-red-500">*</span>}
      {hint && <span className="form-label-hint">{hint}</span>}
    </label>
    {children}
  </div>
);

const AdminDashboard = () => {
  const { admin } = useAuth();
  const { t, formatNumber, formatDate } = useLang();
  const showToast = useToast();

  // Pagination state
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Search
  const [phoneSearch, setPhoneSearch] = useState('');
  const searchTimer = useRef(null);

  // Add wholesaler modal
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Reset password modal
  const [resetTarget, setResetTarget] = useState(null);
  const [resetPwd, setResetPwd] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  // Row menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('list');

  // Admin Support — quick reset lookup
  const [supportPhone, setSupportPhone] = useState('');
  const [supportFound, setSupportFound] = useState(null);
  const [supportSearched, setSupportSearched] = useState(false);
  const [supportLoading, setSupportLoading] = useState(false);

  // Product create
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '', unitType: 'COUNT', defaultUnit: 'PCS', categories: [{ name: '', grade: '' }],
  });
  const [productError, setProductError] = useState('');
  const [productSaving, setProductSaving] = useState(false);

  const UNIT_BY_TYPE = {
    COUNT: ['PCS', 'DOZEN', 'BOX', 'BAG'],
    WEIGHT: ['KG', 'MOUND'],
  };

  const openProductModal = () => {
    setProductForm({ name: '', unitType: 'COUNT', defaultUnit: 'PCS', categories: [{ name: '', grade: '' }] });
    setProductError('');
    setShowProductModal(true);
  };
  const closeProductModal = () => { setShowProductModal(false); setProductError(''); };

  const handleUnitTypeChange = (unitType) => {
    setProductForm((p) => ({ ...p, unitType, defaultUnit: UNIT_BY_TYPE[unitType][0] }));
  };

  const updateCategory = (idx, field, value) => {
    setProductForm((p) => ({
      ...p,
      categories: p.categories.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    }));
  };

  const addCategoryRow = () => setProductForm((p) => ({ ...p, categories: [...p.categories, { name: '', grade: '' }] }));
  const removeCategoryRow = (idx) => setProductForm((p) => ({ ...p, categories: p.categories.filter((_, i) => i !== idx) }));

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) { setProductError('Product name is required.'); return; }
    setProductSaving(true); setProductError('');
    try {
      const cleanCats = productForm.categories
        .map((c) => ({ name: c.name.trim(), grade: (c.grade || '').trim() }))
        .filter((c) => c.name);
      const payload = { ...productForm, name: productForm.name.trim(), categories: cleanCats };
      const created = await postJson(apiPaths.adminProductsCreate, payload);
      showToast(t('product.created').replace('{name}', created.name), 'success');
      closeProductModal();
    } catch (err) {
      setProductError(err.message || 'Failed to create product.');
    } finally {
      setProductSaving(false);
    }
  };

  const fetchPage = useCallback(async (p = page, s = pageSize, q = phoneSearch) => {
    setIsLoading(true);
    try {
      const data = await postJson(apiPaths.adminWholesalersSearch, { page: p, size: s, phone: q });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setPage(data.page || 0);
      setPageSize(data.size || s);
    } catch {
      setItems([]); setTotal(0); setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, phoneSearch]);

  // Initial load
  useEffect(() => { fetchPage(0, pageSize, ''); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Debounced phone search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchPage(0, pageSize, phoneSearch), 350);
    return () => searchTimer.current && clearTimeout(searchTimer.current);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phoneSearch]);

  // KPI computed from all items? We only have current page — show running total instead
  const stats = useMemo(() => {
    const active = items.filter((w) => w.status === 'ACTIVE').length;
    const disabled = items.length - active;
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const thisMonth = items.filter((w) => w.createdAt && new Date(w.createdAt) >= monthStart).length;
    return { active, disabled, thisMonth };
  }, [items]);

  // Add wholesaler
  const handleChange = (f, v) => setFormData((p) => ({ ...p, [f]: v }));
  const closeForm = () => { setShowForm(false); setFormError(''); setFormData(emptyForm); };
  const openForm = () => { setShowForm(true); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(''); setIsSaving(true);
    try {
      await postJson(apiPaths.adminWholesalersCreate, formData);
      showToast(t('form.create.success'), 'success');
      closeForm();
      await fetchPage(0, pageSize, phoneSearch);
    } catch (err) {
      setFormError(err.message || 'Unable to create wholesaler.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset password
  const openReset = (w) => { setResetTarget(w); setResetPwd(''); setResetError(''); setOpenMenuId(null); };
  const closeReset = () => { setResetTarget(null); setResetPwd(''); setResetError(''); };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (resetPwd.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    setIsResetting(true); setResetError('');
    try {
      await postJson(apiPaths.adminWholesalerResetPassword(resetTarget.id), { newPassword: resetPwd });
      showToast(t('admin.resetPwd.success').replace('{name}', resetTarget.businessName), 'success');
      closeReset();
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  const adminName = admin?.fullName || 'Admin';
  const initials = adminName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const showingFrom = total === 0 ? 0 : page * pageSize + 1;
  const showingTo = Math.min(total, (page + 1) * pageSize);

  const handleSupportFind = async (e) => {
    e?.preventDefault?.();
    if (!supportPhone.trim()) return;
    setSupportLoading(true); setSupportSearched(false);
    try {
      const data = await postJson(apiPaths.adminWholesalersSearch, { page: 0, size: 5, phone: supportPhone });
      const exact = (data.items || []).find((w) => (w.phone || '').replace(/\D/g, '') === supportPhone.replace(/\D/g, ''))
        || (data.items || [])[0]
        || null;
      setSupportFound(exact);
    } catch {
      setSupportFound(null);
    } finally {
      setSupportLoading(false);
      setSupportSearched(true);
    }
  };

  return (
    <div className="min-h-screen admin-page-bg">
      <Navbar subtitle={t('admin.console')} />

      <main className="container-main space-y-4">
        {/* Compact header bar */}
        <header className="admin-header-bar">
          <div className="flex items-center gap-3 min-w-0">
            <div className="admin-avatar">{initials}</div>
            <div className="min-w-0">
              <h2 className="admin-header-title">{adminName}</h2>
              <p className="admin-header-sub">{admin?.email}</p>
            </div>
          </div>
          <button onClick={openForm} className="btn-primary flex items-center gap-2 shrink-0">
            <Plus size={16} /> {t('admin.add')}
          </button>
        </header>

        <div className="admin-layout">
          {/* LEFT: sticky KPI sidebar */}
          <aside className="admin-kpi-sidebar">
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-slate"><Users size={16} /></div>
              <div className="stat-card-body">
                <p className="stat-card-label">{t('admin.kpi.total')}</p>
                <p className="stat-card-value">{formatNumber(total)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-emerald"><ShieldCheck size={16} /></div>
              <div className="stat-card-body">
                <p className="stat-card-label">{t('admin.kpi.active')}</p>
                <p className="stat-card-value">{formatNumber(stats.active)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-rose"><ShieldOff size={16} /></div>
              <div className="stat-card-body">
                <p className="stat-card-label">{t('admin.kpi.disabled')}</p>
                <p className="stat-card-value">{formatNumber(stats.disabled)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-card-icon stat-icon-teal"><Calendar size={16} /></div>
              <div className="stat-card-body">
                <p className="stat-card-label">{t('admin.kpi.thisMonth')}</p>
                <p className="stat-card-value">{formatNumber(stats.thisMonth)}</p>
              </div>
            </div>
          </aside>

          {/* RIGHT: tabs + content */}
          <div className="admin-main space-y-4">
        {/* Tabs */}
        <div className="seg-tabs">
          <button
            onClick={() => setActiveTab('list')}
            className={`seg-tab ${activeTab === 'list' ? 'active' : ''}`}
          >
            <Users size={14} /> {t('support.tab.list')}
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`seg-tab ${activeTab === 'support' ? 'active' : ''}`}
          >
            <LifeBuoy size={14} /> {t('support.tab.support')}
          </button>
        </div>

        {/* Admin Support Tab */}
        {activeTab === 'support' && (
          <div className="space-y-4">
            <div className="support-panel">
              <div className="support-panel-header">
                <div className="support-panel-icon"><KeyRound size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="support-panel-title">{t('support.reset.title')}</h3>
                  <p className="support-panel-sub">{t('support.reset.sub')}</p>
                </div>
                <form onSubmit={handleSupportFind} className="support-inline-search shrink-0">
                  <div className="relative">
                    <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="tel"
                      value={supportPhone}
                      onChange={(e) => { setSupportPhone(e.target.value); setSupportSearched(false); setSupportFound(null); }}
                      placeholder={t('support.reset.findPlaceholder')}
                      className="input-field !pl-8 !py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-primary flex items-center gap-1.5 !py-2 !px-3 text-sm"
                    disabled={supportLoading || !supportPhone.trim()}
                  >
                    <Search size={13} /> {supportLoading ? '…' : t('support.reset.findBtn')}
                  </button>
                </form>
              </div>

              {supportSearched && (
                supportFound ? (
                  <button
                    type="button"
                    onClick={() => openReset(supportFound)}
                    className="support-found-card support-found-card-clickable"
                    title={t('admin.resetPwd')}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="wholesaler-avatar !w-10 !h-10 !text-xs">
                        {(supportFound.businessName || supportFound.name || 'W').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-900 truncate">{supportFound.businessName}</p>
                          <span className={`badge ${supportFound.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                            {supportFound.status === 'ACTIVE' ? t('common.active') : t('common.disabled')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">
                          {supportFound.name} • {supportFound.phone} • {supportFound.email}
                        </p>
                      </div>
                    </div>
                    <span className="support-found-cta">
                      <KeyRound size={14} /> {t('admin.resetPwd')}
                    </span>
                  </button>
                ) : (
                  <div className="support-empty">
                    <X size={18} className="text-rose-500" />
                    <p>{t('support.reset.notFound')}</p>
                  </div>
                )
              )}
            </div>

            <div className="support-panel">
              <div className="support-panel-header">
                <div className="support-panel-icon support-panel-icon-teal"><Database size={20} /></div>
                <div className="min-w-0 flex-1">
                  <h3 className="support-panel-title">{t('product.list.title')}</h3>
                  <p className="support-panel-sub">{t('product.list.sub')}</p>
                </div>
                <button onClick={openProductModal} className="btn-primary flex items-center gap-2 shrink-0">
                  <Plus size={15} /> {t('product.add')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Wholesalers Tab */}
        {activeTab === 'list' && (
        <div className="data-card">
          <div className="data-card-header">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-600" />
              <h3 className="data-card-title">{t('admin.wholesalers')}</h3>
              <span className="badge badge-teal">{formatNumber(total)}</span>
            </div>
            <div className="relative w-full sm:w-[300px]">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="input-field !pl-9 !pr-8 !py-2 text-sm"
                placeholder={t('admin.phoneSearch.placeholder')}
              />
              {phoneSearch && (
                <button
                  onClick={() => setPhoneSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100"
                  aria-label="Clear"
                >
                  <X size={13} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-[28%]">{t('admin.col.business')}</th>
                  <th className="w-[18%]">{t('admin.col.owner')}</th>
                  <th className="w-[14%]">{t('admin.col.phone')}</th>
                  <th className="w-[18%]">{t('admin.col.email')}</th>
                  <th className="w-[8%]">{t('admin.col.status')}</th>
                  <th className="w-[10%]">{t('admin.col.created')}</th>
                  <th className="w-[4%] text-right pr-3">·</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="data-table-row">
                      <td colSpan={7}><div className="skeleton h-4 w-full rounded" /></td>
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10">
                      <Users size={28} className="mx-auto mb-2 text-slate-300" />
                      <p className="font-semibold text-slate-600">
                        {phoneSearch ? t('admin.notFound.title') : t('admin.empty.title')}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {phoneSearch ? t('admin.notFound.sub') : t('admin.empty.sub')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  items.map((w) => {
                    const wInitials = (w.businessName || w.name || 'W')
                      .split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                    const isMenuOpen = openMenuId === w.id;
                    return (
                      <tr key={w.id} className="data-table-row">
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="wholesaler-avatar !w-8 !h-8 !text-[11px]">{wInitials}</div>
                            <span className="font-semibold text-slate-900">{w.businessName}</span>
                          </div>
                        </td>
                        <td className="text-slate-700">{w.name}</td>
                        <td className="text-slate-700 font-mono text-[12px]">{w.phone}</td>
                        <td className="text-slate-600 truncate" title={w.email}>{w.email}</td>
                        <td>
                          <span className={`badge ${w.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                            {w.status === 'ACTIVE' ? t('common.active') : t('common.disabled')}
                          </span>
                        </td>
                        <td className="text-xs text-slate-500 whitespace-nowrap">{formatDate(w.createdAt)}</td>
                        <td className="text-right pr-3 relative">
                          <button
                            onClick={() => setOpenMenuId(isMenuOpen ? null : w.id)}
                            className="row-menu-btn"
                            aria-label="Actions"
                          >
                            <MoreVertical size={15} />
                          </button>
                          {isMenuOpen && (
                            <>
                              <div className="row-menu-backdrop" onClick={() => setOpenMenuId(null)} />
                              <div className="row-menu">
                                <button onClick={() => openReset(w)} className="row-menu-item">
                                  <KeyRound size={13} /> {t('admin.resetPwd')}
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination footer */}
          <div className="data-card-footer">
            <div className="text-xs text-slate-500">
              {t('page.showing')
                .replace('{from}', formatNumber(showingFrom))
                .replace('{to}', formatNumber(showingTo))
                .replace('{total}', formatNumber(total))}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <select
                  value={pageSize}
                  onChange={(e) => { const s = Number(e.target.value); setPageSize(s); fetchPage(0, s, phoneSearch); }}
                  className="data-card-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span>{t('page.perPage')}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fetchPage(Math.max(0, page - 1), pageSize, phoneSearch)}
                  disabled={page === 0 || isLoading}
                  className="page-btn"
                  aria-label={t('page.prev')}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs font-semibold text-slate-700 px-2">
                  {formatNumber(page + 1)} / {formatNumber(Math.max(1, totalPages))}
                </span>
                <button
                  onClick={() => fetchPage(Math.min(totalPages - 1, page + 1), pageSize, phoneSearch)}
                  disabled={page >= totalPages - 1 || isLoading}
                  className="page-btn"
                  aria-label={t('page.next')}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
        )}
          </div>
        </div>
      </main>

      {/* ADD WHOLESALER MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '40rem' }}>
            <div className="modal-header">
              <div>
                <h2>{t('admin.add')}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{t('admin.support.title')}</p>
              </div>
              <button onClick={closeForm} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <Field icon={User} label={t('form.name')} required>
                    <input
                      className="input-field" value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder={t('form.name.placeholder')} autoFocus
                    />
                  </Field>
                  <Field icon={Building2} label={t('form.business')} required>
                    <input
                      className="input-field" value={formData.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      placeholder={t('form.business.placeholder')}
                    />
                  </Field>
                  <Field icon={Mail} label={t('form.email')} required>
                    <input
                      className="input-field" type="email" value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder={t('form.email.placeholder')}
                    />
                  </Field>
                  <Field icon={Phone} label={t('form.phone')} required>
                    <input
                      className="input-field" type="tel" value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder={t('form.phone.placeholder')}
                    />
                  </Field>
                  <Field icon={Lock} label={t('form.password')} required>
                    <input
                      className="input-field" type="password" value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder={t('form.password.placeholder')} minLength={8}
                    />
                  </Field>
                  <Field icon={MapPin} label={t('form.address')}>
                    <input
                      className="input-field" value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder={t('form.address.placeholder')}
                    />
                  </Field>
                </div>
                {formError && (
                  <div className="status-error mt-4">
                    <span>!</span><span>{formError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                  {isSaving ? t('common.saving') : (<><Plus size={15} /> {t('admin.add')}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetTarget && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '28rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-amber-100 text-amber-700">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h2>{t('admin.resetPwd')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{resetTarget.businessName}</p>
                </div>
              </div>
              <button onClick={closeReset} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <Field icon={Lock} label={t('admin.resetPwd.label')} required>
                  <input
                    type="password" className="input-field"
                    value={resetPwd} onChange={(e) => setResetPwd(e.target.value)}
                    placeholder={t('admin.resetPwd.placeholder')} minLength={8} autoFocus
                  />
                </Field>
                {resetError && (
                  <div className="status-error mt-4">
                    <span>!</span><span>{resetError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeReset} className="btn-secondary" disabled={isResetting}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isResetting}>
                  {isResetting ? t('common.saving') : (<><KeyRound size={14} /> {t('admin.resetPwd')}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '40rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700">
                  <Database size={18} />
                </div>
                <div>
                  <h2>{t('product.add.title')}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{t('product.add.sub')}</p>
                </div>
              </div>
              <button onClick={closeProductModal} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div className="space-y-4">
                  {/* Product name */}
                  <Field icon={Database} label={t('product.name')} required>
                    <input
                      className="input-field"
                      value={productForm.name}
                      onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={t('product.name.placeholder')}
                      autoFocus
                    />
                  </Field>

                  {/* Unit type segmented */}
                  <div className="form-field">
                    <label className="form-label">{t('product.unitType')} <span className="text-red-500">*</span></label>
                    <div className="unit-type-grid">
                      <button
                        type="button"
                        onClick={() => handleUnitTypeChange('COUNT')}
                        className={`unit-type-btn ${productForm.unitType === 'COUNT' ? 'active' : ''}`}
                      >
                        <span className="unit-type-icon">#</span>
                        <div className="text-left">
                          <p className="font-bold">{t('product.unitType.count')}</p>
                          <p className="text-xs opacity-75">{t('product.unitType.count.hint')}</p>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnitTypeChange('WEIGHT')}
                        className={`unit-type-btn ${productForm.unitType === 'WEIGHT' ? 'active' : ''}`}
                      >
                        <span className="unit-type-icon">kg</span>
                        <div className="text-left">
                          <p className="font-bold">{t('product.unitType.weight')}</p>
                          <p className="text-xs opacity-75">{t('product.unitType.weight.hint')}</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Default unit */}
                  <div className="form-field">
                    <label className="form-label">{t('product.defaultUnit')} <span className="text-red-500">*</span></label>
                    <div className="unit-pills">
                      {UNIT_BY_TYPE[productForm.unitType].map((u) => (
                        <button
                          type="button"
                          key={u}
                          onClick={() => setProductForm((p) => ({ ...p, defaultUnit: u }))}
                          className={`unit-pill ${productForm.defaultUnit === u ? 'active' : ''}`}
                        >
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Categories */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('product.categories')}
                      <span className="form-label-hint">{t('product.categories.sub')}</span>
                    </label>
                    <div className="space-y-2">
                      {productForm.categories.map((cat, idx) => (
                        <div key={idx} className="category-row">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(idx, 'name', e.target.value)}
                            placeholder={t('product.cat.name.placeholder')}
                            className="input-field flex-1"
                          />
                          <input
                            type="text"
                            value={cat.grade}
                            onChange={(e) => updateCategory(idx, 'grade', e.target.value)}
                            placeholder={t('product.cat.grade.placeholder')}
                            className="input-field flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeCategoryRow(idx)}
                            className="category-remove-btn"
                            disabled={productForm.categories.length === 1}
                            aria-label={t('product.cat.remove')}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addCategoryRow}
                        className="btn-secondary flex items-center gap-1.5 text-xs !py-1.5"
                      >
                        <Plus size={13} /> {t('product.cat.add')}
                      </button>
                    </div>
                  </div>
                </div>

                {productError && (
                  <div className="status-error mt-4">
                    <span>!</span><span>{productError}</span>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeProductModal} className="btn-secondary" disabled={productSaving}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={productSaving}>
                  {productSaving ? t('common.saving') : (<><Plus size={14} /> {t('product.add')}</>)}
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
