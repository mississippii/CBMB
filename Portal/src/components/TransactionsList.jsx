import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

const TransactionsList = () => {
  const { transactions } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');

  // Filter transactions by date range, customer name, and supplier name
  const filteredTransactions = useMemo(() => {
    let result = transactions;

    // Filter by date range
    if (startDate || endDate) {
      result = result.filter((txn) => {
        const txnDate = new Date(txn.date);
        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;

        if (start && txnDate < start) return false;
        if (end && txnDate > end) return false;
        return true;
      });
    }

    // Filter by customer name
    if (customerSearch.trim()) {
      result = result.filter((txn) =>
        txn.customer.toLowerCase().includes(customerSearch.toLowerCase())
      );
    }

    // Filter by supplier name
    if (supplierSearch.trim()) {
      result = result.filter((txn) =>
        txn.supplier.toLowerCase().includes(supplierSearch.toLowerCase())
      );
    }

    return result;
  }, [transactions, startDate, endDate, customerSearch, supplierSearch]);

  const creditTransactions = filteredTransactions.filter((t) => t.paymentType === 'Credit');
  const cashTransactions = filteredTransactions.filter((t) => t.paymentType === 'Cash');

  const totalCreditSales = creditTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalCashSales = cashTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
  const totalSales = totalCreditSales + totalCashSales;

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setCustomerSearch('');
    setSupplierSearch('');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card highlight">
        <h3 className="section-header">🔍 Search & Filter Transactions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label>📅 Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label>📅 End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label>🚜 Supplier Name</label>
            <input
              type="text"
              placeholder="Search supplier..."
              value={supplierSearch}
              onChange={(e) => setSupplierSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label>👥 Customer Name</label>
            <input
              type="text"
              placeholder="Search customer..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="btn-secondary flex-1"
            >
              🔄 Clear
            </button>
            <div className="bg-indigo-100 border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center">
              {filteredTransactions.length} result(s)
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">💰 TOTAL SALES</p>
          <p className="text-3xl font-bold money money-income">৳ {totalSales.toLocaleString()}</p>
        </div>

        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">💳 CREDIT SALES</p>
          <p className="text-3xl font-bold money money-info">৳ {totalCreditSales.toLocaleString()}</p>
        </div>

        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">💵 CASH SALES</p>
          <p className="text-3xl font-bold money money-income">৳ {totalCashSales.toLocaleString()}</p>
        </div>
      </div>

      {/* All Transactions Table */}
      <div className="card">
        <h3 className="section-header">📋 Transaction History</h3>
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No transactions found</p>
            <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Supplier</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Customer</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Product</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-700">Qty</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-700">Amount</th>
                  <th className="px-6 py-4 text-center font-semibold text-gray-700">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900">{txn.date}</td>
                    <td className="px-6 py-4 text-gray-700">{txn.supplier}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{txn.customer}</td>
                    <td className="px-6 py-4 text-gray-700">{txn.product}</td>
                    <td className="px-6 py-4 text-center font-semibold text-gray-900">{txn.quantity}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="money money-income font-bold text-lg">৳ {txn.totalAmount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          txn.paymentType === 'Credit'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {txn.paymentType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Credit Transactions Summary */}
      {creditTransactions.length > 0 && (
        <div className="card highlight">
          <h3 className="section-header">💳 Credit Sales Summary</h3>
          <div className="space-y-2">
            {creditTransactions.map((txn) => (
              <div key={txn.id} className="flex justify-between items-center pb-3 border-b border-gray-200 last:border-0">
                <div>
                  <p className="text-gray-700 font-medium">{txn.customer}</p>
                  <p className="text-xs text-gray-500">{txn.date} • {txn.product}</p>
                </div>
                <span className="money money-income font-bold text-lg">৳ {txn.totalAmount.toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-300 mt-4 font-bold">
              <span className="text-gray-900">Total Credit:</span>
              <span className="money money-info text-2xl">৳ {totalCreditSales.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsList;
