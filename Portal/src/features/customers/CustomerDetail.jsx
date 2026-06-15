import { useEffect, useState } from 'react'
import { Power, RotateCcw, Users, ArrowLeft, Phone, MapPin, Building2 } from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useToast } from '../../shared/components/Toast'
import { TablePager, usePagination } from '../../shared/components'
import { formatDate } from '../../shared/utils/format'

const formatCurrency = (value) => '৳ ' + Math.ceil(Number(value) || 0).toLocaleString()
const formatAmount = (transaction) => {
  if (transaction.transactionType === 'Payment') {
    return formatCurrency(transaction.paymentAmount || transaction.totalAmount)
  }
  return formatCurrency(transaction.totalAmount)
}

const renderCustomerTransactionDetails = (transaction) => {
  if (transaction.transactionType === 'Payment') {
    const parts = []
    if (Number(transaction.paymentAmount) > 0) parts.push('Cash received')
    if (Number(transaction.cratesReturned) > 0) parts.push('Crates returned: ' + transaction.cratesReturned)
    return parts.length ? parts.join(' • ') : (transaction.note || 'Payment recorded')
  }

  return [transaction.product, transaction.category && transaction.category !== 'No Category' ? transaction.category : null]
    .filter(Boolean)
    .join(' · ') || 'Sale recorded'
}

const CustomerDetail = ({ customerId, onBack }) => {
  const { customers, transactions, getCustomerProfile, setCustomerStatus } = useData()
  const showToast = useToast()
  const [profile, setProfile] = useState(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)
  const [disableError, setDisableError] = useState('')

  useEffect(() => {
    let isActive = true
    setProfile(null)

    if (!customerId || !getCustomerProfile) return undefined

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
  const customer = profile?.account || fallbackCustomer

  const fallbackTransactions = (customer
    ? transactions.filter((transaction) => (
      transaction.customerId === customer.id ||
      transaction.customer === customer.name ||
      transaction.customerPhone === customer.phone
    ))
    : [])
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  const customerTransactions = profile?.transactions || fallbackTransactions
  // Hook must run before any early return — keep it above the not-found guard.
  const { pageItems: pagedTransactions, ...txnPager } = usePagination(customerTransactions, 12, [customerId])

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>
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
              <button onClick={() => { setDisableError(''); setShowDisableConfirm(true); }} className="icon-btn icon-btn-danger" title="Disable customer">
                <Power size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="profile-workspace">
        <main className="profile-main-stack">
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
            <table className="center-table w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Details</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{formatDate(transaction.createdAt || transaction.date)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${transaction.transactionType === 'Payment' ? 'badge-teal' : 'badge-emerald'}`}>
                        {transaction.transactionType === 'Payment' ? 'Payment' : 'Sale'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{renderCustomerTransactionDetails(transaction)}</td>
                    <td className="px-4 py-3 font-extrabold text-slate-900 tabular-nums">{formatAmount(transaction)}</td>
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
