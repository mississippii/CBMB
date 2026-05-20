import { useCallback, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';

const toStartOfDay = (dateString) => new Date(`${dateString}T00:00:00`);
const toEndOfDay = (dateString) => new Date(`${dateString}T23:59:59.999`);
const formatCurrency = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;
const getTransactionDate = (transaction) => new Date(transaction.createdAt || transaction.date);
const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');

const TransactionsList = () => {
  const { transactions, suppliers, customers } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const ledgerTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.transactionType === 'Sale' ||
          transaction.transactionType === 'Payment' ||
          !transaction.transactionType,
      ),
    [transactions],
  );

  const supplierLookup = useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    suppliers.forEach((supplier) => {
      byId.set(Number(supplier.id), supplier);
      byName.set(String(supplier.name || '').toLowerCase(), supplier);
    });
    return { byId, byName };
  }, [suppliers]);

  const customerLookup = useMemo(() => {
    const byId = new Map();
    const byName = new Map();
    customers.forEach((customer) => {
      byId.set(Number(customer.id), customer);
      byName.set(String(customer.name || '').toLowerCase(), customer);
    });
    return { byId, byName };
  }, [customers]);

  const getTransactionPhones = useCallback(
    (transaction) => {
      const supplier =
        supplierLookup.byId.get(Number(transaction.supplierId)) ||
        (transaction.partyType === 'Supplier'
          ? supplierLookup.byId.get(Number(transaction.partyId))
          : null) ||
        supplierLookup.byName.get(String(transaction.supplier || '').toLowerCase()) ||
        supplierLookup.byName.get(String(transaction.partyName || '').toLowerCase());

      const customer =
        customerLookup.byId.get(Number(transaction.customerId)) ||
        (transaction.partyType === 'Customer'
          ? customerLookup.byId.get(Number(transaction.partyId))
          : null) ||
        customerLookup.byName.get(String(transaction.customer || '').toLowerCase()) ||
        customerLookup.byName.get(String(transaction.partyName || '').toLowerCase());

      return {
        supplierPhone: normalizePhone(supplier?.contact),
        customerPhone: normalizePhone(customer?.phone),
      };
    },
    [supplierLookup, customerLookup],
  );

  const filteredTransactions = useMemo(() => {
    let result = ledgerTransactions;

    if (typeFilter !== 'all') {
      result = result.filter((transaction) =>
        typeFilter === 'sale'
          ? transaction.transactionType !== 'Payment'
          : transaction.transactionType === 'Payment',
      );
    }

    if (startDate || endDate) {
      result = result.filter((transaction) => {
        const txnDate = getTransactionDate(transaction);
        if (Number.isNaN(txnDate.getTime())) return false;
        if (startDate && txnDate < toStartOfDay(startDate)) return false;
        if (endDate && txnDate > toEndOfDay(endDate)) return false;
        return true;
      });
    }

    if (search.trim()) {
      const phoneTerm = normalizePhone(search);
      result = result.filter((transaction) => {
        const { supplierPhone, customerPhone } = getTransactionPhones(transaction);
        return (
          Boolean(phoneTerm) &&
          (supplierPhone.includes(phoneTerm) || customerPhone.includes(phoneTerm))
        );
      });
    }

    return result.slice().sort((a, b) => getTransactionDate(b) - getTransactionDate(a));
  }, [ledgerTransactions, typeFilter, startDate, endDate, search, getTransactionPhones]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, transaction) => {
        const isPayment = transaction.transactionType === 'Payment';
        const isSale = !isPayment;

        if (isSale) {
          acc.salesCount += 1;
          acc.totalSales += Number(transaction.totalAmount) || 0;
          acc.customerCashIn += Number(transaction.paymentAmount) || 0;
          acc.customerDueAdded += Math.max(
            (Number(transaction.totalAmount) || 0) - (Number(transaction.paymentAmount) || 0),
            0,
          );
        } else {
          acc.paymentsCount += 1;
          if (transaction.partyType === 'Customer' && transaction.paymentType === 'Cash') {
            acc.customerCashIn += Number(transaction.paymentAmount) || 0;
            acc.boxJamanotChange += Number(transaction.boxJamanotChange) || 0;
          }
          if (transaction.partyType === 'Supplier' && transaction.paymentType === 'Cash') {
            acc.supplierCashOut += Number(transaction.paymentAmount) || 0;
          }
          acc.boxesReturned += (Number(transaction.boxReturnWooden) || 0) + (Number(transaction.boxReturnPlastic) || 0);
        }

        return acc;
      },
      {
        salesCount: 0,
        paymentsCount: 0,
        totalSales: 0,
        customerCashIn: 0,
        customerDueAdded: 0,
        supplierCashOut: 0,
        boxesReturned: 0,
        boxJamanotChange: 0,
      },
    );
  }, [filteredTransactions]);

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearch('');
    setTypeFilter('all');
  };

  const getTypeLabel = (transaction) => (transaction.transactionType === 'Payment' ? 'Payment' : 'Sale');
  const salesForReport = filteredTransactions.filter((transaction) => transaction.transactionType !== 'Payment');
  const paymentsForReport = filteredTransactions.filter((transaction) => transaction.transactionType === 'Payment');

  const getSupplierName = (transaction) => {
    if (transaction.supplier) return transaction.supplier;
    if (transaction.partyType === 'Supplier') return transaction.partyName || '-';
    return '-';
  };

  const getCustomerName = (transaction) => {
    if (transaction.customer) return transaction.customer;
    if (transaction.partyType === 'Customer') return transaction.partyName || '-';
    return '-';
  };

  const renderAmount = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      return formatCurrency(transaction.paymentAmount || transaction.totalAmount);
    }
    return formatCurrency(transaction.totalAmount);
  };

  const getPaymentOperationLabel = (transaction) => {
    const value = String(transaction.paymentType || transaction.note || '').toUpperCase();
    if (value.includes('PRODUCT_PAYMENT')) return 'Supplier due paid';
    if (value.includes('COMMISSION_RECEIVE')) return 'Commission received';
    if (value.includes('EXPENSE_RECEIVE')) return 'Extra expenses received';
    if (value.includes('SUPPLIER_CRATE_GIVE')) return 'Crates borrowed by supplier';
    if (value.includes('SUPPLIER_CRATE_RETURN')) return 'Crates received from supplier';
    if (value.includes('CASH_AND_BOX_RETURN')) return 'Customer cash and crates received';
    if (value.includes('BOX_RETURN')) return 'Customer crates received';
    if (value.includes('CASH_RECEIVE')) return 'Customer cash received';
    return transaction.transactionType === 'Payment' ? 'Payment recorded' : 'Sale recorded';
  };

  const renderDetails = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      const bangla = Number(transaction.boxReturnWooden || transaction.banglaCrates || 0);
      const china = Number(transaction.boxReturnPlastic || transaction.chinaCrates || 0);
      const parts = [getPaymentOperationLabel(transaction)];
      if (bangla > 0 || china > 0) parts.push('Crates B:' + bangla + ' C:' + china);
      if (Number(transaction.boxJamanotChange) !== 0) parts.push('Jamanot ' + formatCurrency(transaction.boxJamanotChange));
      if (Number(transaction.customerNewDue) > 0) parts.push('Due ' + formatCurrency(transaction.customerNewDue));
      return parts.join(' • ');
    }

    const productLabel = [transaction.product, transaction.category && transaction.category !== 'No Category' ? transaction.category : null]
      .filter(Boolean)
      .join(' / ');
    const quantity = Number(transaction.quantity) > 0
      ? (transaction.quantity + ' ' + String(transaction.unit || '').toUpperCase()).trim()
      : '';
    const parts = [productLabel || 'Sale', quantity].filter(Boolean);
    if (Number(transaction.paymentAmount) > 0) parts.push('Paid ' + formatCurrency(transaction.paymentAmount));
    return parts.join(' • ');
  };

  const renderDetailText = (transaction) => (
    <span className="transaction-detail-text">{renderDetails(transaction)}</span>
  );

  const exportPdf = () => {
    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const renderRows = (items) =>
      items
        .map(
          (transaction) => `
            <tr>
              <td>${escapeHtml(transaction.date)}</td>
              <td>${escapeHtml(getSupplierName(transaction))}</td>
              <td>${escapeHtml(getCustomerName(transaction))}</td>
              <td class="right">${escapeHtml(renderAmount(transaction))}</td>
              <td>${escapeHtml(renderDetails(transaction))}</td>
            </tr>
          `,
        )
        .join('');

    const saleTotal = salesForReport.reduce((sum, transaction) => sum + (Number(transaction.totalAmount) || 0), 0);
    const paymentTotal = paymentsForReport.reduce((sum, transaction) => sum + (Number(transaction.paymentAmount || transaction.totalAmount) || 0), 0);
    const saleTotalRow = '<tr class="total-row"><td colspan="3">Total Sales</td><td class="right">' + escapeHtml(formatCurrency(saleTotal)) + '</td><td></td></tr>';
    const paymentTotalRow = '<tr class="total-row"><td colspan="3">Total Payments</td><td class="right">' + escapeHtml(formatCurrency(paymentTotal)) + '</td><td></td></tr>';

    const reportWindow = window.open('', '_blank');
    if (!reportWindow) return;

    reportWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title></title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; color: #0f172a; font-family: Arial, Helvetica, sans-serif; padding: 24px 24px 52px; background: #ffffff; }
            .page { max-width: 1120px; margin: 0 auto; }
            .header { border-bottom: 3px solid #307d7e; padding-bottom: 14px; margin-bottom: 20px; text-align: center; }
            .logo { width: 48px; height: 48px; display: grid; place-items: center; margin: 0 auto 8px; border-radius: 14px; color: #fff; background: linear-gradient(135deg, #255f60, #307d7e); font-size: 18px; font-weight: 900; }
            h1 { margin: 0; font-size: 21px; }
            .solution { margin-top: 5px; color: #255f60; font-size: 11px; font-weight: 800; }
            h2 { margin: 22px 0 8px; font-size: 15px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
            th { background: #e9f4f4; color: #255f60; text-align: left; padding: 8px; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
            td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: top; color: #334155; line-height: 1.35; }
            tbody tr:nth-child(even) td { background: #f8fafc; }
            .right { text-align: right; white-space: nowrap; }
            .total-row td { background: #f1f5f9 !important; color: #0f172a; font-weight: 900; }
            .print-footer { position: fixed; left: 0; right: 0; bottom: 12px; color: #64748b; font-size: 10px; }
            .page-number { position: absolute; left: 50%; transform: translateX(-50%); }
            .page-number::after { content: counter(page); }
            .generated-at { position: absolute; right: 24px; }
            @page { size: A4 landscape; margin: 12mm; }
            @media print { body { padding: 0 0 38px; } .generated-at { right: 0; } }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header">
              <div class="logo">CB</div>
              <h1>CBTrading Transaction Invoice</h1>
              <div class="solution">Digital solution by CBTrading Software Team</div>
            </div>

            <h2>Sales</h2>
            <table>
              <thead><tr><th>Date</th><th>Supplier</th><th>Customer</th><th class="right">Amount</th><th>Details</th></tr></thead>
              <tbody>${renderRows(salesForReport) || '<tr><td colspan="5">No sales found.</td></tr>'}${saleTotalRow}</tbody>
            </table>

            <h2>Payments</h2>
            <table>
              <thead><tr><th>Date</th><th>Supplier</th><th>Customer</th><th class="right">Amount</th><th>Details</th></tr></thead>
              <tbody>${renderRows(paymentsForReport) || '<tr><td colspan="5">No payments found.</td></tr>'}${paymentTotalRow}</tbody>
            </table>
          </div>
          <div class="print-footer">
            <span class="page-number">Page </span>
            <span class="generated-at">${escapeHtml(new Date().toLocaleString())}</span>
          </div>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  return (
    <div className="space-y-4">
      <div className="transaction-filter-panel">
        <div className="transaction-filter-header">
          <div>
            <h3>Transactions</h3>
            <p>Filter sales and payments by type, date, or party phone ID.</p>
          </div>
          <span className="transaction-filter-count">{filteredTransactions.length} entries</span>
        </div>

        <div className="transaction-filter-grid">
          <div className="filter-control type">
            <label>Type</label>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              className="input-field"
            >
              <option value="all">All Transactions</option>
              <option value="sale">Sale</option>
              <option value="payment">Payment</option>
            </select>
          </div>
          <div className="filter-control phone">
            <label>Customer / Supplier ID</label>
            <input
              type="text"
              inputMode="tel"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input-field"
              placeholder="Phone number, e.g. 01711234567"
            />
          </div>
          <div className="filter-control">
            <label>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="input-field"
            />
          </div>
          <div className="filter-control">
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="input-field"
            />
          </div>
          <div className="filter-control clear">
            <button onClick={clearFilters} className="btn-secondary w-full">
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="supplier-panel">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3>Transaction Ledger</h3>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#307D7E]">
            {filteredTransactions.length} entries
          </span>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
            No sale or payment transactions found.
          </div>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{transaction.date}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="font-bold uppercase tracking-wider text-slate-400">Supplier</p>
                          <p className="mt-0.5 font-semibold text-slate-700">{getSupplierName(transaction)}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase tracking-wider text-slate-400">Customer</p>
                          <p className="mt-0.5 font-semibold text-slate-700">{getCustomerName(transaction)}</p>
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        transaction.transactionType === 'Payment'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {getTypeLabel(transaction)}
                    </span>
                  </div>
                  <p className="text-lg font-extrabold text-slate-900">{renderAmount(transaction)}</p>
                  {renderDetailText(transaction)}
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
              <table className="transaction-ledger-table w-full min-w-[960px] text-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Supplier</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="font-semibold text-slate-900">{transaction.date}</td>
                      <td>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            transaction.transactionType === 'Payment'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {getTypeLabel(transaction)}
                        </span>
                      </td>
                      <td className="font-medium text-slate-700">{getSupplierName(transaction)}</td>
                      <td className="font-medium text-slate-700">{getCustomerName(transaction)}</td>
                      <td className="text-right font-extrabold text-slate-900">{renderAmount(transaction)}</td>
                      <td className="transaction-details-cell">{renderDetailText(transaction)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4 flex justify-end">
          <button onClick={exportPdf} className="btn-primary w-full sm:w-auto">
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionsList;
