import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Phone, Building2, MapPin, TrendingUp, Percent, DollarSign,
  AlertCircle, Receipt, Wallet, Package, CreditCard, Boxes, Pencil, UserCheck,
  Power, RotateCcw, FileText, Tag, Truck, Check,
} from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../../shared/components/Toast'
import { postJson, apiPaths } from '../../services/apiClient'
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
  const { suppliers, supplierProducts, transactions, getSupplierProfile, updateSupplier, setSupplierStatus, getSupplierShipments, setShipmentCommission } = useData()
  const { admin } = useAuth()
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

  // Supplier expense + statement
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [expenseForm, setExpenseForm] = useState({ categoryId: '', amount: '', paidAmount: '', note: '' })
  const [expenseError, setExpenseError] = useState('')
  const [isSavingExpense, setIsSavingExpense] = useState(false)
  const [statement, setStatement] = useState(null)
  const [statementPeriod, setStatementPeriod] = useState('all')
  const [isLoadingStatement, setIsLoadingStatement] = useState(false)

  // Shipment-wise tracking
  const [shipments, setShipments] = useState([])
  const [isLoadingShipments, setIsLoadingShipments] = useState(false)
  const [rateDrafts, setRateDrafts] = useState({})
  const [savingRateId, setSavingRateId] = useState(null)

  const loadShipments = useCallback(async () => {
    if (!supplierId || !getSupplierShipments) return
    setIsLoadingShipments(true)
    try {
      const data = await getSupplierShipments(supplierId)
      setShipments(data)
    } catch {
      setShipments([])
    } finally {
      setIsLoadingShipments(false)
    }
  }, [supplierId, getSupplierShipments])

  useEffect(() => { loadShipments() }, [loadShipments])

  const handleSaveRate = async (shipment) => {
    const draft = rateDrafts[shipment.id]
    const rate = Number(draft)
    if (draft === '' || draft == null || Number.isNaN(rate) || rate < 0 || rate > 100) {
      showToast('Enter a commission rate between 0 and 100.', 'error')
      return
    }
    setSavingRateId(shipment.id)
    try {
      await setShipmentCommission(shipment.id, rate)
      showToast(`Lot #${shipment.id} commission set to ${rate}%`, 'success')
      setRateDrafts((prev) => { const next = { ...prev }; delete next[shipment.id]; return next })
      await loadShipments()
      loadStatement(statementPeriod)
    } catch (error) {
      showToast(error.message || 'Failed to set commission.', 'error')
    } finally {
      setSavingRateId(null)
    }
  }

  const loadStatement = useCallback(async (period) => {
    if (!admin?.wholesalerId || !supplierId) return
    setIsLoadingStatement(true)
    try {
      const data = await postJson(apiPaths.supplierStatement(admin.wholesalerId), {
        accountId: Number(supplierId),
        period,
      })
      setStatement(data)
    } catch {
      setStatement(null)
    } finally {
      setIsLoadingStatement(false)
    }
  }, [admin?.wholesalerId, supplierId])

  useEffect(() => { loadStatement(statementPeriod) }, [loadStatement, statementPeriod])

  const openExpenseModal = async () => {
    setExpenseForm({ categoryId: '', amount: '', paidAmount: '', note: '' })
    setExpenseError('')
    setShowExpenseModal(true)
    if (categories.length === 0 && admin?.wholesalerId) {
      try {
        const cats = await postJson(apiPaths.expenseCategories(admin.wholesalerId))
        setCategories(cats || [])
      } catch { /* keep empty — user can still type a name */ }
    }
  }

  const handleExpenseSave = async () => {
    const amount = Number(expenseForm.amount)
    if (!amount || amount <= 0) { setExpenseError('Enter a valid expense amount.'); return }
    const paid = Number(expenseForm.paidAmount) || 0
    if (paid > amount) { setExpenseError('Supplier-funded amount cannot exceed the total.'); return }
    if (!expenseForm.categoryId) { setExpenseError('Select an expense category.'); return }
    setIsSavingExpense(true)
    setExpenseError('')
    try {
      await postJson(apiPaths.expenseCreate(admin.wholesalerId), {
        wholesalerSupplierId: Number(supplierId),
        categoryId: Number(expenseForm.categoryId),
        amount,
        paidAmount: paid,
        note: expenseForm.note?.trim() || null,
      })
      setShowExpenseModal(false)
      showToast('Expense recorded', 'success')
      loadStatement(statementPeriod)
    } catch (error) {
      setExpenseError(error.message || 'Failed to record expense.')
    } finally {
      setIsSavingExpense(false)
    }
  }

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

  const handleConfirmDisable = async () => {
    setIsTogglingStatus(true)
    setDisableError('')
    try {
      const updated = await setSupplierStatus(supplier.id, false)
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      setShowDisableConfirm(false)
      showToast(`${supplier.name} disabled`, 'success')
    } catch (error) {
      setDisableError(error.message || 'Failed to disable supplier.')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const handleReactivate = async () => {
    setIsTogglingStatus(true)
    try {
      const updated = await setSupplierStatus(supplier.id, true)
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      showToast(`${supplier.name} reactivated`, 'success')
    } catch (error) {
      showToast(error.message || 'Failed to reactivate supplier.', 'error')
    } finally {
      setIsTogglingStatus(false)
    }
  }
  const products = supplierProducts.filter((product) => product.supplierId === supplierId)
  const pendingRateCount = shipments.filter((s) => s.commissionRate == null).length

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
                {pendingRateCount > 0 ? (
                  <span className="badge badge-amber">{pendingRateCount} lot{pendingRateCount === 1 ? '' : 's'} need commission</span>
                ) : shipments.length > 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#1d63ed]">
                    Per-shipment commission
                  </span>
                ) : null}
                {supplier.status === 'DISABLED' && (
                  <span className="badge badge-rose">Disabled</span>
                )}
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
            {supplier.status === 'DISABLED' ? (
              <button onClick={handleReactivate} disabled={isTogglingStatus} className="btn-primary flex items-center gap-2">
                <RotateCcw size={14} /> {isTogglingStatus ? 'Reactivating…' : 'Reactivate'}
              </button>
            ) : (
              <>
                <button onClick={() => { setDisableError(''); setShowDisableConfirm(true); }} className="btn-secondary flex items-center gap-2" title="Disable supplier">
                  <Power size={14} /> Disable
                </button>
                <button onClick={openEditModal} className="btn-secondary flex items-center gap-2">
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={openExpenseModal} className="btn-secondary flex items-center gap-2">
                  <Receipt size={14} /> Expense
                </button>
                <button onClick={() => setShowPaymentModal(true)} className="btn-primary flex items-center gap-2">
                  <CreditCard size={15} /> Record Payment
                </button>
              </>
            )}
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

      {/* SHIPMENTS (per-lot consignment accounting) */}
      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Truck size={18} className="text-blue-600" /> Shipments</h3>
            <p>Each lot is tracked and settled separately. Commission is per shipment.</p>
          </div>
          <span className="text-sm text-slate-500">{shipments.length} lot{shipments.length === 1 ? '' : 's'}</span>
        </div>

        {isLoadingShipments ? (
          <p className="text-sm text-slate-500">Loading shipments…</p>
        ) : shipments.length === 0 ? (
          <div className="empty-state !py-8">
            <Truck size={28} className="empty-state-icon" />
            <p className="empty-state-title">No shipments yet</p>
            <p className="empty-state-sub">Receive a shipment from this supplier to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shipments.map((s) => {
              const ratePending = s.commissionRate == null
              const draft = rateDrafts[s.id] ?? (ratePending ? '' : String(s.commissionRate))
              return (
                <div key={s.id} className="shipment-lot-card">
                  <div className="shipment-lot-head">
                    <div className="flex items-center gap-2">
                      <span className="shipment-lot-tag">Lot #{s.id}</span>
                      <span className="text-sm text-slate-500">{s.date}</span>
                    </div>
                    <span className={`badge ${s.settlementStatus === 'SETTLED' ? 'badge-emerald' : 'badge-amber'}`}>
                      {s.settlementStatus === 'SETTLED' ? 'Settled' : 'Open'}
                    </span>
                  </div>

                  <div className="shipment-lot-grid">
                    <div><span>Est. Value</span><strong>{formatCurrency(s.estimatedValue)}</strong></div>
                    <div><span>Advance Paid</span><strong>{formatCurrency(s.advancePaid)}</strong></div>
                    <div><span>Total Sold</span><strong>{formatCurrency(s.totalSold)}</strong></div>
                    <div><span>Commission</span><strong>{ratePending ? '—' : formatCurrency(s.commissionAmount)}</strong></div>
                    <div className="shipment-lot-net"><span>Net Payable</span><strong>{formatCurrency(s.netPayable)}</strong></div>
                  </div>

                  <div className="shipment-lot-rate">
                    <label><Percent size={13} /> Commission rate{ratePending && <span className="badge badge-amber ml-1">to negotiate</span>}</label>
                    <div className="flex items-center gap-2">
                      <div className="input-with-suffix" style={{ maxWidth: '8rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={draft}
                          onChange={(e) => setRateDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                          className="input-field"
                          placeholder="0"
                        />
                        <span className="input-suffix">%</span>
                      </div>
                      <button
                        onClick={() => handleSaveRate(s)}
                        disabled={savingRateId === s.id}
                        className="btn-primary flex items-center gap-1.5"
                      >
                        <Check size={14} /> {savingRateId === s.id ? 'Saving…' : (ratePending ? 'Set Rate' : 'Update')}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* SUPPLIER STATEMENT */}
      <div className="supplier-panel">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2"><FileText size={18} className="text-blue-600" /> Supplier Statement</h3>
            <p>Net payable after commission, product payments and expense dues</p>
          </div>
          <div className="period-toggle">
            <button className={statementPeriod === 'today' ? 'active' : ''} onClick={() => setStatementPeriod('today')}>Today</button>
            <button className={statementPeriod === 'all' ? 'active' : ''} onClick={() => setStatementPeriod('all')}>All Time</button>
          </div>
        </div>

        {isLoadingStatement ? (
          <p className="mt-4 text-sm text-slate-500">Loading statement…</p>
        ) : statement ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="balance-pill balance-pill-emerald">
                <p>Total Sale</p>
                <p>{formatCurrency(statement.totalSale)}</p>
              </div>
              <div className="balance-pill balance-pill-amber">
                <p>− Commission</p>
                <p>{formatCurrency(statement.commission)}</p>
              </div>
              <div className="balance-pill">
                <p>− Product Paid</p>
                <p>{formatCurrency(statement.productPaid)}</p>
              </div>
            </div>
            <div className="statement-net">
              <span>Net Payable to Supplier</span>
              <strong>{formatCurrency(statement.netPayable)}</strong>
            </div>

            {/* Other expense — a SEPARATE receivable from the supplier, not netted above */}
            <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
              <div className="mb-2 flex items-center gap-2">
                <Receipt size={15} className="text-slate-500" />
                <h4 className="text-sm font-bold text-slate-700">Other Expense (supplier owes separately)</h4>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="balance-pill">
                  <p>Expense Fronted</p>
                  <p>{formatCurrency(statement.expenseTotal)}</p>
                </div>
                <div className="balance-pill balance-pill-emerald">
                  <p>Received Back</p>
                  <p>{formatCurrency(statement.expenseReceived)}</p>
                </div>
                <div className="balance-pill balance-pill-rose">
                  <p>Outstanding Due</p>
                  <p>{formatCurrency(statement.expenseDue)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Not deducted from the net payable. Reduces only when the supplier pays it back (Record Payment → Expense received).
              </p>
            </div>
          </>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No statement data available.</p>
        )}
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

      {/* DISABLE CONFIRMATION */}
      {showDisableConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-rose-100 text-rose-700">
                  <Power size={18} />
                </div>
                <div>
                  <h2>Disable {supplier.name}?</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Hidden from active lists. History stays intact.</p>
                </div>
              </div>
              <button onClick={() => setShowDisableConfirm(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-slate-600">
                The supplier will no longer appear in dropdowns or active lists, but all transactions, ledger entries,
                and crate movements remain in the system. You can reactivate them later.
              </p>
              {disableError && (
                <div className="status-error mt-4">
                  <span>!</span><span>{disableError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDisableConfirm(false)} className="btn-secondary" disabled={isTogglingStatus}>Cancel</button>
              <button onClick={handleConfirmDisable} className="btn-danger flex items-center gap-2" disabled={isTogglingStatus}>
                {isTogglingStatus ? 'Disabling…' : (<><Power size={14} /> Confirm Disable</>)}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '34rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700">
                  <Receipt size={18} />
                </div>
                <div>
                  <h2>Record Expense for {supplier.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Shipment costs the supplier will adjust at settlement</p>
                </div>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label"><Tag size={13} /> Category <span className="text-red-500">*</span></label>
                  <select
                    value={expenseForm.categoryId}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, categoryId: e.target.value }))}
                    className="input-field"
                    autoFocus
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label"><DollarSign size={13} /> Total Amount <span className="text-red-500">*</span></label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))}
                      className="input-field"
                      placeholder="0"
                    />
                    <span className="input-suffix">৳</span>
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label"><Wallet size={13} /> Supplier Funded</label>
                  <div className="input-with-suffix">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={expenseForm.paidAmount}
                      onChange={(e) => setExpenseForm((p) => ({ ...p, paidAmount: e.target.value }))}
                      className="input-field"
                      placeholder="0"
                    />
                    <span className="input-suffix">৳</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Remaining becomes a supplier due of{' '}
                    {formatCurrency(Math.max((Number(expenseForm.amount) || 0) - (Number(expenseForm.paidAmount) || 0), 0))}
                  </p>
                </div>
                <div className="form-field">
                  <label className="form-label"><FileText size={13} /> Note</label>
                  <input
                    type="text"
                    value={expenseForm.note}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, note: e.target.value }))}
                    className="input-field"
                    placeholder="Optional detail"
                  />
                </div>
              </div>
              {expenseError && (
                <div className="status-error mt-4">
                  <span>!</span><span>{expenseError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowExpenseModal(false)} className="btn-secondary" disabled={isSavingExpense}>Cancel</button>
              <button onClick={handleExpenseSave} disabled={isSavingExpense} className="btn-primary flex items-center gap-2">
                {isSavingExpense ? 'Saving…' : (<><Receipt size={14} /> Record Expense</>)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplierDetail
