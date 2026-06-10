import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Receipt, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { formatMoney, formatDate } from '../../shared/utils/format';
import { Loader, EmptyRow, ErrorBanner } from '../../shared/components/Loader';
import PaymentForm from './PaymentForm';

/**
 * Classify a Transaction row as money-in vs money-out and produce a stable label.
 *
 * Decision order (most reliable signal first):
 *   1. Customer-side row → money IN. Use payment_type enum when present (CASH_RECEIVE /
 *      CRATE_RETURN / CASH_AND_CRATE_RETURN) for a precise label.
 *   2. Supplier-side row → look at the SupplierSettlement type embedded in the
 *      description. PRODUCT_PAYMENT + ADVANCE = OUT; COMMISSION/EXPENSE_RECEIVE = IN.
 *   3. Everything else = IN by default.
 *
 * Description-based supplier classification is still a fallback because
 * TransactionResponse doesn't carry a dedicated `settlementType` field yet
 * (on the Near-Term Gaps list).
 */
const classify = (t) => {
  const isCustomerSide = Boolean(t.customerId || t.wholesalerCustomerId);
  const isSupplierSide = Boolean(t.supplierId || t.wholesalerSupplierId);
  const pt = String(t.paymentType || t.paymentOperationType || '').toUpperCase();
  const desc = String(t.description || t.note || '').toLowerCase();

  if (isCustomerSide) {
    if (pt.includes('CRATE_RETURN') && pt.includes('CASH')) {
      return { label: 'Customer cash + crates', dir: 'in', icon: ArrowDownRight };
    }
    if (pt.includes('CRATE_RETURN')) {
      return { label: 'Customer crate return', dir: 'in', icon: ArrowDownRight };
    }
    if (pt.includes('CASH_RECEIVE')) {
      return { label: 'Customer cash received', dir: 'in', icon: ArrowDownRight };
    }
    if (desc.includes('crate borrow')) {
      return { label: 'Customer crate borrow', dir: 'in', icon: ArrowDownRight };
    }
    return { label: 'Customer payment', dir: 'in', icon: ArrowDownRight };
  }

  if (isSupplierSide) {
    if (desc.includes('commission')) {
      return { label: 'Commission received', dir: 'in', icon: ArrowDownRight };
    }
    if (desc.includes('expense received') || desc.includes('expense money received')) {
      return { label: 'Expense reimbursed', dir: 'in', icon: ArrowDownRight };
    }
    if (desc.includes('advance')) {
      return { label: 'Shipment advance', dir: 'out', icon: ArrowUpRight };
    }
    if (desc.includes('crates returned from')) {
      return { label: 'Supplier crate return', dir: 'in', icon: ArrowDownRight };
    }
    if (desc.includes('crates given to')) {
      return { label: 'Supplier crate give', dir: 'out', icon: ArrowUpRight };
    }
    if (desc.includes('product payment') || desc.includes('product payable') || desc.includes('paid supplier')) {
      return { label: 'Paid supplier', dir: 'out', icon: ArrowUpRight };
    }
    return { label: 'Supplier movement', dir: 'in', icon: ArrowDownRight };
  }

  return { label: 'Payment', dir: 'in', icon: ArrowDownRight };
};

const PaymentsPage = () => {
  const { admin } = useAuth();
  const { fetchTransactionsRange } = useData();
  const [showModal, setShowModal] = useState(false);

  // Cache key shared with TransactionsList + SalesPage so tab toggles are free.
  const { data: raw = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.transactions.list(admin?.wholesalerId, null, null),
    queryFn: () => fetchTransactionsRange(null, null),
    enabled: Boolean(admin?.wholesalerId),
  });

  const payments = useMemo(
    () =>
      (raw || [])
        .filter((t) => (t.transactionType || '').toUpperCase() === 'PAYMENT')
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [raw],
  );


  return (
    <div className="space-y-5">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Payments</span>
          <h3>Record &amp; track payments</h3>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Payment
        </button>
      </section>

      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Recent Payments</h3>
          </div>
          <span className="badge badge-teal">{payments.length} total</span>
        </div>

        {isLoading ? (
          <Loader />
        ) : payments.length === 0 ? (
          <EmptyRow label="No payments yet. Click 'New Payment' to record your first money movement." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Party</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Balance After</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((t) => {
                  const cls = classify(t);
                  const Icon = cls.icon;
                  const dirColor = cls.dir === 'in' ? 'text-emerald-700' : 'text-rose-700';
                  const cancelled = String(t.description || '').toLowerCase().includes('cancellation of');
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition ${cancelled ? 'opacity-50 line-through' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${dirColor}`}>
                          <Icon size={14} /> {cls.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">{t.customerName || t.supplierName || '—'}</td>
                      <td className={`px-4 py-3 font-extrabold ${dirColor}`}>
                        {cls.dir === 'in' ? '+ ' : '− '}{formatMoney(t.paymentAmount)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatMoney(t.dueAmount)}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[20rem]">{t.description || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {queryError && <div className="mt-3"><ErrorBanner message={queryError.message || 'Failed to load payments.'} /></div>}
      </div>

      {showModal && <PaymentForm onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default PaymentsPage;
