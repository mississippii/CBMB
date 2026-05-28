import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Boxes, Plus, AlertTriangle, ArrowRightLeft, Store, Users, UserCheck, Package,
  TrendingDown, Hash, ArrowUpRight, ArrowDownLeft, FileText, Wallet, BarChart3, Zap,
  ShoppingCart,
} from 'lucide-react';
import { useData } from '../../data/DataContext';
import { useToast } from '../../shared/components/Toast';
import { postJson, apiPaths } from '../../services/apiClient';
import { useAuth } from '../auth/AuthContext';
import { queryKeys } from '../../services/queryKeys';

// Same shape as DataContext.mapCrateDashboard — kept local so the dashboard query
// produces an identical object regardless of which place loaded it.
const EMPTY_TYPE = { total: 0, inShop: 0, withSuppliers: 0, withCustomers: 0, lost: 0, purchasePrice: 0 };
const EMPTY_INV = {
  totalCratesOwned: 0, cratesInShop: 0, cratesWithSuppliers: 0,
  cratesWithCustomers: 0, cratesLostDamaged: 0,
  bangla: { ...EMPTY_TYPE }, china: { ...EMPTY_TYPE },
};
const mapDashboard = (d) => {
  if (!d) return EMPTY_INV;
  const out = {
    totalCratesOwned: Number(d.totalCratesOwned) || 0,
    cratesInShop: Number(d.cratesInShop) || 0,
    cratesWithSuppliers: Number(d.cratesWithSuppliers) || 0,
    cratesWithCustomers: Number(d.cratesWithCustomers) || 0,
    cratesLostDamaged: Number(d.cratesLostDamaged) || 0,
    bangla: { ...EMPTY_TYPE }, china: { ...EMPTY_TYPE },
  };
  (d.crateTypes || []).forEach((t) => {
    const key = String(t.crateType || '').trim().toUpperCase() === 'CHINA' ? 'china' : 'bangla';
    out[key] = {
      total: Number(t.total) || 0,
      inShop: Number(t.inHand) || 0,
      withSuppliers: Number(t.withSuppliers) || 0,
      withCustomers: Number(t.withCustomers) || 0,
      lost: Number(t.lostDamaged) || 0,
      purchasePrice: Number(t.purchasePrice) || 0,
    };
  });
  return out;
};

const EMPTY_PURCHASE = { crateType: 'BANGLA', quantity: '', unitPrice: '' };
const EMPTY_SELL = { crateType: 'BANGLA', quantity: '', unitSalePrice: '', buyerKind: 'customer', customerId: '', note: '' };
const EMPTY_LOSS = {
  crateType: 'BANGLA',
  quantity: '',
  reason: 'lost',
  compensationKind: 'absorbed', // 'absorbed' | 'customer' | 'supplier'
  compensationPartyId: '',
  compensationAmount: '',       // optional override
};
const EMPTY_PRICE = { crateType: 'BANGLA', purchasePrice: '' };
const EMPTY_SUPPLIER = { supplierId: '', direction: 'give', banglaCrates: '', chinaCrates: '', note: '' };
const EMPTY_CUSTOMER = { customerId: '', direction: 'borrow', banglaCrates: '', chinaCrates: '', jamanotAmount: '', note: '' };

