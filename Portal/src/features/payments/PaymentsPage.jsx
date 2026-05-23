import { useMemo, useState } from 'react';
import { Plus, CreditCard, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useData } from '../../data/DataContext';
import PaymentForm from './PaymentForm';

const fmt = (value) => `৳ ${Math.round(Number(value) || 0).toLocaleString()}`;
const getDateOnly = (value) => (value ? String(value).split('T')[0] : '-');

const PaymentsPage = () => {
  const { transactions } = useData();
  const [showModal, setShowModal] = useState(false);

  const payments = useMemo(
    () =>
      transactions
        .filter((t) => t.transactionType === 'Payment')
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)),
    [transactions],
  );

  const today = new Date().toISOString().split('T')[0];
  const todayTotal = payments
    .filter((t) => getDateOnly(t.createdAt || t.date) === today)
    .reduce((sum, t) => sum + (Number(t.paymentAmount) || 0), 0);

  // Heuristic to classify each payment row for display only.
  // Backend stores the financial impact; this just labels the row.
  const classify = (t) => {
    const desc = String(t.description || t.paymentType || '').toLowerCase();
    if (t.customerId) return { label: 'Customer paid', dir: 'in', icon: ArrowDownRight };
    if (desc.includes('commission')) return { label: 'Commission received', dir: 'in', icon: ArrowDownRight };
    if (desc.includes('expense')) return { label: 'Expense received', dir: 'in', icon: ArrowDownRight };
    if (desc.includes('advance')) return { label: 'Shipment advance', dir: 'out', icon: ArrowUpRight };
    if (desc.includes('settlement') || desc.includes('product')) return { label: 'Paid supplier', dir: 'out', icon: ArrowUpRight };
    return { label: 'Payment', dir: 'in', icon: ArrowDownRight };
  };

  return (
    <div className="space-y-5">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Payments</span>
          <h3>Record &amp; track payments</h3>
          <p>Pay supplier dues or receive money from customers / suppliers. Today's payments: {fmt(todayTotal)}.</p>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Payment
        </button>
      </section>

      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Recent Payments</h3>
            <p>Most recent first</p>
          </div>
          <span className="badge badge-teal">{payments.length} total</span>
        </div>

        {payments.length === 0 ? (
          <div className="empty-state">
            <CreditCard size={32} className="empty-state-icon" />
            <p className="empty-state-title">No payments yet</p>
            <p className="empty-state-sub">Click "New Payment" to record your first money movement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Party</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Balance After</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((t) => {
                  const cls = classify(t);
                  const Icon = cls.icon;
                  const dirColor = cls.dir === 'in' ? 'text-emerald-700' : 'text-rose-700';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{getDateOnly(t.createdAt || t.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${dirColor}`}>
                          <Icon size={14} /> {cls.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {t.customer || t.supplier || '—'}
                      </td>
                      <td className={`px-4 py-3 text-right font-extrabold ${dirColor}`}>
                        {cls.dir === 'in' ? '+ ' : '− '}{fmt(t.paymentAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(t.customerNewDue)}</td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-[20rem]">{t.paymentType || t.note || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <PaymentForm onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default PaymentsPage;
