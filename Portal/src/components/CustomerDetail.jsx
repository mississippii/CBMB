import { useData } from '../context/DataContext'

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`
const getDateOnly = (value) => new Date(value).toISOString().split('T')[0]

const CustomerDetail = ({ customerId, onBack }) => {
  const { customers, transactions } = useData()
  const customer = customers.find((item) => item.id === customerId)

  if (!customer) {
    return <div className="text-gray-600">Customer not found</div>
  }

  const today = getDateOnly(new Date())
  const initials = customer.name
    .split(' ')
    .map((name) => name[0])
    .join('')

  const todaySales = transactions.filter(
    (transaction) =>
      transaction.transactionType !== 'Payment' &&
      transaction.transactionType !== 'SupplierDelivery' &&
      (transaction.customerId === customer.id || transaction.customer === customer.name) &&
      getDateOnly(transaction.createdAt || transaction.date) === today,
  )

  const todayPayments = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'Payment' &&
      transaction.partyType === 'Customer' &&
      (transaction.partyId === customer.id || transaction.partyName === customer.name) &&
      transaction.paymentType === 'Cash' &&
      getDateOnly(transaction.createdAt || transaction.date) === today,
  )

  const todayPurchaseAmount = todaySales.reduce(
    (sum, transaction) => sum + (Number(transaction.totalAmount) || 0),
    0,
  )
  const todayPaidAmount =
    todaySales.reduce((sum, transaction) => sum + (Number(transaction.paymentAmount) || 0), 0) +
    todayPayments.reduce((sum, transaction) => sum + (Number(transaction.paymentAmount) || 0), 0)
  const todayDueAdded = Math.max(todayPurchaseAmount - todayPaidAmount, 0)
  const previousDue = Math.max((Number(customer.amountDue) || 0) - todayDueAdded, 0)
  const dueRatio =
    customer.totalPurchases > 0
      ? Math.min(Math.round((customer.amountDue / customer.totalPurchases) * 100), 100)
      : 0

  return (
    <div className="space-y-5">
      <div className="supplier-profile-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="supplier-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-950">{customer.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#307D7E]">
                  {customer.type}
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {customer.owner} • {customer.phone}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {customer.address || 'No address'}
              </p>
            </div>
          </div>

          {onBack && (
            <button type="button" onClick={onBack} className="btn-secondary">
              Back to Customers
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="metric-tile">
          <p>Today Purchases</p>
          <strong>{formatCurrency(todayPurchaseAmount)}</strong>
        </div>
        <div className="metric-tile">
          <p>Today Paid</p>
          <strong>{formatCurrency(todayPaidAmount)}</strong>
        </div>
        <div className="metric-tile danger">
          <p>Current Due</p>
          <strong>{formatCurrency(customer.amountDue)}</strong>
        </div>
        <div className="metric-tile">
          <p>Box Jamanot</p>
          <strong>{formatCurrency(customer.boxJamanot || 0)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="supplier-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3>Due Summary</h3>
              <p>Current due is separated from today's customer activity.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment Risk</p>
              <p className="text-lg font-extrabold text-slate-900">{dueRatio}%</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Previous Due</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(previousDue)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Today Added</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-800">{formatCurrency(todayDueAdded)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Current Due</p>
              <p className="mt-1 text-xl font-extrabold text-rose-800">{formatCurrency(customer.amountDue)}</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Risk Level</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  dueRatio > 60 ? 'bg-rose-500' : dueRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${dueRatio}%` }}
              />
            </div>
          </div>
        </div>

        <div className="supplier-panel">
          <h3>Box Accountability</h3>
          <div className="mt-4 space-y-3">
            <div className="box-row">
              <span>Wooden</span>
              <strong>{customer.boxesHoldingWooden}</strong>
            </div>
            <div className="box-row">
              <span>Plastic</span>
              <strong>{customer.boxesHoldingPlastic}</strong>
            </div>
            <div className="box-row total">
              <span>Total Due</span>
              <strong>{customer.totalBoxesHolding}</strong>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-emerald-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#307D7E]">Box Jamanot</p>
            <p className="mt-1 text-xl font-extrabold text-[#255f60]">
              {formatCurrency(customer.boxJamanot || 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="supplier-panel">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Lifetime Summary</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Purchases</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-800">
              {formatCurrency(customer.totalPurchases)}
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Total Paid</p>
            <p className="mt-1 text-xl font-extrabold text-sky-800">{formatCurrency(customer.totalPaid)}</p>
          </div>
          <div className="rounded-xl bg-rose-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Payment Due</p>
            <p className="mt-1 text-xl font-extrabold text-rose-800">{formatCurrency(customer.amountDue)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerDetail
