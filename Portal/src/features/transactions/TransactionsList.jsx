import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { TablePager, usePagination } from '../../shared/components';
import { formatDate, formatDateTime } from '../../shared/utils/format';

const toStartOfDay = (dateString) => new Date(`${dateString}T00:00:00`);
const toEndOfDay = (dateString) => new Date(`${dateString}T23:59:59.999`);
const formatCurrency = (value) => `৳ ${Math.ceil(Number(value) || 0).toLocaleString()}`;
const METHOD_LABELS = { CASH: 'Cash', BANK: 'Bank', BKASH: 'bKash', NAGAD: 'Nagad', OTHER: 'Other' };
const getTransactionDate = (transaction) => new Date(transaction.createdAt || transaction.date);
const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '');

const TransactionsList = () => {
  const { admin } = useAuth();
  const { suppliers, customers, fetchTransactionsRange } = useData();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Server-side date filter for the heavy query; client-side type/search filter stays local.
  const fromIso = startDate ? `${startDate}T00:00:00` : null;
  const toIso = endDate ? `${endDate}T23:59:59.999` : null;

  const { data: transactionsRaw = [] } = useQuery({
    queryKey: queryKeys.transactions.list(admin?.wholesalerId, fromIso, toIso),
    queryFn: () => fetchTransactionsRange(fromIso, toIso),
    enabled: Boolean(admin?.wholesalerId),
  });

  // Map backend shape to the existing client model (same as DataContext.mapTransaction).
  const transactions = useMemo(() => (transactionsRaw || []).map((t) => ({
    id: t.id,
    date: t.createdAt?.split('T')[0] || '',
    createdAt: t.createdAt || new Date().toISOString(),
    transactionType: t.transactionType === 'PAYMENT' ? 'Payment' : 'Sale',
    saleId: t.saleId || null,
    transactionCode: t.transactionCode || null,
    paymentId: t.paymentId || null,
    customerId: t.wholesalerCustomerId,
    customer: t.customerName || null,
    customerPhone: t.customerPhone || null,
    supplierId: t.wholesalerSupplierId,
    supplier: t.supplierName || null,
    supplierPhone: t.supplierPhone || null,
    productId: t.productId || null,
    product: t.productName || null,
    categoryId: t.categoryId || null,
    category: t.categoryName || null,
    subCategoryId: t.subCategoryId || null,
    subCategoryName: t.subCategoryName || '',
    quantity: Number(t.quantity) || 0,
    unit: String(t.unit || '').toLowerCase(),
    saleWeightKg: Number(t.saleWeightKg) || 0,
    unitPrice: Number(t.unitPrice) || 0,
    totalAmount: Number(t.saleAmount) || 0,
    grossAmount: Number(t.grossAmount) || 0,
    discountAmount: Number(t.discountAmount) || 0,
    paymentAmount: Number(t.paymentAmount) || 0,
    customerNewDue: Number(t.dueAmount) || 0,
    cratesReturned: Number(t.cratesReturned) || 0,
    paymentOperationType: t.paymentType || '',
    paymentType: t.paymentType || t.description || '',
    paymentMethod: t.paymentMethod || '',
    note: t.description || '',
  })), [transactionsRaw]);

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

  const { pageItems: pagedTransactions, ...pager } = usePagination(
    filteredTransactions, 15, [typeFilter, startDate, endDate, search],
  );

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


  const getItemParts = (transaction) => {
    if (transaction.transactionType !== 'Payment') {
      const parts = [];
      if (transaction.product) {
        parts.push(['Includes', [transaction.product, transaction.category && transaction.category !== 'No Category' ? transaction.category : null, transaction.subCategoryName || null].filter(Boolean).join(' · ')]);
      }
      if (Number(transaction.quantity) > 0) {
        parts.push(['Qty', transaction.quantity + ' ' + String(transaction.unit || '').toUpperCase()]);
      }
      if (Number(transaction.saleWeightKg) > 0) {
        parts.push(['Kg', Number(transaction.saleWeightKg).toLocaleString()]);
      }
      return {
        title: 'Sale recorded',
        meta: parts.map(([label, value]) => label + ': ' + value).join(' · '),
      };
    }

    return { title: getPaymentOperationLabel(transaction), meta: transaction.note || '' };
  };

  // Payment method column: how it was paid, or "Due" when a sale was taken on credit.
  const getMethod = (transaction) => {
    const method = String(transaction.paymentMethod || '').toUpperCase();
    if (method && method !== 'NONE') return { label: METHOD_LABELS[method] || 'Other', due: false };
    if (transaction.transactionType !== 'Payment') return { label: 'Due', due: true };
    return { label: '—', due: false };
  };

  const getPaymentOperationLabel = (transaction) => {
    const value = String(transaction.paymentType || transaction.note || '').toUpperCase();
    if (value.includes('PRODUCT_PAYMENT')) return 'Supplier due paid';
    if (value.includes('COMMISSION_RECEIVE')) return 'Commission received';
    if (value.includes('EXPENSE_RECEIVE')) return 'Extra expenses received';
    if (value.includes('SUPPLIER_CRATE_GIVE')) return 'Crates borrowed by supplier';
    if (value.includes('SUPPLIER_CRATE_RETURN')) return 'Crates received from supplier';
    if (value.includes('CASH_AND_CRATE_RETURN')) return 'Customer cash and crates received';
    if (value.includes('CRATE_RETURN')) return 'Customer crates received';
    if (value.includes('CASH_RECEIVE')) return 'Customer cash received';
    return transaction.transactionType === 'Payment' ? 'Payment recorded' : 'Sale recorded';
  };

  const renderDetails = (transaction) => {
    if (transaction.transactionType === 'Payment') {
      const hasPaymentType = String(transaction.paymentOperationType || '').trim().length > 0;
      const hasParty = transaction.customer || transaction.supplier;
      const description = String(transaction.note || '').trim();
      if (!hasPaymentType && !hasParty && description) return description;

      const crates = Number(transaction.cratesReturned || 0);
      const parts = [getPaymentOperationLabel(transaction)];
      if (crates > 0) parts.push('Crates ' + crates);
      if (Number(transaction.customerNewDue) > 0) parts.push('Due ' + formatCurrency(transaction.customerNewDue));
      return parts.join(' • ');
    }

    const parts = ['Sale recorded'];
    if (transaction.supplier) parts.push('supplier share');
    if (Number(transaction.paymentAmount) > 0) parts.push('paid ' + formatCurrency(transaction.paymentAmount));
    return parts.join(' • ');
  };

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
              <td>${escapeHtml(formatDate(transaction.createdAt || transaction.date))}</td>
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
            .header { border-bottom: 3px solid #1d63ed; padding-bottom: 14px; margin-bottom: 20px; text-align: center; }
            .logo { width: 48px; height: 48px; display: grid; place-items: center; margin: 0 auto 8px; border-radius: 14px; color: #fff; background: linear-gradient(135deg, #1755c9, #1d63ed); font-size: 18px; font-weight: 900; }
            h1 { margin: 0; font-size: 21px; }
            .solution { margin-top: 5px; color: #1755c9; font-size: 11px; font-weight: 800; }
            h2 { margin: 22px 0 8px; font-size: 15px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 16px; }
            th { background: #eff6ff; color: #1755c9; text-align: left; padding: 8px; border: 1px solid #cbd5e1; font-size: 10px; text-transform: uppercase; }
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
            <span class="generated-at">${escapeHtml(formatDateTime(new Date()))}</span>
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
      <div className="profile-workspace">
        <main className="profile-main-stack">
          <div className="supplier-panel">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3>Transaction Ledger</h3>
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-[#1d63ed]">
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
              {pagedTransactions.map((transaction) => {
                const method = getMethod(transaction);
                return (
                  <div key={transaction.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{formatDate(transaction.createdAt || transaction.date)}</p>
                        {transaction.transactionCode ? <p className="font-mono text-[11px] font-semibold tracking-wide text-slate-400">{transaction.transactionCode}</p> : null}
                        <div className="mt-1">
                          {(() => {
                            const item = getItemParts(transaction);
                            return (
                              <>
                                <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                                {item.meta ? <p className="text-xs font-medium text-slate-500">{item.meta}</p> : null}
                              </>
                            );
                          })()}
                        </div>
                        <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
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
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-lg font-extrabold text-slate-900">{renderAmount(transaction)}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${method.due ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                        {method.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
              <table className="center-table w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Details</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Supplier</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                    <th className="px-4 py-3 font-semibold text-slate-700">Payment Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedTransactions.map((transaction) => {
                    const method = getMethod(transaction);
                    return (
                      <tr key={transaction.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                          {formatDate(transaction.createdAt || transaction.date)}
                          {transaction.transactionCode ? <span className="block font-mono text-[11px] font-semibold tracking-wide text-slate-400">{transaction.transactionCode}</span> : null}
                        </td>
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-left">
                          {(() => {
                            const item = getItemParts(transaction);
                            return (
                              <>
                                <span className="font-semibold text-slate-900">{item.title}</span>
                                {item.meta ? <span className="block text-xs text-slate-500">{item.meta}</span> : null}
                              </>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-800">{getSupplierName(transaction)}</td>
                        <td className="px-4 py-3 text-slate-800">{getCustomerName(transaction)}</td>
                        <td className="px-4 py-3 font-extrabold text-slate-900">{renderAmount(transaction)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${method.due ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                            {method.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <TablePager {...pager} />
      </div>
        </main>

        <aside className="profile-side-stack">
          <div className="supplier-panel">
            <h3>Transaction Actions</h3>
            <button onClick={exportPdf} className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2">
              Export
            </button>
          </div>
          <div className="transaction-filter-panel">
        <div className="transaction-filter-header">
          <div>
            <h3 className="flex items-center gap-2"><Filter size={16} className="text-blue-600" /> Filters</h3>
          </div>
          <span className="transaction-filter-count">{filteredTransactions.length}</span>
        </div>

        <div className="grid gap-3">
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
        </aside>
      </div>
    </div>
  );
};

export default TransactionsList;
