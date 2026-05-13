import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const toStartOfDay = (dateString) => new Date(`${dateString}T00:00:00`);
const toEndOfDay = (dateString) => new Date(`${dateString}T23:59:59.999`);

const TransactionsList = () => {
  const { transactions } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    if (startDate || endDate) {
      result = result.filter((transaction) => {
        const txnDate = new Date(transaction.createdAt || transaction.date);
        if (Number.isNaN(txnDate.getTime())) return false;
        if (startDate && txnDate < toStartOfDay(startDate)) return false;
        if (endDate && txnDate > toEndOfDay(endDate)) return false;
        return true;
      });
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((transaction) => {
        const saleText = `${transaction.customer || ''} ${transaction.supplier || ''} ${transaction.product || ''}`;
        const paymentText = `${transaction.partyType || ''} ${transaction.partyName || ''} ${transaction.note || ''}`;
        return `${saleText} ${paymentText}`.toLowerCase().includes(term);
      });
    }

    return result;
  }, [transactions, startDate, endDate, search]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const isPayment = transaction.transactionType === 'Payment';
        const isCustomerPayment = isPayment && transaction.partyType === 'Customer';
        const isSupplierPayment = isPayment && transaction.partyType === 'Supplier';

        if (!isPayment) {
          acc.totalSales += Number(transaction.totalAmount) || 0;
          acc.customerCashIn += Number(transaction.paymentAmount) || 0;
        } else {
          if (isCustomerPayment && transaction.paymentType === 'Cash') {
            acc.customerCashIn += Number(transaction.paymentAmount) || 0;
          }
          if (isSupplierPayment && transaction.paymentType === 'Cash') {
            acc.supplierCashOut += Number(transaction.paymentAmount) || 0;
          }
        }

        return acc;
      },
      { totalSales: 0, customerCashIn: 0, supplierCashOut: 0 },
    );
  }, [filteredTransactions]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
  };

  const getEntryTypeLabel = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      return 'Payment';
    }
    return 'Sale';
  };

  const renderParty = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      return `${transaction.partyType}: ${transaction.partyName}`;
    }
    return `${transaction.customer} ← ${transaction.supplier}`;
  };

  const renderDetails = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      const boxes = (transaction.boxReturnWooden || 0) + (transaction.boxReturnPlastic || 0);
      return (
        <>
          <p className="font-medium text-gray-900">
            {transaction.paymentType} • ৳ {(Number(transaction.totalAmount) || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Due Change: ৳ {(Number(transaction.dueAmountChange) || 0).toLocaleString()} • Box Return:{' '}
            {boxes}
            {transaction.boxJamanotChange
              ? ` • জামানত: ৳${Number(transaction.boxJamanotChange).toLocaleString()}`
              : ''}
          </p>
        </>
      );
    }

    return (
      <>
        <p className="font-medium text-gray-900">
          {transaction.product} ({transaction.quantity} × ৳{transaction.unitPrice})
        </p>
        <p className="text-xs text-gray-500">
          Paid: ৳ {(Number(transaction.paymentAmount) || 0).toLocaleString()} • Due After: ৳{' '}
          {(Number(transaction.customerNewDue) || 0).toLocaleString()}
        </p>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="card highlight">
        <h3 className="section-header">🔍 Transaction Search</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label>📅 Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label>📅 End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label>🔎 Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field"
              placeholder="Customer / Supplier / Product"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={clearFilters} className="btn-secondary flex-1">
              🔄 Clear
            </button>
            <div className="bg-indigo-100 border border-indigo-300 text-indigo-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center">
              {filteredTransactions.length}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">🛒 TOTAL SALES</p>
          <p className="text-3xl font-bold money money-income">
            ৳ {summary.totalSales.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">💵 CUSTOMER CASH IN</p>
          <p className="text-3xl font-bold money money-income">
            ৳ {summary.customerCashIn.toLocaleString()}
          </p>
        </div>
        <div className="card">
          <p className="text-gray-600 text-sm font-medium mb-2">💸 SUPPLIER CASH OUT</p>
          <p className="text-3xl font-bold money money-due">
            ৳ {summary.supplierCashOut.toLocaleString()}
          </p>
        </div>
      </div>

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
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Party</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions
                  .slice()
                  .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
                  .map((transaction) => (
                    <tr key={transaction.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900">{transaction.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            transaction.transactionType === 'Payment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {getEntryTypeLabel(transaction)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">{renderParty(transaction)}</td>
                      <td className="px-6 py-4 text-gray-700">{renderDetails(transaction)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionsList;