const BOX_TYPES = [
  { value: 'BANGLA', label: 'Bangla Crate' },
  { value: 'CHINA', label: 'China Crate' },
];

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
  const { suppliers, customers, addCrates, markCratesLost, setCratePrice, sellCrates, refreshTransactions } = useData();
  const { admin } = useAuth();
  const showToast = useToast();

  // Live dashboard data — always fresh (refetches on tab focus + after writes via invalidation).
  const { data: dashboardRaw } = useQuery({
    queryKey: queryKeys.crates.dashboard(admin?.wholesalerId),
    queryFn: () => postJson(apiPaths.cratesDashboard(admin.wholesalerId)),
    enabled: Boolean(admin?.wholesalerId),
  });
  const crateInventory = mapDashboard(dashboardRaw);

  // Modals
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);

  const [priceForm, setPriceForm] = useState(EMPTY_PRICE);
  const [priceError, setPriceError] = useState('');
  const [isSavingPrice, setIsSavingPrice] = useState(false);

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
  const active = Math.max(totalOwned - lost, 0); // adjusted total — lost is gone

  const safe = Math.max(active, 1);
  const inShopPct = Math.round((inShop / safe) * 100);
  const customerPct = Math.round((withCustomers / safe) * 100);
  const supplierPct = Math.round((withSuppliers / safe) * 100);
  const lostPct = Math.round((lost / Math.max(totalOwned, 1)) * 100);

  // Loss stats
  const [lossRange, setLossRange] = useState(3);
  const { data: lossStats, isLoading: lossLoading } = useQuery({
    queryKey: queryKeys.crates.lossStats(admin?.wholesalerId, lossRange),
    queryFn: () => postJson(apiPaths.cratesLossStats(admin.wholesalerId), { months: lossRange }),
    enabled: Boolean(admin?.wholesalerId),
  });

  const crateTypes = [
    { key: 'bangla', label: 'Bangla', data: crateInventory.bangla || {} },
    { key: 'china', label: 'China', data: crateInventory.china || {} },
  ];

  // Handlers
  const handlePurchase = async () => {
    const qty = Number(purchaseForm.quantity) || 0;
    if (qty <= 0) { setPurchaseError('Enter a quantity greater than 0.'); return; }
    const priceRaw = purchaseForm.unitPrice;
    const price = Number(priceRaw);
    if (priceRaw === '' || !Number.isFinite(price) || price <= 0) {
      setPurchaseError('Cost per crate is required.');
      return;
    }
    setIsSavingPurchase(true); setPurchaseError('');
    try {
      await addCrates(purchaseForm.crateType, qty, price);
      showToast(`Added ${qty} ${purchaseForm.crateType} crates @ ৳${price.toLocaleString()}`, 'success');
      setPurchaseForm(EMPTY_PURCHASE);
      setShowPurchaseModal(false);
    } catch (err) {
      setPurchaseError(err.message || 'Failed to add crates.');
    } finally {
      setIsSavingPurchase(false);
    }
  };

  const openPurchaseModal = () => {
    const key = (purchaseForm.crateType || 'BANGLA').toLowerCase();
    const currentPrice = crateInventory[key]?.purchasePrice || 0;
    setPurchaseForm({
      crateType: purchaseForm.crateType || 'BANGLA',
      quantity: '',
      unitPrice: currentPrice ? String(currentPrice) : '',
    });
    setPurchaseError('');
    setShowPurchaseModal(true);
  };

  const handlePurchaseTypeChange = (newType) => {
    const key = newType.toLowerCase();
    const typePrice = crateInventory[key]?.purchasePrice || 0;
    setPurchaseForm((p) => ({
      ...p,
      crateType: newType,
      // Refresh price default when the user switches type — unless they've already typed one.
      unitPrice: p.unitPrice === '' ? (typePrice ? String(typePrice) : '') : p.unitPrice,
    }));
  };

  const openSellModal = () => {
    setSellForm({ ...EMPTY_SELL, crateType: 'BANGLA' });
    setSellError('');
    setShowSellModal(true);
  };

  const handleSell = async () => {
    const qty = Number(sellForm.quantity) || 0;
    const priceRaw = sellForm.unitSalePrice;
    const price = Number(priceRaw);
    if (qty <= 0) { setSellError('Enter a quantity greater than 0.'); return; }
    if (priceRaw === '' || !Number.isFinite(price) || price <= 0) {
      setSellError('Sale price per crate is required.');
      return;
    }
    if (sellForm.buyerKind === 'customer' && !sellForm.customerId) {
      setSellError('Pick the customer who is buying the crates.');
      return;
    }

    const key = (sellForm.crateType || 'BANGLA').toLowerCase();
    const inShopAvail = Number(crateInventory[key]?.inShop) || 0;
    if (qty > inShopAvail) {
      setSellError(`Only ${inShopAvail} ${sellForm.crateType} crates in shop.`);
      return;
    }

    setIsSavingSell(true); setSellError('');
    try {
      await sellCrates({
        crateType: sellForm.crateType,
        quantity: qty,
        unitSalePrice: price,
        customerAccountId: sellForm.buyerKind === 'customer' ? Number(sellForm.customerId) : null,
        note: sellForm.note,
      });
      const buyerLabel = sellForm.buyerKind === 'customer' ? 'on account' : 'cash';
      showToast(`Sold ${qty} ${sellForm.crateType} crates @ ৳${price.toLocaleString()} (${buyerLabel})`, 'success');
      setSellForm(EMPTY_SELL);
      setShowSellModal(false);
    } catch (err) {
      setSellError(err.message || 'Failed to record sale.');
    } finally {
      setIsSavingSell(false);
    }
  };

  const handleLoss = async () => {
    const qty = Number(lossForm.quantity) || 0;
    if (qty <= 0) { setLossError('Enter a quantity greater than 0.'); return; }

    let compensation = null;
    if (lossForm.compensationKind !== 'absorbed') {
      if (!lossForm.compensationPartyId) {
        setLossError('Select the party who is paying for the loss.');
        return;
      }
      compensation = {
        partyType: lossForm.compensationKind === 'customer' ? 'WHOLESALER_CUSTOMER' : 'WHOLESALER_SUPPLIER',
        partyAccountId: Number(lossForm.compensationPartyId),
        amount: lossForm.compensationAmount || null,
      };
    }

    setIsSavingLoss(true); setLossError('');
    try {
      await markCratesLost(lossForm.crateType, qty, lossForm.reason, compensation);
      const suffix = compensation
        ? ` (charged to ${lossForm.compensationKind})`
        : ' (absorbed by shop)';
      showToast(`Marked ${qty} ${lossForm.crateType} crates as ${lossForm.reason}${suffix}`, 'warning');
      setLossForm(EMPTY_LOSS);
      setShowLossModal(false);
    } catch (err) {
      setLossError(err.message || 'Failed to mark crates.');
    } finally {
      setIsSavingLoss(false);
    }
  };

  const handlePriceSave = async () => {
    const price = Number(priceForm.purchasePrice);
    if (!Number.isFinite(price) || price < 0) {
      setPriceError('Enter a valid price (0 or greater).');
      return;
    }
    setIsSavingPrice(true); setPriceError('');
    try {
      await setCratePrice(priceForm.crateType, price);
      showToast(`${priceForm.crateType} crate price set to ৳ ${price}`, 'success');
      setShowPriceModal(false);
    } catch (err) {
      setPriceError(err.message || 'Failed to set price.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const openPriceModal = (crateType) => {
    const existing = crateInventory[crateType.toLowerCase()] || {};
    setPriceForm({ crateType, purchasePrice: existing.purchasePrice || '' });
    setPriceError('');
    setShowPriceModal(true);
  };

  const handleCustomerCrate = async () => {
    const bangla = Number(customerForm.banglaCrates) || 0;
    const china = Number(customerForm.chinaCrates) || 0;
    const jamanot = Number(customerForm.jamanotAmount) || 0;
    if (!customerForm.customerId) { setCustomerError('Please select a customer.'); return; }
    if (bangla + china <= 0) { setCustomerError('Enter at least 1 crate.'); return; }
    setIsSavingCustomer(true); setCustomerError('');
    try {
      if (customerForm.direction === 'borrow') {
        await postJson(apiPaths.paymentsCustomerCrateBorrow(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId),
          banglaCrates: bangla,
          chinaCrates: china,
          jamanotAmount: jamanot,
          note: customerForm.note,
        });
        showToast(`${bangla + china} crates borrowed${jamanot > 0 ? ` · ৳${jamanot} jamanot collected` : ''}`, 'success');
      } else {
        // Return — use customer/settle (cash=0, jamanot = refund)
        await postJson(apiPaths.paymentsCustomerSettle(admin.wholesalerId), {
          wholesalerCustomerId: Number(customerForm.customerId),
          cashAmount: 0,
          banglaCratesReturned: bangla,
          chinaCratesReturned: china,
          jamanotAmount: jamanot,
          paymentMethod: 'CASH',
          note: customerForm.note,
        });
        showToast(`${bangla + china} crates returned${jamanot > 0 ? ` · ৳${jamanot} jamanot refunded` : ''}`, 'success');
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
    const bangla = Number(supplierForm.banglaCrates) || 0;
    const china = Number(supplierForm.chinaCrates) || 0;
    if (!supplierForm.supplierId) { setSupplierError('Please select a supplier.'); return; }
    if (bangla + china <= 0) { setSupplierError('Enter at least 1 crate.'); return; }
    setIsSavingSupplier(true); setSupplierError('');
    try {
      const endpoint = supplierForm.direction === 'give'
        ? apiPaths.paymentsSupplierCrateGive(admin.wholesalerId)
        : apiPaths.paymentsSupplierCrateReturn(admin.wholesalerId);
      await postJson(endpoint, {
        wholesalerSupplierId: Number(supplierForm.supplierId),
        banglaCrates: bangla,
        chinaCrates: china,
        note: supplierForm.note,
      });
      const action = supplierForm.direction === 'give' ? 'given to' : 'received from';
      showToast(`${bangla + china} crates ${action} supplier`, 'success');
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
    <div className="space-y-5">
      {/* HERO */}
      <div className="crate-hero">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div className="crate-hero-icon"><Boxes size={22} /></div>
          <div className="min-w-0">
            <h2 className="crate-hero-title">Crate Operations</h2>
            <p className="crate-hero-sub">
              Track every Bangla &amp; China crate — in shop, with customers, with suppliers, or lost
            </p>
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
        </div>
      </div>

      {/* KPI ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Store} label="In Shop" value={`${inShop.toLocaleString()} (${inShopPct}%)`} tone="emerald" />
        <KPI icon={Users} label="With Customers" value={`${withCustomers.toLocaleString()} (${customerPct}%)`} tone="teal" />
        <KPI icon={UserCheck} label="With Suppliers" value={`${withSuppliers.toLocaleString()} (${supplierPct}%)`} tone="amber" />
        <KPI icon={TrendingDown} label="Lost Forever" value={`${lost.toLocaleString()} (${lostPct}%)`} tone="rose" />
      </div>

      {/* ALLOCATION BAR + TYPE BREAKDOWN */}
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-4">
        <div className="supplier-panel">
          <h3 className="flex items-center gap-2"><Package size={18} className="text-blue-600" /> Allocation</h3>
          <p>Where your crates are right now</p>

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
                </div>
                <button
                  type="button"
                  onClick={() => openPriceModal(type.label.toUpperCase())}
                  className="mt-2 w-full text-xs font-semibold text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded px-2 py-1 flex items-center justify-between gap-2 border border-slate-200"
                  title="Used to value lost/damaged crates in P&L"
                >
                  <span>Cost per crate</span>
                  <span className="font-bold">৳ {(type.data.purchasePrice || 0).toLocaleString()} <span className="text-slate-400 font-normal">edit</span></span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* CRATE TOOLKIT */}
        <div className="supplier-panel toolkit-panel">
          <div className="toolkit-header">
            <div className="toolkit-icon"><Zap size={16} /></div>
            <div>
              <h3 className="toolkit-title">Crate Toolkit</h3>
              <p className="toolkit-sub">All crate actions, one tap away</p>
            </div>
          </div>
          <div className="quick-action-list">
            <button onClick={() => setShowCustomerModal(true)} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#eff6ff', color: '#1d63ed' }}><Users size={14} /></span>
              <span className="quick-action-label">Customer Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={() => setShowSupplierModal(true)} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#fffbeb', color: '#b45309' }}><UserCheck size={14} /></span>
              <span className="quick-action-label">Supplier Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={() => setShowLossModal(true)} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#fff1f2', color: '#be123c' }}><AlertTriangle size={14} /></span>
              <span className="quick-action-label">Mark Lost / Damaged</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={openSellModal} className="quick-action-row">
              <span className="quick-action-icon" style={{ background: '#ecfdf5', color: '#047857' }}><ShoppingCart size={14} /></span>
              <span className="quick-action-label">Sell Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
            <button onClick={openPurchaseModal} className="quick-action-row quick-action-row-primary">
              <span className="quick-action-icon" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}><Plus size={14} /></span>
              <span className="quick-action-label">Add New Crates</span>
              <ArrowUpRight size={13} className="quick-action-arrow" />
            </button>
          </div>
        </div>
      </div>

      {/* LOSS TREND CHART */}
      <div className="supplier-panel">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="flex items-center gap-2"><BarChart3 size={18} className="text-blue-600" /> Lost Crate Trend</h3>
            <p>How many crates were marked lost or damaged over time</p>
          </div>
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
              <div>
                <p className="loss-chart-summary-label">Bangla</p>
                <p className="loss-chart-summary-value">{lossStats.totalBangla.toLocaleString()}</p>
              </div>
              <div>
                <p className="loss-chart-summary-label">China</p>
                <p className="loss-chart-summary-value">{lossStats.totalChina.toLocaleString()}</p>
              </div>
            </div>

            {(() => {
              const buckets = lossStats.buckets;
              const maxRaw = Math.max(...buckets.map((b) => b.total), 1);
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

              const points = (key) => buckets.map((b, i) => `${xOf(i)},${yOf(b[key])}`).join(' ');
              const areaPath = (key) => {
                const top = buckets.map((b, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(b[key])}`).join(' ');
                return `${top} L ${xOf(buckets.length - 1)} ${padT + chartH} L ${xOf(0)} ${padT + chartH} Z`;
              };

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

                    {/* Areas — China first (background) then Bangla (foreground) */}
                    <defs>
                      <linearGradient id="banglaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1d63ed" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#1d63ed" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="chinaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>

                    <path d={areaPath('china')} fill="url(#chinaGradient)" />
                    <polyline points={points('china')} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    <path d={areaPath('bangla')} fill="url(#banglaGradient)" />
                    <polyline points={points('bangla')} fill="none" stroke="#1d63ed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Data points */}
                    {buckets.map((b, i) => (
                      <g key={`pts-${i}`}>
                        <circle cx={xOf(i)} cy={yOf(b.china)} r="3.5" fill="#fff" stroke="#f43f5e" strokeWidth="2" />
                        <circle cx={xOf(i)} cy={yOf(b.bangla)} r="3.5" fill="#fff" stroke="#1d63ed" strokeWidth="2" />
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
                        <title>{`${b.month}\nBangla: ${b.bangla}\nChina: ${b.china}\nTotal: ${b.total}`}</title>
                      </rect>
                    ))}
                  </svg>
                </div>
              );
            })()}

            <div className="loss-chart-legend">
              <span className="flex items-center gap-1.5"><span className="allocation-dot" style={{ background: '#1d63ed' }} /> Bangla</span>
              <span className="flex items-center gap-1.5"><span className="allocation-dot" style={{ background: '#f43f5e' }} /> China</span>
            </div>
          </>
        )}
      </div>

      {/* ADD CRATES MODAL */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '26rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Plus size={18} /></div>
                <div><h2>Add New Crates</h2><p className="text-xs text-slate-500 mt-0.5">Record a crate purchase</p></div>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><Boxes size={13} /> Crate Type</label>
                  <div className="unit-type-grid">
                    {BOX_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.value}
                        onClick={() => handlePurchaseTypeChange(t.value)}
                        className={`unit-type-btn ${purchaseForm.crateType === t.value ? 'active' : ''}`}
                      >
                        <span className="unit-type-icon">{t.value === 'BANGLA' ? 'BA' : 'CH'}</span>
                        <div className="text-left">
                          <p className="font-bold">{t.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label"><Hash size={13} /> Quantity</label>
                  <input
                    type="number" min="1" value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="input-field" placeholder="e.g. 50" autoFocus
                  />
                </div>
                <div className="form-field">
                  <label className="form-label">
                    <Wallet size={13} /> Cost per crate (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number" min="0.01" step="0.01" value={purchaseForm.unitPrice}
                    onChange={(e) => setPurchaseForm((p) => ({ ...p, unitPrice: e.target.value }))}
                    className="input-field"
                    placeholder={`Current ৳ ${(crateInventory[purchaseForm.crateType.toLowerCase()]?.purchasePrice || 0)}`}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Crates are a capital investment — this price doesn&apos;t hit P&amp;L, it sets the cost basis for resale &amp; loss accounting.
                  </p>
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
                <div className="modal-icon-circle bg-rose-100 text-rose-700"><AlertTriangle size={18} /></div>
                <div><h2>Mark Lost / Damaged</h2><p className="text-xs text-slate-500 mt-0.5">Removes from active inventory</p></div>
              </div>
              <button onClick={() => setShowLossModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><Boxes size={13} /> Crate Type</label>
                  <div className="unit-type-grid">
                    {BOX_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.value}
                        onClick={() => setLossForm((p) => ({ ...p, crateType: t.value }))}
                        className={`unit-type-btn ${lossForm.crateType === t.value ? 'active' : ''}`}
                      >
                        <span className="unit-type-icon">{t.value === 'BANGLA' ? 'BA' : 'CH'}</span>
                        <div className="text-left"><p className="font-bold">{t.label}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-label"><Hash size={13} /> Quantity</label>
                  <input
                    type="number" min="1" value={lossForm.quantity}
                    onChange={(e) => setLossForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="input-field" placeholder="e.g. 5" autoFocus
                  />
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

                <div className="form-field">
                  <label className="form-label"><Wallet size={13} /> Who pays for it?</label>
                  <div className="unit-pills">
                    {[
                      { value: 'absorbed', label: 'Shop absorbs' },
                      { value: 'customer', label: 'Customer' },
                      { value: 'supplier', label: 'Supplier' },
                    ].map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        onClick={() => setLossForm((p) => ({
                          ...p,
                          compensationKind: c.value,
                          compensationPartyId: '',
                          compensationAmount: '',
                        }))}
                        className={`unit-pill ${lossForm.compensationKind === c.value ? 'active' : ''}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    "Shop absorbs" counts as a loss in P&amp;L. Otherwise the party is charged at cost per crate.
                  </p>
                </div>

                {lossForm.compensationKind !== 'absorbed' && (
                  <>
                    <div className="form-field">
                      <label className="form-label">
                        <Users size={13} /> {lossForm.compensationKind === 'customer' ? 'Customer' : 'Supplier'}
                      </label>
                      <select
                        className="input-field"
                        value={lossForm.compensationPartyId}
                        onChange={(e) => setLossForm((p) => ({ ...p, compensationPartyId: e.target.value }))}
                      >
                        <option value="">— Select —</option>
                        {(lossForm.compensationKind === 'customer' ? customers : suppliers).map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-label"><Hash size={13} /> Amount to charge (optional)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={lossForm.compensationAmount}
                        onChange={(e) => setLossForm((p) => ({ ...p, compensationAmount: e.target.value }))}
                        className="input-field"
                        placeholder={`Defaults to qty × ৳ ${(crateInventory[lossForm.crateType.toLowerCase()]?.purchasePrice || 0)}`}
                      />
                    </div>
                  </>
                )}

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
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Users size={18} /></div>
                <div>
                  <h2>Customer Crate Movement</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Lend crates against jamanot deposit, or accept return</p>
                </div>
              </div>
              <button onClick={() => setShowCustomerModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><Users size={13} /> Customer <span className="text-red-500">*</span></label>
                  <select
                    value={customerForm.customerId}
                    onChange={(e) => setCustomerForm((p) => ({ ...p, customerId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Choose permanent customer…</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (holds {c.totalCratesHolding || 0} · ৳{Number(c.jamanotBalance || 0).toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label"><ArrowRightLeft size={13} /> Direction</label>
                  <div className="unit-type-grid">
                    <button
                      type="button"
                      onClick={() => setCustomerForm((p) => ({ ...p, direction: 'borrow' }))}
                      className={`unit-type-btn ${customerForm.direction === 'borrow' ? 'active' : ''}`}
                    >
                      <span className="unit-type-icon"><ArrowUpRight size={16} /></span>
                      <div className="text-left">
                        <p className="font-bold">Borrow</p>
                        <p className="text-xs opacity-75">Out → customer (collect jamanot)</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerForm((p) => ({ ...p, direction: 'return' }))}
                      className={`unit-type-btn ${customerForm.direction === 'return' ? 'active' : ''}`}
                    >
                      <span className="unit-type-icon"><ArrowDownLeft size={16} /></span>
                      <div className="text-left">
                        <p className="font-bold">Return</p>
                        <p className="text-xs opacity-75">Customer → in shop (refund jamanot)</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Bangla Crates</label>
                    <input
                      type="number" min="0" value={customerForm.banglaCrates}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, banglaCrates: e.target.value }))}
                      className="input-field" placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">China Crates</label>
                    <input
                      type="number" min="0" value={customerForm.chinaCrates}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, chinaCrates: e.target.value }))}
                      className="input-field" placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label">
                    <Wallet size={13} /> Jamanot {customerForm.direction === 'borrow' ? 'Deposit' : 'Refund'}
                    <span className="form-label-hint">optional</span>
                  </label>
                  <div className="input-with-suffix">
                    <span className="input-prefix">৳</span>
                    <input
                      type="number" min="0" value={customerForm.jamanotAmount}
                      onChange={(e) => setCustomerForm((p) => ({ ...p, jamanotAmount: e.target.value }))}
                      className="input-field !pl-8"
                      placeholder="Leave 0 if no deposit"
                    />
                  </div>
                </div>

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
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><ArrowRightLeft size={18} /></div>
                <div>
                  <h2>Supplier Crate Movement</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Give crates to or receive from a supplier</p>
                </div>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><UserCheck size={13} /> Supplier <span className="text-red-500">*</span></label>
                  <select
                    value={supplierForm.supplierId}
                    onChange={(e) => setSupplierForm((p) => ({ ...p, supplierId: e.target.value }))}
                    className="input-field"
                  >
                    <option value="">Choose supplier…</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (holds {s.totalCratesHolding || 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="form-label"><ArrowRightLeft size={13} /> Direction</label>
                  <div className="unit-type-grid">
                    <button
                      type="button"
                      onClick={() => setSupplierForm((p) => ({ ...p, direction: 'give' }))}
                      className={`unit-type-btn ${supplierForm.direction === 'give' ? 'active' : ''}`}
                    >
                      <span className="unit-type-icon"><ArrowUpRight size={16} /></span>
                      <div className="text-left">
                        <p className="font-bold">Give</p>
                        <p className="text-xs opacity-75">Out → supplier</p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupplierForm((p) => ({ ...p, direction: 'return' }))}
                      className={`unit-type-btn ${supplierForm.direction === 'return' ? 'active' : ''}`}
                    >
                      <span className="unit-type-icon"><ArrowDownLeft size={16} /></span>
                      <div className="text-left">
                        <p className="font-bold">Return</p>
                        <p className="text-xs opacity-75">Supplier → in shop</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label">Bangla Crates</label>
                    <input
                      type="number" min="0" value={supplierForm.banglaCrates}
                      onChange={(e) => setSupplierForm((p) => ({ ...p, banglaCrates: e.target.value }))}
                      className="input-field" placeholder="0"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">China Crates</label>
                    <input
                      type="number" min="0" value={supplierForm.chinaCrates}
                      onChange={(e) => setSupplierForm((p) => ({ ...p, chinaCrates: e.target.value }))}
                      className="input-field" placeholder="0"
                    />
                  </div>
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
                <div className="modal-icon-circle bg-emerald-100 text-emerald-700"><ShoppingCart size={18} /></div>
                <div>
                  <h2>Sell Crates</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Customer is charged · only profit hits P&amp;L</p>
                </div>
              </div>
              <button onClick={() => setShowSellModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div className="form-field">
                  <label className="form-label"><Boxes size={13} /> Crate Type</label>
                  <div className="unit-type-grid">
                    {BOX_TYPES.map((t) => (
                      <button
                        type="button"
                        key={t.value}
                        onClick={() => setSellForm((p) => ({ ...p, crateType: t.value }))}
                        className={`unit-type-btn ${sellForm.crateType === t.value ? 'active' : ''}`}
                      >
                        <span className="unit-type-icon">{t.value === 'BANGLA' ? 'BA' : 'CH'}</span>
                        <div className="text-left">
                          <p className="font-bold">{t.label}</p>
                          <p className="text-xs opacity-75">
                            {(crateInventory[t.value.toLowerCase()]?.inShop || 0).toLocaleString()} in shop
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label className="form-label"><Users size={13} /> Buyer</label>
                  <div className="unit-pills">
                    {[
                      { value: 'customer', label: 'Permanent customer' },
                      { value: 'walkin', label: 'Walk-in (cash)' },
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
                      : 'Cash sale — no account entry, just the inventory movement and P&L profit.'}
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

                <div className="form-grid">
                  <div className="form-field">
                    <label className="form-label"><Hash size={13} /> Quantity</label>
                    <input
                      type="number" min="1" value={sellForm.quantity}
                      onChange={(e) => setSellForm((p) => ({ ...p, quantity: e.target.value }))}
                      className="input-field" placeholder="e.g. 20"
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-label">
                      <Wallet size={13} /> Sale price each (৳) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number" min="0.01" step="0.01" value={sellForm.unitSalePrice}
                      onChange={(e) => setSellForm((p) => ({ ...p, unitSalePrice: e.target.value }))}
                      className="input-field" placeholder="e.g. 300"
                    />
                  </div>
                </div>

                {/* Preview: total + cost basis + profit */}
                {Number(sellForm.quantity) > 0 && Number(sellForm.unitSalePrice) >= 0 && (() => {
                  const qty = Number(sellForm.quantity) || 0;
                  const unit = Number(sellForm.unitSalePrice) || 0;
                  const key = (sellForm.crateType || 'BANGLA').toLowerCase();
                  const costBasis = Number(crateInventory[key]?.purchasePrice) || 0;
                  const gross = qty * unit;
                  const cost = qty * costBasis;
                  const profit = gross - cost;
                  return (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Sale total (customer owes)</span><strong>৳ {gross.toLocaleString()}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Cost basis (avg)</span><span>৳ {cost.toLocaleString()}</span></div>
                      <div className="flex justify-between border-t border-slate-200 pt-1">
                        <span className="text-slate-700 font-semibold">P&amp;L impact</span>
                        <strong className={profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {profit >= 0 ? '+' : ''}৳ {profit.toLocaleString()}
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

      {/* SET CRATE PRICE MODAL */}
      {showPriceModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '24rem' }}>
            <div className="modal-header">
              <div className="flex items-center gap-2.5">
                <div className="modal-icon-circle bg-blue-100 text-blue-700"><Wallet size={18} /></div>
                <div>
                  <h2>Crate Cost</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{priceForm.crateType} — used to value losses in P&amp;L</p>
                </div>
              </div>
              <button onClick={() => setShowPriceModal(false)} className="modal-close-btn">✕</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label className="form-label"><Hash size={13} /> Purchase price per crate (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceForm.purchasePrice}
                  onChange={(e) => setPriceForm((p) => ({ ...p, purchasePrice: e.target.value }))}
                  className="input-field"
                  placeholder="e.g. 250"
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-1">
                  Already-recorded losses keep their original cost snapshot; only new losses use this price.
                </p>
              </div>
              {priceError && <div className="status-error"><span>!</span><span>{priceError}</span></div>}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowPriceModal(false)} className="btn-secondary" disabled={isSavingPrice}>Cancel</button>
              <button onClick={handlePriceSave} className="btn-primary flex items-center gap-2" disabled={isSavingPrice}>
                {isSavingPrice ? 'Saving…' : 'Save price'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BoxDashboard;
