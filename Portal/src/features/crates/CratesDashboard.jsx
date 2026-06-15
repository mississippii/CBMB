import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Plus, AlertTriangle, ArrowRightLeft, Store, Users, UserCheck, Package,
  TrendingDown, ArrowUpRight, FileText, BarChart3, Zap,
  ShoppingCart, ChevronDown, ChevronUp, DollarSign, X, Wallet,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import { postJson, apiPaths } from '../../services/apiClient';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';

// Crate types are an admin-managed global catalog. The dashboard mirrors the active
// catalog into the wholesaler's box_types on every load, so `d.crateTypes` is the
// full list of selectable types (with their live inventory) — no hard-coding.
const EMPTY_TYPE = { name: '', label: '', total: 0, inShop: 0, withSuppliers: 0, withCustomers: 0, lost: 0, purchasePrice: 0, weightedAvgCost: 0 };

const titleCase = (s) => {
  const str = String(s || '').trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : str;
};

const mapDashboard = (d) => {
  const types = (d?.crateTypes || []).map((t) => {
    const name = String(t.crateType || '').trim().toUpperCase();
    return {
      name,
      label: titleCase(t.crateType),
      total: Number(t.total) || 0,
      inShop: Number(t.inHand) || 0,
      withSuppliers: Number(t.withSuppliers) || 0,
      withCustomers: Number(t.withCustomers) || 0,
      lost: Number(t.lostDamaged) || 0,
      purchasePrice: Number(t.purchasePrice) || 0,
      weightedAvgCost: Number(t.weightedAvgCost) || 0,
    };
  });
  const byType = {};
  types.forEach((t) => { byType[t.name] = t; });
  return {
    totalCratesOwned: Number(d?.totalCratesOwned) || 0,
    cratesInShop: Number(d?.cratesInShop) || 0,
    cratesWithSuppliers: Number(d?.cratesWithSuppliers) || 0,
    cratesWithCustomers: Number(d?.cratesWithCustomers) || 0,
    cratesLostDamaged: Number(d?.cratesLostDamaged) || 0,
    totalCrateValue: Number(d?.totalCrateValue) || 0,
    types,
    byType,
  };
};

const EMPTY_PURCHASE = { paymentMethod: 'CASH', lines: [{ crateType: '', quantity: '', unitPrice: '' }] };
const PAYMENT_METHODS = ['CASH', 'BANK', 'BKASH', 'NAGAD', 'OTHER'];
const EMPTY_SELL = { buyerKind: 'customer', customerId: '', note: '', paymentMethod: 'CASH', lines: [{ crateType: '', quantity: '', unitSalePrice: '' }] };
const EMPTY_LOSS = { reason: 'lost', lines: [{ crateType: '', quantity: '' }] };
// One crate type per transaction — borrow/return/give/receive are each recorded separately.
// owner = whose crates (WHOLESALER = leg 1, SUPPLIER = leg 2); action = give / return.
// lines lets several crate types be recorded in one entry.
// movement: give (my crates → supplier) / return (supplier returns mine) / receive (supplier's crates in) / handback (return theirs).
const EMPTY_SUPPLIER = { supplierId: '', movement: 'give', lines: [{ crateType: '', quantity: '' }], note: '' };
// movement: borrow (give to customer) / return (customer returns mine) / receive (customer's crates in) / handback (return theirs).
const EMPTY_CUSTOMER = { customerId: '', movement: 'borrow', deposit: '', note: '', lines: [{ crateType: '', quantity: '' }] };

