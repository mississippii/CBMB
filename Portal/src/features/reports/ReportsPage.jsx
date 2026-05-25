import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Filter, Calendar, Download } from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';

const formatMoney = (value) => '৳ ' + (Number(value) || 0).toLocaleString();
const formatQty = (value) => Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 3 });

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

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const endOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
};
const isoNow = () => new Date().toISOString();
const isoDaysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
};
const isoStartOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};
const isoStartOfYear = () => {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const presetRange = (preset) => {
  switch (preset) {
    case 'today': return { from: startOfToday(), to: endOfToday() };
    case 'week':  return { from: isoDaysAgo(7), to: isoNow() };
    case 'month': return { from: isoStartOfMonth(), to: isoNow() };
    case 'year':  return { from: isoStartOfYear(), to: isoNow() };
    default:      return { from: null, to: null };
  }
};

const ReportsPage = () => {
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
      {/* Filter panel */}
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
                period === value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</label>
            <select
              value={productId}
              onChange={(e) => { setProductId(e.target.value); setCategoryId(''); setSubCategoryId(''); }}
              className="input-field"
            >
              <option value="">All products</option>
              {catalogProducts.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Variety</label>
            <select
              value={categoryId}
              onChange={(e) => { setCategoryId(e.target.value); setSubCategoryId(''); }}
              disabled={!selectedProduct}
              className="input-field disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">All varieties</option>
              {varieties.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lot</label>
            <select
              value={subCategoryId}
              onChange={(e) => setSubCategoryId(e.target.value)}
              disabled={!lots.length}
              className="input-field disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">All lots</option>
              {lots.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Supplier</label>
            <select
              value={supplierAccountId}
              onChange={(e) => setSupplierAccountId(e.target.value)}
              className="input-field"
            >
              <option value="">All suppliers</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Group by</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="input-field"
            >
              {GROUP_BY.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <KpiTile label="Total Sold" value={formatMoney(summary.totalSold)} tone="blue" />
        <KpiTile label="Cash at Sale" value={formatMoney(summary.cashAtSale)} tone="emerald" />
        <KpiTile label="Due Created" value={formatMoney(summary.dueCreated)} tone="rose" />
        <KpiTile label="Commission" value={formatMoney(summary.commissionEarned)} tone="slate" />
        <KpiTile label="Quantity" value={formatQty(summary.totalQuantity)} tone="slate" />
        <KpiTile label="Sales" value={`${summary.saleCount || 0}`} tone="slate" />
      </section>

      {/* Breakdown table */}
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
          {groups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
              No sales match these filters.
            </div>
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

      {loading && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-sm font-semibold text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
};

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
