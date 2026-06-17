import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Users, Plus, Search, KeyRound,
  Building2, User, Mail, Phone, MapPin, Lock, Database,
  ChevronLeft, ChevronRight, ChevronDown, Pencil, FolderPlus, Tag, MoreVertical, X, LifeBuoy, Boxes,
} from 'lucide-react';
import { useToast } from '../../shared/components/Toast';
import Navbar from '../../shared/components/Navbar';
import { TablePager } from '../../shared/components';
import { apiPaths, postJson } from '../../services/apiClient';
import { formatNumber, formatDate } from '../../shared/utils/format';
import { isValidEmail, isValidPhone, normalizePhone, EMAIL_HINT, PHONE_HINT } from '../../shared/utils/validation';

const emptyForm = {
  name: '', email: '', password: '', businessName: '', phone: '', address: '',
};

// Deterministic colourful avatar gradient per wholesaler — same key always maps
// to the same colour, so the list looks varied but stable across reloads.
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #2563eb, #4f46e5)',
  'linear-gradient(135deg, #16a34a, #059669)',
  'linear-gradient(135deg, #db2777, #be185d)',
  'linear-gradient(135deg, #ea580c, #d97706)',
  'linear-gradient(135deg, #7c3aed, #6d28d9)',
  'linear-gradient(135deg, #0891b2, #0e7490)',
  'linear-gradient(135deg, #dc2626, #b91c1c)',
  'linear-gradient(135deg, #ca8a04, #a16207)',
];
const avatarGradient = (key) => {
  const s = String(key ?? '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
};

// Left-side modules (mirrors the wholesaler workspace nav). Add more here as the admin grows.
const modules = [
  { id: 'list', label: 'Wholesalers', icon: Users, color: '#FF0000' },
  { id: 'support', label: 'Admin Support', icon: LifeBuoy, color: '#008000' },
];

// White icon on dark colours, black on bright ones (e.g. yellow) for readability.
const readableInk = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#ffffff';
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

  // Edit wholesaler modal
  const [editTarget, setEditTarget] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', businessName: '', phone: '', address: '' });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Row menu
  const [openMenuId, setOpenMenuId] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('list');

  // Product catalog
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', categories: [{ name: '' }] });
  const [productError, setProductError] = useState('');
  const [productSaving, setProductSaving] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  // Catalog search + client-side pagination (scales to thousands of products).
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogPage, setCatalogPage] = useState(0);
  // Per-product UI state — expanded ids, in-flight category form state.
  const [expanded, setExpanded] = useState({});
  const [catEditor, setCatEditor] = useState(null); // { mode:'add'|'rename', productId, parentId?, categoryId?, value }
  const [catSaving, setCatSaving] = useState(false);

  // Crates Service — global crate-type catalog
  const [crateTypes, setCrateTypes] = useState([]);
  const [crateTypesLoading, setCrateTypesLoading] = useState(false);
  const [showCrateTypeModal, setShowCrateTypeModal] = useState(false);
  const [crateTypeForm, setCrateTypeForm] = useState({ name: '' });
  const [crateTypeError, setCrateTypeError] = useState('');
  const [crateTypeSaving, setCrateTypeSaving] = useState(false);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const list = await postJson(apiPaths.adminProductsList);
      setCatalog(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast(err.message || 'Failed to load catalog.', 'error');
    } finally {
      setCatalogLoading(false);
    }
  };

  const loadCrateTypes = async () => {
    setCrateTypesLoading(true);
    try {
      const list = await postJson(apiPaths.adminCrateTypesList);
      setCrateTypes(Array.isArray(list) ? list : []);
    } catch (err) {
      showToast(err.message || 'Failed to load crate types.', 'error');
    } finally {
      setCrateTypesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'support') { loadCatalog(); loadCrateTypes(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Catalog: filter by product or variety name, then page client-side.
  const CATALOG_PAGE_SIZE = 12;
  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((p) =>
      (p.name || '').toLowerCase().includes(q)
      || (p.categories || []).some((c) => (c.name || '').toLowerCase().includes(q)),
    );
  }, [catalog, catalogSearch]);
  const totalCatalogPages = Math.max(1, Math.ceil(filteredCatalog.length / CATALOG_PAGE_SIZE));
  const safeCatalogPage = Math.min(catalogPage, totalCatalogPages - 1);
  const pagedCatalog = useMemo(
    () => filteredCatalog.slice(safeCatalogPage * CATALOG_PAGE_SIZE, safeCatalogPage * CATALOG_PAGE_SIZE + CATALOG_PAGE_SIZE),
    [filteredCatalog, safeCatalogPage],
  );


  const openProductModal = () => {
    setProductForm({ name: '', categories: [{ name: '' }] });
    setProductError('');
    setShowProductModal(true);
  };
  const closeProductModal = () => { setShowProductModal(false); setProductError(''); };

  const updateCategory = (idx, value) => {
    setProductForm((p) => ({
      ...p,
      categories: p.categories.map((c, i) => (i === idx ? { ...c, name: value } : c)),
    }));
  };
  const addCategoryRow = () => setProductForm((p) => ({ ...p, categories: [...p.categories, { name: '' }] }));
  const removeCategoryRow = (idx) => setProductForm((p) => ({ ...p, categories: p.categories.filter((_, i) => i !== idx) }));

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!productForm.name.trim()) { setProductError('Product name is required.'); return; }
    setProductSaving(true); setProductError('');
    try {
      const cleanCats = productForm.categories
        .map((c) => ({ name: (c.name || '').trim() }))
        .filter((c) => c.name);
      const payload = { name: productForm.name.trim(), categories: cleanCats };
      const created = await postJson(apiPaths.adminProductsCreate, payload);
      showToast(`Product "${created.name}" created`, 'success');
      closeProductModal();
      loadCatalog();
    } catch (err) {
      setProductError(err.message || 'Failed to create product.');
    } finally {
      setProductSaving(false);
    }
  };

  const handleCategorySave = async () => {
    if (!catEditor) return;
    const name = String(catEditor.value || '').trim();
    if (!name) { showToast('Variety name is required.', 'error'); return; }
    setCatSaving(true);
    try {
      if (catEditor.mode === 'add') {
        await postJson(apiPaths.adminCategoriesCreate, {
          productId: catEditor.productId,
          name,
          usesLots: !!catEditor.usesLots,
        });
        showToast('Variety added', 'success');
      } else {
        await postJson(apiPaths.adminCategoriesUpdate, {
          categoryId: catEditor.categoryId,
          name,
          usesLots: catEditor.usesLots,
        });
        showToast('Variety updated', 'success');
      }
      setCatEditor(null);
      loadCatalog();
    } catch (err) {
      showToast(err.message || 'Failed.', 'error');
    } finally {
      setCatSaving(false);
    }
  };

  const handleCreateCrateType = async (e) => {
    e.preventDefault();
    if (!crateTypeForm.name.trim()) { setCrateTypeError('Crate type name is required.'); return; }
    setCrateTypeSaving(true); setCrateTypeError('');
    try {
      const created = await postJson(apiPaths.adminCrateTypesCreate, { name: crateTypeForm.name.trim() });
      showToast(`Crate type "${created.name}" added`, 'success');
      setShowCrateTypeModal(false);
      loadCrateTypes();
    } catch (err) {
      setCrateTypeError(err.message || 'Failed to add crate type.');
    } finally {
      setCrateTypeSaving(false);
    }
  };

  const toggleCrateTypeStatus = async (ct) => {
    try {
      await postJson(apiPaths.adminCrateTypesUpdate, {
        id: ct.id,
        status: ct.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
      });
      loadCrateTypes();
    } catch (err) {
      showToast(err.message || 'Failed to update crate type.', 'error');
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

  // Add wholesaler
  const handleChange = (f, v) => setFormData((p) => ({ ...p, [f]: v }));
  const closeForm = () => { setShowForm(false); setFormError(''); setFormData(emptyForm); };
  const openForm = () => { setShowForm(true); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.businessName.trim()) {
      setFormError('Owner name and business name are required.');
      return;
    }
    if (!isValidEmail(formData.email)) {
      setFormError(EMAIL_HINT);
      return;
    }
    if (!isValidPhone(formData.phone)) {
      setFormError(PHONE_HINT);
      return;
    }
    if ((formData.password || '').length < 8) {
      setFormError('Password must be at least 8 characters.');
      return;
    }
    setFormError(''); setIsSaving(true);
    try {
      await postJson(apiPaths.adminWholesalersCreate, { ...formData, phone: normalizePhone(formData.phone) });
      showToast('Wholesaler created successfully', 'success');
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
      showToast('Password updated for {name}'.replace('{name}', resetTarget.businessName), 'success');
      closeReset();
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setIsResetting(false);
    }
  };

  // Edit wholesaler info (name, business name, phone, address)
  const openEdit = (w) => {
    setEditTarget(w);
    setEditForm({ name: w.name || '', businessName: w.businessName || '', phone: w.phone || '', address: w.address || '' });
    setEditError('');
    setOpenMenuId(null);
  };
  const closeEdit = () => { setEditTarget(null); setEditError(''); };
  const handleEditField = (f, v) => setEditForm((p) => ({ ...p, [f]: v }));

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.businessName.trim() || !editForm.phone.trim()) {
      setEditError('Name, business name and phone are required.');
      return;
    }
    if (!isValidPhone(editForm.phone)) {
      setEditError(PHONE_HINT);
      return;
    }
    setIsEditSaving(true); setEditError('');
    try {
      await postJson(apiPaths.adminWholesalerUpdate(editTarget.id), { ...editForm, phone: normalizePhone(editForm.phone) });
      showToast('Updated {name}'.replace('{name}', editForm.businessName), 'success');
      closeEdit();
      fetchPage(page, pageSize, phoneSearch);
    } catch (err) {
      setEditError(err.message || 'Failed to update wholesaler.');
    } finally {
      setIsEditSaving(false);
    }
  };


  const showingFrom = total === 0 ? 0 : page * pageSize + 1;
  const showingTo = Math.min(total, (page + 1) * pageSize);


  return (
    <div className="min-h-screen admin-page-bg">
      <Navbar subtitle={'Admin Console'} />

      <main className="container-main space-y-4">
        <div className="workspace-layout">
          {/* LEFT: module nav (same pattern as the wholesaler workspace) */}
          <aside className="workspace-sidebar">
            <nav className="sidebar-nav">
              {modules.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                >
                  <span
                    className="sidebar-nav-badge"
                    style={{ background: color, boxShadow: `0 4px 10px ${color}59` }}
                  >
                    <Icon size={13} strokeWidth={2.4} color={readableInk(color)} />
                  </span>
                  <span className="sidebar-nav-title">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          {/* RIGHT: active module content */}
          <section className="workspace-content admin-dashboard-content space-y-4">
            {/* Admin Support Tab */}
        {activeTab === 'support' && (
          <div className="profile-workspace admin-two-column">
            <div className="profile-main-stack">
            {/* Product Catalog */}
            <div className="support-panel admin-catalog-summary-panel">
              <div className="support-panel-header admin-catalog-label-row">
                <div className="support-panel-icon support-panel-icon-emerald"><Database size={20} /></div>
                <h3 className="support-panel-title">Product Catalog</h3>
                <div className="admin-catalog-compact-stats">
                  <span><strong>{formatNumber(catalog.length)}</strong> Products</span>
                  <span><strong>{formatNumber(catalog.reduce((sum, p) => sum + (p.categories || []).length, 0))}</strong> Varieties</span>
                  <span><strong>{formatNumber(catalog.reduce((sum, p) => sum + (p.categories || []).filter((c) => c.usesLots).length, 0))}</strong> Lot varieties</span>
                </div>
                <div className="admin-catalog-label-actions">
                  <button
                    type="button"
                    onClick={() => setShowCatalogModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Database size={15} /> View Catalog
                  </button>
                  <button onClick={openProductModal} className="btn-secondary inline-flex items-center gap-2">
                    <Plus size={15} /> Add Product
                  </button>
                </div>
              </div>
            </div>
            </div>

            <aside className="profile-side-stack">
              <div className="supplier-panel">
                <h3>Catalog Actions</h3>
                <div className="mt-3 space-y-2">
                  <button
                    onClick={() => { setCrateTypeForm({ name: '' }); setCrateTypeError(''); setShowCrateTypeModal(true); }}
                    className="btn-primary flex w-full items-center justify-center gap-2"
                  >
                    <Plus size={15} /> Add Crate Type
                  </button>
                </div>
              </div>
              <div className="supplier-panel">
                <h3 className="flex items-center gap-2"><Boxes size={17} className="text-teal-600" /> Crate Types</h3>
                <div className="mt-3 space-y-2">
                  {crateTypesLoading ? (
                    <span className="text-sm text-slate-500">Loading…</span>
                  ) : crateTypes.length === 0 ? (
                    <span className="text-sm text-slate-500">No crate types yet.</span>
                  ) : (
                    crateTypes.map((ct) => (
                      <div key={ct.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5">
                        <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{ct.name}</span>
                        <span className={`badge ${ct.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                          {ct.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCrateTypeStatus(ct)}
                          className="btn-compact"
                          title={ct.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        >
                          {ct.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>


          </div>
        )}

        {/* Wholesalers Tab */}
        {activeTab === 'list' && (
        <div className="profile-workspace admin-two-column">
          <div className="profile-main-stack">
            <div className="data-card admin-table-card">
          <div className="data-card-header admin-data-header">
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Users size={15} />
              </span>
              <h3 className="data-card-title truncate">{'Wholesalers'}</h3>
              <span className="badge badge-teal">{formatNumber(total)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="data-table-wrap admin-table-wrap">
            <table className="data-table admin-wholesaler-table">
              <thead>
                <tr>
                  <th className="w-[28%]">{'Business'}</th>
                  <th className="w-[18%]">{'Owner'}</th>
                  <th className="w-[14%]">{'Phone'}</th>
                  <th className="w-[18%]">{'Email'}</th>
                  <th className="w-[8%]">{'Status'}</th>
                  <th className="w-[10%]">{'Created'}</th>
                  <th className="w-[4%] text-right pr-3" aria-label="Actions" />
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
                        {phoneSearch ? 'No matches found' : 'No wholesalers yet'}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {phoneSearch ? 'Try a different search term.' : 'Create your first wholesaler account to get started.'}
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
                            <div
                              className="wholesaler-avatar !w-8 !h-8 !text-[11px]"
                              style={{ background: avatarGradient(w.id ?? w.businessName ?? w.name) }}
                            >
                              {wInitials}
                            </div>
                            <span className="font-semibold text-slate-900">{w.businessName}</span>
                          </div>
                        </td>
                        <td className="text-slate-700">{w.name}</td>
                        <td className="text-slate-700 font-mono text-[12px]">{w.phone}</td>
                        <td className="text-slate-600 truncate" title={w.email}>{w.email}</td>
                        <td>
                          <span className={`badge ${w.status === 'ACTIVE' ? 'badge-emerald' : 'badge-rose'}`}>
                            {w.status === 'ACTIVE' ? 'Active' : 'Disabled'}
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
                                <button onClick={() => openEdit(w)} className="row-menu-item">
                                  <Pencil size={13} /> {'Edit Info'}
                                </button>
                                <button onClick={() => openReset(w)} className="row-menu-item">
                                  <KeyRound size={13} /> {'Reset Password'}
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

          {/* Pagination — same control as the wholesaler tables */}
          <div className="px-4 pb-3">
            <TablePager
              page={page + 1}
              setPage={(p) => fetchPage(p - 1, pageSize, phoneSearch)}
              totalPages={Math.max(1, totalPages)}
              total={total}
              rangeStart={showingFrom}
              rangeEnd={showingTo}
              pageSize={pageSize}
              setPageSize={(s) => { setPageSize(s); fetchPage(0, s, phoneSearch); }}
              pageSizeOptions={[10, 20, 50, 100]}
            />
          </div>
            </div>
          </div>

          <aside className="profile-side-stack">
          <div className="supplier-panel">
            <h3>Wholesaler Actions</h3>
            <button onClick={openForm} className="btn-primary mt-3 flex w-full items-center justify-center gap-2">
              <Plus size={16} /> {'Add Wholesaler'}
            </button>
          </div>
          <div className="supplier-panel">
            <h3 className="flex items-center gap-2"><Search size={16} className="text-blue-600" /> Search</h3>
            <div className="relative mt-3">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="tel"
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                className="input-field !pl-9 !pr-8 !py-2 text-sm"
                placeholder={'Search by phone number…'}
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
          <div className="supplier-panel">
            <h3>Summary</h3>
            <div className="mt-3 space-y-2">
              <div className="box-row total"><span>Total wholesalers</span><strong>{formatNumber(total)}</strong></div>
            </div>
          </div>
          </aside>
        </div>
        )}
          </section>
        </div>
      </main>

      {/* ADD WHOLESALER MODAL */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '40rem' }}>
            <div className="modal-header">
              <div>
                <h2>{'Add Wholesaler'}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{'Support your wholesalers'}</p>
              </div>
              <button onClick={closeForm} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <Field icon={User} label={'Owner Name'} required>
                    <input
                      className="input-field" value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder={'e.g. Rahim Hossain'} autoFocus
                    />
                  </Field>
                  <Field icon={Building2} label={'Business Name'} required>
                    <input
                      className="input-field" value={formData.businessName}
                      onChange={(e) => handleChange('businessName', e.target.value)}
                      placeholder={'e.g. Rahim Trading'}
                    />
                  </Field>
                  <Field icon={Mail} label={'Email'} required>
                    <input
                      className="input-field" type="email" value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder={'owner@example.com'}
                    />
                  </Field>
                  <Field icon={Phone} label={'Phone'} required>
                    <input
                      className="input-field" type="tel" value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder={'01700000000'}
                    />
                  </Field>
                  <Field icon={Lock} label={'Password'} required>
                    <input
                      className="input-field" type="password" value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder={'Set login password (8+ chars)'} minLength={8}
                    />
                  </Field>
                  <Field icon={MapPin} label={'Address'}>
                    <input
                      className="input-field" value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      placeholder={'Business address (optional)'}
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
                  {'Cancel'}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                  {isSaving ? 'Saving…' : (<><Plus size={15} /> {'Add Wholesaler'}</>)}
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
                  <h2>{'Reset Password'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{resetTarget.businessName}</p>
                </div>
              </div>
              <button onClick={closeReset} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <Field icon={Lock} label={'New Password'} required>
                  <input
                    type="password" className="input-field"
                    value={resetPwd} onChange={(e) => setResetPwd(e.target.value)}
                    placeholder={'Minimum 8 characters'} minLength={8} autoFocus
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
                  {'Cancel'}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isResetting}>
                  {isResetting ? 'Saving…' : (<><KeyRound size={14} /> {'Reset Password'}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT WHOLESALER MODAL */}
      {editTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className="modal-content" style={{ maxWidth: '34rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Pencil size={18} />
                </div>
                <div>
                  <h2>{'Edit Wholesaler'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{editTarget.email}</p>
                </div>
              </div>
              <button onClick={closeEdit} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleEditSave}>
              <div className="modal-body">
                <div className="form-grid">
                  <Field icon={User} label={'Owner Name'} required>
                    <input className="input-field" value={editForm.name}
                      onChange={(e) => handleEditField('name', e.target.value)} autoFocus />
                  </Field>
                  <Field icon={Building2} label={'Business Name'} required>
                    <input className="input-field" value={editForm.businessName}
                      onChange={(e) => handleEditField('businessName', e.target.value)} />
                  </Field>
                  <Field icon={Phone} label={'Phone'} required>
                    <input className="input-field" type="tel" value={editForm.phone}
                      onChange={(e) => handleEditField('phone', e.target.value)} />
                  </Field>
                  <Field icon={MapPin} label={'Address'}>
                    <input className="input-field" value={editForm.address}
                      onChange={(e) => handleEditField('address', e.target.value)} />
                  </Field>
                </div>
                <p className="mt-3 text-xs text-slate-500">Email is the login ID and can&apos;t be changed here.</p>
                {editError && (
                  <div className="status-error mt-3"><span>!</span><span>{editError}</span></div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={closeEdit} className="btn-secondary" disabled={isEditSaving}>
                  {'Cancel'}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={isEditSaving}>
                  {isEditSaving ? 'Saving…' : (<><Pencil size={14} /> {'Save Changes'}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT CATALOG MODAL */}
      {showCatalogModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCatalogModal(false)}>
          <div className="modal-content admin-catalog-modal">
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                  <Database size={18} />
                </div>
                <div>
                  <h2>Product Catalog</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Global product and variety setup</p>
                </div>
              </div>
              <button onClick={() => setShowCatalogModal(false)} className="modal-close-btn">✕</button>
            </div>

            <div className="modal-body">
              <div className="admin-catalog-modal-toolbar">
                <div className="relative min-w-0 flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => { setCatalogSearch(e.target.value); setCatalogPage(0); }}
                    placeholder="Search products or varieties…"
                    className="input-field !pl-8 !py-2 text-sm"
                  />
                </div>
                <button onClick={openProductModal} className="btn-primary inline-flex shrink-0 items-center gap-2">
                  <Plus size={15} /> Add Product
                </button>
              </div>

              {catalogLoading ? (
                <p className="mt-3 text-sm text-slate-500">Loading catalog…</p>
              ) : catalog.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No products yet.</p>
              ) : filteredCatalog.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No products match &ldquo;{catalogSearch.trim()}&rdquo;.</p>
              ) : (
                <>
                  <div className="admin-catalog-table-wrap mt-3">
                    <table className="admin-catalog-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Varieties</th>
                          <th>Lots</th>
                          <th>Preview</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedCatalog.map((product) => {
                          const isOpen = !!expanded[product.id];
                          const varieties = product.categories || [];
                          const lotCount = varieties.filter((v) => v.usesLots).length;
                          const preview = varieties.slice(0, 4);
                          return (
                            <Fragment key={product.id}>
                              <tr className="admin-catalog-row">
                                <td>
                                  <div className="admin-catalog-product-cell">
                                    <button
                                      type="button"
                                      onClick={() => setExpanded((e) => ({ ...e, [product.id]: !e[product.id] }))}
                                      className="admin-catalog-expand-btn"
                                      title={isOpen ? 'Hide varieties' : 'Show varieties'}
                                    >
                                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCatEditor({ mode: 'add', productId: product.id, value: '', usesLots: false })}
                                      className="admin-catalog-product"
                                      title="Add variety and lot setup"
                                    >
                                      <span>{product.name}</span>
                                    </button>
                                  </div>
                                </td>
                                <td>
                                  <span className="badge badge-teal">{varieties.length}</span>
                                </td>
                                <td>
                                  <span className={lotCount > 0 ? 'badge badge-amber' : 'badge'}>{lotCount}</span>
                                </td>
                                <td>
                                  <div className="admin-catalog-preview">
                                    {preview.length === 0 ? (
                                      <span className="text-xs text-slate-400">No varieties</span>
                                    ) : (
                                      preview.map((v) => (
                                        <span key={v.id} className="admin-catalog-chip">
                                          {v.name}
                                          {v.usesLots && <small>Lot</small>}
                                        </span>
                                      ))
                                    )}
                                    {varieties.length > preview.length && (
                                      <span className="admin-catalog-more">+{varieties.length - preview.length}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="text-right">
                                  <button
                                    type="button"
                                    onClick={() => setCatEditor({ mode: 'add', productId: product.id, value: '', usesLots: false })}
                                    className="btn-compact"
                                    title="Add variety"
                                  >
                                    <FolderPlus size={12} /> Add
                                  </button>
                                </td>
                              </tr>
                              {isOpen && (
                                <tr className="admin-catalog-detail-row">
                                  <td colSpan={5}>
                                    {varieties.length === 0 ? (
                                      <div className="admin-catalog-empty-detail">No varieties added for this product.</div>
                                    ) : (
                                      <div className="admin-catalog-detail-list">
                                        {varieties.map((v) => (
                                          <div key={v.id} className="admin-catalog-detail-item">
                                            <Tag size={12} className="text-slate-400" />
                                            <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{v.name}</span>
                                            {v.usesLots && <span className="badge badge-amber">Lot1..200</span>}
                                            <button
                                              type="button"
                                              onClick={() => setCatEditor({ mode: 'rename', productId: product.id, categoryId: v.id, value: v.name, usesLots: v.usesLots })}
                                              className="btn-compact"
                                              title="Rename / toggle lots"
                                            >
                                              <Pencil size={12} /> Edit
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">
                      {filteredCatalog.length} of {catalog.length}
                    </span>
                    {totalCatalogPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setCatalogPage(Math.max(0, safeCatalogPage - 1))}
                          disabled={safeCatalogPage === 0}
                          className="page-btn"
                          aria-label="Previous page"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="px-2 text-xs font-semibold text-slate-700">
                          {formatNumber(safeCatalogPage + 1)} / {formatNumber(totalCatalogPages)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setCatalogPage(Math.min(totalCatalogPages - 1, safeCatalogPage + 1))}
                          disabled={safeCatalogPage >= totalCatalogPages - 1}
                          className="page-btn"
                          aria-label="Next page"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Category add/rename modal */}
      {catEditor && (
        <div className="modal-overlay modal-overlay-front">
                <div className="modal-content" style={{ maxWidth: '24rem' }}>
                  <div className="modal-header">
                    <div className="flex items-center gap-2.5">
                      <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                        {catEditor.mode === 'add' ? <FolderPlus size={18} /> : <Pencil size={18} />}
                      </div>
                      <div>
                        <h2>{catEditor.mode === 'add' ? 'Add category' : 'Rename category'}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {catEditor.mode === 'add' ? 'New variety under this product' : 'Rename or toggle lot usage'}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setCatEditor(null)} className="modal-close-btn">✕</button>
                  </div>
                  <div className="modal-body">
                    <div className="form-field">
                      <label className="form-label"><Tag size={13} /> Variety name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={catEditor.value}
                        onChange={(e) => setCatEditor((c) => ({ ...c, value: e.target.value }))}
                        className="input-field"
                        placeholder="e.g. Amrapali"
                        autoFocus
                      />
                    </div>
                    <label className="mt-3 flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!catEditor.usesLots}
                        onChange={(e) => setCatEditor((c) => ({ ...c, usesLots: e.target.checked }))}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-slate-800">This variety uses Lot1..Lot200</span>
                        <span className="block text-xs text-slate-500">Wholesalers will pick one of the 200 lots when receiving a shipment of this variety.</span>
                      </span>
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button onClick={() => setCatEditor(null)} className="btn-secondary" disabled={catSaving}>Cancel</button>
                    <button onClick={handleCategorySave} className="btn-primary flex items-center gap-2" disabled={catSaving}>
                      {catSaving ? '…' : (catEditor.mode === 'add' ? 'Add' : 'Save')}
                    </button>
                  </div>
                </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL */}
      {showProductModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '40rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  <Database size={18} />
                </div>
                <div>
                  <h2>{'Add New Product'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{'Global catalog — all wholesalers will see this product'}</p>
                </div>
              </div>
              <button onClick={closeProductModal} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreateProduct}>
              <div className="modal-body">
                <div className="space-y-4">
                  {/* Product name */}
                  <Field icon={Database} label={'Product Name'} required>
                    <input
                      className="input-field"
                      value={productForm.name}
                      onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={'e.g. Apple'}
                      autoFocus
                    />
                  </Field>

                  {/* Top-level categories (optional seeds — deeper levels added from the catalog list) */}
                  <div className="form-field">
                    <label className="form-label">
                      Top-level categories
                      <span className="form-label-hint">optional · add sub-categories later from the catalog list</span>
                    </label>
                    <div className="space-y-2">
                      {productForm.categories.map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cat.name}
                            onChange={(e) => updateCategory(idx, e.target.value)}
                            placeholder="e.g. Lakhna"
                            className="input-field flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => removeCategoryRow(idx)}
                            className="icon-btn"
                            disabled={productForm.categories.length === 1}
                            aria-label="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={addCategoryRow} className="btn-compact">
                        <Plus size={12} /> Add another
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
                  {'Cancel'}
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={productSaving}>
                  {productSaving ? 'Saving…' : (<><Plus size={14} /> {'Add Product'}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD CRATE TYPE MODAL */}
      {showCrateTypeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '24rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><Boxes size={18} /></div>
                <div>
                  <h2>Add Crate Type</h2>
                </div>
              </div>
              <button onClick={() => setShowCrateTypeModal(false)} className="modal-close-btn">✕</button>
            </div>
            <form onSubmit={handleCreateCrateType}>
              <div className="modal-body">
                <div className="form-field">
                  <label className="form-label"><Boxes size={13} /> Crate type name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={crateTypeForm.name}
                    onChange={(e) => setCrateTypeForm({ name: e.target.value })}
                    className="input-field"
                    placeholder="e.g. PLASTIC"
                    autoFocus
                  />
                </div>
                {crateTypeError && (
                  <div className="status-error mt-4"><span>!</span><span>{crateTypeError}</span></div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowCrateTypeModal(false)} className="btn-secondary" disabled={crateTypeSaving}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-2" disabled={crateTypeSaving}>
                  {crateTypeSaving ? '…' : (<><Plus size={14} /> Add</>)}
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
