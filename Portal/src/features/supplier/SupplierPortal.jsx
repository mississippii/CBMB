import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Building2, ChevronRight, LayoutGrid, MapPin, Package, Phone,
  RefreshCw, Truck, UserRound, Wallet,
} from 'lucide-react';
import Navbar from '../../shared/components/Navbar';
import { useAuth } from '../auth/AuthContext';
import { apiPaths, postJson } from '../../services/apiClient';
import { EmptyRow, ErrorBanner } from '../../shared/components/Loader';
import TablePager, { usePagination } from '../../shared/components/TablePager';
import { formatDate, formatMoney, formatQuantity } from '../../shared/utils/format';

const tabs = [
  { id: 'wholesalers', label: 'My Wholesalers', icon: LayoutGrid, color: '#FF0000' },
  { id: 'shipments',   label: 'Shipments',      icon: Truck,      color: '#008000' },
];
const TAB_IDS = tabs.map((t) => t.id);

// White icon on dark colours, black on bright ones — same rule as the dashboard.
const readableInk = (hex) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#000000' : '#ffffff';
};

/** Sold progress out of delivered quantity (uses remaining stock per item). */
const shipmentProgress = (shipment) => {
  const delivered = Number(shipment.totalQuantity) || 0;
  if (delivered <= 0) return null;
  const remaining = (shipment.items || [])
    .reduce((sum, item) => sum + (Number(item.inventoryQuantityOnHand) || 0), 0);
  const sold = Math.max(0, delivered - remaining);
  return { delivered, remaining, sold, pct: Math.min(100, Math.round((sold / delivered) * 100)) };
};

const ProgressBar = ({ pct }) => (
  <div className="h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
    <div
      className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}
      style={{ width: `${pct}%` }}
    />
  </div>
);

const Th = ({ children }) => (
  <th className="px-4 py-3 font-semibold text-slate-700">{children}</th>
);

/* ── Shipment detail body (shared by card rows and the shipments table) ─── */

