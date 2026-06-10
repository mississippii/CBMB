import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Receipt } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { formatMoney, formatDate } from '../../shared/utils/format';
import { Loader, EmptyRow, ErrorBanner } from '../../shared/components/Loader';
import SaleForm from './SaleForm';

const SalesPage = () => {
  const { admin } = useAuth();
  const { fetchTransactionsRange } = useData();
  const [showModal, setShowModal] = useState(false);

  // Share the cache key with TransactionsList so toggling tabs costs zero network.
  const { data: raw = [], isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.transactions.list(admin?.wholesalerId, null, null),
    queryFn: () => fetchTransactionsRange(null, null),
    enabled: Boolean(admin?.wholesalerId),
  });

  const sales = useMemo(
    () =>
      (raw || [])
        .filter((t) => (t.transactionType || '').toUpperCase() !== 'PAYMENT')
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    [raw],
  );


  return (
    <div className="space-y-5">
      <section className="inventory-hero">
        <div>
          <span className="box-eyebrow">Sales</span>
          <h3>Record &amp; track sales</h3>
        </div>
        <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={() => setShowModal(true)}>
          <Plus size={16} /> New Sale
        </button>
      </section>

      <div className="supplier-panel">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2"><Receipt size={18} className="text-blue-600" /> Recent Sales</h3>
          </div>
          <span className="badge badge-teal">{sales.length} total</span>
        </div>

        {isLoading ? (
          <Loader />
        ) : sales.length === 0 ? (
          <EmptyRow label="No sales yet. Click 'New Sale' to record your first one." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[720px] text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Customer</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Units</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Kg</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Paid</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((t) => {
                  const cancelled = String(t.description || '').toLowerCase().includes('cancellation of sale');
                  const productLabel = [t.productName, t.categoryName].filter(Boolean).join(' / ');
                  return (
                    <tr key={t.id} className={`hover:bg-slate-50 transition ${cancelled ? 'opacity-50 line-through' : ''}`}>
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3 text-slate-800">{t.customerName || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{productLabel || '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {Number(t.quantity) > 0 ? `${Number(t.quantity).toLocaleString()} ${String(t.unit || '').toUpperCase()}`.trim() : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {Number(t.saleWeightKg) > 0 ? Number(t.saleWeightKg).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 font-extrabold text-slate-900">{formatMoney(t.saleAmount)}</td>
                      <td className="px-4 py-3 text-emerald-700 font-semibold">{formatMoney(t.paymentAmount)}</td>
                      <td className="px-4 py-3 text-rose-700 font-semibold">{formatMoney(t.dueAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {queryError && <div className="mt-3"><ErrorBanner message={queryError.message || 'Failed to load sales.'} /></div>}
      </div>

      {showModal && <SaleForm onClose={() => setShowModal(false)} />}
    </div>
  );
};

export default SalesPage;
