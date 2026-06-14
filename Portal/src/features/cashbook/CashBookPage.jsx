import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BookOpenCheck, ArrowDownRight, ArrowUpRight, Calendar, Lock, Unlock,
  CheckCircle2, AlertTriangle, Wallet, ChevronLeft, ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { formatDate } from '../../shared/utils/format';

const fmt = (value) => '৳ ' + Math.ceil(Number(value) || 0).toLocaleString();

// Local calendar date (yyyy-mm-dd). toISOString() would report the UTC day, which
// rolls a day early/late for users off UTC (e.g. an early-morning market in UTC+6).
const isoLocal = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = () => isoLocal(new Date());
const shiftIso = (iso, days) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return isoLocal(d);
};
const prettyDate = (iso) => formatDate(iso);

const INFLOW_ROWS = [
  { key: 'cashSales',           label: 'Cash sales' },
  { key: 'crateCashSales',      label: 'Crate sales (walk-in)' },
  { key: 'customerCollections', label: 'Customer collections' },
  { key: 'crateDepositsTaken',  label: 'Crate deposits taken' },
];
const OUTFLOW_ROWS = [
  { key: 'supplierPayments',     label: 'Supplier payments' },
  { key: 'shipmentExpenses',     label: 'Shipment expenses' },
  { key: 'shopExpenses',         label: 'Shop expenses' },
  { key: 'crateDepositRefunds',  label: 'Crate deposit refunds' },
];

