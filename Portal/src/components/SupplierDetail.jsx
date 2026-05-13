import { useData } from '../context/DataContext';

const SupplierDetail = ({ supplierId }) => {
  const { suppliers, supplierProducts } = useData();

  const supplier = suppliers.find((item) => item.id === supplierId);
  const products = supplierProducts.filter((product) => product.supplierId === supplierId);

  if (!supplier) {
    return <div className="text-gray-600">Supplier not found</div>;
  }

  const totalProductValue = products.reduce((sum, product) => sum + product.totalValue, 0);

  const initials = supplier.name
    .split(' ')
    .map((name) => name[0])
    .join('');

  return (
    <div className="space-y-6">
      <div className="status-success">
        <span>ℹ️</span>
        <span>Payments and box updates are managed from "Payment / Due / Box Update" in Transactions.</span>
      </div>

      <div className="border-b border-gray-200 pb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
            <span className="text-2xl font-bold text-gray-700">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">{supplier.name}</h2>
            <p className="text-gray-500 text-sm">
              Commission Rate: <span className="font-semibold text-gray-700">{supplier.commissionRate}%</span>
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Location</p>
            <p className="text-sm font-medium text-gray-900">{supplier.location}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Contact</p>
            <p className="text-sm font-medium text-gray-900">{supplier.contact}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Settlement</p>
            <p className="text-sm font-medium text-gray-900">{supplier.lastSettlementDate}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Account Summary</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.totalSales.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Commission Earned</p>
            <p className="text-2xl font-bold text-gray-900">
              ৳ {supplier.totalCommissionEarned.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-lg p-5 border border-gray-200">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Commission Paid</p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.advancePaymentsMade.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-300">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-2">
              Commission Due
            </p>
            <p className="text-2xl font-bold text-gray-900">৳ {supplier.amountDue.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-gray-900 mb-4">Boxes Inventory</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Wooden</p>
            <p className="text-4xl font-bold text-gray-900">{supplier.boxesHoldingWooden}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Plastic</p>
            <p className="text-4xl font-bold text-gray-900">{supplier.boxesHoldingPlastic}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-300 text-center">
            <p className="text-xs text-gray-600 uppercase tracking-wider font-semibold mb-3">Total</p>
            <p className="text-4xl font-bold text-gray-900">{supplier.totalBoxesHolding}</p>
          </div>
        </div>
      </div>

      {products.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span>🛒</span>Products In Stock
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Unit Price</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Value</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-800 font-medium">{product.productName}</td>
                    <td className="px-4 py-3 text-gray-700">{product.category}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{product.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-700">৳ {product.unitPrice}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="money money-income font-bold">
                        ৳ {product.totalValue.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          product.status === 'in_stock'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
            <div className="text-right">
              <p className="text-gray-700 text-sm mb-1">Total Product Value:</p>
              <p className="text-2xl font-bold money money-income">৳ {totalProductValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierDetail;
