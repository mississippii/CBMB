import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, TrendingUp, Banknote, CreditCard, ArrowDownToLine, ArrowUpFromLine,
  Users, UserCheck, PiggyBank, Truck, BadgeDollarSign, Wallet,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';

const formatMoney = (value) => '৳ ' + (Number(value) || 0).toLocaleString();
const formatRate = (value) => (value == null ? '—' : `${Number(value).toFixed(2)}%`);

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: '7 days' },
  { value: 'month', label: 'Month' },
  { value: 'year',  label: 'Year' },
];

const KPI_TILES = [
  { key: 'totalSold',  label: 'Total Sale',     icon: TrendingUp, tone: 'blue',    source: 'sales' },
  { key: 'cashAtSale', label: 'Cash on Sale',   icon: Banknote,   tone: 'emerald', source: 'sales' },
  { key: 'dueCreated', label: 'Due Created',    icon: CreditCard, tone: 'rose',    source: 'sales' },
  { key: 'total',      label: 'Money In',       icon: ArrowDownToLine, tone: 'emerald', source: 'moneyIn' },
  { key: 'total',      label: 'Money Out',      icon: ArrowUpFromLine, tone: 'rose',    source: 'moneyOut' },
  { key: 'netProfit',  label: 'Net Profit',     icon: BadgeDollarSign, tone: 'amber', source: 'profit' },
];

const TONE = {
  blue:    'border-blue-200    text-blue-700    bg-gradient-to-br from-blue-50 to-white',
  emerald: 'border-emerald-200 text-emerald-700 bg-gradient-to-br from-emerald-50 to-white',
  rose:    'border-rose-200    text-rose-700    bg-gradient-to-br from-rose-50 to-white',
  amber:   'border-amber-200   text-amber-700   bg-gradient-to-br from-amber-50 to-white',
  slate:   'border-slate-200   text-slate-700   bg-white',
};

const ICON_TONE = {
  blue:    'bg-blue-100    text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  rose:    'bg-rose-100    text-rose-700',
  amber:   'bg-amber-100   text-amber-700',
  slate:   'bg-slate-100   text-slate-700',
};

