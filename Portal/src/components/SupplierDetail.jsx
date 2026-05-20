import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`
const getDateOnly = (value) => new Date(value).toISOString().split('T')[0]

const SupplierDetail = ({ supplierId, onBack }) => {
  const { suppliers, supplierProducts, transactions, getSupplierProfile } = useData()
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    let isActive = true
    setProfile(null)

    if (!supplierId || !getSupplierProfile) return undefined

    getSupplierProfile(supplierId)
      .then((result) => {
        if (isActive) setProfile(result)
      })
      .catch(() => {
        if (isActive) setProfile(null)
      })

    return () => {
      isActive = false
    }
  }, [supplierId, getSupplierProfile])

  const fallbackSupplier = suppliers.find((item) => item.id === supplierId)
  const supplier = profile?.account || fallbackSupplier
  const products = supplierProducts.filter((product) => product.supplierId === supplierId)

  if (!supplier) {
    return <div className="text-gray-600">Supplier not found</div>
  }

  const today = getDateOnly(new Date())
  const supplierTransactions = profile?.transactions || transactions.filter((transaction) => (
    transaction.supplierId === supplier.id ||
    transaction.supplier === supplier.name ||
    transaction.supplierPhone === supplier.contact
  ))
  const todaySales = supplierTransactions.filter(
    (transaction) =>
      transaction.transactionType === 'Sale' &&
      getDateOnly(transaction.createdAt || transaction.date) === today,
  )
  const fallbackTodaySalesAmount = todaySales.reduce(
    (sum, transaction) => sum + (Number(transaction.totalAmount) || 0),
    0,
  )
  const fallbackTodayCommission = todaySales.reduce((sum, transaction) => {
    const explicitCommission = Number(transaction.commissionAmount) || 0
    if (explicitCommission > 0) return sum + explicitCommission
    return sum + ((Number(transaction.totalAmount) || 0) * (Number(supplier.commissionRate) || 0)) / 100
  }, 0)
  const commissionReceived = supplierTransactions
    .filter((transaction) => (
      transaction.transactionType === 'Payment' &&
      String(transaction.note || transaction.paymentType || '').toLowerCase().includes('commission')
    ))
    .reduce((sum, transaction) => sum + (Number(transaction.paymentAmount) || 0), 0)
  const fallbackOtherExpense = supplierTransactions
    .filter((transaction) => (
      transaction.transactionType === 'Payment' &&
      String(transaction.note || transaction.paymentType || '').toLowerCase().includes('expense')
    ))
    .reduce((sum, transaction) => sum + (Number(transaction.paymentAmount) || 0), 0)
  const todaySalesAmount = Number(supplier.todaySale ?? fallbackTodaySalesAmount) || 0
  const todayCommission = Number(supplier.todayCommission ?? fallbackTodayCommission) || 0
  const commissionDue = Number(supplier.commissionDue ?? Math.max((Number(supplier.totalCommissionEarned) || 0) - commissionReceived, 0)) || 0
  const otherExpense = Number(supplier.otherExpense ?? fallbackOtherExpense) || 0
  const initials = supplier.name
    .split(' ')
    .map((name) => name[0])
    .join('')

  return (
    <div className="space-y-5">
      <div className="supplier-profile-header">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="supplier-avatar">{initials}</div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-extrabold text-slate-950">{supplier.name}</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-[#307D7E]">
                  {supplier.commissionRate}% commission
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {supplier.location} • {supplier.contact}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                Last settlement: {supplier.lastSettlementDate}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {onBack && (
              <button type="button" onClick={onBack} className="btn-secondary">
                Back to Suppliers
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="metric-tile">
          <p>Today Sale</p>
          <strong>{formatCurrency(todaySalesAmount)}</strong>
        </div>
        <div className="metric-tile">
          <p>Today Commission</p>
          <strong>{formatCurrency(todayCommission)}</strong>
        </div>
        <div className="metric-tile">
          <p>Total Sale</p>
          <strong>{formatCurrency(supplier.totalSales)}</strong>
        </div>
        <div className="metric-tile">
          <p>Commission Due</p>
          <strong>{formatCurrency(commissionDue)}</strong>
        </div>
        <div className="metric-tile danger">
          <p>Supplier Due</p>
          <strong>{formatCurrency(supplier.amountDue)}</strong>
        </div>
        <div className="metric-tile">
          <p>Other Expense</p>
          <strong>{formatCurrency(otherExpense)}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="supplier-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3>Supplier Balance</h3>
              <p>Sales, commission, due, and expense movement for this supplier.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Transactions</p>
              <p className="text-lg font-extrabold text-slate-900">{supplierTransactions.length.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Sale</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-800">{formatCurrency(supplier.totalSales)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Commission Due</p>
              <p className="mt-1 text-xl font-extrabold text-amber-800">{formatCurrency(commissionDue)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Supplier Due</p>
              <p className="mt-1 text-xl font-extrabold text-rose-800">{formatCurrency(supplier.amountDue)}</p>
            </div>
          </div>
        </div>

        <div className="supplier-panel">
          <h3>Crate Accountability</h3>
          <div className="mt-4 space-y-3">
            <div className="box-row">
              <span>Bangla</span>
              <strong>{supplier.boxesHoldingWooden}</strong>
            </div>
            <div className="box-row">
              <span>China</span>
              <strong>{supplier.boxesHoldingPlastic}</strong>
            </div>
            <div className="box-row total">
              <span>Total Crates Due</span>
              <strong>{supplier.totalBoxesHolding}</strong>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-amber-50 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Commission Due</p>
            <p className="mt-1 text-lg font-extrabold text-amber-800">{formatCurrency(commissionDue)}</p>
          </div>
        </div>
      </div>

      <div className="supplier-panel">
        <h3 className="mb-4 text-lg font-bold text-slate-900">Products In Stock</h3>

        {products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-medium text-slate-500">
            No products received from this supplier yet.
          </div>
        ) : (
          <>
          <div className="space-y-3 lg:hidden">
            {products.map((product) => {
              const isStockOut = Number(product.quantity) <= 0
              return (
              <div key={product.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-900">{product.productName}</p>
                    <p className="text-xs text-slate-500">{product.category}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isStockOut ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {isStockOut ? 'Stock Out' : 'In Stock'}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-[11px] text-slate-500">Qty</p>
                    <p className="font-semibold text-slate-800">{product.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Unit</p>
                    <p className="font-semibold text-slate-800">{product.unit}</p>
                  </div>
                  
                </div>
              </div>
              )
            })}
          </div>

          <div className="hidden lg:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Unit</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => {
                  const isStockOut = Number(product.quantity) <= 0
                  return (
                    <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-800 font-medium">{product.productName}</td>
                      <td className="px-4 py-3 text-gray-700">{product.category}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{product.quantity}</td>
                      <td className="px-4 py-3 text-center text-gray-700">{product.unit}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            isStockOut ? 'bg-rose-100 text-rose-700' : 'bg-green-100 text-green-700'
                          }`}
                        >
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
    </div>
  )
}

export default SupplierDetail