// Line colors for the N-type loss chart, cycled per crate type.
const LOSS_COLORS = ['#1d63ed', '#f43f5e', '#059669', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

// Empty-catalog hint shared by every crate picker — keeps the forms self-explanatory
// when no crate types exist yet (all types are admin-managed, fully backend-driven).
const NoCrateTypes = () => (
  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
    No crate types yet — ask an admin to add one under <span className="font-semibold">Crates Service</span>.
  </p>
);

// Single-type dropdown used by every Crate Toolkit form. Lists all available catalog
// types; `hintOf(value)` renders an optional contextual line under the select (e.g.
// "5 in shop" / "3 held by customer"). One type per transaction — borrow/return/sell
// are each recorded separately.
const CrateTypeSelect = ({ types, value, onChange, hintOf, placeholder = 'Choose crate type…' }) => {
  if (!types.length) return <NoCrateTypes />;
  return (
    <div className="space-y-1">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      >
        <option value="">{placeholder}</option>
        {types.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {hintOf && value && <p className="text-[11px] text-slate-500">{hintOf(value)}</p>}
    </div>
  );
};

const KPI = ({ icon: Icon, label, value, tone = 'default' }) => (
  <div className={`kpi-tile kpi-tile-${tone}`}>
    <div className="kpi-tile-icon"><Icon size={18} /></div>
    <div className="kpi-tile-body">
      <p className="kpi-tile-label">{label}</p>
      <strong className="kpi-tile-value">{value}</strong>
    </div>
  </div>
);

const BoxDashboard = () => {
  const { suppliers, customers, addCrates, markCratesLost, sellCrates, refreshTransactions } = useData();
  const { admin } = useAuth();
  const showToast = useToast();

  // Live dashboard data — always fresh (refetches on tab focus + after writes via invalidation).
  const { data: dashboardRaw } = useQuery({
    queryKey: queryKeys.crates.dashboard(admin?.wholesalerId),
    queryFn: () => postJson(apiPaths.cratesDashboard(admin.wholesalerId)),
    enabled: Boolean(admin?.wholesalerId),
  });
  const crateInventory = mapDashboard(dashboardRaw);

  // Selectable types come straight from the dashboard (mirrors the active admin catalog).
  const boxTypes = crateInventory.types.map((t) => ({ value: t.name, label: t.label }));
  const defaultType = boxTypes[0]?.value || '';
  const statOf = (name) => crateInventory.byType[String(name || '').toUpperCase()] || EMPTY_TYPE;

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState(EMPTY_PURCHASE);
  const [lossForm, setLossForm] = useState(EMPTY_LOSS);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER);
  const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);
  const [sellForm, setSellForm] = useState(EMPTY_SELL);

  const [purchaseError, setPurchaseError] = useState('');
  const [lossError, setLossError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [customerError, setCustomerError] = useState('');
  const [sellError, setSellError] = useState('');

  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isSavingLoss, setIsSavingLoss] = useState(false);
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const [isSavingSell, setIsSavingSell] = useState(false);

  // Stats — "Active" excludes lost since lost is permanent loss
  const totalOwned = Number(crateInventory.totalCratesOwned) || 0;
  const inShop = Number(crateInventory.cratesInShop) || 0;
  const withCustomers = Number(crateInventory.cratesWithCustomers) || 0;
  const withSuppliers = Number(crateInventory.cratesWithSuppliers) || 0;
  const lost = Number(crateInventory.cratesLostDamaged) || 0;
  const totalCrateValue = Number(crateInventory.totalCrateValue) || 0; // capital tied up in live crates
  const active = Math.max(totalOwned - lost, 0); // adjusted total — lost is gone

  const safe = Math.max(active, 1);
  const inShopPct = Math.round((inShop / safe) * 100);
  const customerPct = Math.round((withCustomers / safe) * 100);
  const supplierPct = Math.round((withSuppliers / safe) * 100);

  // Crates that belong to OTHERS but sit in my custody (leg 2) — a liability, not my stock.
  const suppliersHoldingMine = suppliers.filter((s) => Number(s.totalCratesHeld) > 0);
  const totalSupplierCratesHeld = suppliers.reduce((sum, s) => sum + (Number(s.totalCratesHeld) || 0), 0);
  const customersHoldingMine = customers.filter((c) => Number(c.totalCratesHeld) > 0);
  const totalCustomerCratesHeld = customers.reduce((sum, c) => sum + (Number(c.totalCratesHeld) || 0), 0);

  // Loss stats
  const [lossRange, setLossRange] = useState(3);
  const [showLossTrend, setShowLossTrend] = useState(false);
  const { data: lossStats, isLoading: lossLoading } = useQuery({
    queryKey: queryKeys.crates.lossStats(admin?.wholesalerId, lossRange),
    queryFn: () => postJson(apiPaths.cratesLossStats(admin.wholesalerId), { months: lossRange }),
    enabled: Boolean(admin?.wholesalerId),
  });

  const crateTypes = crateInventory.types.map((t) => ({ key: t.name, label: t.label, data: t }));

  // Selected-party crate holdings (per type) — drives the contextual hints in the
  // customer/supplier movement forms so the user sees what's available before typing.
  const selectedCustomer = customers.find((c) => String(c.id) === String(customerForm.customerId));
  const selectedSupplier = suppliers.find((s) => String(s.id) === String(supplierForm.supplierId));
  const holdingOf = (party, type) =>
    (party?.crateHoldings || []).find((h) => h.crateType === String(type || '').toUpperCase())?.quantity || 0;
  // Leg 2 — the party's own crates the wholesaler is holding, per type (supplier or customer).
  const heldOf = (party, type) =>
    (party?.supplierCrateHoldings || party?.customerCrateHoldings || []).find((h) => h.crateType === String(type || '').toUpperCase())?.quantity || 0;

  // Supplier crate line helpers (multiple crate types per entry).
  const updateSupplierLine = (i, patch) => setSupplierForm((p) => ({ ...p, lines: p.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) }));
  const addSupplierLine = () => setSupplierForm((p) => ({ ...p, lines: [...p.lines, { crateType: '', quantity: '' }] }));
  const removeSupplierLine = (i) => setSupplierForm((p) => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, idx) => idx !== i) : p.lines }));

  // Generic multi-line crate helpers for the customer / purchase / loss / sell modals.
  const lineSetter = (setForm, blank) => ({
    update: (i, patch) => setForm((p) => ({ ...p, lines: p.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)) })),
    add: () => setForm((p) => ({ ...p, lines: [...p.lines, { ...blank }] })),
    remove: (i) => setForm((p) => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((_, idx) => idx !== i) : p.lines })),
  });
  const customerLine = lineSetter(setCustomerForm, { crateType: '', quantity: '' });
  const purchaseLine = lineSetter(setPurchaseForm, { crateType: '', quantity: '', unitPrice: '' });
  const lossLine = lineSetter(setLossForm, { crateType: '', quantity: '' });
  const sellLine = lineSetter(setSellForm, { crateType: '', quantity: '', unitSalePrice: '' });
  // Collect valid {crateType, quantity, ...extra} lines from a form, merging duplicate types' quantities.
  const collectLines = (lines, extraKeys = []) => {
    const out = [];
    for (const l of lines) {
      const crateType = String(l.crateType || '').toUpperCase();
      const quantity = Math.floor(Number(l.quantity) || 0);
      if (!crateType || quantity <= 0) continue;
      const row = { crateType, quantity };
      for (const k of extraKeys) row[k] = l[k];
      out.push(row);
    }
    return out;
  };

  // Handlers
  const handlePurchase = async () => {
    const lines = collectLines(purchaseForm.lines, ['unitPrice']);
    if (lines.length === 0) { setPurchaseError('Add at least one crate type with a quantity.'); return; }
    for (const l of lines) {
      if (!(Number(l.unitPrice) > 0)) { setPurchaseError(`Enter a cost per crate for ${l.crateType}.`); return; }
    }
    setIsSavingPurchase(true); setPurchaseError('');
    try {
      await addCrates(null, null, null, lines, purchaseForm.paymentMethod);
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      showToast(`Added ${totalQty} crates across ${lines.length} type${lines.length === 1 ? '' : 's'}`, 'success');
      setPurchaseForm(EMPTY_PURCHASE);
      setShowPurchaseModal(false);
    } catch (err) {
      setPurchaseError(err.message || 'Failed to add crates.');
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const openPurchaseModal = () => {
    const type = defaultType;
    const currentPrice = statOf(type).purchasePrice || 0;
    setPurchaseForm({ lines: [{ crateType: type, quantity: '', unitPrice: currentPrice ? String(currentPrice) : '' }] });
    setPurchaseError('');
    setShowPurchaseModal(true);
  };

  // When a purchase line's type changes, default its cost to that type's current price (if blank).
  const setPurchaseLineType = (i, newType) => {
    const typePrice = statOf(newType).purchasePrice || 0;
    setPurchaseForm((p) => ({
      ...p,
      lines: p.lines.map((l, idx) => (idx === i
        ? { ...l, crateType: newType, unitPrice: l.unitPrice === '' && typePrice ? String(typePrice) : l.unitPrice }
        : l)),
    }));
  };

  const openSellModal = () => {
    setSellForm({ ...EMPTY_SELL, crateType: defaultType });
    setSellError('');
    setShowSellModal(true);
  };

  const openLossModal = () => {
    setLossForm({ ...EMPTY_LOSS, crateType: defaultType });
    setLossError('');
    setShowLossModal(true);
  };

  const handleSell = async () => {
    const lines = collectLines(sellForm.lines, ['unitSalePrice']);
    if (lines.length === 0) { setSellError('Add at least one crate type with a quantity.'); return; }
    if (sellForm.buyerKind === 'customer' && !sellForm.customerId) {
      setSellError('Pick the customer who is buying the crates.');
      return;
    }
    for (const l of lines) {
      if (!(Number(l.unitSalePrice) > 0)) { setSellError(`Enter a sale price for ${l.crateType}.`); return; }
      const avail = Number(statOf(l.crateType).inShop) || 0;
      if (l.quantity > avail) { setSellError(`Only ${avail} ${l.crateType} crates in shop.`); return; }
    }

    setIsSavingSell(true); setSellError('');
    try {
      await sellCrates({
        customerAccountId: sellForm.buyerKind === 'customer' ? Number(sellForm.customerId) : null,
        note: sellForm.note,
        paymentMethod: sellForm.paymentMethod,
        lines,
      });
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      const buyerLabel = sellForm.buyerKind === 'customer'
        ? 'on account'
        : (sellForm.paymentMethod === 'BKASH' ? 'bKash' : sellForm.paymentMethod.toLowerCase());
      showToast(`Sold ${totalQty} crates (${buyerLabel})`, 'success');
      setSellForm(EMPTY_SELL);
      setShowSellModal(false);
    } catch (err) {
      setSellError(err.message || 'Failed to record sale.');
    } finally {
      setIsSavingSell(false);
    }
  };

  const handleLoss = async () => {
    const lines = collectLines(lossForm.lines);
    if (lines.length === 0) { setLossError('Add at least one crate type with a quantity.'); return; }

    setIsSavingLoss(true); setLossError('');
    try {
      await markCratesLost(null, null, lossForm.reason, lines);
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      showToast(`Marked ${totalQty} crates as ${lossForm.reason} (absorbed by shop)`, 'warning');
      setLossForm(EMPTY_LOSS);
      setShowLossModal(false);
    } catch (err) {
      setLossError(err.message || 'Failed to mark crates.');
    } finally {
      setIsSavingLoss(false);
    }
  };

  const handleCustomerCrate = async () => {
    if (!customerForm.customerId) { setCustomerError('Please select a customer.'); return; }
    const lines = collectLines(customerForm.lines);
    if (lines.length === 0) { setCustomerError('Add at least one crate type with a quantity.'); return; }
    const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
    const deposit = Math.max(0, Number(customerForm.deposit) || 0);
    setIsSavingCustomer(true); setCustomerError('');
    try {
      const move = customerForm.movement;
      if (move === 'borrow') {
        // Crates given to customer (leg 1 +), optional refundable deposit taken.
        await postJson(apiPaths.paymentsCustomerCrateBorrow(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId), crates: lines, depositAmount: deposit, note: customerForm.note,
        });
        showToast(`${totalQty} crates given to customer`, 'success');
      } else if (move === 'return') {
        // Customer returns my crates (leg 1 −), optional deposit refund.
        if (deposit > Number(selectedCustomer?.crateDepositHeld || 0)) {
          setCustomerError(`Refund cannot exceed the ৳${Number(selectedCustomer?.crateDepositHeld || 0).toLocaleString()} deposit held.`);
          setIsSavingCustomer(false); return;
        }
        await postJson(apiPaths.paymentsCustomerSettle(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId), cashAmount: 0, crateReturns: lines, depositRefund: deposit, paymentMethod: 'CASH', note: customerForm.note,
        });
        showToast(`${totalQty} crates returned by customer`, 'success');
      } else if (move === 'receive') {
        // Customer's own crates come into my custody (leg 2 +).
        await postJson(apiPaths.paymentsCustomerCrateReceive(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId), crates: lines, note: customerForm.note,
        });
        showToast(`${totalQty} crates received from customer`, 'success');
      } else {
        // Return the customer's own crates back to them (leg 2 −).
        await postJson(apiPaths.paymentsCustomerCrateHandback(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId), crates: lines, note: customerForm.note,
        });
        showToast(`${totalQty} crates returned to customer`, 'success');
      }
      setCustomerForm(EMPTY_CUSTOMER);
      setShowCustomerModal(false);
      refreshTransactions();
    } catch (err) {
      setCustomerError(err.message || 'Failed to record crate movement.');
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleSupplierCrate = async () => {
    if (!supplierForm.supplierId) { setSupplierError('Please select a supplier.'); return; }
    // Collect all valid crate-type lines; merge duplicate types.
    const merged = new Map();
    for (const l of supplierForm.lines) {
      const type = String(l.crateType || '').toUpperCase();
      const q = Math.floor(Number(l.quantity) || 0);
      if (!type || q <= 0) continue;
      merged.set(type, (merged.get(type) || 0) + q);
    }
    const lines = [...merged.entries()].map(([crateType, quantity]) => ({ crateType, quantity }));
    if (lines.length === 0) { setSupplierError('Add at least one crate type with a quantity.'); return; }

    setIsSavingSupplier(true); setSupplierError('');
    try {
      // The four crate movements → one of the four endpoints.
      const route = {
        give:     { path: apiPaths.paymentsSupplierCrateGive,     msg: 'given to supplier' },
        return:   { path: apiPaths.paymentsSupplierCrateReturn,   msg: 'returned by supplier' },
        receive:  { path: apiPaths.paymentsSupplierCrateReceive,  msg: 'received from supplier' },
        handback: { path: apiPaths.paymentsSupplierCrateHandback, msg: 'returned to supplier' },
      }[supplierForm.movement];
      await postJson(route.path(admin.wholesalerId), {
        wholesalerSupplierId: Number(supplierForm.supplierId),
        crates: lines,
        note: supplierForm.note,
      });
      const totalQty = lines.reduce((s, l) => s + l.quantity, 0);
      showToast(`${totalQty} crates ${route.msg}`, 'success');
      setSupplierForm(EMPTY_SUPPLIER);
      setShowSupplierModal(false);
      refreshTransactions();
    } catch (err) {
      setSupplierError(err.message || 'Failed to record crate movement.');
    } finally {
      setIsSavingSupplier(false);
    }
  };

  return (
    <div className="profile-workspace">
      <main className="profile-main-stack">
      {/* HERO */}
      <div className="crate-hero">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="crate-hero-icon"><Boxes size={22} /></div>
          <div className="min-w-0">
            <h2 className="crate-hero-title">Crate Operations</h2>
          </div>
        </div>
        <div className="crate-hero-stat-row">
          <div className="crate-hero-stat">
            <span className="crate-hero-stat-label">Active</span>
            <strong className="crate-hero-stat-value">{active.toLocaleString()}</strong>
          </div>
          <div className="crate-hero-stat-divider" />
          <div className="crate-hero-stat">
            <span className="crate-hero-stat-label">Out</span>
            <strong className="crate-hero-stat-value text-amber-600">{(withCustomers + withSuppliers).toLocaleString()}</strong>
          </div>
          <div className="crate-hero-stat-divider" />
          <div className="crate-hero-stat">
            <span className="crate-hero-stat-label">Lost</span>
            <strong className="crate-hero-stat-value text-rose-600">{lost.toLocaleString()}</strong>
          </div>
          <div className="crate-hero-stat-divider" />
          <div className="crate-hero-stat" title="Capital tied up in live crates (qty × weighted-avg cost)">
            <span className="crate-hero-stat-label">Capital</span>
            <strong className="crate-hero-stat-value text-indigo-600">৳{totalCrateValue.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Store} label="In Shop" value={inShop.toLocaleString()} tone="emerald" />
        <KPI icon={Users} label="With Customers" value={withCustomers.toLocaleString()} tone="teal" />
        <KPI icon={UserCheck} label="With Suppliers" value={withSuppliers.toLocaleString()} tone="amber" />
        <KPI icon={TrendingDown} label="Lost Forever" value={lost.toLocaleString()} tone="rose" />
      </div>

      {/* ALLOCATION BAR + TYPE BREAKDOWN */}
        <div className="supplier-panel">
          <h3 className="flex items-center gap-2"><Package size={18} className="text-blue-600" /> Allocation</h3>

          <div className="allocation-bar mt-4">
            <div className="allocation-seg allocation-seg-shop" style={{ width: `${inShopPct}%` }} title={`In Shop: ${inShop}`} />
            <div className="allocation-seg allocation-seg-customer" style={{ width: `${customerPct}%` }} title={`With Customers: ${withCustomers}`} />
            <div className="allocation-seg allocation-seg-supplier" style={{ width: `${supplierPct}%` }} title={`With Suppliers: ${withSuppliers}`} />
          </div>
          <div className="allocation-legend mt-3">
            <span className="flex items-center gap-1.5"><span className="allocation-dot allocation-dot-shop" /> In Shop {inShop}</span>
            <span className="flex items-center gap-1.5"><span className="allocation-dot allocation-dot-customer" /> Customers {withCustomers}</span>
            <span className="flex items-center gap-1.5"><span className="allocation-dot allocation-dot-supplier" /> Suppliers {withSuppliers}</span>
          </div>

          {/* Type Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
            {crateTypes.map((type) => (
              <div key={type.key} className="type-card">
                <div className="flex items-center justify-between">
                  <p className="type-card-title">{type.label}</p>
                  <span className="badge badge-teal">{(type.data.total || 0).toLocaleString()}</span>
                </div>
                <div className="type-card-stats">
                  <div><span>In Shop</span><strong>{(type.data.inShop || 0).toLocaleString()}</strong></div>
                  <div><span>Customers</span><strong>{(type.data.withCustomers || 0).toLocaleString()}</strong></div>
                  <div><span>Suppliers</span><strong>{(type.data.withSuppliers || 0).toLocaleString()}</strong></div>
                  <div><span>Lost</span><strong className="text-rose-600">{(type.data.lost || 0).toLocaleString()}</strong></div>
                  <div><span>Avg Price</span><strong>৳ {Math.ceil(Number(type.data.weightedAvgCost) || 0).toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      {/* LOSS TREND CHART */}
      <div className="supplier-panel">
        <button
          type="button"
          onClick={() => setShowLossTrend((v) => !v)}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <h3 className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /> Lost Crate Trend</h3>
          {showLossTrend ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>

        {showLossTrend && (
          <div className="mt-4">
            <div className="mb-4 flex justify-end">
              <div className="unit-pills">
                {[1, 3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLossRange(m)}
                    className={`unit-pill ${lossRange === m ? 'active' : ''}`}
                  >
                    {m === 1 ? 'Last month' : `${m} months`}
                  </button>
                ))}
              </div>
            </div>

        {lossLoading ? (
          <div className="flex gap-2 h-32 items-end">
            {Array.from({ length: lossRange }).map((_, i) => (
              <div key={i} className="skeleton flex-1 rounded-md" style={{ height: `${30 + i * 15}%` }} />
            ))}
          </div>
        ) : !lossStats || lossStats.buckets.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={32} className="empty-state-icon" />
            <p className="empty-state-title">No data yet</p>
          </div>
        ) : (
          <>
            <div className="loss-chart-summary">
              <div>
                <p className="loss-chart-summary-label">Total Lost</p>
                <p className="loss-chart-summary-value text-rose-600">{lossStats.totalLost.toLocaleString()}</p>
              </div>
              {(lossStats.byType || []).map((t) => (
                <div key={t.crateType}>
                  <p className="loss-chart-summary-label">{titleCase(t.crateType)}</p>
                  <p className="loss-chart-summary-value">{(Number(t.quantity) || 0).toLocaleString()}</p>
                </div>
              ))}
            </div>

            {(() => {
              const buckets = lossStats.buckets;
              // One line per crate type that actually had a loss in this window.
              const types = (lossStats.byType || []).map((t) => t.crateType);
              const qtyOf = (bucket, type) => {
                const hit = (bucket.byType || []).find((x) => x.crateType === type);
                return hit ? Number(hit.quantity) || 0 : 0;
              };
              const maxRaw = Math.max(...buckets.map((b) => Number(b.total) || 0), 1);
              // Round max up to a nice number for gridlines
              const niceMax = (() => {
                const exp = Math.pow(10, Math.floor(Math.log10(maxRaw)));
                const step = exp / 2;
                return Math.ceil(maxRaw / step) * step;
              })();
              const safeMax = Math.max(niceMax, 1);
              const W = 800;
              const H = 240;
              const padL = 36, padR = 16, padT = 18, padB = 28;
              const chartW = W - padL - padR;
              const chartH = H - padT - padB;
              const stepX = buckets.length > 1 ? chartW / (buckets.length - 1) : 0;
              const yOf = (v) => padT + chartH - (v / safeMax) * chartH;
              const xOf = (i) => padL + i * stepX;
              const pointsFor = (type) => buckets.map((b, i) => `${xOf(i)},${yOf(qtyOf(b, type))}`).join(' ');

              const gridSteps = 4;
              const gridLines = Array.from({ length: gridSteps + 1 }, (_, i) => i);

              return (
                <div className="loss-chart-wrap">
                  <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="loss-chart-svg">
                    {/* Gridlines + Y labels */}
                    {gridLines.map((i) => {
                      const v = Math.round((safeMax / gridSteps) * (gridSteps - i));
                      const y = padT + (chartH / gridSteps) * i;
                      return (
                        <g key={`grid-${i}`}>
                          <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                          <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#94a3b8" fontWeight="600">
                            {v}
                          </text>
                        </g>
                      );
                    })}

                    {/* One polyline + points per crate type */}
                    {types.map((type, ti) => (
                      <g key={`line-${type}`}>
                        <polyline
                          points={pointsFor(type)}
                          fill="none"
                          stroke={LOSS_COLORS[ti % LOSS_COLORS.length]}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {buckets.map((b, i) => (
                          <circle
                            key={`pt-${type}-${i}`}
                            cx={xOf(i)}
                            cy={yOf(qtyOf(b, type))}
                            r="3.5"
                            fill="#fff"
                            stroke={LOSS_COLORS[ti % LOSS_COLORS.length]}
                            strokeWidth="2"
                          />
                        ))}
                      </g>
                    ))}

                    {/* X labels */}
                    {buckets.map((b, i) => (
                      <text
                        key={`x-${i}`}
                        x={xOf(i)}
                        y={H - 8}
                        textAnchor="middle"
                        fontSize="10"
                        fill="#64748b"
                        fontWeight="600"
                      >
                        {b.month.slice(5)}/{b.month.slice(2, 4)}
                      </text>
                    ))}

                    {/* Hover hit areas with title tooltip */}
                    {buckets.map((b, i) => (
                      <rect
                        key={`hit-${i}`}
                        x={xOf(i) - stepX / 2}
                        y={padT}
                        width={stepX || 20}
                        height={chartH}
                        fill="transparent"
                      >
                        <title>{`${b.month}\n${(b.byType || []).map((x) => `${x.crateType}: ${x.quantity}`).join('\n')}\nTotal: ${b.total}`}</title>
                      </rect>
                    ))}
                  </svg>
                </div>
              );
            })()}

            <div className="loss-chart-legend">
              {(lossStats.byType || []).map((t, i) => (
                <span key={t.crateType} className="flex items-center gap-1.5">
                  <span className="allocation-dot" style={{ background: LOSS_COLORS[i % LOSS_COLORS.length] }} /> {titleCase(t.crateType)}
                </span>
              ))}
            </div>
          </>
        )}
          </div>
        )}
      </div>
      </main>

      <aside className="profile-side-stack">
        {/* CRATE TOOLKIT */}
        <div className="supplier-panel toolkit-panel">
          <div className="toolkit-header">
            <div className="toolkit-icon"><Zap size={16} /></div>
            <div>
              <h3 className="toolkit-title">Crate Toolkit</h3>
            </div>
          </div>
          <div className="quick-action-list">
            <button onClick={() => setShowCustomerModal(true)} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#0000FF', color: '#fff' }}><Users size={14} /></span>
              <span className="quick-action-label">Customer Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={() => setShowSupplierModal(true)} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#FFFF00', color: '#000' }}><UserCheck size={14} /></span>
              <span className="quick-action-label">Supplier Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={openLossModal} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#FF0000', color: '#fff' }}><AlertTriangle size={14} /></span>
              <span className="quick-action-label">Mark Lost / Damaged</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={openSellModal} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#008000', color: '#fff' }}><ShoppingCart size={14} /></span>
              <span className="quick-action-label">Sell Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={openPurchaseModal} className="quick-action-row quick-action-row-primary">
              <span className="quick-action-icon" style={{ background: '#FF00FF', color: '#fff' }}><Plus size={14} /></span>
              <span className="quick-action-label">Add New Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
          </div>
        </div>

        {/* Suppliers' crates I'm holding (leg 2) — a liability, not my stock. */}
        <div className="supplier-panel">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2"><UserCheck size={17} className="text-amber-600" /> Supplier crates I hold</h3>
            <span className="badge badge-amber">{totalSupplierCratesHeld.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Crates owned by suppliers, in your custody — you owe these back.</p>
          <div className="mt-3 space-y-2">
            {suppliersHoldingMine.length === 0 ? (
              <div className="box-row"><span>None</span><strong>0</strong></div>
            ) : (
              suppliersHoldingMine.map((s) => (
                <div key={s.id} className="box-row">
                  <span className="min-w-0 truncate">{s.businessName || s.name}</span>
                  <strong className="text-amber-700">
                    {(s.supplierCrateHoldings || []).map((c) => `${c.quantity} ${c.crateType}`).join(', ') || s.totalCratesHeld}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Customers' crates I'm holding (leg 2) — a liability, not my stock. */}
        <div className="supplier-panel">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2"><Users size={17} className="text-amber-600" /> Customer crates I hold</h3>
            <span className="badge badge-amber">{totalCustomerCratesHeld.toLocaleString()}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Crates owned by customers, in your custody — you owe these back.</p>
          <div className="mt-3 space-y-2">
            {customersHoldingMine.length === 0 ? (
              <div className="box-row"><span>None</span><strong>0</strong></div>
            ) : (
              customersHoldingMine.map((c) => (
                <div key={c.id} className="box-row">
                  <span className="min-w-0 truncate">{c.name}</span>
                  <strong className="text-amber-700">
                    {(c.customerCrateHoldings || []).map((h) => `${h.quantity} ${h.crateType}`).join(', ') || c.totalCratesHeld}
                  </strong>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* ADD CRATES MODAL */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><Plus size={18} /></div>
                <div><h2>Add New Crates</h2></div>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="form-label"><Boxes size={13} /> Crate types <span className="text-red-500">*</span></label>
                  {purchaseForm.lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1">
                        <CrateTypeSelect
                          types={boxTypes}
                          value={line.crateType}
                          onChange={(v) => setPurchaseLineType(i, v)}
                          hintOf={(v) => `${(statOf(v).inShop || 0).toLocaleString()} in shop`}
                        />
                      </div>
                      <input
                        type="number" min="1" value={line.quantity}
                        onChange={(e) => purchaseLine.update(i, { quantity: e.target.value })}
                        className="input-field" style={{ maxWidth: '5.5rem' }} placeholder="Qty"
                      />
                      <input
                        type="number" min="0.01" step="0.01" value={line.unitPrice}
                        onChange={(e) => purchaseLine.update(i, { unitPrice: e.target.value })}
                        className="input-field" style={{ maxWidth: '7rem' }} placeholder="৳ / crate"
                      />
                      <button
                        type="button" onClick={() => purchaseLine.remove(i)} className="icon-btn mt-[2px]"
                        disabled={purchaseForm.lines.length === 1} aria-label="Remove crate type"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={purchaseLine.add} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                  <p className="text-xs text-slate-500">
                    Crates are a capital investment — the cost doesn&apos;t hit P&amp;L, it sets the cost basis for resale &amp; loss accounting.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="form-label"><Wallet size={13} /> Paid from <span className="text-red-500">*</span></label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m} type="button"
                        onClick={() => setPurchaseForm((f) => ({ ...f, paymentMethod: m }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                          purchaseForm.paymentMethod === m
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {m === 'BKASH' ? 'bKash' : m.charAt(0) + m.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    {purchaseForm.paymentMethod === 'CASH'
                      ? 'Cash purchase — this leaves the cash drawer and shows in the Cash Book.'
                      : 'Non-cash purchase — recorded as crate capital, but does not affect the cash drawer.'}
                  </p>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                  <span className="text-xs font-medium text-slate-500">Total cost</span>
                  <span className="text-sm font-bold text-slate-800">
                    ৳{purchaseForm.lines
                      .reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0)
                      .toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
                {purchaseError && (
                  <div className="status-error"><span>!</span><span>{purchaseError}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPurchaseModal(false)} className="btn-secondary" disabled={isSavingPurchase}>Cancel</button>
              <button onClick={handlePurchase} className="btn-primary flex items-center gap-2" disabled={isSavingPurchase}>
                {isSavingPurchase ? 'Saving…' : (<><Plus size={14} /> Add Crates</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MARK LOST MODAL */}
      {showLossModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-rose-500 to-red-600 text-white"><AlertTriangle size={18} /></div>
                <div><h2>Mark Lost / Damaged</h2></div>
              </div>
              <button onClick={() => setShowLossModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="form-label"><Boxes size={13} /> Crate types <span className="text-red-500">*</span></label>
                  {lossForm.lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1">
                        <CrateTypeSelect
                          types={boxTypes}
                          value={line.crateType}
                          onChange={(v) => lossLine.update(i, { crateType: v })}
                          hintOf={(v) => `${(statOf(v).inShop || 0).toLocaleString()} in shop`}
                        />
                      </div>
                      <input
                        type="number" min="1" value={line.quantity}
                        onChange={(e) => lossLine.update(i, { quantity: e.target.value })}
                        className="input-field" style={{ maxWidth: '6.5rem' }} placeholder="Qty"
                      />
                      <button
                        type="button" onClick={() => lossLine.remove(i)} className="icon-btn mt-[2px]"
                        disabled={lossForm.lines.length === 1} aria-label="Remove crate type"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={lossLine.add} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                </div>
                <div className="form-field">
                  <label className="form-label"><FileText size={13} /> Reason</label>
                  <div className="unit-pills">
                    {['lost', 'damaged', 'broken'].map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setLossForm((p) => ({ ...p, reason: r }))}
                        className={`unit-pill ${lossForm.reason === r ? 'active' : ''}`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Lost / damaged crates are written off against crate capital (absorbed by the shop) and valued at the weighted-average cost for P&amp;L.
                </p>

                {lossError && (
                  <div className="status-error"><span>!</span><span>{lossError}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowLossModal(false)} className="btn-secondary" disabled={isSavingLoss}>Cancel</button>
              <button onClick={handleLoss} className="btn-danger flex items-center gap-2" disabled={isSavingLoss}>
                {isSavingLoss ? 'Saving…' : (<><AlertTriangle size={14} /> Confirm</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER CRATE MODAL */}
      {showCustomerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '34rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><Users size={18} /></div>
                <div>
                  <h2>Customer Crate Movement</h2>
                </div>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label"><ArrowRightLeft size={13} /> Movement</label>
                    <select
                      value={customerForm.movement}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, movement: e.target.value }))}
                      className="input-field"
                    >
                      <option value="receive">Crate received from customer</option>
                      <option value="borrow">Crates given to customer</option>
                      <option value="return">Get crates returned from customer</option>
                      <option value="handback">Return crates to customer</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label"><Users size={13} /> Customer <span className="text-red-500">*</span></label>
                    <select
                      value={customerForm.customerId}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, customerId: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Choose customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-slate-500">
                  {{
                    borrow:   'You give your crates to the customer.',
                    return:   'The customer returns your crates to you.',
                    receive:  "The customer's own crates come into your custody (you'll owe them back).",
                    handback: "You return the customer's crates back to them.",
                  }[customerForm.movement]}
                </p>

                <div className="space-y-2">
                  <label className="form-label"><Boxes size={13} /> Crate types <span className="text-red-500">*</span></label>
                  {customerForm.lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1">
                        <CrateTypeSelect
                          types={boxTypes}
                          value={line.crateType}
                          onChange={(v) => customerLine.update(i, { crateType: v })}
                          hintOf={(v) => {
                            if (customerForm.movement === 'return') return `${holdingOf(selectedCustomer, v).toLocaleString()} held by customer`;
                            if (customerForm.movement === 'handback') return `${heldOf(selectedCustomer, v).toLocaleString()} I hold`;
                            if (customerForm.movement === 'borrow') return `${(statOf(v).inShop || 0).toLocaleString()} in shop`;
                            return '';
                          }}
                        />
                      </div>
                      <input
                        type="number" min="1" value={line.quantity}
                        onChange={(e) => customerLine.update(i, { quantity: e.target.value })}
                        className="input-field" style={{ maxWidth: '6.5rem' }} placeholder="Qty"
                      />
                      <button
                        type="button" onClick={() => customerLine.remove(i)} className="icon-btn mt-[2px]"
                        disabled={customerForm.lines.length === 1} aria-label="Remove crate type"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={customerLine.add} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                </div>

                {/* Refundable crate deposit — only on leg-1 movements (give / return my crates). */}
                {(customerForm.movement === 'borrow' || customerForm.movement === 'return') && (
                  <div className="form-field">
                    <label className="form-label">
                      <DollarSign size={13} />
                      {customerForm.movement === 'borrow' ? 'Crate deposit taken' : 'Deposit to refund'}
                      <span className="form-label-hint">optional</span>
                    </label>
                    <div className="input-with-suffix">
                      <span className="input-prefix">৳</span>
                      <input
                        type="number" min="0" step="1" value={customerForm.deposit}
                        onChange={(e) => setCustomerForm((p) => ({ ...p, deposit: e.target.value }))}
                        className="input-field !pl-8" placeholder="0"
                      />
                    </div>
                    {customerForm.movement === 'return' && Number(selectedCustomer?.crateDepositHeld || 0) > 0 && (
                      <p className="mt-1 text-[11px] text-slate-400">
                        Deposit held: ৳{Number(selectedCustomer.crateDepositHeld).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div className="form-field">
                  <label className="form-label"><FileText size={13} /> Note <span className="form-label-hint">optional</span></label>
                  <input
                    type="text" value={customerForm.note}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, note: e.target.value }))}
                    className="input-field" placeholder="e.g. For Tuesday market"
                  />
                </div>

                {customerError && (
                  <div className="status-error"><span>!</span><span>{customerError}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCustomerModal(false)} className="btn-secondary" disabled={isSavingCustomer}>Cancel</button>
              <button onClick={handleCustomerCrate} className="btn-primary flex items-center gap-2" disabled={isSavingCustomer}>
                {isSavingCustomer ? 'Saving…' : (<><ArrowRightLeft size={14} /> Record</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUPPLIER CRATE MODAL */}
      {showSupplierModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '32rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-blue-500 to-indigo-600 text-white"><ArrowRightLeft size={18} /></div>
                <div>
                  <h2>Supplier Crate Movement</h2>
                </div>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label"><ArrowRightLeft size={13} /> Movement</label>
                    <select
                      value={supplierForm.movement}
                      onChange={(e) => setSupplierForm((p) => ({ ...p, movement: e.target.value }))}
                      className="input-field"
                    >
                      <option value="receive">Crate received from supplier</option>
                      <option value="give">Crates given to supplier</option>
                      <option value="return">Get crates returned from supplier</option>
                      <option value="handback">Return crates to supplier</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label"><UserCheck size={13} /> Supplier <span className="text-red-500">*</span></label>
                    <select
                      value={supplierForm.supplierId}
                      onChange={(e) => setSupplierForm((p) => ({ ...p, supplierId: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Choose supplier…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.businessName || s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="-mt-2 text-[11px] text-slate-500">
                  {{
                    give:     'You give your crates to the supplier.',
                    return:   'The supplier returns your crates to you.',
                    receive:  "The supplier's own crates come into your custody (you'll owe them back).",
                    handback: "You return the supplier's crates back to them.",
                  }[supplierForm.movement]}
                </p>

                <div className="space-y-2">
                  <label className="form-label"><Boxes size={13} /> Crate types <span className="text-red-500">*</span></label>
                  {supplierForm.lines.map((line, i) => {
                    const hint = (v) => {
                      if (supplierForm.movement === 'give') return `${(statOf(v).inShop || 0).toLocaleString()} in shop`;
                      if (supplierForm.movement === 'return') return `${holdingOf(selectedSupplier, v).toLocaleString()} held by supplier`;
                      if (supplierForm.movement === 'handback') return `${heldOf(selectedSupplier, v).toLocaleString()} I hold`;
                      return '';
                    };
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-1">
                          <CrateTypeSelect
                            types={boxTypes}
                            value={line.crateType}
                            onChange={(v) => updateSupplierLine(i, { crateType: v })}
                            hintOf={hint}
                          />
                        </div>
                        <input
                          type="number" min="1" value={line.quantity}
                          onChange={(e) => updateSupplierLine(i, { quantity: e.target.value })}
                          className="input-field" style={{ maxWidth: '6.5rem' }} placeholder="Qty"
                        />
                        <button
                          type="button"
                          onClick={() => removeSupplierLine(i)}
                          className="icon-btn mt-[2px]"
                          disabled={supplierForm.lines.length === 1}
                          aria-label="Remove crate type"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                  <button type="button" onClick={addSupplierLine} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                </div>

                <div className="form-field">
                  <label className="form-label"><FileText size={13} /> Note <span className="form-label-hint">optional</span></label>
                  <input
                    type="text" value={supplierForm.note}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, note: e.target.value }))}
                    className="input-field" placeholder="e.g. Delivered with last shipment"
                  />
                </div>

                {supplierError && (
                  <div className="status-error"><span>!</span><span>{supplierError}</span></div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSupplierModal(false)} className="btn-secondary" disabled={isSavingSupplier}>Cancel</button>
              <button onClick={handleSupplierCrate} className="btn-primary flex items-center gap-2" disabled={isSavingSupplier}>
                {isSavingSupplier ? 'Saving…' : (<><ArrowRightLeft size={14} /> Record</>)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELL CRATES MODAL */}
      {showSellModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '28rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-gradient-to-br from-emerald-500 to-green-600 text-white"><ShoppingCart size={18} /></div>
                <div>
                  <h2>Sell Crates</h2>
                </div>
              </div>
              <button onClick={() => setShowSellModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><Users size={13} /> Buyer</label>
                  <div className="unit-pills">
                    {[
                      { value: 'customer', label: 'Permanent customer' },
                      { value: 'walkin', label: 'Walk-in' },
                    ].map((b) => (
                      <button
                        type="button"
                        key={b.value}
                        onClick={() => setSellForm((p) => ({ ...p, buyerKind: b.value, customerId: '' }))}
                        className={`unit-pill ${sellForm.buyerKind === b.value ? 'active' : ''}`}
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {sellForm.buyerKind === 'customer'
                      ? 'Sale amount goes on the customer’s ledger as a receivable.'
                      : 'Walk-in sale — no account entry, just the inventory movement and P&L profit.'}
                  </p>
                </div>

                {sellForm.buyerKind === 'customer' && (
                  <div className="form-field">
                    <label className="form-label"><Users size={13} /> Customer <span className="text-red-500">*</span></label>
                    <select
                      value={sellForm.customerId}
                      onChange={(e) => setSellForm((p) => ({ ...p, customerId: e.target.value }))}
                      className="input-field"
                    >
                      <option value="">Choose customer…</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {sellForm.buyerKind === 'walkin' && (
                  <div className="space-y-1.5">
                    <label className="form-label"><Wallet size={13} /> Paid with <span className="text-red-500">*</span></label>
                    <div className="flex flex-wrap gap-1.5">
                      {PAYMENT_METHODS.map((m) => (
                        <button
                          key={m} type="button"
                          onClick={() => setSellForm((f) => ({ ...f, paymentMethod: m }))}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                            sellForm.paymentMethod === m
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                          }`}
                        >
                          {m === 'BKASH' ? 'bKash' : m.charAt(0) + m.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">
                      {sellForm.paymentMethod === 'CASH'
                        ? 'Cash sale — the money enters the cash drawer and shows in the Cash Book.'
                        : 'Non-cash sale — recorded as P&L profit, but does not affect the cash drawer.'}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="form-label"><Boxes size={13} /> Crate types <span className="text-red-500">*</span></label>
                  {sellForm.lines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="flex-1">
                        <CrateTypeSelect
                          types={boxTypes}
                          value={line.crateType}
                          onChange={(v) => sellLine.update(i, { crateType: v })}
                          hintOf={(v) => `${(statOf(v).inShop || 0).toLocaleString()} in shop`}
                        />
                      </div>
                      <input
                        type="number" min="1" value={line.quantity}
                        onChange={(e) => sellLine.update(i, { quantity: e.target.value })}
                        className="input-field" style={{ maxWidth: '5.5rem' }} placeholder="Qty"
                      />
                      <input
                        type="number" min="0.01" step="0.01" value={line.unitSalePrice}
                        onChange={(e) => sellLine.update(i, { unitSalePrice: e.target.value })}
                        className="input-field" style={{ maxWidth: '7rem' }} placeholder="৳ each"
                      />
                      <button
                        type="button" onClick={() => sellLine.remove(i)} className="icon-btn mt-[2px]"
                        disabled={sellForm.lines.length === 1} aria-label="Remove crate type"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={sellLine.add} className="btn-compact">
                    <Boxes size={12} /> Add crate type
                  </button>
                </div>

                {/* Preview: total + cost basis + profit across all lines */}
                {(() => {
                  let gross = 0; let cost = 0; let any = false;
                  for (const l of sellForm.lines) {
                    const qty = Number(l.quantity) || 0;
                    const unit = Number(l.unitSalePrice) || 0;
                    if (qty <= 0 || !l.crateType) continue;
                    any = true;
                    gross += qty * unit;
                    cost += qty * (Number(statOf(l.crateType).weightedAvgCost) || 0);
                  }
                  if (!any) return null;
                  const profit = gross - cost;
                  return (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Sale total (customer owes)</span><strong>৳ {Math.ceil(gross).toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Cost basis (avg)</span><span>৳ {Math.ceil(cost).toLocaleString()}</span></div>
                      <div className="flex justify-between border-t border-slate-200 pt-1">
                        <span className="text-slate-700 font-semibold">P&amp;L impact</span>
                        <strong className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {profit >= 0 ? '+' : ''}৳ {Math.ceil(profit).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-field">
                  <label className="form-label"><FileText size={13} /> Note <span className="form-label-hint">optional</span></label>
                  <input
                    type="text" value={sellForm.note}
                    onChange={(e) => setSellForm((p) => ({ ...p, note: e.target.value }))}
                    className="input-field" placeholder="e.g. Sold from extra stock"
                  />
                </div>

                {sellError && <div className="status-error"><span>!</span><span>{sellError}</span></div>}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSellModal(false)} className="btn-secondary" disabled={isSavingSell}>Cancel</button>
              <button onClick={handleSell} className="btn-primary flex items-center gap-2" disabled={isSavingSell}>
                {isSavingSell ? 'Saving…' : (<><ShoppingCart size={14} /> Confirm Sale</>)}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BoxDashboard;
