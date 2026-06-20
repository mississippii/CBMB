import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Filter, Plus, Wallet } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import Modal from '../../shared/components/Modal';
import { TablePager, usePagination, DateRangeFilter, ConfirmDialog } from '../../shared/components';
import { formatDate } from '../../shared/utils/format';

const fmt = (value) => '৳ ' + Math.ceil(Number(value) || 0).toLocaleString();

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
const toStartOfDay = (s) => `${s}T00:00:00`;
const toEndOfDay = (s) => `${s}T23:59:59.999`;
const currentLocalTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const ShopExpensesPage = () => {
  const { admin } = useAuth();
  const queryClient = useQueryClient();
  const { fetchShopExpenseCategories, fetchShopExpenses, createShopExpense } = useData();
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());

  const [showForm, setShowForm] = useState(false);
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMethod, setFormPaymentMethod] = useState('CASH');
  const [formDate, setFormDate] = useState(todayIso());
  const [formNote, setFormNote] = useState('');
  const [formError, setFormError] = useState('');

  const [showSaveWarning, setShowSaveWarning] = useState(false);

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
  const formBusy = createMutation.isPending;

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
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [expenses]);

  const { pageItems: pagedExpenses, ...expensePager } = usePagination(expenses, 15, [startDate, endDate]);

  const resetForm = () => {
    setFormCategoryId(''); setFormAmount(''); setFormPaymentMethod('CASH');
    setFormDate(todayIso()); setFormNote(''); setFormError('');
  };

  // Step 1 — validate, then ask for confirmation. Expenses are final once saved.
  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    const amount = Number(formAmount);
    if (!amount || amount <= 0) { setFormError('Amount must be greater than zero.'); return; }
    if (!formCategoryId) { setFormError('Pick a category.'); return; }
    setShowSaveWarning(true);
  };

  // Step 2 — actually save after the user confirms the warning.
  const handleConfirmSave = async () => {
    setFormError('');
    try {
      await createMutation.mutateAsync({
        categoryId: Number(formCategoryId),
        amount: Number(formAmount),
        paymentMethod: formPaymentMethod,
        expenseDate: `${formDate}T${currentLocalTime()}`,
        note: formNote.trim() || null,
      });
      setShowSaveWarning(false);
      resetForm();
      setShowForm(false);
    } catch (err) {
      setShowSaveWarning(false);
      setFormError(err.message || 'Failed to save.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="profile-workspace">
        <main className="profile-main-stack">
          {/* Header */}
          <section className="inventory-hero" style={{ padding: '0.75rem 1rem' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <Wallet size={18} />
              </div>
              <div className="leading-tight">
                <h3>Shop Overhead</h3>
                <span className="text-xs text-slate-500">Shop expense</span>
              </div>
            </div>
          </section>

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
        <h3 className="mb-3 flex items-center gap-2"><Filter size={16} className="text-blue-600" /> Filters</h3>
        <DateRangeFilter from={startDate} to={endDate} setFrom={setStartDate} setTo={setEndDate} />

        <div className="mt-4">
          <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white px-3.5 py-3 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Period Total</p>
            <p className="mt-1 text-xl font-extrabold leading-tight text-rose-600 tabular-nums">{fmt(totals.total)}</p>
            <p className="text-[11px] text-slate-400">{totals.count} entries</p>
          </div>

          {totals.byCategory.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">By category</p>
              <div className="divide-y divide-slate-100">
                {totals.byCategory.map(([name, amount]) => (
                  <div key={name} className="flex items-center justify-between gap-3 py-1.5">
                    <span className="min-w-0 truncate text-xs font-medium text-slate-600">{name}</span>
                    <span className="shrink-0 text-sm font-bold text-slate-900 tabular-nums">{fmt(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Save warning — expenses cannot be changed after saving */}
      <ConfirmDialog
        open={showSaveWarning}
        title="Confirm expense"
        message="Save this expense?"
        confirmLabel="Confirm Save"
        busy={formBusy}
        onCancel={() => setShowSaveWarning(false)}
        onConfirm={handleConfirmSave}
      >
        <div className="space-y-1.5">
          <div className="flex justify-between gap-4"><span className="text-slate-500">Category</span><span className="font-semibold text-slate-900">{categories.find((c) => String(c.id) === String(formCategoryId))?.name || '—'}</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-500">Amount</span><span className="font-semibold text-slate-900">{fmt(formAmount)}</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-500">Payment</span><span className="font-semibold text-slate-900">{PAYMENT_METHODS.find((m) => m.value === formPaymentMethod)?.label || formPaymentMethod}</span></div>
          <div className="flex justify-between gap-4 border-t border-slate-200 pt-1.5"><span className="font-semibold text-slate-600">Date</span><span className="font-bold text-slate-900">{formatDate(formDate)}</span></div>
        </div>
      </ConfirmDialog>
    </div>
  );
};

export default ShopExpensesPage;
