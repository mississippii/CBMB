import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft, Phone, Building2, MapPin, Percent, DollarSign,
  AlertCircle, Receipt, Package, Boxes, Pencil, UserCheck,
  Power, RotateCcw, FileText, Tag, Truck, Check, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../../shared/components/Toast'
import { TablePager, usePagination } from '../../shared/components'
import { postJson, apiPaths } from '../../services/apiClient'

const formatCurrency = (value) => `৳ ${Math.round(Number(value) || 0).toLocaleString()}`

const METHOD_LABELS = { CASH: 'Cash', BANK: 'Bank', BKASH: 'bKash', NAGAD: 'Nagad', OTHER: 'Other' }

// Details column: sold product for sales, the money operation for payments.
const txDetails = (t) => {
  if (t.transactionType === 'Payment') {
    const v = String(t.paymentOperationType || t.note || '').toUpperCase()
    if (v.includes('PRODUCT_PAYMENT')) return 'Product payment'
    if (v.includes('COMMISSION_RECEIVE')) return 'Commission received'
    if (v.includes('EXPENSE_RECEIVE')) return 'Expense received'
    if (v.includes('SUPPLIER_CRATE_GIVE')) return 'Crates given'
    if (v.includes('SUPPLIER_CRATE_RETURN')) return 'Crates returned'
    const n = Number(t.cratesReturned || 0)
    if (n > 0) return `Crates: ${n}`
    return t.note || 'Payment'
  }
  const parts = [t.product, t.category && t.category !== 'No Category' ? t.category : null].filter(Boolean)
  const label = parts.join(' / ') || 'Sale'
  const qty = Number(t.quantity) > 0 ? ` · ${t.quantity} ${String(t.unit || '').toUpperCase()}`.trimEnd() : ''
  return label + qty
}

// Canonical transaction type used by the "Filter by type" dropdown.
const txCategory = (t) => {
  if (t.transactionType !== 'Payment') return 'Sale'
  const v = String(t.paymentOperationType || t.note || '').toUpperCase()
  if (v.includes('PRODUCT_PAYMENT')) return 'Product payment'
  if (v.includes('COMMISSION_RECEIVE')) return 'Commission received'
  if (v.includes('EXPENSE_RECEIVE')) return 'Expense received'
  if (v.includes('SUPPLIER_CRATE_GIVE')) return 'Crates given'
  if (v.includes('SUPPLIER_CRATE_RETURN')) return 'Crates returned'
  return 'Payment'
}

const txMethod = (t) => {
  const m = String(t.paymentMethod || '').toUpperCase()
  if (m && m !== 'NONE') return { label: METHOD_LABELS[m] || 'Other', due: false }
  if (t.transactionType !== 'Payment') return { label: 'Due', due: true }
  return { label: '—', due: false }
}

const txAmount = (t) => (t.transactionType === 'Payment'
  ? formatCurrency(t.paymentAmount || t.totalAmount)
  : formatCurrency(t.totalAmount))

const SupplierDetail = ({ supplierId, onBack }) => {
  const { suppliers, supplierProducts, getSupplierProfile, updateSupplier, setSupplierStatus, getSupplierShipments, setShipmentCommission, settleShipment } = useData()
  const { admin } = useAuth()
  const showToast = useToast()
  const [profile, setProfile] = useState(null)
  const [txFilter, setTxFilter] = useState('all')
  const [showTransactions, setShowTransactions] = useState(true)
  const [showStock, setShowStock] = useState(false)
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
  const [expenseForm, setExpenseForm] = useState({ deliveryId: '', categoryId: '', amount: '', note: '' })
  const [expenseError, setExpenseError] = useState('')
  const [isSavingExpense, setIsSavingExpense] = useState(false)

  // Shipment-wise tracking
  const [shipments, setShipments] = useState([])
  const [isLoadingShipments, setIsLoadingShipments] = useState(false)
  const [showCommissionModal, setShowCommissionModal] = useState(false)
  const [commissionForm, setCommissionForm] = useState({ deliveryId: '', rate: '' })
  const [commissionError, setCommissionError] = useState('')
  const [isSavingCommission, setIsSavingCommission] = useState(false)
  const [settlingId, setSettlingId] = useState(null)
  const [settleTarget, setSettleTarget] = useState(null)  // shipment awaiting confirm

  const handleConfirmSettle = async () => {
    if (!settleTarget) return
    const shipment = settleTarget
    setSettlingId(shipment.id)
    try {
      await settleShipment(shipment.id, true)
      showToast(`Lot #${shipment.id} settled`, 'success')
      setSettleTarget(null)
      await loadShipments()
      // refresh supplier balance (amountDue, etc.)
      if (getSupplierProfile && supplierId) {
        try { const fresh = await getSupplierProfile(supplierId); setProfile(fresh) } catch { /* ignore */ }
      }
    } catch (error) {
      showToast(error.message || 'Failed to settle shipment.', 'error')
    } finally {
      setSettlingId(null)
    }
  }

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
    // getSupplierShipments is recreated on every DataContext render; depending on it
    // would refetch on every unrelated data change. supplierId is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  useEffect(() => { loadShipments() }, [loadShipments])

  const openCommissionModal = (deliveryId = '') => {
    const lot = shipments.find((s) => String(s.id) === String(deliveryId))
    setCommissionForm({
      deliveryId: deliveryId ? String(deliveryId) : '',
      rate: lot && lot.commissionRate != null ? String(lot.commissionRate) : '',
    })
    setCommissionError('')
    setShowCommissionModal(true)
  }

  const handleCommissionSave = async () => {
    if (!commissionForm.deliveryId) { setCommissionError('Select the shipment to set commission for.'); return }
    const rate = Number(commissionForm.rate)
    if (commissionForm.rate === '' || Number.isNaN(rate) || rate < 0 || rate > 100) {
      setCommissionError('Enter a commission rate between 0 and 100.'); return
    }
    setIsSavingCommission(true)
    setCommissionError('')
    try {
      await setShipmentCommission(Number(commissionForm.deliveryId), rate)
      showToast(`Lot #${commissionForm.deliveryId} commission set to ${rate}%`, 'success')
      setShowCommissionModal(false)
      await loadShipments()
    } catch (error) {
      setCommissionError(error.message || 'Failed to set commission.')
    } finally {
      setIsSavingCommission(false)
    }
  }


  const openExpenseModal = async (deliveryId = '') => {
    setExpenseForm({ deliveryId: deliveryId ? String(deliveryId) : '', categoryId: '', amount: '', note: '' })
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
    if (!expenseForm.deliveryId) { setExpenseError('Select the shipment this expense belongs to.'); return }
    if (!amount || amount <= 0) { setExpenseError('Enter a valid expense amount.'); return }
    if (!expenseForm.categoryId) { setExpenseError('Select an expense category.'); return }
    setIsSavingExpense(true)
    setExpenseError('')
    try {
      await postJson(apiPaths.expenseCreate(admin.wholesalerId), {
        wholesalerSupplierId: Number(supplierId),
        deliveryId: Number(expenseForm.deliveryId),
        categoryId: Number(expenseForm.categoryId),
        amount,
        paidAmount: 0, // wholesaler fronts the full amount → full amount is the supplier's due
        note: expenseForm.note?.trim() || null,
      })
      setShowExpenseModal(false)
      showToast('Expense recorded', 'success')
      loadShipments()
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
    // Only refetch when the supplier changes — not on every DataContext re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

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
  const supplierTransactions = profile?.transactions || []
  const txTypes = [...new Set(supplierTransactions.map(txCategory))]
  const filteredTransactions = txFilter === 'all'
    ? supplierTransactions
    : supplierTransactions.filter((t) => txCategory(t) === txFilter)
  const { pageItems: pagedTransactions, ...txnPager } = usePagination(filteredTransactions, 12, [txFilter, supplierId])
  const openShipments = shipments.filter((s) => s.settlementStatus !== 'SETTLED')
  const settledShipments = shipments.filter((s) => s.settlementStatus === 'SETTLED')
  const pendingRateCount = openShipments.filter((s) => s.commissionRate == null).length
  const lotSoldOut = (lotId) => !supplierProducts.some((p) => p.deliveryId === lotId && Number(p.quantity) > 0)

  const renderLotRow = (s) => {
    const ratePending = s.commissionRate == null
    const settled = s.settlementStatus === 'SETTLED'
    const soldOut = lotSoldOut(s.id)
    return (
      <tr key={s.id} className={`hover:bg-slate-50 transition ${settled ? 'opacity-60' : ''}`}>
        <td className="px-3 py-2 whitespace-nowrap text-left">
          <span className="font-semibold text-slate-900">{s.name || `Lot #${s.id}`}</span>
          <span className="block text-xs text-slate-400">{s.date}</span>
        </td>
        <td className="px-3 py-2 text-slate-700">{Number(s.totalUnitsSold || 0).toLocaleString()}</td>
        <td className="px-3 py-2 text-slate-700">{Number(s.totalKgSold) > 0 ? Number(s.totalKgSold).toLocaleString() : '—'}</td>
        <td className="px-3 py-2 font-semibold text-slate-900">{formatCurrency(s.totalSold)}</td>
        <td className="px-3 py-2 text-slate-700">
          {ratePending ? <span className="badge badge-amber">pending</span> : formatCurrency(s.commissionAmount)}
        </td>
        <td className="px-3 py-2 text-slate-700">{formatCurrency(s.expenseTotal)}</td>
        <td className={`px-3 py-2 font-bold ${Number(s.netPayable) < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatCurrency(s.netPayable)}</td>
        <td className="px-3 py-2">
          {settled ? (
            <span className="badge badge-emerald">Settled</span>
          ) : supplier.status === 'DISABLED' ? (
            <span className="badge badge-amber">Open</span>
          ) : (
            <button
              onClick={() => setSettleTarget(s)}
              disabled={settlingId === s.id || !soldOut}
              className={`btn-compact ${soldOut ? 'btn-compact-primary' : ''}`}
              title={soldOut
                ? 'Settle this shipment (records the payments and closes it)'
                : 'Settle becomes available once all stock from this lot is sold'}
            >
              <Check size={12} /> Settle
            </button>
          )}
        </td>
      </tr>
    )
  }

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


  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="supplier-profile-header" style={{ padding: '0.9rem 1.1rem' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button type="button" onClick={onBack} className="back-arrow-btn" title="Back to suppliers">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
              <UserCheck size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 truncate">{supplier.name}</h2>
                {supplier.status === 'DISABLED' && <span className="badge badge-rose">Disabled</span>}
                {pendingRateCount > 0 && (
                  <span className="badge badge-amber">{pendingRateCount} lot{pendingRateCount === 1 ? '' : 's'} need rate</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {supplier.businessName && (
                  <span className="inline-flex items-center gap-1"><Building2 size={12} /> {supplier.businessName}</span>
                )}
                {supplier.location && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {supplier.location}</span>
                )}
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {supplier.contact}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {supplier.status === 'DISABLED' ? (
              <button onClick={handleReactivate} disabled={isTogglingStatus} className="btn-primary flex items-center gap-1.5">
                <RotateCcw size={14} /> {isTogglingStatus ? 'Reactivating…' : 'Reactivate'}
              </button>
            ) : (
              <>
                <button onClick={openEditModal} className="icon-btn" title="Edit supplier"><Pencil size={15} /></button>
                <button onClick={() => { setDisableError(''); setShowDisableConfirm(true); }} className="icon-btn icon-btn-danger" title="Disable supplier"><Power size={15} /></button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MONEY + CRATES side by side */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(() => {
          const netDue = Number(supplier.amountDue) || 0
          const payable = netDue > 0 ? netDue : 0
          const advance = netDue < 0 ? -netDue : 0
          return (
            <div className="supplier-panel">
              <h3 className="flex items-center gap-2"><DollarSign size={17} className="text-blue-600" /> Supplier Money</h3>
              <div className="mt-3 space-y-2">
                <div className="box-row"><span>Supplier Payable</span><strong className="text-rose-700">{formatCurrency(payable)}</strong></div>
                <div className="box-row total"><span>Advance Paid</span><strong className="text-amber-700">{formatCurrency(advance)}</strong></div>
              </div>
            </div>
          )
        })()}

        <div className="supplier-panel">
          <h3 className="flex items-center gap-2"><Boxes size={17} className="text-blue-600" /> Crates</h3>
          <div className="mt-3 space-y-2">
            {(supplier.crateHoldings || []).length === 0 ? (
              <div className="box-row"><span>No crates due</span><strong>0</strong></div>
            ) : (
              (supplier.crateHoldings || []).map((c) => (
                <div key={c.crateType} className="box-row"><span>{c.crateType}</span><strong>{c.quantity || 0}</strong></div>
              ))
            )}
            <div className="box-row total"><span>Total Due</span><strong>{supplier.totalCratesHolding || 0}</strong></div>
          </div>
        </div>
      </div>

      {/* SHIPMENTS (per-lot consignment accounting) */}
      <div className="supplier-panel">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2"><Truck size={18} className="text-blue-600" /> Shipments</h3>
          </div>
          {supplier.status !== 'DISABLED' && shipments.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => openCommissionModal()} className="btn-compact">
                <Percent size={12} /> Set Commission
              </button>
              <button onClick={() => openExpenseModal()} className="btn-compact">
                <Receipt size={12} /> Add Expense
              </button>
            </div>
          )}
        </div>

        {isLoadingShipments ? (
          <p className="text-sm text-slate-500">Loading shipments…</p>
        ) : shipments.length === 0 ? (
          <div className="empty-state !py-8">
            <Truck size={28} className="empty-state-icon" />
            <p className="empty-state-title">No shipments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 font-semibold text-slate-700 text-left">Shipment</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Unit Sold</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Kg</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Total Sold</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Commission</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Expense</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Net Payable</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Settle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...openShipments, ...settledShipments].map(renderLotRow)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TRANSACTIONS (sales, payments & money movements for this supplier) */}
      <div className="supplier-panel">
        <button
          type="button"
          onClick={() => setShowTransactions((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Transactions</h3>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            {supplierTransactions.length} entr{supplierTransactions.length === 1 ? 'y' : 'ies'}
            {showTransactions ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </span>
        </button>

        {showTransactions && (
          <div className="mt-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-slate-400" />
                <select
                  value={txFilter}
                  onChange={(e) => setTxFilter(e.target.value)}
                  className="input-field !py-1.5 text-sm"
                >
                  <option value="all">All types</option>
                  {txTypes.map((ty) => (
                    <option key={ty} value={ty}>{ty}</option>
                  ))}
                </select>
              </div>
              <span className="badge badge-teal">{filteredTransactions.length} shown</span>
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="empty-state !py-8">
                <Receipt size={28} className="empty-state-icon" />
                <p className="empty-state-title">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="center-table w-full min-w-[760px] text-sm">
                  <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Details</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Payment Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedTransactions.map((t) => {
                  const method = txMethod(t)
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{t.date}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.transactionType === 'Payment' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {t.transactionType === 'Payment' ? 'Payment' : 'Sale'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{txDetails(t)}</td>
                      <td className="px-4 py-3 text-slate-800">{t.customer || <span className="text-slate-400">—</span>}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{txAmount(t)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${method.due ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                          {method.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
                  </tbody>
                </table>
                <TablePager {...txnPager} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* CURRENT STOCK */}
      <div className="supplier-panel">
        <button
          type="button"
          onClick={() => setShowStock((v) => !v)}
          className="mb-3 flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="flex items-center gap-2"><Package size={17} className="text-blue-600" /> Current Stock</h3>
          <span className="flex items-center gap-2 text-sm text-slate-500">
            {products.length} item{products.length === 1 ? '' : 's'}
            {showStock ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </span>
        </button>

        {showStock && (products.length === 0 ? (
          <p className="text-sm text-slate-500">No stock from this supplier right now.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[520px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 font-semibold text-slate-700">Product</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Category</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Lot</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Qty</th>
                  <th className="px-3 py-2 font-semibold text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => {
                  const isStockOut = Number(product.quantity) <= 0
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition">
                      <td className="px-3 py-2 font-medium text-slate-800">{product.productName}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {product.category || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        {product.subCategoryName
                          ? <span className={`font-semibold ${isStockOut ? 'text-slate-400' : 'text-blue-700'}`}>{product.subCategoryName}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {product.quantity} <span className="text-xs text-slate-400">{String(product.unit || '').toUpperCase()}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`badge ${isStockOut ? 'badge-rose' : 'badge-emerald'}`}>{isStockOut ? 'Out' : 'In'}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}
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

      {/* SETTLE CONFIRMATION */}
      {settleTarget && (() => {
        const t = settleTarget
        const ratePending = t.commissionRate == null
        const payable = Math.max(0, (Number(t.totalSold) || 0) - (Number(t.advancePaid) || 0))
        const commission = Number(t.commissionAmount) || 0
        const expense = Number(t.expenseDue) || 0
        const cashOut = Math.max(0, payable - commission - expense)
        return (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '30rem' }}>
              <div className="modal-header">
                <div className="flex items-center gap-2.5">
                  <div className="modal-icon-circle bg-blue-100 text-blue-700"><Check size={18} /></div>
                  <div>
                    <h2>Settle Lot #{t.id}?</h2>
                  </div>
                </div>
                <button onClick={() => setSettleTarget(null)} className="modal-close-btn">✕</button>
              </div>
              <div className="modal-body">
                {ratePending ? (
                  <div className="status-error"><span>!</span><span>Set the commission rate before settling.</span></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="box-row"><span>Product payment to supplier</span><strong>{formatCurrency(payable)}</strong></div>
                      <div className="box-row"><span>Commission you collect</span><strong className="text-amber-700">{formatCurrency(commission)}</strong></div>
                      <div className="box-row"><span>Expense you collect</span><strong className="text-rose-700">{formatCurrency(expense)}</strong></div>
                    </div>
                    <div className="statement-net mt-3">
                      <span>Cash you hand over (net)</span>
                      <strong>{formatCurrency(cashOut)}</strong>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      All three movements will be recorded against this supplier. The supplier balance, commission and expense due will all update. This cannot be undone from the UI.
                    </p>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button onClick={() => setSettleTarget(null)} className="btn-secondary" disabled={settlingId === t.id}>Cancel</button>
                <button
                  onClick={handleConfirmSettle}
                  disabled={ratePending || settlingId === t.id}
                  className="btn-primary flex items-center gap-2"
                >
                  <Check size={14} /> {settlingId === t.id ? 'Settling…' : 'Yes, settle'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* COMMISSION MODAL */}
      {showCommissionModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '30rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Percent size={18} /></div>
                <div>
                  <h2>Set Commission Rate</h2>
                </div>
              </div>
              <button onClick={() => setShowCommissionModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label className="form-label"><Truck size={13} /> Shipment (lot) <span className="text-red-500">*</span></label>
                  <select
                    value={commissionForm.deliveryId}
                    onChange={(e) => {
                      const id = e.target.value
                      const lot = shipments.find((s) => String(s.id) === String(id))
                      setCommissionForm({ deliveryId: id, rate: lot && lot.commissionRate != null ? String(lot.commissionRate) : '' })
                    }}
                    className="input-field"
                    autoFocus
                  >
                    <option value="">Select shipment…</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || `Lot #${s.id}`} · {s.commissionRate == null ? 'pending' : `${s.commissionRate}%`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label"><Percent size={13} /> Commission Rate <span className="text-red-500">*</span></label>
                  <div className="input-with-suffix">
                    <input
                      type="number" min="0" max="100" step="0.5"
                      value={commissionForm.rate}
                      onChange={(e) => setCommissionForm((p) => ({ ...p, rate: e.target.value }))}
                      className="input-field" placeholder="0"
                    />
                    <span className="input-suffix">%</span>
                  </div>
                </div>
              </div>
              {commissionError && (
                <div className="status-error mt-3"><span>!</span><span>{commissionError}</span></div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCommissionModal(false)} className="btn-secondary" disabled={isSavingCommission}>Cancel</button>
              <button onClick={handleCommissionSave} disabled={isSavingCommission} className="btn-primary flex items-center gap-2">
                <Check size={14} /> {isSavingCommission ? 'Saving…' : 'Save Rate'}
              </button>
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
                </div>
              </div>
              <button onClick={() => setShowExpenseModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field form-field-full">
                  <label className="form-label"><Truck size={13} /> Shipment (lot) <span className="text-red-500">*</span></label>
                  <select
                    value={expenseForm.deliveryId}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, deliveryId: e.target.value }))}
                    className="input-field"
                    autoFocus
                  >
                    <option value="">Select shipment…</option>
                    {shipments.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || `Lot #${s.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label"><Tag size={13} /> Category <span className="text-red-500">*</span></label>
                  <select
                    value={expenseForm.categoryId}
                    onChange={(e) => setExpenseForm((p) => ({ ...p, categoryId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label"><DollarSign size={13} /> Expense Amount <span className="text-red-500">*</span></label>
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
                  <p className="mt-1 text-xs text-slate-500">
                    You pay this now; the full amount becomes a due the supplier owes you.
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
