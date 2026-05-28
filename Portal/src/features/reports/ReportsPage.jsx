import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3, Filter, Calendar, Download, FileText, Printer, TrendingUp, TrendingDown,
  ChevronRight,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { postJson, apiPaths } from '../../services/apiClient';
import { formatMoney, formatDate } from '../../shared/utils/format';
import { Loader, EmptyRow, ErrorBanner } from '../../shared/components/Loader';

const formatQty = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

const PNL_PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: '7 days' },
  { value: 'month', label: 'This month' },
  { value: 'year',  label: 'This year' },
  { value: 'all',   label: 'All-time' },
];

const SUB_TABS = [
  { value: 'pnl',   label: 'Profit & Loss', icon: FileText },
  { value: 'sales', label: 'Sales Breakdown', icon: BarChart3 },
];

const ReportsPage = () => {
  const [tab, setTab] = useState('pnl');
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-xs font-semibold">
        {SUB_TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
              tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

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

const DeltaBadge = ({ current, prior }) => {
  if (prior == null) return null;
  const pct = pctDelta(current, prior);
  if (pct == null) return <span className="text-[10px] font-semibold text-slate-400">—</span>;
  const up = pct >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-700' : 'text-rose-700'}`}>
      <Icon size={10} /> {Math.abs(pct).toFixed(1)}%
    </span>
  );
};

const PnLReport = () => {
  const { admin } = useAuth();
  const [period, setPeriod] = useState('month');
  const [compareToPrior, setCompareToPrior] = useState(true);

  const { data: pnl, isLoading, error: queryError } = useQuery({
    queryKey: ['reports', 'pnl', admin?.wholesalerId, period, compareToPrior],
    queryFn: () => postJson(apiPaths.reportsPnL(admin.wholesalerId), { period, compareToPrior }),
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

  return (
    <div className="space-y-4">
      {/* Toolbar — hidden in print */}
      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <FileText size={14} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Profit &amp; Loss Statement</h3>
              <p className="text-[11px] text-slate-500">Accrual basis — commission booked when sold, expenses when posted</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={compareToPrior}
                onChange={(e) => setCompareToPrior(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              Compare to prior
            </label>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!pnl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-40"
            >
              <Printer size={12} /> Print
            </button>
            <button
              type="button"
              onClick={handleCsv}
              disabled={!pnl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300 disabled:opacity-40"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold text-slate-600">
          <Calendar size={12} className="ml-2 text-slate-400" />
          {PNL_PERIODS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setPeriod(value)}
              className={`px-2.5 py-1 rounded-full transition ${
                period === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && <Loader />}
      {queryError && <ErrorBanner message={queryError.message || 'Failed to load report.'} />}

      {pnl && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm print:shadow-none print:border-0">
          <PnLHeader pnl={pnl} />
          <PnLBody pnl={pnl} compareToPrior={compareToPrior} />
        </section>
      )}
    </div>
  );
};

const PnLHeader = ({ pnl }) => (
  <header className="mb-6 border-b border-slate-200 pb-4">
    <h2 className="text-xl font-extrabold text-slate-900">Profit &amp; Loss Statement</h2>
    <p className="text-xs text-slate-500 mt-1">
      Period: <strong className="text-slate-700">{pnl.period}</strong>
      {pnl.from && pnl.to && (
        <> &middot; {formatDate(pnl.from)} → {formatDate(pnl.to)}</>
      )}
    </p>
  </header>
);

const PnLBody = ({ pnl, compareToPrior }) => {
  const prior = compareToPrior ? pnl.prior : null;

  return (
    <div className="space-y-6 text-sm">
      {/* INCOME */}
      <Section title="Income" tone="emerald">
        <Line
          label="Commission earned"
          amount={pnl.income.commissionEarned}
          priorAmount={prior?.income?.commissionEarned}
        />
        {(pnl.income.bySupplier || []).length > 0 && (
          <BreakdownList items={pnl.income.bySupplier} />
        )}
        {pnl.income.crateSalesNet != null && Number(pnl.income.crateSalesNet) !== 0 && (
          <Line
            label="Crate sales (net)"
            amount={pnl.income.crateSalesNet}
            priorAmount={prior?.income?.crateSalesNet}
            hint="Profit on crate sales: sale price minus weighted-average cost basis"
          />
        )}
        <Subtotal label="Total income" amount={pnl.totalIncome} priorAmount={prior?.totalIncome} tone="emerald" />
      </Section>

      {/* EXPENSES */}
      <Section title="Expenses" tone="rose">
        <Line
          label="Shop expenses"
          amount={pnl.expenses.shopExpenses}
          priorAmount={prior?.expenses?.shopExpenses}
        />
        {(pnl.expenses.shopByCategory || []).length > 0 && (
          <BreakdownList items={pnl.expenses.shopByCategory} />
        )}
        <Line
          label="Crate loss (absorbed)"
          amount={pnl.expenses.crateLossAbsorbed}
          priorAmount={prior?.expenses?.crateLossAbsorbed}
          hint="Lost/damaged crates that no party compensated"
        />
        <Subtotal label="Total expenses" amount={pnl.totalExpenses} priorAmount={prior?.totalExpenses} tone="rose" />
      </Section>

      {/* NET PROFIT */}
      <div className="rounded-xl border-2 border-slate-900 bg-slate-50 px-5 py-4 flex items-center justify-between">
        <span className="text-base font-extrabold uppercase tracking-wider text-slate-900">Net Profit</span>
        <div className="text-right">
          <div className={`text-2xl font-black ${Number(pnl.netProfit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatMoney(pnl.netProfit)}
          </div>
          {prior && (
            <div className="mt-0.5 flex items-center justify-end gap-2 text-[11px] text-slate-500">
              <span>prior: {formatMoney(prior.netProfit)}</span>
              <DeltaBadge current={pnl.netProfit} prior={prior.netProfit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Section = ({ title, tone, children }) => {
  const dot = tone === 'emerald' ? 'bg-emerald-500' : 'bg-rose-500';
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        {title}
      </h4>
      <div className="space-y-1 pl-4 border-l-2 border-slate-100">
        {children}
      </div>
    </div>
  );
};

const Line = ({ label, amount, priorAmount, hint }) => (
  <div className="flex items-baseline justify-between py-1.5">
    <div className="flex-1 min-w-0">
      <span className="font-semibold text-slate-800">{label}</span>
      {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
    </div>
    <div className="text-right pl-3">
      <div className="font-bold text-slate-900 tabular-nums">{formatMoney(amount)}</div>
      {priorAmount != null && (
        <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-end gap-1.5">
          <span>was {formatMoney(priorAmount)}</span>
          <DeltaBadge current={amount} prior={priorAmount} />
        </div>
      )}
    </div>
  </div>
);

const BreakdownList = ({ items }) => (
  <div className="pl-3 pb-2 space-y-0.5">
    {items.map((row) => (
      <div key={`${row.id ?? row.name}`} className="flex justify-between text-[12px] text-slate-600">
        <span className="flex items-center gap-1">
          <ChevronRight size={10} className="text-slate-400" /> {row.name}
        </span>
        <span className="tabular-nums">{formatMoney(row.amount)}</span>
      </div>
    ))}
  </div>
);

const Subtotal = ({ label, amount, priorAmount, tone }) => {
  const cls = tone === 'emerald' ? 'text-emerald-700' : 'text-rose-700';
  return (
    <div className="mt-2 pt-2 border-t border-slate-200 flex items-baseline justify-between">
      <span className="font-bold uppercase text-[11px] tracking-wider text-slate-600">{label}</span>
      <div className="text-right">
        <div className={`font-extrabold text-base tabular-nums ${cls}`}>{formatMoney(amount)}</div>
        {priorAmount != null && (
          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center justify-end gap-1.5">
            <span>was {formatMoney(priorAmount)}</span>
            <DeltaBadge current={amount} prior={priorAmount} />
          </div>
        )}
      </div>
    </div>
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

const PERIOD_PRESETS = [
  { value: '',         label: 'All-time' },
  { value: 'today',    label: 'Today' },
  { value: 'week',     label: '7 days' },
  { value: 'month',    label: 'This month' },
  { value: 'year',     label: 'This year' },
];

const startOfToday = () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString(); };
const endOfToday   = () => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+1); return d.toISOString(); };
const isoNow       = () => new Date().toISOString();
const isoDaysAgo   = (n) => { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString(); };
const isoStartOfMonth = () => { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d.toISOString(); };
const isoStartOfYear  = () => { const d = new Date(); d.setMonth(0,1); d.setHours(0,0,0,0); return d.toISOString(); };

const presetRange = (preset) => {
  switch (preset) {
    case 'today': return { from: startOfToday(), to: endOfToday() };
    case 'week':  return { from: isoDaysAgo(7), to: isoNow() };
    case 'month': return { from: isoStartOfMonth(), to: isoNow() };
    case 'year':  return { from: isoStartOfYear(), to: isoNow() };
    default:      return { from: null, to: null };
  }
};

const SalesBreakdown = () => {
  const { admin } = useAuth();
  const { catalogProducts, subCategories, suppliers, fetchSalesAggregate } = useData();

  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [supplierAccountId, setSupplierAccountId] = useState('');
  const [groupBy, setGroupBy] = useState('category');
  const [period, setPeriod] = useState('month');

  const selectedProduct = useMemo(
    () => catalogProducts.find((p) => Number(p.id) === Number(productId)),
    [catalogProducts, productId],
  );
  const varieties = selectedProduct?.categories || [];
  const selectedVariety = varieties.find((v) => Number(v.id) === Number(categoryId));
  const lots = selectedVariety?.usesLots ? subCategories : [];

  const filters = useMemo(() => {
    const { from, to } = presetRange(period);
    return {
      from, to,
      productId: productId ? Number(productId) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      subCategoryId: subCategoryId ? Number(subCategoryId) : null,
      supplierAccountId: supplierAccountId ? Number(supplierAccountId) : null,
      groupBy: groupBy || null,
    };
  }, [period, productId, categoryId, subCategoryId, supplierAccountId, groupBy]);

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.sales.aggregate(admin?.wholesalerId, filters),
    queryFn: () => fetchSalesAggregate(filters),
    enabled: Boolean(admin?.wholesalerId),
  });
  const error = queryError ? (queryError.message || 'Failed to load report.') : '';

  const summary = data?.summary || {};
  const groups = data?.groups || [];

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
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <BarChart3 size={14} />
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

        <div className="mb-3 inline-flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-slate-50 p-0.5 text-[11px] font-semibold text-slate-600">
          <Calendar size={12} className="ml-2 text-slate-400" />
          {PERIOD_PRESETS.map(({ value, label }) => (
            <button
              key={value || 'all'}
              type="button"
              onClick={() => setPeriod(value)}
              className={`px-2.5 py-1 rounded-full transition ${
                period === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Filter size={14} />
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
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3 text-right">Sold</th>
                    <th className="py-2 pr-3 text-right">Quantity</th>
                    <th className="py-2 pr-3 text-right">Commission</th>
                    <th className="py-2 pr-3 text-right">Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {groups.map((row) => (
                    <tr key={`${row.id ?? 'none'}-${row.name}`} className="hover:bg-slate-50">
                      <td className="py-2 pr-3 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-2 pr-3 text-right font-extrabold text-slate-900">{formatMoney(row.totalSold)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{formatQty(row.totalQuantity)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{formatMoney(row.commissionEarned)}</td>
                      <td className="py-2 pr-3 text-right text-slate-700">{row.saleCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {error && <ErrorBanner message={error} />}
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