const OverviewPage = () => {
  const { admin } = useAuth();
  const { fetchDashboardSummary } = useData();
  const [period, setPeriod] = useState('today');

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.dashboardSummary(admin?.wholesalerId, period),
    queryFn: () => fetchDashboardSummary(period),
    enabled: Boolean(admin?.wholesalerId),
  });
  const error = queryError ? (queryError.message || 'Failed to load dashboard.') : '';

  const tiles = useMemo(() => {
    if (!data) return [];
    return KPI_TILES.map((tile) => ({
      ...tile,
      value: data[tile.source]?.[tile.key] ?? 0,
    }));
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header card */}
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-slate-50 p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
          <div className="shrink-0 lg:w-56 flex flex-col justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <TrendingUp size={18} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-extrabold leading-tight text-slate-900">Overview</h3>
                <p className="text-[11px] text-slate-500 leading-tight">Live business snapshot</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-semibold text-slate-600">
              {PERIOD_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
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
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              <Calendar size={11} className="text-slate-400" />
              <span>{data?.from ? new Date(data.from).toLocaleDateString() : '—'} → {data?.to ? new Date(data.to).toLocaleDateString() : 'now'}</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <div key={tile.label} className={`rounded-xl border px-3 py-2.5 hover:shadow-sm transition ${TONE[tile.tone]}`}>
                  <div className="flex items-center justify-between gap-1.5">
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${tile.tone === 'slate' ? 'text-slate-500' : ''}`}>{tile.label}</p>
                    <span className={`h-6 w-6 inline-flex items-center justify-center rounded-lg ${ICON_TONE[tile.tone]}`}>
                      <Icon size={12} />
                    </span>
                  </div>
                  <p className="mt-0.5 text-lg font-extrabold leading-tight">{formatMoney(tile.value)}</p>
                  {tile.source === 'sales' && tile.key === 'totalSold' && data?.sales?.saleCount != null && (
                    <p className="text-[10px] text-slate-500">{data.sales.saleCount} sale{data.sales.saleCount === 1 ? '' : 's'}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Balance rollups (point-in-time, not period) + period shop overhead */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <BalanceCard
          icon={Users}
          tone="rose"
          label="Customers Owe You"
          value={data?.totals?.customersOweYou}
        />
        <BalanceCard
          icon={UserCheck}
          tone="blue"
          label="You Owe Suppliers"
          value={data?.totals?.youOweSuppliers}
        />
        <BalanceCard
          icon={PiggyBank}
          tone="emerald"
          label="Supplier Prepaid"
          value={data?.totals?.supplierPrepaid}
          hint="Advance you've paid"
        />
        <BalanceCard
          icon={CreditCard}
          tone="slate"
          label="Customer Credit"
          value={data?.totals?.customerCreditBalances}
          hint="Refunds owed"
        />
        <BalanceCard
          icon={Wallet}
          tone="amber"
          label="Shop Overhead"
          value={data?.profit?.shopExpenses}
          hint="This period"
        />
      </section>

      {/* Money breakdown row */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MoneyBreakdownCard
          title="Money In"
          icon={ArrowDownToLine}
          tone="emerald"
          rows={[
            { label: 'Customer payments', value: data?.moneyIn?.customerPayments },
            { label: 'Supplier commission received', value: data?.moneyIn?.supplierCommissionReceive },
            { label: 'Supplier expense received', value: data?.moneyIn?.supplierExpenseReceive },
          ]}
          total={data?.moneyIn?.total}
        />
        <MoneyBreakdownCard
          title="Money Out"
          icon={ArrowUpFromLine}
          tone="rose"
          rows={[
            { label: 'Supplier product payments', value: data?.moneyOut?.supplierProductPayments },
            { label: 'Shop overhead expenses', value: data?.moneyOut?.shopExpenses },
          ]}
          total={data?.moneyOut?.total}
        />
      </section>

      {/* Top shipments */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
              <Truck size={14} />
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">Top Shipments</h3>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
            {data?.topShipments?.length ?? 0} lots
          </span>
        </div>
        {(!data?.topShipments || data.topShipments.length === 0) ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">
            No shipment sales in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-3">Shipment</th>
                  <th className="py-2 pr-3">Supplier</th>
                  <th className="py-2 pr-3 text-right">Sold</th>
                  <th className="py-2 pr-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.topShipments.map((row) => (
                  <tr key={`${row.deliveryId ?? 'none'}-${row.shipmentName}`} className="hover:bg-slate-50">
                    <td className="py-2 pr-3 font-semibold text-slate-800">{row.shipmentName || '—'}</td>
                    <td className="py-2 pr-3 text-slate-600">{row.supplierName || '—'}</td>
                    <td className="py-2 pr-3 text-right font-extrabold text-slate-900">{formatMoney(row.totalSold)}</td>
                    <td className="py-2 pr-3 text-right text-slate-700">{formatRate(row.commissionRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

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

const BalanceCard = ({ icon: Icon, tone, label, value, hint }) => (
  <div className={`rounded-2xl border px-4 py-3 shadow-sm ${TONE[tone]}`}>
    <div className="flex items-center justify-between gap-2">
      <p className={`text-[11px] font-bold uppercase tracking-wider`}>{label}</p>
      <span className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>
        <Icon size={14} />
      </span>
    </div>
    <p className="mt-1 text-xl font-extrabold leading-tight">{formatMoney(value)}</p>
    {hint && <p className="text-[11px] text-slate-500 mt-0.5">{hint}</p>}
  </div>
);

const MoneyBreakdownCard = ({ title, icon: Icon, tone, rows, total }) => (
  <div className={`rounded-2xl border px-4 py-3 shadow-sm ${TONE[tone]}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className={`h-7 w-7 inline-flex items-center justify-center rounded-lg ${ICON_TONE[tone]}`}>
          <Icon size={14} />
        </span>
        <h4 className="text-sm font-extrabold">{title}</h4>
      </div>
      <p className="text-lg font-extrabold">{formatMoney(total)}</p>
    </div>
    <div className="mt-3 space-y-1.5">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center justify-between text-[12px] font-semibold text-slate-700">
          <span className="text-slate-600">{row.label}</span>
          <span>{formatMoney(row.value)}</span>
        </div>
      ))}
    </div>
  </div>
);

export default OverviewPage;
