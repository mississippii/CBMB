import { useEffect, useState } from 'react'
import { Power, RotateCcw, Users, ArrowLeft, Phone, MapPin, Building2, Pencil } from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useToast } from '../../shared/components/Toast'
import { TablePager, usePagination } from '../../shared/components'
import { formatDate } from '../../shared/utils/format'
import { isValidPhone, normalizePhone, PHONE_HINT } from '../../shared/utils/validation'

const formatCurrency = (value) => '৳ ' + Math.ceil(Number(value) || 0).toLocaleString()
const moneyOrDash = (value) => Number(value) > 0 ? formatCurrency(value) : '—'

const methodLabel = (value) => {
  const method = String(value || '').toUpperCase()
  if (!method || method === 'NONE') return '—'
  if (method === 'BKASH') return 'bKash'
  return method.charAt(0) + method.slice(1).toLowerCase()
}

const typeLabel = (transaction) => {
  if (transaction.transactionType !== 'Payment') return 'Sale'
  const value = String(transaction.paymentOperationType || transaction.paymentType || transaction.note || '').toUpperCase()
  if (value.includes('CASH_AND_CRATE_RETURN')) return 'Cash + crates'
  if (value.includes('CRATE_RETURN')) return 'Crates received'
  if (value.includes('CASH_RECEIVE')) return 'Cash received'
  if (Number(transaction.cratesReturned) > 0 && Number(transaction.paymentAmount) > 0) return 'Cash + crates'
  if (Number(transaction.cratesReturned) > 0) return 'Crates received'
  if (Number(transaction.paymentAmount) > 0) return 'Cash received'
  return 'Payment'
}

const productLabel = (transaction) => {
  if (transaction.transactionType !== 'Payment') return transaction.product || 'Product'
  const value = String(transaction.paymentOperationType || transaction.paymentType || transaction.note || '').toUpperCase()
  return value.includes('CRATE') || Number(transaction.cratesReturned) > 0 ? 'Crate' : '—'
}

const transactionAmount = (transaction) => (
  transaction.transactionType === 'Payment' ? '—' : moneyOrDash(transaction.totalAmount)
)

const transactionPaid = (transaction) => moneyOrDash(transaction.paymentAmount)
const transactionDue = (transaction) => {
  if (transaction.transactionType === 'Payment') return '—'
  return formatCurrency(Math.max(0, (Number(transaction.totalAmount) || 0) - (Number(transaction.paymentAmount) || 0)))
}

