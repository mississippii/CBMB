import { useEffect, useState } from 'react'
import {
  ArrowLeft, Phone, Building2, MapPin, TrendingUp, Percent, DollarSign,
  AlertCircle, Receipt, Wallet, Package, CreditCard, Boxes, Pencil, UserCheck,
  Power, RotateCcw,
} from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useToast } from '../../shared/components/Toast'
import TransactionForm from '../sales/TransactionForm'

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`
const getDateOnly = (value) => new Date(value).toISOString().split('T')[0]

const KPITile = ({ icon: Icon, label, value, tone = 'default' }) => (
  <div className={`kpi-tile kpi-tile-${tone}`}>
    <div className="kpi-tile-icon"><Icon size={18} /></div>
    <div className="kpi-tile-body">
      <p className="kpi-tile-label">{label}</p>
      <strong className="kpi-tile-value">{value}</strong>
    </div>
  </div>
)

const SupplierDetail = ({ supplierId, onBack }) => {
  const { suppliers, supplierProducts, transactions, getSupplierProfile, updateSupplier, setSupplierStatus } = useData()
  const showToast = useToast()
  const [profile, setProfile] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', businessName: '', location: '', commissionRate: 0 })
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [disableError, setDisableError] = useState('')

  useEffect(() => {
    let isActive = true
    setProfile(null)
    if (!supplierId || !getSupplierProfile) return undefined
    getSupplierProfile(supplierId)
      .then((result) => { if (isActive) setProfile(result) })
      .catch(() => { if (isActive) setProfile(null) })
    return () => { isActive = false }
  }, [supplierId, getSupplierProfile])

  const fallbackSupplier = suppliers.find((item) => item.id === supplierId)
  const supplier = profile?.account || fallbackSupplier

  const openEditModal = () => {
    if (!supplier) return
    setEditForm({
      name: supplier.name || '',
      businessName: supplier.businessName || '',
      location: supplier.location || '',
      commissionRate: supplier.commissionRate || 0,
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editForm.name.trim()) {
      setEditError('Supplier name is required.')
      return
    }
    setIsSavingEdit(true)
    setEditError('')
    try {
      const updated = await updateSupplier({ id: supplier.id, ...editForm, name: editForm.name.trim() })
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      setShowEditModal(false)
      showToast('Supplier updated', 'success')
    } catch (error) {
      setEditError(error.message || 'Failed to update supplier.')
    } finally {
      setIsSavingEdit(false)
    }
  }
  const products = supplierProducts.filter((product) => product.supplierId === supplierId)

  if (!supplier) {
    return (
      <div className="empty-state">
        <AlertCircle size={36} className="empty-state-icon" />
        <p className="empty-state-title">Supplier not found</p>
        {onBack && (
          <button onClick={onBack} className="btn-secondary mt-3 flex items-center gap-2 mx-auto">
            <ArrowLeft size={14} /> Back
          </button>
        )}
      </div>
    )
  }

  const today = getDateOnly(new Date())
  const supplierTransactions = profile?.transactions || transactions.filter((t) => (
    t.supplierId === supplier.id || t.supplier === supplier.name || t.supplierPhone === supplier.contact
  ))
  const todaySales = supplierTransactions.filter(
    (t) => t.transactionType === 'Sale' && getDateOnly(t.createdAt || t.date) === today
  )
  const fallbackTodaySalesAmount = todaySales.reduce((s, t) => s + (Number(t.totalAmount) || 0), 0)
  const fallbackTodayCommission = todaySales.reduce((s, t) => {
    const explicit = Number(t.commissionAmount) || 0
    if (explicit > 0) return s + explicit
    return s + ((Number(t.totalAmount) || 0) * (Number(supplier.commissionRate) || 0)) / 100
  }, 0)
  const commissionReceived = supplierTransactions
    .filter((t) => t.transactionType === 'Payment' && String(t.note || t.paymentType || '').toLowerCase().includes('commission'))
    .reduce((s, t) => s + (Number(t.paymentAmount) || 0), 0)
  const fallbackOtherExpense = supplierTransactions
    .filter((t) => t.transactionType === 'Payment' && String(t.note || t.paymentType || '').toLowerCase().includes('expense'))
    .reduce((s, t) => s + (Number(t.paymentAmount) || 0), 0)
  const todaySalesAmount = Number(supplier.todaySale ?? fallbackTodaySalesAmount) || 0
  const todayCommission = Number(supplier.todayCommission ?? fallbackTodayCommission) || 0
  const commissionDue = Number(supplier.commissionDue ?? Math.max((Number(supplier.totalCommissionEarned) || 0) - commissionReceived, 0)) || 0
  const otherExpense = Number(supplier.otherExpense ?? fallbackOtherExpense) || 0
  const initials = supplier.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="supplier-profile-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            {onBack && (
              <button type="button" onClick={onBack} className="back-arrow-btn" title="Back to suppliers">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="supplier-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-950">{supplier.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#1d63ed]">
                  {supplier.commissionRate}% commission
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
                {supplier.businessName && (
                  <span className="inline-flex items-center gap-1.5"><Building2 size={13} /> {supplier.businessName}</span>
                )}
                {supplier.location && (
                  <span className="inline-flex items-center gap-1.5"><MapPin size={13} /> {supplier.location}</span>
                )}
                <span className="inline-flex items-center gap-1.5"><Phone size={13} /> {supplier.contact}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button onClick={openEditModal} className="btn-secondary flex items-center gap-2">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary flex items-center gap-2">
              <CreditCard size={15} /> Record Payment
            </button>
          </div>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KPITile icon={TrendingUp} label="Today Sale" value={formatCurrency(todaySalesAmount)} tone="emerald" />
        <KPITile icon={Percent} label="Today Commission" value={formatCurrency(todayCommission)} tone="teal" />
        <KPITile icon={DollarSign} label="Total Sale" value={formatCurrency(supplier.totalSales)} />
        <KPITile icon={Wallet} label="Commission Due" value={formatCurrency(commissionDue)} tone="amber" />
        <KPITile icon={AlertCircle} label="Supplier Due" value={formatCurrency(supplier.amountDue)} tone="rose" />
        <KPITile icon={Receipt} label="Other Expense" value={formatCurrency(otherExpense)} />
      </div>

      {/* BALANCE + CRATE PANELS */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="supplier-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="flex items-center gap-2"><DollarSign size={18} className="text-blue-600" /> Supplier Balance</h3>
              <p>Sales, commission and dues movement</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transactions</p>
              <p className="text-lg font-extrabold text-slate-900">{supplierTransactions.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="balance-pill balance-pill-emerald">
              <p>Total Sale</p>
              <p>{formatCurrency(supplier.totalSales)}</p>
            </div>
            <div className="balance-pill balance-pill-amber">
              <p>Commission Due</p>
              <p>{formatCurrency(commissionDue)}</p>
            </div>
            <div className="balance-pill balance-pill-rose">
              <p>Supplier Due</p>
              <p>{formatCurrency(supplier.amountDue)}</p>
            </div>
          </div>
        </div>

        <div className="supplier-panel">
          <h3 className="flex items-center gap-2"><Boxes size={18} className="text-blue-600" /> Crate Accountability</h3>
          <div className="mt-4 space-y-2.5">
            <div className="box-row">
              <span>Bangla Crates</span>
              <strong>{supplier.boxesHoldingWooden || 0}</strong>
            </div>
            <div className="box-row">
              <span>China Crates</span>
              <strong>{supplier.boxesHoldingPlastic || 0}</strong>
            </div>
            <div className="box-row total">
              <span>Total Crates Due</span>
              <strong>{supplier.totalBoxesHolding || 0}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PRODUCTS */}
      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2"><Package size={18} className="text-blue-600" /> Products In Stock</h3>
          <span className="text-sm text-slate-500">{products.length} item{products.length === 1 ? '' : 's'}</span>
        </div>

        {products.length === 0 ? (
          <div className="empty-state !py-8">
            <Package size={28} className="empty-state-icon" />
            <p className="empty-state-title">No products yet</p>
            <p className="empty-state-sub">No shipments received from this supplier.</p>
          </div>
        ) : (
          <>
            {/* Mobile */}
            <div className="space-y-2 lg:hidden">
              {products.map((product) => {
                const isStockOut = Number(product.quantity) <= 0
                return (
                  <div key={product.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{product.productName}</p>
                        <p className="text-xs text-slate-500">{product.category}</p>
                      </div>
                      <span className={`badge ${isStockOut ? 'badge-rose' : 'badge-emerald'}`}>
                        {isStockOut ? 'Stock Out' : 'In Stock'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <span className="text-slate-600"><span className="font-bold text-slate-900">{product.quantity}</span> {product.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop */}
            <div className="hidden lg:block overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Category</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Qty</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Unit</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const isStockOut = Number(product.quantity) <= 0
                    return (
                      <tr key={product.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-800 font-medium">{product.productName}</td>
                        <td className="px-4 py-3 text-slate-700">{product.category}</td>
                        <td className="px-4 py-3 text-center text-slate-700 font-semibold">{product.quantity}</td>
                        <td className="px-4 py-3 text-center text-slate-600">{product.unit}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${isStockOut ? 'badge-rose' : 'badge-emerald'}`}>
                            {isStockOut ? 'Stock Out' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Edit Supplier</h2>
                <p className="text-xs text-slate-500 mt-0.5">Phone and opening due cannot be changed</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    <UserCheck size={13} /> Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <Building2 size={13} /> Business Name
                  </label>
                  <input
                    type="text"
                    value={editForm.businessName}
                    onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <MapPin size={13} /> Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <Percent size={13} /> Commission Rate
                  </label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editForm.commissionRate}
                      onChange={(e) => setEditForm((p) => ({ ...p, commissionRate: e.target.value }))}
                      className="input-field"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
              {editError && (
                <div className="status-error mt-4">
                  <span>!</span>
                  <span>{editError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary" disabled={isSavingEdit}>Cancel</button>
              <button onClick={handleEditSave} disabled={isSavingEdit} className="btn-primary flex items-center gap-2">
                {isSavingEdit ? 'Saving…' : (<><Pencil size={14} /> Save Changes</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '48rem' }}>
            <div className="modal-header">
              <div>
                <h2>Record Payment for {supplier.name}</h2>
                <p className="text-xs text-slate-500 mt-0.5">Select supplier operation type below</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body max-h-[70vh] overflow-y-auto">
              <TransactionForm entryMode="payment" onClose={() => setShowPaymentModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierDetail
