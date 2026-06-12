import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Filter, Download, FileText, Printer, TrendingUp, TrendingDown,
  ChevronRight, Wallet, Percent,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { postJson, apiPaths } from '../../services/apiClient';
import { formatMoney, formatDate, formatDateTime } from '../../shared/utils/format';
import { Loader, EmptyRow, ErrorBanner } from '../../shared/components/Loader';
import { TablePager, usePagination, DateRangeFilter, todayLocalIso, nextDayLocalIso } from '../../shared/components';

const formatQty = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

const prettyDay = (iso) => formatDate(`${iso}T00:00:00`);

const SUB_TABS = [
  { value: 'pnl',   label: 'Profit & Loss', icon: FileText },
  { value: 'sales', label: 'Sales Breakdown', icon: BarChart3 },
];

const ReportsPage = () => {
  const [tab, setTab] = useState('pnl');
  return (
    <div className="space-y-5">
      <section className="inventory-hero no-print">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
            <BarChart3 size={22} />
          </div>
          <div>
            <span className="box-eyebrow">Reports</span>
            <h3>Business reports</h3>
          </div>
        </div>

        <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold shadow-sm">
          {SUB_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition ${
                tab === value
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'pnl' ? <PnLReport /> : <SalesBreakdown />}
    </div>
  );
};

// ============================================================================
// P&L
// ============================================================================

const pctDelta = (current, prior) => {
  const c = Number(current) || 0;
  const p = Number(prior) || 0;
  if (p === 0) return c === 0 ? 0 : null; // null means "infinite/N/A"
  return ((c - p) / Math.abs(p)) * 100;
};

const DeltaBadge = ({ current, prior, light }) => {
  if (prior == null) return null;
  const pct = pctDelta(current, prior);
  if (pct == null) return <span className={`text-[10px] font-semibold ${light ? 'text-white/70' : 'text-slate-400'}`}>—</span>;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const tone = light
    ? 'bg-white/20 text-white'
    : (up ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700');
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${tone}`}>
      <Icon size={10} /> {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

const PnLReport = () => {
  const { admin } = useAuth();
  const [fromDate, setFromDate] = useState(todayLocalIso());
  const [toDate, setToDate] = useState(todayLocalIso());
  const [compareToPrior, setCompareToPrior] = useState(true);

  const { data: pnl, isLoading, error: queryError } = useQuery({
    queryKey: ['reports', 'pnl', admin?.wholesalerId, fromDate, toDate, compareToPrior],
    queryFn: () => postJson(apiPaths.reportsPnL(admin.wholesalerId), {
      period: 'custom',
      from: `${fromDate}T00:00:00`,
      to: `${nextDayLocalIso(toDate)}T00:00:00`,   // exclusive end — include the whole `toDate`
      compareToPrior,
    }),
    enabled: Boolean(admin?.wholesalerId),
  });

  const handlePrint = () => window.print();

  const handleCsv = () => {
    if (!pnl) return;
    const rows = [];
    rows.push(['Period', pnl.period, pnl.from || '', pnl.to || '']);
    rows.push([]);
    rows.push(['INCOME']);
    rows.push(['Commission earned', pnl.income.commissionEarned]);
    (pnl.income.bySupplier || []).forEach((s) => rows.push(['  ' + s.name, s.amount]));
    if (pnl.income.crateSalesNet != null && Number(pnl.income.crateSalesNet) !== 0) {
      rows.push(['Crate sales (net)', pnl.income.crateSalesNet]);
    }
    rows.push(['Total income', pnl.totalIncome]);
    rows.push([]);
    rows.push(['EXPENSES']);
    rows.push(['Shop expenses', pnl.expenses.shopExpenses]);
    (pnl.expenses.shopByCategory || []).forEach((c) => rows.push(['  ' + c.name, c.amount]));
    rows.push(['Crate loss (absorbed)', pnl.expenses.crateLossAbsorbed]);
    rows.push(['Total expenses', pnl.totalExpenses]);
    rows.push([]);
    rows.push(['NET PROFIT', pnl.netProfit]);
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `pnl-${pnl.period}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const prior = compareToPrior ? pnl?.prior : null;
  const rangeText = fromDate === toDate ? prettyDay(fromDate) : `${prettyDay(fromDate)} – ${prettyDay(toDate)}`;

  return (
    <div className="profile-workspace">
      <main className="profile-main-stack">
        {isLoading && <Loader />}
        {queryError && <ErrorBanner message={queryError.message || 'Failed to load report.'} />}

        {pnl && (
          <div className="no-print space-y-4">
            <p className="px-1 text-xs font-semibold text-slate-500">{rangeText}</p>
            <PnLSummary pnl={pnl} prior={prior} />
            <ProfitBar income={pnl.totalIncome} expenses={pnl.totalExpenses} />
            <div className="grid gap-4 lg:grid-cols-2">
              <FlowCard tone="emerald" icon={TrendingUp} title="Income" total={pnl.totalIncome}>
                <Line label="Commission earned" amount={pnl.income.commissionEarned} priorAmount={prior?.income?.commissionEarned} />
                {(pnl.income.bySupplier || []).length > 0 && <BreakdownList items={pnl.income.bySupplier} />}
                {pnl.income.crateSalesNet != null && Number(pnl.income.crateSalesNet) !== 0 && (
                  <Line label="Crate sales (net)" amount={pnl.income.crateSalesNet} priorAmount={prior?.income?.crateSalesNet} hint="Sale price minus weighted-average cost basis" />
                )}
              </FlowCard>
              <FlowCard tone="rose" icon={TrendingDown} title="Expenses" total={pnl.totalExpenses}>
                <Line label="Shop expenses" amount={pnl.expenses.shopExpenses} priorAmount={prior?.expenses?.shopExpenses} />
                {(pnl.expenses.shopByCategory || []).length > 0 && <BreakdownList items={pnl.expenses.shopByCategory} />}
                <Line label="Crate loss (absorbed)" amount={pnl.expenses.crateLossAbsorbed} priorAmount={prior?.expenses?.crateLossAbsorbed} hint="Lost/damaged crates no party compensated" />
              </FlowCard>
            </div>
            <EquationBar pnl={pnl} prior={prior} />
          </div>
        )}

        {pnl && <PnLInvoice pnl={pnl} account={admin} period={rangeText} />}
      </main>

      <aside className="profile-side-stack no-print">
        <section className="supplier-panel">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
                <FileText size={15} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Profit &amp; Loss Statement</h3>
                <p className="text-[11px] text-slate-500">Accrual basis</p>
              </div>
            </div>
          </div>

          <div className="mb-3 space-y-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={compareToPrior}
                onChange={(e) => setCompareToPrior(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Compare to prior
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!pnl}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-40"
              >
                <Printer size={12} /> Print
              </button>
              <button
                type="button"
                onClick={handleCsv}
                disabled={!pnl}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-40"
              >
                <Download size={12} /> CSV
              </button>
            </div>
          </div>

          <DateRangeFilter from={fromDate} to={toDate} setFrom={setFromDate} setTo={setToDate} />
        </section>
      </aside>
    </div>
  );
};

// ── Print-only invoice / statement document ──────────────────────────────────

const InvRow = ({ label, amount, strong, sub }) => (
  <tr className={strong ? 'inv-row-strong' : ''}>
    <td className={`inv-cell-label${sub ? ' inv-cell-sub' : ''}`}>{label}</td>
    <td className="inv-cell-amount">{formatMoney(amount)}</td>
  </tr>
);

const PnLInvoice = ({ pnl, account, period }) => {
  const now = new Date();
  const docNo = `PNL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const generated = formatDateTime(now);
  const positive = Number(pnl.netProfit) >= 0;

  return (
    <div className="pnl-print-sheet">
      <div className="inv-doc">
        {/* Letterhead */}
        <header className="inv-head">
          <div className="inv-brand">
            <div className="inv-logo">CB</div>
            <div>
              <div className="inv-brand-name">CBTrading</div>
              <div className="inv-brand-sub">Wholesale Consignment</div>
            </div>
          </div>
          <div className="inv-title-block">
            <div className="inv-title">Profit &amp; Loss</div>
            <div className="inv-title-sub">Statement</div>
          </div>
        </header>

        {/* Meta strip */}
        <section className="inv-meta">
          <div>
            <span className="inv-meta-label">Account</span>
            <span className="inv-meta-value">{account?.fullName || 'Wholesaler'}</span>
            {account?.email && <span className="inv-meta-line">{account.email}</span>}
            {account?.wholesalerId && <span className="inv-meta-line">Account ID #{account.wholesalerId}</span>}
          </div>
          <div className="inv-meta-right">
            <div><span className="inv-meta-label">Statement No.</span><span className="inv-meta-value">{docNo}</span></div>
            <div><span className="inv-meta-label">Period</span><span className="inv-meta-value">{period}</span></div>
            <div><span className="inv-meta-label">Generated</span><span className="inv-meta-line">{generated}</span></div>
          </div>
        </section>

        {/* Income */}
        <table className="inv-table">
          <thead>
            <tr><th className="inv-th">Income</th><th className="inv-th inv-th-amount">Amount</th></tr>
          </thead>
          <tbody>
            <InvRow label="Commission earned" amount={pnl.income.commissionEarned} />
            {(pnl.income.bySupplier || []).map((s) => (
              <InvRow key={`inc-${s.id ?? s.name}`} label={s.name} amount={s.amount} sub />
            ))}
            {pnl.income.crateSalesNet != null && Number(pnl.income.crateSalesNet) !== 0 && (
              <InvRow label="Crate sales (net)" amount={pnl.income.crateSalesNet} />
            )}
            <InvRow label="Total Income" amount={pnl.totalIncome} strong />
          </tbody>
        </table>

        {/* Expenses */}
        <table className="inv-table">
          <thead>
            <tr><th className="inv-th">Expenses</th><th className="inv-th inv-th-amount">Amount</th></tr>
          </thead>
          <tbody>
            <InvRow label="Shop expenses" amount={pnl.expenses.shopExpenses} />
            {(pnl.expenses.shopByCategory || []).map((c) => (
              <InvRow key={`exp-${c.id ?? c.name}`} label={c.name} amount={c.amount} sub />
            ))}
            <InvRow label="Crate loss (absorbed)" amount={pnl.expenses.crateLossAbsorbed} />
            <InvRow label="Total Expenses" amount={pnl.totalExpenses} strong />
          </tbody>
        </table>

        {/* Net profit banner */}
        <div className={`inv-net ${positive ? 'inv-net-pos' : 'inv-net-neg'}`}>
          <span className="inv-net-label">Net {positive ? 'Profit' : 'Loss'}</span>
          <span className="inv-net-value">{formatMoney(Math.abs(Number(pnl.netProfit)))}</span>
        </div>

        {/* Footer */}
        <footer className="inv-foot">
          <span>Generated by CBTrading on {generated}</span>
          <span>This is a system-generated statement and does not require a signature.</span>
        </footer>
      </div>
    </div>
  );
};

const TILE_TONES = {
  emerald: { chip: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
  rose:    { chip: 'bg-rose-50 text-rose-600',        value: 'text-rose-700' },
  indigo:  { chip: 'bg-indigo-50 text-indigo-600',    value: 'text-indigo-700' },
  slate:   { chip: 'bg-slate-100 text-slate-500',     value: 'text-slate-900' },
};

const SummaryTile = ({ tone, icon: Icon, label, value, current, prior }) => {
  const t = TILE_TONES[tone] || TILE_TONES.slate;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-full ${t.chip}`}><Icon size={14} /></span>
      </div>
      <p className={`mt-2 text-2xl font-black leading-tight tabular-nums ${t.value}`}>{value}</p>
      {prior != null && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span>was {formatMoney(prior)}</span>
          <DeltaBadge current={current} prior={prior} />
        </div>
      )}
    </div>
  );
};

const PnLSummary = ({ pnl, prior }) => {
  const net = Number(pnl.netProfit);
  const positive = net >= 0;
  const inc = Number(pnl.totalIncome);
  const margin = inc > 0 ? (net / inc) * 100 : null;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <SummaryTile tone="emerald" icon={TrendingUp} label="Total Income" value={formatMoney(pnl.totalIncome)} current={pnl.totalIncome} prior={prior?.totalIncome} />
      <SummaryTile tone="rose" icon={TrendingDown} label="Total Expenses" value={formatMoney(pnl.totalExpenses)} current={pnl.totalExpenses} prior={prior?.totalExpenses} />
      <SummaryTile tone={positive ? 'emerald' : 'rose'} icon={Wallet} label={positive ? 'Net Profit' : 'Net Loss'} value={formatMoney(Math.abs(net))} current={net} prior={prior?.netProfit} />
      <SummaryTile tone="indigo" icon={Percent} label="Profit Margin" value={margin == null ? '—' : `${margin.toFixed(1)}%`} />
    </div>
  );
};

const ProfitBarRow = ({ label, value, pct, bar, text }) => (
  <div className="flex items-center gap-3">
    <span className={`w-20 shrink-0 text-[11px] font-bold ${text}`}>{label}</span>
    <div className="h-2.5 flex-1 rounded-full bg-slate-100">
      <div className={`h-2.5 rounded-full ${bar}`} style={{ width: `${pct}%` }} />
    </div>
    <span className="w-28 shrink-0 text-right text-xs font-extrabold tabular-nums text-slate-700">{value}</span>
  </div>
);

const ProfitBar = ({ income, expenses }) => {
  const inc = Math.max(0, Number(income) || 0);
  const exp = Math.max(0, Number(expenses) || 0);
  const denom = Math.max(inc, exp, 1);
  const profit = inc - exp;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">Income vs Expenses</h4>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${profit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {profit >= 0 ? 'Profit' : 'Loss'} {formatMoney(Math.abs(profit))}
        </span>
      </div>
      <div className="space-y-2.5">
        <ProfitBarRow label="Income" value={formatMoney(inc)} pct={(inc / denom) * 100} bar="bg-emerald-500" text="text-emerald-700" />
        <ProfitBarRow label="Expenses" value={formatMoney(exp)} pct={(exp / denom) * 100} bar="bg-rose-400" text="text-rose-700" />
      </div>
    </section>
  );
};

const FLOW_TONES = {
  emerald: { head: 'border-emerald-100 bg-emerald-50/60 text-emerald-700', chip: 'bg-emerald-100 text-emerald-600' },
  rose:    { head: 'border-rose-100 bg-rose-50/60 text-rose-700',          chip: 'bg-rose-100 text-rose-600' },
};

const FlowCard = ({ tone, icon: Icon, title, total, children }) => {
  const t = FLOW_TONES[tone];
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`flex items-center justify-between border-b px-4 py-3 ${t.head}`}>
        <h4 className="flex items-center gap-2 text-sm font-extrabold">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${t.chip}`}><Icon size={13} /></span>
          {title}
        </h4>
        <span className="text-base font-black tabular-nums">{formatMoney(total)}</span>
      </div>
      <div className="px-4 py-1.5">{children}</div>
    </section>
  );
};

const Line = ({ label, amount, priorAmount, hint }) => (
  <div className="flex items-baseline justify-between border-b border-slate-100 py-2.5 last:border-0">
    <div className="min-w-0 flex-1">
      <span className="text-sm font-semibold text-slate-800">{label}</span>
      {hint && <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>}
    </div>
    <div className="pl-3 text-right">
      <div className="text-sm font-bold tabular-nums text-slate-900">{formatMoney(amount)}</div>
      {priorAmount != null && (
        <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <span>was {formatMoney(priorAmount)}</span>
          <DeltaBadge current={amount} prior={priorAmount} />
        </div>
      )}
    </div>
  </div>
);

const BreakdownList = ({ items }) => (
  <div className="space-y-1 border-b border-slate-100 pb-2.5 pl-3">
    {items.map((row) => (
      <div key={`${row.id ?? row.name}`} className="flex items-center justify-between text-[12px] text-slate-500">
        <span className="flex items-center gap-1"><ChevronRight size={10} className="text-slate-300" /> {row.name}</span>
        <span className="tabular-nums">{formatMoney(row.amount)}</span>
      </div>
    ))}
  </div>
);

const EqTerm = ({ label, value, tone }) => (
  <div>
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
    <p className={`text-xl font-extrabold tabular-nums ${tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700'}`}>{value}</p>
  </div>
);

const EquationBar = ({ pnl, prior }) => {
  const net = Number(pnl.netProfit);
  const positive = net >= 0;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <EqTerm label="Income" value={formatMoney(pnl.totalIncome)} tone="emerald" />
        <span className="text-2xl font-black text-slate-300">−</span>
        <EqTerm label="Expenses" value={formatMoney(pnl.totalExpenses)} tone="rose" />
        <span className="text-2xl font-black text-slate-300">=</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Net {positive ? 'Profit' : 'Loss'}</p>
          <p className={`text-2xl font-black tabular-nums ${positive ? 'text-emerald-700' : 'text-rose-700'}`}>{formatMoney(Math.abs(net))}</p>
          {prior && (
            <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
              <span>prior {formatMoney(prior.netProfit)}</span>
              <DeltaBadge current={net} prior={prior.netProfit} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// Sales Breakdown (existing drill-down, preserved as second sub-tab)
// ============================================================================

const GROUP_BY = [
  { value: '',            label: 'No breakdown' },
  { value: 'product',     label: 'By Product' },
  { value: 'category',    label: 'By Variety' },
  { value: 'subCategory', label: 'By Lot' },
  { value: 'supplier',    label: 'By Supplier' },
  { value: 'shipment',    label: 'By Shipment' },
];

const SalesBreakdown = () => {
  const { admin } = useAuth();
  const { catalogProducts, subCategories, suppliers, fetchSalesAggregate } = useData();

  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [supplierAccountId, setSupplierAccountId] = useState('');
  const [groupBy, setGroupBy] = useState('category');
  const [fromDate, setFromDate] = useState(todayLocalIso());
  const [toDate, setToDate] = useState(todayLocalIso());

  const selectedProduct = useMemo(
    () => catalogProducts.find((p) => Number(p.id) === Number(productId)),
    [catalogProducts, productId],
  );
  const varieties = selectedProduct?.categories || [];
  const selectedVariety = varieties.find((v) => Number(v.id) === Number(categoryId));
  const lots = selectedVariety?.usesLots ? subCategories : [];

  const filters = useMemo(() => ({
    from: `${fromDate}T00:00:00`,
    to: `${nextDayLocalIso(toDate)}T00:00:00`,   // exclusive end — include the whole `toDate`
    productId: productId ? Number(productId) : null,
    categoryId: categoryId ? Number(categoryId) : null,
    subCategoryId: subCategoryId ? Number(subCategoryId) : null,
    supplierAccountId: supplierAccountId ? Number(supplierAccountId) : null,
    groupBy: groupBy || null,
  }), [fromDate, toDate, productId, categoryId, subCategoryId, supplierAccountId, groupBy]);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.sales.aggregate(admin?.wholesalerId, filters),
    queryFn: () => fetchSalesAggregate(filters),
    enabled: Boolean(admin?.wholesalerId),
  });
  const error = queryError ? (queryError.message || 'Failed to load report.') : '';

  const summary = data?.summary || {};
  const groups = data?.groups || [];

  const { pageItems: pagedGroups, ...groupPager } = usePagination(
    groups, 15, [groupBy, fromDate, toDate, productId, categoryId, subCategoryId, supplierAccountId],
  );

  const exportCsv = () => {
    if (!groups.length) return;
    const header = ['Name', 'Total Sold', 'Total Qty', 'Commission Earned', 'Sale Count'];
    const rows = groups.map((g) => [g.name, g.totalSold, g.totalQuantity, g.commissionEarned, g.saleCount]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales-report-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="profile-workspace">
      <main className="profile-main-stack">
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <KpiTile label="Total Sold" value={formatMoney(summary.totalSold)} tone="blue" />
        <KpiTile label="Cash at Sale" value={formatMoney(summary.cashAtSale)} tone="emerald" />
        <KpiTile label="Due Created" value={formatMoney(summary.dueCreated)} tone="rose" />
        <KpiTile label="Commission" value={formatMoney(summary.commissionEarned)} tone="slate" />
        <KpiTile label="Quantity" value={formatQty(summary.totalQuantity)} tone="slate" />
        <KpiTile label="Sales" value={`${summary.saleCount || 0}`} tone="slate" />
      </section>

      {groupBy && (
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <Filter size={15} />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">
                {GROUP_BY.find((g) => g.value === groupBy)?.label || 'Breakdown'}
              </h3>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              {groups.length} rows
            </span>
          </div>
          {loading ? <Loader /> : groups.length === 0 ? (
            <EmptyRow label="No sales match these filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] overflow-hidden rounded-xl text-sm">
                <thead>
                  <tr className="border-b border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 text-left text-[11px] font-bold uppercase tracking-wider text-blue-900">
                    <th className="px-3 py-2.5">Name</th>
                    <th className="px-3 py-2.5 text-right">Sold</th>
                    <th className="px-3 py-2.5 text-right">Quantity</th>
                    <th className="px-3 py-2.5 text-right">Commission</th>
                    <th className="px-3 py-2.5 text-right">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagedGroups.map((row) => (
                    <tr key={`${row.id ?? 'none'}-${row.name}`} className="transition hover:bg-blue-50/50">
                      <td className="px-3 py-2.5 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-slate-900 tabular-nums">{formatMoney(row.totalSold)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">{formatQty(row.totalQuantity)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">{formatMoney(row.commissionEarned)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-700 tabular-nums">{row.saleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePager {...groupPager} />
            </div>
          )}
        </section>
      )}

      {error && <ErrorBanner message={error} />}
      </main>

      <aside className="profile-side-stack">
        <section className="supplier-panel">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                <BarChart3 size={15} />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Sales Reports</h3>
                <p className="text-[11px] text-slate-500">Drill down by product, variety, lot, supplier, or shipment</p>
              </div>
            </div>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!groups.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-40"
            >
              <Download size={12} /> CSV
            </button>
          </div>

          <div className="mb-3">
            <DateRangeFilter from={fromDate} to={toDate} setFrom={setFromDate} setTo={setToDate} />
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <FilterSelect label="Product" value={productId} onChange={(v) => { setProductId(v); setCategoryId(''); setSubCategoryId(''); }}
              options={[{ value: '', label: 'All products' }, ...catalogProducts.map((p) => ({ value: p.id, label: p.name }))]} />
            <FilterSelect label="Variety" value={categoryId} disabled={!selectedProduct}
              onChange={(v) => { setCategoryId(v); setSubCategoryId(''); }}
              options={[{ value: '', label: 'All varieties' }, ...varieties.map((v) => ({ value: v.id, label: v.name }))]} />
            <FilterSelect label="Lot" value={subCategoryId} disabled={!lots.length} onChange={setSubCategoryId}
              options={[{ value: '', label: 'All lots' }, ...lots.map((s) => ({ value: s.id, label: s.name }))]} />
            <FilterSelect label="Supplier" value={supplierAccountId} onChange={setSupplierAccountId}
              options={[{ value: '', label: 'All suppliers' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} />
            <FilterSelect label="Group by" value={groupBy} onChange={setGroupBy} options={GROUP_BY} />
          </div>
        </section>
      </aside>
    </div>
  );
};

const FilterSelect = ({ label, value, onChange, disabled, options }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="input-field disabled:bg-slate-100 disabled:text-slate-400"
    >
      {options.map((o) => <option key={o.value || 'none'} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const TONE = {
  blue:    'border-blue-200    bg-gradient-to-br from-blue-50 to-white    text-blue-700',
  emerald: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-700',
  rose:    'border-rose-200    bg-gradient-to-br from-rose-50 to-white    text-rose-700',
  slate:   'border-slate-200   bg-white                                   text-slate-700',
};

const KpiTile = ({ label, value, tone }) => (
  <div className={`rounded-xl border px-3 py-2.5 ${TONE[tone]}`}>
    <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
    <p className="mt-0.5 text-lg font-extrabold leading-tight">{value}</p>
  </div>
);

export default ReportsPage;
