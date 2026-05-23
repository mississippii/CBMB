import { useMemo, useState } from 'react';
import { Plus, ShoppingCart, Receipt } from 'lucide-react';
import { useData } from '../../data/DataContext';
import SaleForm from './SaleForm';

const fmt = (value) => `৳ ${(Number(value) || 0).toLocaleString()}`;
const getDateOnly = (value) => (value ? String(value).split('T')[0] : '-');

const SalesPage = () => {
  const { transactions } = useData();
  const [showModal, setShowModal] = useState(false);

  const sales = useMemo(
    () =>
      transactions
        .filter((t) => t.transactionType === 'Sale')
        .slice()
        .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)),
    [transactions],
  );

  const today = new Date().toISOString().split('T')[0];
  const todayTotal = sales
    .filter((t) => getDateOnly(t.createdAt || t.date) === today)
    .reduce((sum, t) => sum + (Number(t.totalAmount) || 0), 0);

  return (
    <div className="space-y-5">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Sales</span>
          <h3>Record &amp; track sales</h3>
          <p>Sell stock from a supplier lot to customers. Today’s sales: {fmt(todayTotal)}.</p>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Sale
        </button>
      </section>

      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Recent Sales</h3>
            <p>Most recent first</p>
          </div>
          <span className="badge badge-teal">{sales.length} total</span>
        </div>

        {sales.length === 0 ? (
          <div className="empty-state">
            <ShoppingCart size={32} className="empty-state-icon" />
            <p className="empty-state-title">No sales yet</p>
            <p className="empty-state-sub">Click “New Sale” to record your first sale.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700">Supplier</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Qty</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Discount</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Net Amount</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700">Paid</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-700">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((t) => {
                  const paid = Number(t.paymentAmount) || 0;
                  const amount = Number(t.totalAmount) || 0; // net (discount already excluded)
                  const discount = Number(t.discountAmount) || 0;
                  const status = paid >= amount && amount > 0
                    ? { label: 'Cash on', cls: 'badge-emerald' }
                    : paid <= 0
                      ? { label: 'Due', cls: 'badge-rose' }
                      : { label: 'Partial Pay', cls: 'badge-amber' };
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{getDateOnly(t.createdAt || t.date)}</td>
                      <td className="px-4 py-3 text-slate-800">{t.customer || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-medium">{t.product || '—'}</div>
                        {(() => {
                          const tail = [t.category, t.subCategoryName].filter(Boolean).join(' › ');
                          return tail ? <div className="text-xs text-slate-500">{tail}</div> : null;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{t.supplier || '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{Number(t.quantity) || 0}</td>
                      <td className="px-4 py-3 text-right">
                        {discount > 0
                          ? <span className="text-amber-700 font-semibold">− {fmt(discount)}</span>
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-900">{fmt(amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={paid >= amount ? 'text-emerald-700 font-semibold' : paid > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'}>
                          {fmt(paid)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${status.cls}`}>{status.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && <SaleForm onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default SalesPage;
