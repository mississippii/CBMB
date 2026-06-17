import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, TrendingUp, Banknote, CreditCard, ArrowDownToLine, ArrowUpFromLine,
  Users, UserCheck, Truck, Wallet, Package, ChevronRight, Sun, ShoppingBag,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';
import { DateRangeFilter, todayLocalIso, nextDayLocalIso } from '../../shared/components';
import { formatDate } from '../../shared/utils/format';

const formatMoney = (value) => '৳ ' + Math.ceil(Number(value) || 0).toLocaleString();
const formatRate = (value) => (value == null ? '—' : `${Number(value).toFixed(2)}%`);
const formatCount = (value) => (Number(value) || 0).toLocaleString();

const TODAY_TILES = [
  { key: 'totalSale',    label: 'Total Sale',     icon: TrendingUp, accent: 'sky'     },
  { key: 'cashAtSale',   label: 'Cash',           icon: Banknote,   accent: 'emerald' },
  { key: 'dueCreated',   label: 'Due Created',    icon: CreditCard, accent: 'rose'    },
  { key: 'shopExpenses', label: 'Shop Expenses',  icon: Wallet,     accent: 'amber'   },
];

const ACCENT = {
  sky:     { ring: 'ring-sky-200',     icon: 'bg-sky-100 text-sky-700',         value: 'text-sky-900',     dot: 'bg-sky-500'     },
  emerald: { ring: 'ring-emerald-200', icon: 'bg-emerald-100 text-emerald-700', value: 'text-emerald-900', dot: 'bg-emerald-500' },
  rose:    { ring: 'ring-rose-200',    icon: 'bg-rose-100 text-rose-700',       value: 'text-rose-900',    dot: 'bg-rose-500'    },
  amber:   { ring: 'ring-amber-200',   icon: 'bg-amber-100 text-amber-700',     value: 'text-amber-900',   dot: 'bg-amber-500'   },
  slate:   { ring: 'ring-slate-200',   icon: 'bg-slate-100 text-slate-700',     value: 'text-slate-900',   dot: 'bg-slate-400'   },
  blue:    { ring: 'ring-blue-200',    icon: 'bg-blue-100 text-blue-700',       value: 'text-blue-900',    dot: 'bg-blue-500'    },
};

