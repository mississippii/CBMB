import { useEffect, useState } from 'react'
import { Power, RotateCcw } from 'lucide-react'
import { useData } from '../../data/DataContext'
import { useToast } from '../../shared/components/Toast'

const formatCurrency = (value) => '৳ ' + (Number(value) || 0).toLocaleString()
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
    if (Number(transaction.boxJamanotChange) !== 0) {
      parts.push('Jamanot: ' + formatCurrency(Math.abs(Number(transaction.boxJamanotChange))))
    }
    return parts.length ? parts.join(' • ') : (transaction.note || 'Payment recorded')
  }

  return [transaction.product, transaction.category && transaction.category !== 'No Category' ? transaction.category : null]
    .filter(Boolean)
    .join(' / ') || 'Sale recorded'
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
  }, [customerId, getCustomerProfile])

  const fallbackCustomer = customers.find((item) => item.id === customerId)
  const customer = profile?.account || fallbackCustomer

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>
  }

  const initials = customer.name
    .split(' ')
    .map((name) => name[0])
    .join('')

  const fallbackTransactions = transactions
    .filter((transaction) => (
      transaction.customerId === customer.id ||
      transaction.customer === customer.name ||
      transaction.customerPhone === customer.phone
    ))
    .slice()
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
  const customerTransactions = profile?.transactions || fallbackTransactions

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
      <div className="supplier-profile-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="supplier-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-950">{customer.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#1d63ed]">
                  {customer.type}
                </span>
                {customer.status === 'DISABLED' && (
                  <span className="badge badge-rose">Disabled</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {customer.owner} • {customer.phone}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {customer.address || 'No address'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {customer.status === 'DISABLED' ? (
              <button onClick={handleReactivate} disabled={isTogglingStatus} className="btn-primary flex items-center gap-2">
                <RotateCcw size={14} /> {isTogglingStatus ? 'Reactivating…' : 'Reactivate'}
              </button>
            ) : (
              <button onClick={() => { setDisableError(''); setShowDisableConfirm(true); }} className="btn-secondary flex items-center gap-2">
                <Power size={14} /> Disable
              </button>
            )}
            {onBack && (
              <button type="button" onClick={onBack} className="btn-secondary">
                Back to Customers
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="metric-tile danger">
          <p>Current Due</p>
          <strong>{formatCurrency(customer.amountDue)}</strong>
        </div>
        <div className="metric-tile">
          <p>Crate Jamanot</p>
          <strong>{formatCurrency(customer.crateJamanot || 0)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="supplier-panel">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3>Payment Summary</h3>
              <p>All sale and payment transactions for this customer.</p>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#1d63ed]">
              {isProfileLoading ? 'Loading' : customerTransactions.length + ' entries'}
            </span>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            {customerTransactions.length === 0 ? (
              <div className="empty-state">No customer transactions found.</div>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Details</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {customerTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-semibold text-slate-900">{transaction.date}</td>
                      <td>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          transaction.transactionType === 'Payment'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {transaction.transactionType === 'Payment' ? 'Payment' : 'Sale'}
                        </span>
                      </td>
                      <td className="text-slate-600">
                        {renderCustomerTransactionDetails(transaction)}
                      </td>
                      <td className="text-right font-extrabold text-slate-900">{formatAmount(transaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="supplier-panel">
          <h3>Crate Accountability</h3>
          <p>Crates currently due from this customer.</p>

          <div className="mt-4 space-y-3">
            <div className="box-row">
              <span>Bangla</span>
              <strong>{customer.cratesHoldingWooden || 0}</strong>
            </div>
            <div className="box-row">
              <span>China</span>
              <strong>{customer.cratesHoldingPlastic || 0}</strong>
            </div>
            <div className="box-row total">
              <span>Total Crates Due</span>
              <strong>{customer.totalCratesHolding || 0}</strong>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#1d63ed]">Crate Jamanot</p>
            <p className="mt-1 text-xl font-extrabold text-[#1755c9]">
              {formatCurrency(customer.crateJamanot || 0)}
            </p>
          </div>
        </div>
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
                  <p className="text-xs text-slate-500 mt-0.5">Hidden from active lists. History stays intact.</p>
                </div>
              </div>
              <button onClick={() => setShowDisableConfirm(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-slate-600">
                The customer will no longer appear in sale dropdowns or active lists, but all transactions,
                ledger entries, crate movements, and jamanot history remain. You can reactivate them later.
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
