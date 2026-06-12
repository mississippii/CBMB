import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Plus, Wallet } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import Modal from '../../shared/components/Modal';
import { TablePager, usePagination, DateRangeFilter } from '../../shared/components';
import { formatDate } from '../../shared/utils/format';

const fmt = (value) => '৳ ' + (Number(value) || 0).toLocaleString();

const PAYMENT_METHODS = [
  { value: 'CASH',  label: 'Cash' },
  { value: 'BANK',  label: 'Bank' },
  { value: 'BKASH', label: 'bKash' },
  { value: 'NAGAD', label: 'Nagad' },
  { value: 'OTHER', label: 'Other' },
];

// Local calendar date (yyyy-mm-dd) — avoids the UTC day-shift of toISOString().
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => isoLocal(new Date());
const toStartOfDay = (s) => new Date(`${s}T00:00:00`).toISOString();
const toEndOfDay = (s) => new Date(`${s}T23:59:59.999`).toISOString();

const ShopExpensesPage = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { fetchShopExpenseCategories, fetchShopExpenses, createShopExpense, cancelShopExpense } = useData();
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());

  const [showForm, setShowForm] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formDate, setFormDate] = useState(todayIso());
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  const fromIso = startDate ? toStartOfDay(startDate) : null;
  const toIso = endDate ? toEndOfDay(endDate) : null;

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.shopExpenses.categories(admin?.wholesalerId),
    queryFn: () => fetchShopExpenseCategories(),
    enabled: Boolean(admin?.wholesalerId),
    staleTime: 5 * 60_000,
  });

  const { data: expenses = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.shopExpenses.list(admin?.wholesalerId, fromIso, toIso),
    queryFn: () => fetchShopExpenses(fromIso, toIso),
    enabled: Boolean(admin?.wholesalerId),
  });
  const error = queryError ? (queryError.message || 'Failed to load.') : '';

  const invalidateShopExpenses = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.shopExpenses.root(admin?.wholesalerId) });
    queryClient.invalidateQueries({ queryKey: ['dashboardSummary', admin?.wholesalerId] });
    queryClient.invalidateQueries({ queryKey: ['cash', admin?.wholesalerId] });
  };

  const createMutation = useMutation({ mutationFn: (p) => createShopExpense(p), onSuccess: invalidateShopExpenses });
  const cancelMutation = useMutation({ mutationFn: ({ id, reason }) => cancelShopExpense(id, reason), onSuccess: invalidateShopExpenses });
  const formBusy = createMutation.isPending;
  const cancelBusy = cancelMutation.isPending;

  const totals = useMemo(() => {
    const active = expenses.filter((e) => e.status !== 'CANCELLED');
    const total = active.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const byCategory = new Map();
    active.forEach((e) => {
      const key = e.categoryName || 'Other';
      byCategory.set(key, (byCategory.get(key) || 0) + (Number(e.amount) || 0));
    });
    return {
      total,
      count: active.length,
      topCategories: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3),
    };
  }, [expenses]);

  const { pageItems: pagedExpenses, ...expensePager } = usePagination(expenses, 15, [startDate, endDate]);

  const resetForm = () => {
    setFormCategoryId(''); setFormAmount(''); setFormPaymentMethod('CASH');
    setFormDate(todayIso()); setFormNote(''); setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    const amount = Number(formAmount);
    if (!amount || amount <= 0) { setFormError('Amount must be greater than zero.'); return; }
    if (!formCategoryId) { setFormError('Pick a category.'); return; }
    try {
      await createMutation.mutateAsync({
        categoryId: Number(formCategoryId),
        amount,
        paymentMethod: formPaymentMethod,
        expenseDate: new Date(`${formDate}T${new Date().toTimeString().slice(0, 8)}`).toISOString(),
        note: formNote.trim() || null,
      });
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save.');
    }
  };

  const handleCancel = async () => {
    if (!cancelTargetId) return;
    setCancelError('');
    try {
      await cancelMutation.mutateAsync({ id: cancelTargetId, reason: cancelReason });
      setCancelTargetId(null);
      setCancelReason('');
    } catch (err) {
      setCancelError(err.message || 'Failed to cancel.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="inventory-hero">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Wallet size={22} />
          </div>
          <div>
            <span className="box-eyebrow">Shop Expenses</span>
            <h3>Shop overhead</h3>
            <p>Rent, salary, utility, lunch, tax</p>
          </div>
        </div>
      </section>

      <div className="profile-workspace">
        <main className="profile-main-stack">
          {/* Entries */}
          <section className="supplier-panel">
        <div className="flex items-center justify-between">
          <h3>Entries</h3>
          <span className="badge badge-rose">{expenses.length} rows</span>
        </div>

        {expenses.length === 0 ? (
          <div className="empty-state mt-4">{loading ? 'Loading…' : 'No expenses in this period.'}</div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="center-table w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 font-semibold text-slate-700">Date</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Category</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Amount</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Method</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Note</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedExpenses.map((expense) => {
                  const cancelled = expense.status === 'CANCELLED';
                  return (
                    <tr key={expense.id} className={`transition ${cancelled ? 'opacity-50 line-through' : 'hover:bg-slate-50'}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-800">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{expense.categoryName}</td>
                      <td className="px-4 py-3 font-extrabold text-slate-900 tabular-nums">{fmt(expense.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="badge badge-teal">{expense.paymentMethod}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{expense.note || '—'}</td>
                      <td className="px-4 py-3">
                        {!cancelled && (
                          <button type="button" onClick={() => { setCancelTargetId(expense.id); setCancelReason(''); setCancelError(''); }}
                            className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100">
                            <Ban size={11} /> Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <TablePager {...expensePager} />
          </div>
        )}
        {error && (<div className="status-error mt-3"><span>!</span><span>{error}</span></div>)}
          </section>

        </main>

        <aside className="profile-side-stack">
          <div className="supplier-panel">
            <h3>Expense Actions</h3>
            <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary mt-3 inline-flex w-full items-center justify-center gap-2">
              <Plus size={16} /> New Expense
            </button>
          </div>
          {/* Filters + KPIs */}
          <section className="supplier-panel">
        <DateRangeFilter from={startDate} to={endDate} setFrom={setStartDate} setTo={setEndDate} />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white px-3.5 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Period Total</p>
            <p className="mt-1 text-xl font-extrabold leading-tight text-rose-600 tabular-nums">{fmt(totals.total)}</p>
            <p className="text-[11px] text-slate-400">{totals.count} entries</p>
          </div>
          {totals.topCategories.map(([name, amount]) => (
            <div key={name} className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-500">{name}</p>
              <p className="mt-1 text-xl font-extrabold leading-tight text-slate-900 tabular-nums">{fmt(amount)}</p>
            </div>
          ))}
        </div>
      </section>

        </aside>
      </div>

      {/* Add modal */}
      <Modal
        open={showForm}
        onClose={() => { if (!formBusy) setShowForm(false); }}
        title="Add shop expense"
        icon={Wallet}
        iconClass="bg-rose-100 text-rose-600"
        maxWidth="32rem"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} disabled={formBusy} className="btn-secondary">Cancel</button>
            <button type="submit" form="shop-expense-form" disabled={formBusy} className="btn-primary">{formBusy ? 'Saving…' : 'Save'}</button>
          </div>
        )}
      >
        <form id="shop-expense-form" onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</label>
              <select value={formCategoryId} onChange={(e) => setFormCategoryId(e.target.value)} className="input-field mt-1 w-full" required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Amount (৳)</label>
              <input type="number" inputMode="decimal" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="input-field mt-1 w-full" placeholder="0.00" required />
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Payment</label>
              <select value={formPaymentMethod} onChange={(e) => setFormPaymentMethod(e.target.value)} className="input-field mt-1 w-full">
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</label>
              <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="input-field mt-1 w-full" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Note (optional)</label>
            <input type="text" value={formNote} onChange={(e) => setFormNote(e.target.value)} className="input-field mt-1 w-full" placeholder="e.g. May salary" />
          </div>
          {formError && (<div className="status-error"><span>!</span><span>{formError}</span></div>)}
        </form>
      </Modal>

      {/* Cancel modal */}
      <Modal
        open={cancelTargetId != null}
        onClose={() => { if (!cancelBusy) setCancelTargetId(null); }}
        title="Cancel this expense?"
        icon={Ban}
        iconClass="bg-rose-100 text-rose-600"
        maxWidth="28rem"
        footer={(
          <div className="flex w-full justify-end gap-2">
            <button type="button" onClick={() => setCancelTargetId(null)} disabled={cancelBusy} className="btn-secondary">Keep</button>
            <button type="button" onClick={handleCancel} disabled={cancelBusy} className="btn-danger">{cancelBusy ? 'Cancelling…' : 'Confirm Cancel'}</button>
          </div>
        )}
      >
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reason (optional)</label>
            <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="input-field mt-1 w-full" placeholder="e.g. duplicate entry" />
          </div>
          {cancelError && (<div className="status-error"><span>!</span><span>{cancelError}</span></div>)}
        </div>
      </Modal>
    </div>
  );
};

export default ShopExpensesPage;