const OverviewPage = ({ onOpenProfile }) => {
  const { admin } = useAuth();
  const { fetchDashboardSummary, fetchInventoryList, suppliers, customers } = useData();
  const [fromDate, setFromDate] = useState(todayLocalIso());
  const [toDate, setToDate] = useState(todayLocalIso());

  const { data: todayData } = useQuery({
    queryKey: queryKeys.dashboardSummary(admin?.wholesalerId, 'today'),
    queryFn: () => fetchDashboardSummary('today'),
    enabled: Boolean(admin?.wholesalerId),
  });

  const { data, isLoading: loading, error: queryError } = useQuery({
    queryKey: queryKeys.dashboardSummary(admin?.wholesalerId, `${fromDate}_${toDate}`),
    queryFn: () => fetchDashboardSummary('custom', `${fromDate}T00:00:00`, `${nextDayLocalIso(toDate)}T00:00:00`),
    enabled: Boolean(admin?.wholesalerId),
  });
  const error = queryError ? (queryError.message || 'Failed to load dashboard.') : '';

  const { data: inventory = [] } = useQuery({
    queryKey: queryKeys.inventory.list(admin?.wholesalerId),
    queryFn: () => fetchInventoryList(),
    enabled: Boolean(admin?.wholesalerId),
  });

  const todayValues = {
    totalSale:    todayData?.sales?.totalSold ?? 0,
    cashAtSale:   todayData?.sales?.cashAtSale ?? 0,
    dueCreated:   todayData?.sales?.dueCreated ?? 0,
    shopExpenses: todayData?.profit?.shopExpenses ?? 0,
    saleCount:    todayData?.sales?.saleCount ?? 0,
  };

  const productSummary = useMemo(() => {
    let inStock = 0, stockOut = 0, totalQty = 0;
    inventory.forEach((p) => {
      const qty = Number(p?.totalQuantity ?? p?.quantity ?? 0) || 0;
      totalQty += qty;
      if (qty > 0) inStock += 1; else stockOut += 1;
    });
    return { productCount: inventory.length, inStock, stockOut, totalQty };
  }, [inventory]);

  // Sort strips: biggest dues first. Compute consolidated totals for the strip headers.
  const supplierStats = useMemo(() => {
    const list = [...(suppliers || [])].sort((a, b) =>
      Math.abs(Number(b.amountDue) || 0) - Math.abs(Number(a.amountDue) || 0)
    );
    let youOwe = 0, prepaid = 0;
    list.forEach((s) => {
      const amt = Number(s.amountDue) || 0;
      if (amt > 0) youOwe += amt; else prepaid += Math.abs(amt);
    });
    return { list, youOwe, prepaid };
  }, [suppliers]);

  const customerStats = useMemo(() => {
    const list = [...(customers || [])].sort((a, b) =>
      Math.abs(Number(b.amountDue) || 0) - Math.abs(Number(a.amountDue) || 0)
    );
    let owesYou = 0, credit = 0;
    list.forEach((c) => {
      const amt = Number(c.amountDue) || 0;
      if (amt > 0) owesYou += amt; else credit += Math.abs(amt);
    });
    return { list, owesYou, credit };
  }, [customers]);

  return (
    <div className="space-y-4">

      {/* ============================================================
          TODAY — primary hero, no period selector. The day at a glance.
          ============================================================ */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20 text-amber-200">
              <Sun size={16} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold leading-tight">Today</h3>
              <p className="text-[11px] text-slate-300">
                {formatDate(new Date())}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-200">
            {todayValues.saleCount} sale{todayValues.saleCount === 1 ? '' : 's'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TODAY_TILES.map((tile) => {
            const Icon = tile.icon;
            const a = ACCENT[tile.accent];
            return (
              <div key={tile.key} className="rounded-xl bg-white/95 px-3 py-3 ring-1 ring-white/10 backdrop-blur">
                <div className="flex items-center justify-between gap-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{tile.label}</p>
                  <span className={`h-6 w-6 inline-flex items-center justify-center rounded-lg ${a.icon}`}>
                    <Icon size={12} />
                  </span>
                </div>
                <p className={`mt-1 text-xl font-extrabold leading-tight ${a.value}`}>
                  {formatMoney(todayValues[tile.key])}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          MONEY MATTERS — two strips with totals folded into headers.
          Replaces the 4-card balance rollup row.
          ============================================================ */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <MoneyStrip
          title="Suppliers"
          icon={UserCheck}
          accent="blue"
          parties={supplierStats.list}
          partyType="supplier"
          totals={[
            { label: 'You owe', value: supplierStats.youOwe, tone: 'rose' },
            { label: 'Prepaid', value: supplierStats.prepaid, tone: 'emerald' },
          ]}
          dueLabel={(amt) => amt > 0 ? 'You owe' : amt < 0 ? 'Prepaid' : 'Settled'}
          onOpenProfile={onOpenProfile}
          emptyText="No suppliers yet."
        />
        <MoneyStrip
          title="Customers"
          icon={Users}
          accent="rose"
          parties={customerStats.list}
          partyType="customer"
          totals={[
            { label: 'Owes you', value: customerStats.owesYou, tone: 'rose' },
            { label: 'Credit', value: customerStats.credit, tone: 'emerald' },
          ]}
          dueLabel={(amt) => amt > 0 ? 'Owes you' : amt < 0 ? 'Credit' : 'Settled'}
          onOpenProfile={onOpenProfile}
          emptyText="No customers yet."
        />
      </section>

      {/* ============================================================
          PERIOD — money flow + profit. Period selector lives here.
          ============================================================ */}
      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <TrendingUp size={16} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">Cash flow</h3>
              <p className="text-[11px] text-slate-500 inline-flex items-center gap-1">
                <Calendar size={10} />
                {formatDate(data?.from)} → {data?.to ? formatDate(data.to) : 'now'}
              </p>
            </div>
          </div>
          <DateRangeFilter from={fromDate} to={toDate} setFrom={setFromDate} setTo={setToDate} />
        </div>

        {/* Big Net Profit + the two breakdown cards */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
            <div className="flex items-center gap-2">
              <span className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                <TrendingUp size={14} />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Net Profit</p>
            </div>
            <p className={`mt-1 text-3xl font-black ${Number(data?.profit?.netProfit) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatMoney(data?.profit?.netProfit)}
            </p>
            <div className="mt-2 space-y-1 text-[11px] text-slate-600">
              <Row label="Commission earned" value={data?.profit?.commissionEarned} />
              <Row label="Shop overhead" value={data?.profit?.shopExpenses} negative />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FlowCard
              title="Money In"
              icon={ArrowDownToLine}
              accent="emerald"
              rows={[
                { label: 'Customer payments', value: data?.moneyIn?.customerPayments },
              ]}
              total={data?.moneyIn?.total}
            />
            <FlowCard
              title="Money Out"
              icon={ArrowUpFromLine}
              accent="rose"
              rows={[
                { label: 'Supplier product payments', value: data?.moneyOut?.supplierProductPayments },
                { label: 'Shop overhead', value: data?.moneyOut?.shopExpenses },
              ]}
              total={data?.moneyOut?.total}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
          STOCK + SHIPMENTS — side by side.
          ============================================================ */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_2fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Package size={14} />
            </span>
            <h3 className="text-sm font-extrabold text-slate-900">Stock</h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat icon={ShoppingBag} accent="blue"
              label="Products" value={formatCount(productSummary.productCount)} />
            <MiniStat icon={Package} accent="emerald"
              label="In Stock" value={formatCount(productSummary.inStock)} />
            <MiniStat icon={Package} accent={productSummary.stockOut > 0 ? 'rose' : 'slate'}
              label="Out" value={formatCount(productSummary.stockOut)} />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {formatCount(productSummary.totalQty)} total units across {productSummary.productCount} product{productSummary.productCount === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-8 w-8 inline-flex items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                <Truck size={14} />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">Top Shipments</h3>
            </div>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700">
              {data?.topShipments?.length ?? 0} lots
            </span>
          </div>
          {(!data?.topShipments || data.topShipments.length === 0) ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[12px] font-semibold text-slate-500">
              No shipment sales in this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-1.5 pr-3">Shipment</th>
                    <th className="py-1.5 pr-3">Supplier</th>
                    <th className="py-1.5 pr-3 text-right">Sold</th>
                    <th className="py-1.5 pr-3 text-right">Comm.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topShipments.map((row) => (
                    <tr key={`${row.deliveryId ?? 'none'}-${row.shipmentName}`} className="hover:bg-slate-50">
                      <td className="py-1.5 pr-3 font-semibold text-slate-800">{row.shipmentName || '—'}</td>
                      <td className="py-1.5 pr-3 text-slate-600">{row.supplierName || '—'}</td>
                      <td className="py-1.5 pr-3 text-right font-extrabold text-slate-900">{formatMoney(row.totalSold)}</td>
                      <td className="py-1.5 pr-3 text-right text-slate-700">{formatRate(row.commissionRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {loading && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-[12px] font-semibold text-slate-500">
          Loading…
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[12px] font-semibold text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, negative }) => (
  <div className="flex items-center justify-between">
    <span className="text-slate-500">{label}</span>
    <span className={`font-bold ${negative ? 'text-rose-700' : 'text-slate-800'}`}>
      {negative ? '−' : ''}{formatMoney(value)}
    </span>
  </div>
);

const MiniStat = ({ icon: Icon, accent, label, value }) => {
  const a = ACCENT[accent] || ACCENT.slate;
  return (
    <div className={`rounded-lg ring-1 ${a.ring} bg-white px-2.5 py-2`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-5 w-5 inline-flex items-center justify-center rounded ${a.icon}`}>
          <Icon size={10} />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`mt-0.5 text-lg font-extrabold leading-tight ${a.value}`}>{value}</p>
    </div>
  );
};

const FlowCard = ({ title, icon: Icon, accent, rows, total }) => {
  const a = ACCENT[accent];
  return (
    <div className={`rounded-xl border ring-1 ${a.ring} bg-white px-3 py-3`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`h-6 w-6 inline-flex items-center justify-center rounded-lg ${a.icon}`}>
            <Icon size={12} />
          </span>
          <h4 className="text-[12px] font-extrabold text-slate-800">{title}</h4>
        </div>
        <p className={`text-base font-extrabold ${a.value}`}>{formatMoney(total)}</p>
      </div>
      <div className="mt-2 space-y-0.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span>{row.label}</span>
            <span className="text-slate-800">{formatMoney(row.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Money strip with consolidated totals in the header. Horizontally scrolling
 * party cards, click → onOpenProfile(partyType, id) jumps to their profile.
 */
const MoneyStrip = ({ title, icon: Icon, accent, parties, partyType, totals, dueLabel, onOpenProfile, emptyText }) => {
  const a = ACCENT[accent];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.icon}`}>
            <Icon size={14} />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            <p className="text-[10px] text-slate-500">{parties.length} account{parties.length === 1 ? '' : 's'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {totals.map((t) => {
            const ta = ACCENT[t.tone] || ACCENT.slate;
            return (
              <div key={t.label} className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.label}</p>
                <p className={`text-[13px] font-extrabold ${ta.value}`}>{formatMoney(t.value)}</p>
              </div>
            );
          })}
        </div>
      </div>
      {parties.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[12px] font-semibold text-slate-500">
          {emptyText}
        </div>
      ) : (
        <div className="-mx-1 overflow-x-auto pb-1">
          <div className="flex gap-2 px-1">
            {parties.map((p) => {
              const amt = Number(p.amountDue) || 0;
              const isOutstanding = amt !== 0;
              const amtTone = !isOutstanding
                ? 'text-slate-500'
                : (amt > 0 ? 'text-rose-700' : 'text-emerald-700');
              const dotTone = !isOutstanding
                ? 'bg-slate-300'
                : (amt > 0 ? 'bg-rose-500' : 'bg-emerald-500');
              const initials = String(p.name || '?').trim().slice(0, 1).toUpperCase();
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onOpenProfile?.(partyType, p.id)}
                  className="group shrink-0 w-40 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm transition"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-7 w-7 inline-flex items-center justify-center rounded-full text-xs font-extrabold ${a.icon}`}>
                      {initials}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[12px] font-bold text-slate-900">{p.name || 'Unnamed'}</p>
                    <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-500" />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${dotTone}`} />
                    <span className="text-[10px] font-semibold text-slate-500">{dueLabel(amt)}</span>
                  </div>
                  <p className={`text-base font-extrabold leading-tight ${amtTone}`}>
                    {formatMoney(Math.abs(amt))}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewPage;