const ShipmentDetailBody = ({ shipment: s }) => {
  const sold = Number(s.totalSold) || 0;
  const netPayable = Number(s.netPayable) || 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Total sold', value: formatMoney(sold), cls: 'text-slate-800' },
          { label: `Commission${s.commissionRate != null ? ` ${s.commissionRate}%` : ''}`, value: formatMoney(s.commissionAmount), cls: 'text-rose-600' },
          { label: 'Expenses', value: formatMoney(s.expenseTotal), cls: 'text-rose-600' },
          { label: 'Advance received', value: formatMoney(s.advancePaid), cls: 'text-amber-600' },
          { label: 'Net payable', value: formatMoney(netPayable), cls: netPayable >= 0 ? 'text-emerald-600' : 'text-amber-600' },
        ].map((cell) => (
          <div key={cell.label} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
            <p className="text-[11px] font-semibold text-slate-400 truncate">{cell.label}</p>
            <p className={`text-sm font-bold ${cell.cls}`}>{cell.value}</p>
          </div>
        ))}
      </div>

      {(s.items || []).length === 0 ? (
        <EmptyRow label="No items recorded." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Product', 'Lot', 'Delivered', 'Sold', 'Left', 'Progress'].map((h) => (
                  <th key={h} className="px-3 py-2 !text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.items.map((item) => {
                const qty = Number(item.quantity) || 0;
                const left = Number(item.inventoryQuantityOnHand) || 0;
                const soldQty = Math.max(0, qty - left);
                const pct = qty > 0 ? Math.min(100, Math.round((soldQty / qty) * 100)) : 0;
                const unit = String(item.unit || '').toLowerCase();
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2 !text-center font-semibold text-slate-800">
                      {item.productName}
                      {item.categoryName ? <span className="text-slate-400 font-normal"> · {item.categoryName}</span> : null}
                    </td>
                    <td className="px-3 py-2 !text-center text-slate-600">{item.subCategoryName || '—'}</td>
                    <td className="px-3 py-2 !text-center text-slate-800">{formatQuantity(qty)} {unit}</td>
                    <td className="px-3 py-2 !text-center text-slate-800">{formatQuantity(soldQty)} {unit}</td>
                    <td className={`px-3 py-2 !text-center font-semibold ${left > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                      {formatQuantity(left)} {unit}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2 min-w-[110px]">
                        <ProgressBar pct={pct} />
                        <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ── Wholesaler detail (opened from the table, like SupplierDetail) ─────── */

const SalesTransactionsTable = ({ sales, isLoading, error }) => {
  const sortedSales = useMemo(() => [...(sales || [])].sort((a, b) => {
    const byDate = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    return byDate || ((b.id || 0) - (a.id || 0));
  }), [sales]);
  const pager = usePagination(sortedSales, 8);

  return (
    <div className="supplier-panel">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2"><Wallet size={17} className="text-blue-600" /> Sales Transactions</h3>
        <span className="badge badge-teal">{sortedSales.length} total</span>
      </div>
      <ErrorBanner message={error?.message} />
      {isLoading ? (
        <div className="data-load-panel py-6">
          <div className="windows-loader" aria-label="Loading sales" />
          <h3>Loading sales</h3>
        </div>
      ) : sortedSales.length === 0 ? (
        <EmptyRow label="No sales recorded yet." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="center-table w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <Th>Date</Th>
                  <Th>Buyer</Th>
                  <Th>Product</Th>
                  <Th>Lot</Th>
                  <Th>Quantity</Th>
                  <Th>Weight</Th>
                  <Th>Unit Price</Th>
                  <Th>Sale Amount</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pager.pageItems.map((row) => {
                  const unit = String(row.unit || '').toLowerCase();
                  return (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 text-left">
                        <span className="font-semibold text-slate-900">{row.customerName || 'Walk-in buyer'}</span>
                        {row.customerPhone ? <span className="block text-xs text-slate-500">{row.customerPhone}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <span className="font-extrabold text-slate-900">{row.productName || 'Product'}</span>
                        {row.categoryName ? <span className="block text-xs text-slate-500">{row.categoryName}</span> : null}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.subCategoryName || '-'}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">
                        {formatQuantity(row.quantity)} {unit}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">
                        {row.saleWeightKg != null ? `${formatQuantity(row.saleWeightKg)} kg` : '-'}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 tabular-nums">{formatMoney(row.unitPrice, { decimals: 2 })}</td>
                      <td className="px-4 py-3 font-bold text-slate-900 tabular-nums">{formatMoney(row.saleAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sortedSales.length > 8 && <TablePager {...pager} />}
        </>
      )}
    </div>
  );
};

const WholesalerDetail = ({ link, shipments, supplierId, supplierHeaders, onBack }) => {
  const net = Number(link.netDue) || 0;
  const payable = net > 0 ? net : 0;
  const advance = net < 0 ? -net : 0;
  const { pageItems, ...pager } = usePagination(shipments, 8);
  const [detailShipment, setDetailShipment] = useState(null);
  const salesQuery = useQuery({
    queryKey: ['supplierPortal', 'sales', supplierId, link.accountId],
    queryFn: () => postJson(apiPaths.supplierPortalSales(supplierId), { accountId: link.accountId }, { headers: supplierHeaders }),
    enabled: Boolean(supplierId && link?.accountId),
  });

  return (
    <div className="space-y-5">
      {/* HEADER — mirrors the supplier profile header */}
      <div className="supplier-profile-header">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={onBack} className="back-arrow-btn" title="Back to wholesalers">
              <ArrowLeft size={18} />
            </button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30">
              <Building2 size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 truncate">{link.businessName}</h2>
                {link.status !== 'ACTIVE' && <span className="badge badge-rose">Inactive</span>}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><UserRound size={12} /> {link.ownerName || '—'}</span>
                <span className="inline-flex items-center gap-1"><Phone size={12} /> {link.phone || '—'}</span>
                <span className="inline-flex items-center gap-1"><MapPin size={12} /> {link.address || '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-workspace">
        <main className="profile-main-stack">
          {/* SHIPMENTS */}
          {shipments.length === 0 ? (
            <EmptyRow label="No shipments yet." />
          ) : (
            <div className="supplier-panel">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2"><Truck size={17} className="text-blue-600" /> Shipments</h3>
                <span className="badge badge-teal">{shipments.length} total</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="center-table w-full text-sm min-w-[620px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <Th>Shipment</Th>
                      <Th>Date</Th>
                      <Th>Unit</Th>
                      <Th>Sold</Th>
                      <Th>Left</Th>
                      <Th>Amount</Th>
                      <Th>{''}</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageItems.map((row) => {
                      const s = row.shipment;
                      const progress = shipmentProgress(s);
                      const unitsSold = s.totalUnitsSold != null
                        ? Number(s.totalUnitsSold) || 0
                        : (progress ? progress.sold : 0);
                      const left = progress ? progress.remaining : Math.max(0, Number(s.totalQuantity || 0) - unitsSold);
                      return (
                        <tr
                          key={s.id}
                          onClick={() => setDetailShipment(s)}
                          className="cursor-pointer transition-colors hover:bg-slate-50"
                          title="Click to view shipment details"
                        >
                          <td className="px-3 py-2.5 text-left">
                            <span className="font-extrabold text-slate-900">{s.name || `Shipment #${s.id}`}</span>
                            <span className="block text-[11px] text-slate-500">{(s.items || []).length} line{(s.items || []).length === 1 ? '' : 's'}</span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{formatDate(s.deliveryDate)}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700 tabular-nums">{formatQuantity(s.totalQuantity)}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-700 tabular-nums">{formatQuantity(unitsSold)}</td>
                          <td className={`px-3 py-2.5 font-semibold tabular-nums ${left > 0 ? 'text-slate-700' : 'text-slate-300'}`}>{formatQuantity(left)}</td>
                          <td className="px-3 py-2.5 font-bold text-slate-900 tabular-nums">{formatMoney(s.totalSold)}</td>
                          <td className="px-3 py-2.5 text-slate-400">
                            <ChevronRight size={15} className="mx-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {shipments.length > 8 && <TablePager {...pager} />}
            </div>
          )}

          <SalesTransactionsTable
            sales={salesQuery.data || []}
            isLoading={salesQuery.isLoading}
            error={salesQuery.error}
          />
        </main>

        <aside className="profile-side-stack">
          <div className="supplier-panel">
            <h3 className="flex items-center gap-2"><Wallet size={17} className="text-blue-600" /> My Money</h3>
            <div className="mt-3 space-y-2">
              <div className="box-row"><span>Owed to me</span><strong className="text-emerald-700">{formatMoney(payable)}</strong></div>
              <div className="box-row total"><span>Advance held by me</span><strong className="text-amber-700">{formatMoney(advance)}</strong></div>
            </div>
          </div>
          <div className="supplier-panel">
            <h3 className="flex items-center gap-2"><Package size={17} className="text-blue-600" /> Crates I Hold</h3>
            <div className="mt-3 space-y-2">
              {(link.crateDues || []).length === 0 ? (
                <div className="box-row"><span>No crates due</span><strong className="text-slate-400">0</strong></div>
              ) : (
                (link.crateDues || []).map((c) => (
                  <div key={c.crateType} className="box-row">
                    <span>{c.crateType}</span><strong>{c.quantity}</strong>
                  </div>
                ))
              )}
              <div className="box-row total">
                <span>Total crates</span>
                <strong className="text-blue-700">{link.totalCratesDue || 0}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {detailShipment && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '56rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Truck size={18} /></div>
                <div className="min-w-0">
                  <h2 className="truncate">{detailShipment.name || `Shipment #${detailShipment.id}`}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{formatDate(detailShipment.deliveryDate)} · {link.businessName}</p>
                </div>
              </div>
              <button type="button" onClick={() => setDetailShipment(null)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body max-h-[72vh] overflow-y-auto">
              <ShipmentDetailBody shipment={detailShipment} />
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setDetailShipment(null)} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Page ───────────────────────────────────────────────────────────────── */

const SupplierPortal = () => {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const supplierId = admin?.supplierId;
  const supplierPortalToken = admin?.supplierPortalToken;
  const supplierHeaders = supplierPortalToken ? { 'X-Supplier-Portal-Token': supplierPortalToken } : {};

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = TAB_IDS.includes(tabParam) ? tabParam : 'wholesalers';
  const setActiveTab = (id) => {
    setSelectedId(null);
    setSearchParams(id === 'wholesalers' ? {} : { tab: id });
  };

  const [selectedId, setSelectedId] = useState(null); // accountId of the opened wholesaler
  const [shipmentModal, setShipmentModal] = useState(null); // { wholesalerBusinessName, shipment }

  const overviewQuery = useQuery({
    queryKey: ['supplierPortal', 'overview', supplierId],
    queryFn: () => postJson(apiPaths.supplierPortalOverview(supplierId), undefined, { headers: supplierHeaders }),
    enabled: Boolean(supplierId && supplierPortalToken),
  });

  const shipmentsQuery = useQuery({
    queryKey: ['supplierPortal', 'shipments', supplierId],
    queryFn: () => postJson(apiPaths.supplierPortalShipments(supplierId), undefined, { headers: supplierHeaders }),
    enabled: Boolean(supplierId && supplierPortalToken),
  });

  const overview = overviewQuery.data;
  const wholesalers = overview?.wholesalers || [];
  const allShipments = useMemo(() => shipmentsQuery.data || [], [shipmentsQuery.data]);

  const shipmentsByWholesaler = useMemo(() => {
    const groups = {};
    allShipments.forEach((row) => {
      (groups[row.wholesalerId] ||= []).push(row);
    });
    return groups;
  }, [allShipments]);

  const flatPager = usePagination(allShipments, 10);
  const selected = wholesalers.find((w) => w.accountId === selectedId) || null;

  const totalCratesHeld = wholesalers.reduce((sum, w) => sum + (Number(w.totalCratesDue) || 0), 0);
  const shipmentTotals = allShipments.reduce((acc, row) => {
    acc.units += Number(row.shipment.totalQuantity) || 0;
    acc.sold += Number(row.shipment.totalSold) || 0;
    return acc;
  }, { units: 0, sold: 0 });

  const isLoading = overviewQuery.isLoading || shipmentsQuery.isLoading;
  const isRefreshing = overviewQuery.isFetching || shipmentsQuery.isFetching;

  const handleRefresh = () => {
    overviewQuery.refetch();
    shipmentsQuery.refetch();
  };

  const handleLogout = () => {
    logout();
    navigate('/supplier-login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <Navbar onHome={() => setActiveTab('wholesalers')} onLogout={handleLogout} />

      <div className="container-main">
        <div className="workspace-layout">
          <aside className="workspace-sidebar">
            <nav className="sidebar-nav">
              {tabs.map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                >
                  <span
                    className="sidebar-nav-badge"
                    style={{ background: color, boxShadow: `0 4px 10px ${color}59` }}
                  >
                    <Icon size={13} strokeWidth={2.4} color={readableInk(color)} />
                  </span>
                  <span className="sidebar-nav-title">{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="workspace-content">
            {isLoading ? (
              <div className="data-load-panel">
                <div className="windows-loader" aria-label="Loading data" />
                <h3>Loading data</h3>
              </div>
            ) : (
              <div className="animate-fadeIn space-y-4">
                <ErrorBanner message={overviewQuery.error?.message || shipmentsQuery.error?.message} />


                {/* WHOLESALER DETAIL */}
                {activeTab === 'wholesalers' && selected && (
                  <WholesalerDetail
                    link={selected}
                    shipments={shipmentsByWholesaler[selected.wholesalerId] || []}
                    supplierId={supplierId}
                    supplierHeaders={supplierHeaders}
                    onBack={() => setSelectedId(null)}
                  />
                )}

                {/* WHOLESALERS TABLE */}
                {activeTab === 'wholesalers' && !selected && (
                  <div className="profile-workspace">
                    <main className="profile-main-stack">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-extrabold text-slate-900">My Wholesalers</h2>
                      <button type="button" onClick={handleRefresh} className="btn-secondary flex items-center gap-2">
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                      </button>
                    </div>

                    {wholesalers.length === 0 ? (
                      <EmptyRow label="No wholesaler accounts yet." />
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                        <table className="party-table w-full min-w-[680px]">
                          <thead>
                            <tr>
                              <th className="w-[28%]">Wholesaler</th>
                              <th className="w-[20%]">Contact</th>
                              <th className="w-[13%] text-right">Shipments</th>
                              <th className="w-[13%] text-right">Crates Held</th>
                              <th className="w-[20%] text-right">Net Position</th>
                              <th className="w-[6%]" aria-label="Open" />
                            </tr>
                          </thead>
                          <tbody>
                            {wholesalers.map((w) => {
                              const net = Number(w.netDue) || 0;
                              const count = (shipmentsByWholesaler[w.wholesalerId] || []).length;
                              const positionLabel = net > 0 ? 'Owed to me' : net < 0 ? 'Advance held' : 'Settled';
                              const positionClass = net > 0 ? 'text-emerald-700' : net < 0 ? 'text-amber-700' : 'text-slate-400';
                              return (
                                <tr
                                  key={w.accountId}
                                  onClick={() => setSelectedId(w.accountId)}
                                  className="cursor-pointer"
                                >
                                  <td>
                                    <div className="party-cell-main">
                                      <span className="party-avatar">{w.businessName?.charAt(0).toUpperCase() || 'W'}</span>
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="party-name">{w.businessName}</span>
                                          {w.status !== 'ACTIVE' && <span className="badge badge-rose">Inactive</span>}
                                        </div>
                                        <div className="party-subline">{w.ownerName || 'No owner name'}</div>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="party-contact">
                                      <span>{w.phone || '—'}</span>
                                      <small>{w.address || 'No address'}</small>
                                    </div>
                                  </td>
                                  <td className="text-right font-semibold tabular-nums text-slate-700">{count}</td>
                                  <td className={`text-right font-semibold tabular-nums ${Number(w.totalCratesDue) > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                                    {Number(w.totalCratesDue) > 0 ? w.totalCratesDue : '—'}
                                  </td>
                                  <td className="text-right">
                                    <span className={`block font-bold tabular-nums ${positionClass}`}>{net === 0 ? '—' : formatMoney(Math.abs(net))}</span>
                                    <span className="block text-[11px] font-semibold text-slate-400">{positionLabel}</span>
                                  </td>
                                  <td className="text-right text-slate-400">
                                    <ChevronRight size={16} className="ml-auto" />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    </main>

                    <aside className="profile-side-stack">
                      <div className="supplier-panel">
                        <h3 className="flex items-center gap-2"><Wallet size={17} className="text-blue-600" /> My Money</h3>
                        <div className="mt-3 space-y-2">
                          <div className="box-row"><span>Owed to me</span><strong className="text-emerald-700">{formatMoney(overview?.totalPayableToSupplier)}</strong></div>
                          <div className="box-row total"><span>Advance held by me</span><strong className="text-amber-700">{formatMoney(overview?.totalAdvanceHeldBySupplier)}</strong></div>
                        </div>
                      </div>
                      <div className="supplier-panel">
                        <h3 className="flex items-center gap-2"><Package size={17} className="text-blue-600" /> Overview</h3>
                        <div className="mt-3 space-y-2">
                          <div className="box-row"><span>Wholesalers</span><strong>{wholesalers.length}</strong></div>
                          <div className="box-row"><span>Shipments</span><strong>{allShipments.length}</strong></div>
                          <div className="box-row total"><span>Crates held</span><strong>{totalCratesHeld}</strong></div>
                        </div>
                      </div>
                    </aside>
                  </div>
                )}

                {/* ALL SHIPMENTS */}
                {activeTab === 'shipments' && (
                  <div className="profile-workspace">
                    <main className="profile-main-stack">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-extrabold text-slate-900">Shipments</h2>
                      <button type="button" onClick={handleRefresh} className="btn-secondary flex items-center gap-2">
                        <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                      </button>
                    </div>

                    {allShipments.length === 0 ? (
                      <EmptyRow label="No shipments yet." />
                    ) : (
                      <>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="center-table w-full text-sm min-w-[720px]">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200">
                                <Th>Shipment Name</Th>
                                <Th>Wholesaler</Th>
                                <Th>Total Unit</Th>
                                <Th>Unit Sold</Th>
                                <Th>Total Sold Price</Th>
                                <Th>{''}</Th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {flatPager.pageItems.map((row) => {
                                const s = row.shipment;
                                const key = `${row.wholesalerId}-${s.id}`;
                                const progress = shipmentProgress(s);
                                const unitsSold = s.totalUnitsSold != null
                                  ? Number(s.totalUnitsSold) || 0
                                  : (progress ? progress.sold : 0);
                                return (
                                  <tr
                                    key={key}
                                    onClick={() => setShipmentModal(row)}
                                    className="cursor-pointer transition-colors hover:bg-slate-50"
                                    title="Click to view shipment details"
                                  >
                                      <td className="px-4 py-3">
                                        <span className="font-semibold text-slate-900">{s.name || `Shipment #${s.id}`}</span>
                                        <span className="block text-xs text-slate-500">{formatDate(s.deliveryDate)}</span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-700">{row.wholesalerBusinessName}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-700">{formatQuantity(s.totalQuantity)}</td>
                                      <td className="px-4 py-3 font-semibold text-slate-700">{formatQuantity(unitsSold)}</td>
                                      <td className="px-4 py-3 font-bold text-slate-900">{formatMoney(s.totalSold)}</td>
                                      <td className="px-4 py-3 text-slate-400">
                                        <ChevronRight size={15} className="mx-auto" />
                                      </td>
                                    </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        <TablePager
                          page={flatPager.page} setPage={flatPager.setPage}
                          pageSize={flatPager.pageSize} setPageSize={flatPager.setPageSize}
                          totalPages={flatPager.totalPages} total={flatPager.total}
                          rangeStart={flatPager.rangeStart} rangeEnd={flatPager.rangeEnd}
                        />
                      </>
                    )}
                    </main>

                    <aside className="profile-side-stack">
                      <div className="supplier-panel">
                        <h3 className="flex items-center gap-2"><Truck size={17} className="text-blue-600" /> Shipments Summary</h3>
                        <div className="mt-3 space-y-2">
                          <div className="box-row"><span>Total shipments</span><strong>{allShipments.length}</strong></div>
                          <div className="box-row"><span>Total units</span><strong>{formatQuantity(shipmentTotals.units)}</strong></div>
                          <div className="box-row total"><span>Total sold</span><strong className="text-emerald-700">{formatMoney(shipmentTotals.sold)}</strong></div>
                        </div>
                      </div>
                    </aside>
                  </div>
                )}

                {shipmentModal && (
                  <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '56rem' }}>
                      <div className="modal-header">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="modal-icon-circle bg-blue-100 text-blue-700"><Truck size={18} /></div>
                          <div className="min-w-0">
                            <h2 className="truncate">{shipmentModal.shipment.name || `Shipment #${shipmentModal.shipment.id}`}</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {formatDate(shipmentModal.shipment.deliveryDate)} · {shipmentModal.wholesalerBusinessName}
                            </p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setShipmentModal(null)} className="modal-close-btn">✕</button>
                      </div>
                      <div className="modal-body max-h-[72vh] overflow-y-auto">
                        <ShipmentDetailBody shipment={shipmentModal.shipment} />
                      </div>
                      <div className="modal-footer">
                        <button type="button" onClick={() => setShipmentModal(null)} className="btn-secondary">Close</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default SupplierPortal;
