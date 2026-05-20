import { useData } from '../context/DataContext'

const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`
const getDateOnly = (value) => new Date(value).toISOString().split('T')[0]

const SupplierDetail = ({ supplierId, onBack }) => {
  const { suppliers, supplierProducts, transactions } = useData()

  const supplier = suppliers.find((item) => item.id === supplierId)
  const products = supplierProducts.filter((product) => product.supplierId === supplierId)

  if (!supplier) {
    return <div className="text-gray-600">Supplier not found</div>
  }

  const totalStockQuantity = products.reduce((sum, product) => sum + (Number(product.quantity) || 0), 0)
  const today = getDateOnly(new Date())
  const todaySales = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'Sale' &&
      transaction.supplierId === supplier.id &&
      getDateOnly(transaction.createdAt || transaction.date) === today,
  )
  const todaySalesAmount = todaySales.reduce(
    (sum, transaction) => sum + (Number(transaction.totalAmount) || 0),
    0,
  )
  const todayCommission = todaySales.reduce(
    (sum, transaction) => sum + (Number(transaction.commissionAmount) || 0),
    0,
  )
  const previousPayable = Math.max((Number(supplier.amountDue) || 0) - todaySalesAmount, 0)
  const initials = supplier.name
    .split(' ')
    .map((name) => name[0])
    .join('')
  const payableRatio =
    supplier.totalSales > 0
      ? Math.min(Math.round((supplier.amountDue / supplier.totalSales) * 100), 100)
      : 0

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
          <p>Today Sales</p>
          <strong>{formatCurrency(todaySalesAmount)}</strong>
        </div>
        <div className="metric-tile">
          <p>Today Commission</p>
          <strong>{formatCurrency(todayCommission)}</strong>
        </div>
        <div className="metric-tile">
          <p>Total Sales</p>
          <strong>{formatCurrency(supplier.totalSales)}</strong>
        </div>
        <div className="metric-tile">
          <p>Total Commission</p>
          <strong>{formatCurrency(supplier.totalCommissionEarned)}</strong>
        </div>
        <div className="metric-tile danger">
          <p>Sale Payable</p>
          <strong>{formatCurrency(supplier.amountDue)}</strong>
        </div>
        <div className="metric-tile">
          <p>Stock Quantity</p>
          <strong>{totalStockQuantity.toLocaleString()}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="supplier-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3>Supplier Balance</h3>
              <p>Sale payable is based on product sale value; commission is tracked separately.</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Quantity</p>
              <p className="text-lg font-extrabold text-slate-900">{totalStockQuantity.toLocaleString()}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Previous Payable</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{formatCurrency(previousPayable)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Today Sale Added</p>
              <p className="mt-1 text-xl font-extrabold text-emerald-800">{formatCurrency(todaySalesAmount)}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Sale Payable</p>
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

          <div className="mt-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Commission Earned</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">{formatCurrency(supplier.totalCommissionEarned)}</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full ${
                  payableRatio > 60 ? 'bg-rose-500' : payableRatio > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${payableRatio}%` }}
              />
            </div>
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

          <div className="mt-4 flex justify-end rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-right">
              <p className="text-sm text-emerald-700">Total Stock Quantity</p>
              <p className="text-2xl font-extrabold text-emerald-800">{totalStockQuantity.toLocaleString()}</p>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SupplierDetail
