import { useMemo } from 'react';
import { useData } from '../context/DataContext';

const formatCurrency = (value) =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat('en-BD', {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const getDateOnly = (dateValue) => {
  if (!dateValue) return '-';
  return String(dateValue).split('T')[0];
};

const StoreInventory = ({ onAddProducts }) => {
  const { supplierProducts, suppliers, transactions } = useData();

  const supplierById = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier])),
    [suppliers],
  );

  const products = useMemo(
    () =>
      [...supplierProducts]
        .map((product) => {
          const quantity = Number(product.quantity) || 0;
          const supplier = supplierById.get(product.supplierId);
          return {
            ...product,
            quantity,
            supplierName: supplier?.name || 'Unknown supplier',
            supplierPhone: supplier?.contact || supplier?.phone || '',
            stockStatus: quantity <= 0 ? 'Stock out' : quantity <= 10 ? 'Low stock' : 'Available',
          };
        })
        .sort((a, b) => {
          if (a.quantity <= 0 && b.quantity > 0) return 1;
          if (a.quantity > 0 && b.quantity <= 0) return -1;
          return String(a.productName).localeCompare(String(b.productName));
        }),
    [supplierById, supplierProducts],
  );

  const today = new Date().toISOString().split('T')[0];
  const todaySales = transactions.filter(
    (transaction) =>
      transaction.transactionType === 'Sale' && getDateOnly(transaction.createdAt || transaction.date) === today,
  );

  const summary = {
    productCount: products.length,
    availableCount: products.filter((product) => product.quantity > 0).length,
    stockOutCount: products.filter((product) => product.quantity <= 0).length,
    totalQuantity: products.reduce((sum, product) => sum + product.quantity, 0),
    todaySales: todaySales.reduce((sum, transaction) => sum + (Number(transaction.totalAmount) || 0), 0),
  };

  return (
    <div className="store-inventory">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Store Inventory</span>
          <h3>Available products</h3>
          <p>Current product stock by supplier, category, and quantity.</p>
        </div>
        <button type="button" className="btn-primary" onClick={onAddProducts}>
          Add Product
        </button>
      </section>

      <section className="inventory-kpi-grid">
        <div className="metric-tile">
          <p>Total Products</p>
          <strong>{summary.productCount}</strong>
        </div>
        <div className="metric-tile">
          <p>Available</p>
          <strong>{summary.availableCount}</strong>
        </div>
        <div className="metric-tile danger">
          <p>Stock Out</p>
          <strong>{summary.stockOutCount}</strong>
        </div>
        <div className="metric-tile">
          <p>Total Quantity</p>
          <strong>{formatNumber(summary.totalQuantity)}</strong>
        </div>
        <div className="metric-tile">
          <p>Today Sales</p>
          <strong>{formatCurrency(summary.todaySales)}</strong>
        </div>
      </section>

      <section className="supplier-panel inventory-panel">
        <div className="inventory-panel-header">
          <div>
            <h3>Products In Store</h3>
            <p>Stock out products stay visible so the wholesaler can restock them.</p>
          </div>
          <span>{summary.availableCount} available</span>
        </div>

        {products.length === 0 ? (
          <div className="empty-state">
            No products added yet. Add product stock after receiving from suppliers.
          </div>
        ) : (
          <>
            <div className="table-scroll inventory-table">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Supplier</th>
                    <th className="px-4 py-3" style={{ textAlign: 'center' }}>Quantity</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Last Received</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{product.productName}</td>
                      <td className="px-4 py-3 text-slate-700">{product.category}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold">{product.supplierName}</div>
                        <div className="text-xs text-slate-500">{product.supplierPhone}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900" style={{ textAlign: 'center' }}>
                        {formatNumber(product.quantity)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{String(product.unit || '').toUpperCase()}</td>
                      <td className="px-4 py-3">
                        <span className={`stock-pill ${product.quantity <= 0 ? 'out' : product.quantity <= 10 ? 'low' : ''}`}>
                          {product.stockStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{getDateOnly(product.dateReceived)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default StoreInventory;