const TONES = {
  teal:    { card: 'border-teal-200 bg-gradient-to-br from-teal-50 to-white',       label: 'text-teal-600',    value: 'text-teal-700' },
  emerald: { card: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white', label: 'text-emerald-600', value: 'text-emerald-700' },
  amber:   { card: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',     label: 'text-amber-600',   value: 'text-amber-600' },
  slate:   { card: 'border-slate-200 bg-white',                                     label: 'text-slate-500',   value: 'text-slate-900' },
};
const Tile = ({ label, value, sub, tone = 'slate' }) => {
  const t = TONES[tone] || TONES.slate;
  return (
    <div className={`rounded-2xl border px-3.5 py-3 shadow-sm ${t.card}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${t.label}`}>{label}</p>
      <p className={`mt-1 text-xl font-extrabold leading-tight tabular-nums ${t.value}`}>{value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium text-slate-400">{sub}</p>}
    </div>
  );
};

const LedgerRow = ({ label, amount, zero }) => (
  <div className="flex items-center justify-between py-2.5">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    <span className={`text-sm font-extrabold tabular-nums ${zero ? 'text-slate-300' : 'text-slate-900'}`}>{amount}</span>
  </div>
);

const CashBookPage = () => {
  const { admin } = useAuth();
  const { fetchDailyCash, closeCashDay, reopenCashDay } = useData();
  const [date, setDate] = useState(todayIso());

  const [openingInput, setOpeningInput] = useState('');
  const [countedInput, setCountedInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [actionError, setActionError] = useState('');

  const { data, isLoading, error: queryError } = useQuery({
    queryKey: queryKeys.cash.daily(admin?.wholesalerId, date),
    queryFn: () => fetchDailyCash(date),
    enabled: Boolean(admin?.wholesalerId),
  });

  const closed = data?.status === 'CLOSED';

  useEffect(() => {
    if (!data) return;
    setOpeningInput(data.openingCash != null ? String(data.openingCash) : '');
    setCountedInput(data.countedCash != null ? String(data.countedCash) : '');
    setNoteInput(data.note || '');
    setActionError('');
  }, [data]);

  const inflow = data?.inflow || {};
  const outflow = data?.outflow || {};

  const openingNum = openingInput === '' ? Number(data?.openingCash || 0) : Number(openingInput) || 0;
  const expected = useMemo(() => openingNum + Number(data?.netMovement || 0), [openingNum, data?.netMovement]);
  const countedNum = countedInput === '' ? null : Number(countedInput) || 0;
  const variance = countedNum == null ? null : countedNum - expected;
  const matched = variance != null && Math.abs(variance) < 0.005;
  const net = Number(data?.netMovement || 0);

  const closeMutation = useMutation({ mutationFn: (payload) => closeCashDay(payload) });
  const reopenMutation = useMutation({ mutationFn: () => reopenCashDay(date) });
  const busy = closeMutation.isPending || reopenMutation.isPending;

  const handleClose = async () => {
    setActionError('');
    if (countedNum == null) { setActionError('Enter the counted cash to close the day.'); return; }
    if (countedNum < 0) { setActionError('Counted cash cannot be negative.'); return; }
    try {
      await closeMutation.mutateAsync({
        date,
        openingCash: openingInput === '' ? null : Number(openingInput),
        countedCash: countedNum,
        note: noteInput.trim() || null,
      });
    } catch (err) {
      setActionError(err.message || 'Failed to close the day.');
    }
  };

  const handleReopen = async () => {
    setActionError('');
    try {
      await reopenMutation.mutateAsync();
    } catch (err) {
      setActionError(err.message || 'Failed to reopen the day.');
    }
  };

  const isFuture = date > todayIso();

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="inventory-hero">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/30">
            <BookOpenCheck size={22} />
          </div>
          <div>
            <span className="box-eyebrow">Cash Book</span>
            <h3>Day-end reconciliation</h3>
            <p>{prettyDate(date)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <button type="button" onClick={() => setDate(shiftIso(date, -1))} className="p-2 text-slate-500 hover:bg-slate-50" aria-label="Previous day">
              <ChevronLeft size={16} />
            </button>
            <label className="flex items-center gap-1.5 border-x border-slate-200 px-3 py-1.5">
              <Calendar size={14} className="text-slate-400" />
              <input type="date" value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} className="bg-transparent text-sm font-bold text-slate-800 outline-none" />
            </label>
            <button type="button" onClick={() => setDate(shiftIso(date, 1))} disabled={date >= todayIso()} className="p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-30" aria-label="Next day">
              <ChevronRight size={16} />
            </button>
          </div>
          <span className={`badge ${closed ? 'badge-emerald' : 'badge-amber'} gap-1`}>
            {closed ? <Lock size={11} /> : <Unlock size={11} />} {closed ? 'Closed' : 'Open'}
          </span>
        </div>
      </section>

      {isLoading ? (
        <div className="empty-state">Loading cash book…</div>
      ) : (
        <>
          <div className="profile-workspace">
            <main className="profile-main-stack">
              {/* Day summary */}
              <section className="supplier-panel">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2"><TrendingUp size={16} className="text-teal-600" /> Day Summary</h3>
              <span className="badge badge-teal">{data?.sales?.saleCount || 0} sales</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile tone="teal" label="Total Sold" value={fmt(data?.sales?.totalSold)}
                    sub={`Cash ${fmt(data?.sales?.cashAtSale)} · Due ${fmt(data?.sales?.dueCreated)}`} />
              <Tile tone="amber" label="Customer Due" value={fmt(data?.sales?.dueCreated)} />
              <Tile tone="slate" label="Supplier Share" value={fmt(data?.sales?.supplierShare)} />
              <Tile tone="emerald" label="Commission" value={fmt(data?.sales?.commissionEarned)} />
            </div>
          </section>

          {/* Debit / Credit ledger */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <section className="supplier-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-2 text-emerald-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100"><ArrowDownRight size={15} /></span>
                  Cash In
                </h3>
                <span className="text-lg font-extrabold text-emerald-700 tabular-nums">{fmt(data?.totalIn)}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {INFLOW_ROWS.map((row) => (
                  <LedgerRow key={row.key} label={row.label} amount={fmt(inflow[row.key])} zero={!Number(inflow[row.key])} />
                ))}
              </div>
            </section>

            <section className="supplier-panel">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="flex items-center gap-2 text-rose-700">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100"><ArrowUpRight size={15} /></span>
                  Cash Out
                </h3>
                <span className="text-lg font-extrabold text-rose-700 tabular-nums">{fmt(data?.totalOut)}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {OUTFLOW_ROWS.map((row) => (
                  <LedgerRow key={row.key} label={row.label} amount={fmt(outflow[row.key])} zero={!Number(outflow[row.key])} />
                ))}
              </div>
            </section>
          </div>

            </main>

            <aside className="profile-side-stack">
              {/* Reconciliation */}
              <section className="supplier-panel">
            <h3 className="flex items-center gap-2"><Wallet size={16} className="text-teal-600" /> Drawer Reconciliation</h3>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opening float</label>
                <input
                  type="number" inputMode="decimal" step="0.01"
                  value={openingInput} onChange={(e) => setOpeningInput(e.target.value)}
                  disabled={closed || busy}
                  className="input-field mt-1.5 w-full !py-2 text-base font-extrabold disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>

              <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net movement</p>
                <p className={`mt-1 text-xl font-extrabold tabular-nums ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {net >= 0 ? '+ ' : '− '}{fmt(Math.abs(net))}
                </p>
              </div>

              <div className="flex flex-col justify-center rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white px-3.5 py-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Expected in drawer</p>
                <p className="mt-1 text-xl font-extrabold text-teal-700 tabular-nums">{fmt(expected)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Counted cash</label>
                <input
                  type="number" inputMode="decimal" step="0.01"
                  value={countedInput} onChange={(e) => setCountedInput(e.target.value)}
                  disabled={closed || busy}
                  className="input-field mt-1.5 w-full !py-2 text-base font-extrabold disabled:bg-slate-100"
                  placeholder="0.00"
                />
              </div>
            </div>

            {variance != null && (
              <div className={`mt-4 flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-bold ${
                matched ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}>
                {matched ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                {matched ? 'Balanced' : `${variance > 0 ? 'Surplus' : 'Shortage'} of ${fmt(Math.abs(variance))}`}
              </div>
            )}

            <input
              type="text" value={noteInput} onChange={(e) => setNoteInput(e.target.value)}
              disabled={closed || busy}
              className="input-field mt-4 w-full text-sm disabled:bg-slate-100"
              placeholder="Note (optional)"
            />

            {actionError && (<div className="status-error mt-3"><span>!</span><span>{actionError}</span></div>)}

            <div className="mt-5 flex items-center justify-end border-t border-slate-100 pt-4">
              {closed ? (
                <button type="button" onClick={handleReopen} disabled={busy} className="btn-secondary inline-flex items-center gap-1.5">
                  <Unlock size={14} /> {reopenMutation.isPending ? 'Reopening…' : 'Reopen day'}
                </button>
              ) : (
                <button type="button" onClick={handleClose} disabled={busy || isFuture} className="btn-primary inline-flex items-center gap-1.5">
                  <Lock size={14} /> {closeMutation.isPending ? 'Closing…' : 'Close & reconcile'}
                </button>
              )}
            </div>
          </section>

            </aside>
          </div>

          {queryError && (
            <div className="status-error"><span>!</span><span>{queryError.message || 'Failed to load the cash book.'}</span></div>
          )}
        </>
      )}
    </div>
  );
};

export default CashBookPage;