const CustomerDetail = ({ customerId, onBack }) => {
  const { customers, transactions, getCustomerProfile, updateCustomer, setCustomerStatus } = useData()
  const showToast = useToast()
  const [profile, setProfile] = useState(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', ownerName: '', phone: '', address: '' })
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [disableError, setDisableError] = useState('')

  useEffect(() => {
    let isActive = true
    if (!customerId || !getCustomerProfile) return undefined

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsProfileLoading(true)
    getCustomerProfile(customerId)
      .then((result) => {
        if (isActive) setProfile(result)
      })
      .catch(() => {
        if (isActive) setProfile(null)
      })
      .finally(() => {
        if (isActive) setIsProfileLoading(false)
      })

    return () => {
      isActive = false
    }
    // Only refetch when the customer changes — not on every DataContext re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const fallbackCustomer = customers.find((item) => item.id === customerId)
  const profileMatches = profile?.account?.id === customerId
  const customer = profileMatches ? profile.account : fallbackCustomer

  const fallbackTransactions = (customer
    ? transactions.filter((transaction) => (
      transaction.customerId === customer.id ||
      transaction.customer === customer.name ||
      transaction.customerPhone === customer.phone
    ))
    : [])
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  const customerTransactions = profileMatches ? (profile?.transactions || []) : fallbackTransactions
  // Hook must run before any early return — keep it above the not-found guard.
  const { pageItems: pagedTransactions, ...txnPager } = usePagination(customerTransactions, 12, [customerId])

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>
  }

  const openEditModal = () => {
    setEditForm({
      name: customer.name || '',
      ownerName: customer.ownerName || customer.owner || '',
      phone: normalizePhone(customer.phone),
      address: customer.address || '',
    })
    setEditError('')
    setShowEditModal(true)
  }

  const handleEditSave = async () => {
    const phone = normalizePhone(editForm.phone)
    setIsSavingEdit(true)
    setEditError('')
    try {
      const updated = await updateCustomer({
        id: customer.id,
        name: editForm.name.trim(),
        ownerName: editForm.ownerName.trim(),
        phone,
        address: editForm.address.trim(),
      })
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      setShowEditModal(false)
      showToast('Customer updated', 'success')
    } catch (error) {
      setEditError(error.message || 'Failed to update customer.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const requestEditSave = () => {
    if (!editForm.name.trim()) { setEditError('Business name is required.'); return }
    if (!isValidPhone(editForm.phone)) { setEditError(PHONE_HINT); return }
    handleEditSave()
  }

  const handleConfirmDisable = async () => {
    setIsTogglingStatus(true)
    setDisableError('')
    try {
      const updated = await setCustomerStatus(customer.id, false)
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      setShowDisableConfirm(false)
      showToast(`${customer.name} disabled`, 'success')
    } catch (error) {
      setDisableError(error.message || 'Failed to disable customer.')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const handleReactivate = async () => {
    setIsTogglingStatus(true)
    try {
      const updated = await setCustomerStatus(customer.id, true)
      setProfile((prev) => (prev ? { ...prev, account: { ...prev.account, ...updated } } : prev))
      showToast(`${customer.name} reactivated`, 'success')
    } catch (error) {
      showToast(error.message || 'Failed to reactivate customer.', 'error')
    } finally {
      setIsTogglingStatus(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="profile-workspace">
        <main className="profile-main-stack">
          <div className="supplier-profile-header" style={{ padding: '0.9rem 1.1rem' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <button type="button" onClick={onBack} className="back-arrow-btn" title="Back to customers">
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30">
              <Users size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 truncate">{customer.ownerName || customer.owner || customer.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#1d63ed]">
                  {customer.type}
                </span>
                {customer.status === 'DISABLED' && (
                  <span className="badge badge-rose">Disabled</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                {customer.name && (
                  <span className="inline-flex items-center gap-1"><Building2 size={12} /> {customer.name}</span>
                )}
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {customer.phone}</span>
                {customer.address && (
                  <span className="inline-flex items-center gap-1"><MapPin size={12} /> {customer.address}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {customer.status === 'DISABLED' ? (
              <button onClick={handleReactivate} disabled={isTogglingStatus} className="btn-primary flex items-center gap-1.5">
                <RotateCcw size={14} /> {isTogglingStatus ? 'Reactivating…' : 'Reactivate'}
              </button>
            ) : (
              <>
                <button onClick={openEditModal} className="icon-btn" title="Edit customer">
                  <Pencil size={15} />
                </button>
                <button onClick={() => { setDisableError(''); setShowDisableConfirm(true); }} className="icon-btn icon-btn-danger" title="Disable customer">
                  <Power size={15} />
                </button>
              </>
            )}
          </div>
        </div>
          </div>

          {/* Payment Summary — full width, grows with history */}
          <div className="supplier-panel">
        <div className="flex items-center justify-between">
          <h3>Payment Summary</h3>
          <span className="badge badge-teal">
            {isProfileLoading ? 'Loading' : customerTransactions.length + ' entries'}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
          {customerTransactions.length === 0 ? (
            <div className="empty-state">No customer transactions found.</div>
          ) : (
            <table className="center-table w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Paid</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Due</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{formatDate(transaction.createdAt || transaction.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${transaction.transactionType === 'Payment' ? 'badge-teal' : 'badge-emerald'}`}>
                        {typeLabel(transaction)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left font-semibold text-slate-700">{productLabel(transaction)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900 tabular-nums">{transactionAmount(transaction)}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 tabular-nums">{transactionPaid(transaction)}</td>
                    <td className="px-4 py-3 font-semibold text-rose-700 tabular-nums">{transactionDue(transaction)}</td>
                    <td className="px-4 py-3"><span className="badge badge-teal">{methodLabel(transaction.paymentMethod)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <TablePager {...txnPager} />
      </div>


        </main>

        <aside className="profile-side-stack">
          {/* ACCOUNT SUMMARY */}
          <div className="grid grid-cols-1 gap-4">
            <div className="supplier-panel flex flex-col">
          <h3>Current Due</h3>
          <div className="mt-4 flex flex-1 flex-col justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-5 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-600">Outstanding balance</p>
            <strong className="mt-1 text-3xl font-black text-rose-700 tabular-nums">{formatCurrency(customer.amountDue)}</strong>
          </div>
        </div>

            <div className="supplier-panel">
          <h3>Crate Accountability</h3>

          {/* Leg 1 — my crates the customer is holding (they owe me back) */}
          <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-slate-400">My crates with customer</p>
          <div className="mt-1.5 space-y-2">
            {(customer.crateHoldings || []).length === 0 ? (
              <div className="box-row"><span>None</span><strong>0</strong></div>
            ) : (
              (customer.crateHoldings || []).map((c) => (
                <div key={c.crateType} className="box-row">
                  <span>{c.crateType}</span>
                  <strong>{c.quantity || 0}</strong>
                </div>
              ))
            )}
            <div className="box-row total">
              <span>Customer owes me</span>
              <strong className="text-blue-700">{customer.totalCratesHolding || 0}</strong>
            </div>
          </div>

          {/* Leg 2 — the customer's own crates I'm holding (I owe them back) */}
          <p className="mt-4 text-[11px] font-bold uppercase tracking-wide text-slate-400">Customer's crates I hold</p>
          <div className="mt-1.5 space-y-2">
            {(customer.customerCrateHoldings || []).length === 0 ? (
              <div className="box-row"><span>None</span><strong>0</strong></div>
            ) : (
              (customer.customerCrateHoldings || []).map((c) => (
                <div key={c.crateType} className="box-row">
                  <span>{c.crateType}</span>
                  <strong>{c.quantity || 0}</strong>
                </div>
              ))
            )}
            <div className="box-row total">
              <span>I owe customer</span>
              <strong className="text-amber-700">{customer.totalCratesHeld || 0}</strong>
            </div>
          </div>
        </div>

            <div className="supplier-panel">
          <h3>Crate Deposit</h3>
          <div className="mt-4 flex flex-col justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600">Deposit held (refundable)</p>
            <strong className="mt-1 text-2xl font-black text-amber-700 tabular-nums">{formatCurrency(customer.crateDepositHeld || 0)}</strong>
            <p className="mt-1 text-[11px] text-slate-400">Security money against borrowed crates — returned when crates come back.</p>
          </div>
        </div>
          </div>

        </aside>
      </div>

      {showEditModal && (
        <div className="modal-overlay">
          <div className="modal-content supplier-form-modal">
            <div className="modal-header">
              <div>
                <h2>Edit Customer</h2>
              </div>
              <button onClick={() => setShowEditModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-field">
                  <label className="form-label">
                    <Building2 size={13} /> Business Name <span className="text-red-500">*</span>
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
                    <Users size={13} /> Owner Name
                  </label>
                  <input
                    type="text"
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm((p) => ({ ...p, ownerName: e.target.value }))}
                    className="input-field"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <Phone size={13} /> Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: normalizePhone(e.target.value) }))}
                    className="input-field"
                    inputMode="numeric"
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <MapPin size={13} /> Location
                  </label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
                    className="input-field"
                  />
                </div>
              </div>
              {editError && (
                <div className="status-error mt-4">
                  <span>!</span>
                  <span>{editError}</span>
                </div>
              )}
            </div>
            <div className="modal-footer justify-center">
              <button onClick={() => setShowEditModal(false)} className="btn-secondary" disabled={isSavingEdit}>Cancel</button>
              <button onClick={requestEditSave} disabled={isSavingEdit} className="btn-primary flex items-center gap-2">
                {isSavingEdit ? 'Saving…' : (<><Pencil size={14} /> Save Changes</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisableConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-rose-100 text-rose-700">
                  <Power size={18} />
                </div>
                <div>
                  <h2>Disable {customer.name}?</h2>
                </div>
              </div>
              <button onClick={() => setShowDisableConfirm(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-slate-600">
                The customer will no longer appear in sale dropdowns or active lists, but all transactions,
                ledger entries and crate movements remain. You can reactivate them later.
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
    </div>
  )
}

export default CustomerDetail
