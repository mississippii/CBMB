/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../features/auth/AuthContext';
import { apiPaths, postJson } from '../services/apiClient';
import { queryKeys } from '../services/queryKeys';

const DataContext = createContext();

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const toPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};
// Local calendar date (yyyy-mm-dd) — toISOString() would report the UTC day.
const getDateOnly = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const getNextId = (items) => {
  if (!items.length) return 1;
  return Math.max(...items.map((item) => Number(item.id) || 0)) + 1;
};

const loadSection = async (label, request, fallback) => {
  try {
    return { label, data: await request(), error: null };
  } catch (error) {
    return { label, data: fallback, error };
  }
};

const asArray = (value) => (Array.isArray(value) ? value : []);

// N-type crate inventory: totals plus a per-type map keyed by uppercase crate name.
// Crate types are entirely backend-driven (admin catalog) — no hard-coded types.
const EMPTY_CRATE_INVENTORY = {
  totalCratesOwned: 0,
  cratesInShop: 0,
  cratesWithSuppliers: 0,
  cratesWithCustomers: 0,
  cratesLostDamaged: 0,
  byType: {},
};

const createDefaultState = () => ({
  suppliers: [],
  customers: [],
  transactions: [],
  supplierProducts: [],
  shipments: [],
  catalogProducts: [],
  subCategories: [],   // fixed system list of Lot1..Lot200
  crateInventory: EMPTY_CRATE_INVENTORY,
});


// N-type crate dashboard: keep totals plus a per-type map keyed by uppercase crate
// name. Crate types are entirely backend-driven (admin catalog) — no hard-coded types.
const mapCrateDashboard = (dashboard) => {
  const byType = {};
  (dashboard?.crateTypes || []).forEach((item) => {
    const name = String(item.crateType || '').trim().toUpperCase();
    byType[name] = {
      total: Number(item.total) || 0,
      inShop: Number(item.inHand) || 0,
      withSuppliers: Number(item.withSuppliers) || 0,
      withCustomers: Number(item.withCustomers) || 0,
      lost: Number(item.lostDamaged) || 0,
      purchasePrice: Number(item.purchasePrice) || 0,
      weightedAvgCost: Number(item.weightedAvgCost) || 0,
    };
  });
  return {
    totalCratesOwned: Number(dashboard?.totalCratesOwned) || 0,
    cratesInShop: Number(dashboard?.cratesInShop) || 0,
    cratesWithSuppliers: Number(dashboard?.cratesWithSuppliers) || 0,
    cratesWithCustomers: Number(dashboard?.cratesWithCustomers) || 0,
    cratesLostDamaged: Number(dashboard?.cratesLostDamaged) || 0,
    byType,
  };
};


const mapInventoryItem = (item) => ({
  id: item.inventoryId,
  inventoryId: item.inventoryId,
  productId: item.productId,
  categoryId: item.categoryId || null,
  supplierId: item.wholesalerSupplierId,
  supplierRecordId: item.supplierId,
  productName: item.productName,
  category: item.categoryName || 'No Category',
  grade: item.grade || '',
  unit: String(item.unit || '').toLowerCase(),
  quantity: roundMoney(Number(item.quantityOnHand) || 0),
  unitPrice: 0,
  totalValue: 0,
  deliveryId: item.deliveryId || null,
  deliveryDate: item.deliveryDate || null,
  subCategoryId: item.subCategoryId || null,
  subCategoryName: item.subCategoryName || '',
  dateReceived: item.updatedAt?.split('T')[0] || getDateOnly(),
  status: Number(item.quantityOnHand) > 0 ? 'in_stock' : 'sold_out',
});

// Per-type crate dues from the backend: [{ crateType, quantity }]. Normalized to
// uppercase names so callers can match against the catalog without surprises.
const mapCrateDues = (crateDues) =>
  (crateDues || []).map((d) => ({
    crateType: String(d.crateType || '').trim().toUpperCase(),
    quantity: Number(d.quantity) || 0,
  }));

const mapSupplierAccount = (account) => ({
  id: account.id,
  supplierId: account.supplierId,
  wholesalerId: account.wholesalerId,
  name: account.name,
  businessName: account.businessName || '',
  contact: account.phone,
  phone: account.phone,
  location: account.location || '',
  commissionRate: Number(account.commissionRate) || 0,
  totalSales: roundMoney(Number(account.totalSales) || 0),
  totalCommissionEarned: roundMoney(Number(account.totalCommissionEarned) || 0),
  advancePaymentsMade: 0,
  amountDue: roundMoney(Number(account.currentDue ?? account.openingDue) || 0),
  lastSettlementDate: account.createdAt?.split('T')[0] || getDateOnly(),
  balance: -roundMoney(Number(account.currentDue ?? account.openingDue) || 0),
  crateHoldings: mapCrateDues(account.crateDues),
  totalCratesHolding: Number(account.totalCratesDue) || 0,
  status: account.status || 'ACTIVE',
});

const mapCustomerAccount = (account) => ({
  id: account.id,
  customerId: account.customerId,
  wholesalerId: account.wholesalerId,
  name: account.name,
  owner: account.ownerName || '',
  phone: account.phone,
  address: account.address || '',
  type: 'Permanent',
  totalPurchases: roundMoney(Number(account.totalPurchases) || 0),
  totalPaid: roundMoney(Number(account.totalPaid) || 0),
  amountDue: roundMoney(Number(account.currentDue ?? account.openingDue) || 0),
  crateHoldings: mapCrateDues(account.crateDues),
  totalCratesHolding: Number(account.totalCratesDue) || 0,
  crateDepositHeld: roundMoney(Number(account.crateDepositHeld) || 0),
  status: account.status || 'ACTIVE',
});


const mapShipment = (shipment) => ({
  id: shipment.id,
  wholesalerId: shipment.wholesalerId,
  supplierId: shipment.wholesalerSupplierId,
  name: shipment.name || '',
  deliveryDate: shipment.deliveryDate,
  date: shipment.deliveryDate?.split('T')[0] || getDateOnly(),
  totalQuantity: roundMoney(Number(shipment.totalQuantity) || 0),
  status: shipment.status || 'POSTED',
  note: shipment.note || '',
  estimatedValue: roundMoney(Number(shipment.estimatedValue) || 0),
  advancePaid: roundMoney(Number(shipment.advancePaid) || 0),
  commissionRate: shipment.commissionRate == null ? null : Number(shipment.commissionRate),
  settlementStatus: shipment.settlementStatus || 'OPEN',
  totalSold: roundMoney(Number(shipment.totalSold) || 0),
  commissionAmount: roundMoney(Number(shipment.commissionAmount) || 0),
  netPayable: roundMoney(Number(shipment.netPayable) || 0),
  expenseTotal: roundMoney(Number(shipment.expenseTotal) || 0),
  expenseDue: roundMoney(Number(shipment.expenseDue) || 0),
  totalUnitsSold: roundMoney(Number(shipment.totalUnitsSold) || 0),
  totalKgSold: roundMoney(Number(shipment.totalKgSold) || 0),
  items: (shipment.items || []).map((item) => ({
    id: item.id,
    inventoryId: item.inventoryId,
    productId: item.productId,
    productName: item.productName,
    categoryId: item.categoryId || null,
    categoryName: item.categoryName || '',
    subCategoryId: item.subCategoryId || null,
    subCategoryName: item.subCategoryName || '',
    quantity: roundMoney(Number(item.quantity) || 0),
    remaining: roundMoney(Number(item.inventoryQuantityOnHand) || 0),
    unit: String(item.unit || '').toLowerCase(),
    note: item.note || '',
  })),
});

const mapTransaction = (transaction) => ({
  id: transaction.id,
  date: transaction.createdAt?.split('T')[0] || getDateOnly(),
  createdAt: transaction.createdAt || new Date().toISOString(),
  transactionType: transaction.transactionType === 'PAYMENT' ? 'Payment' : 'Sale',
  saleId: transaction.saleId || null,
  paymentId: transaction.paymentId || null,
  settlementId: transaction.settlementId || null,
  customerId: transaction.wholesalerCustomerId,
  customer: transaction.customerName || null,
  customerPhone: transaction.customerPhone || null,
  supplierId: transaction.wholesalerSupplierId,
  supplier: transaction.supplierName || null,
  supplierPhone: transaction.supplierPhone || null,
  productId: transaction.productId || null,
  product: transaction.productName || null,
  categoryId: transaction.categoryId || null,
  category: transaction.categoryName || null,
  subCategoryId: transaction.subCategoryId || null,
  subCategoryName: transaction.subCategoryName || '',
  quantity: Number(transaction.quantity) || 0,
  unit: String(transaction.unit || '').toLowerCase(),
  saleWeightKg: Number(transaction.saleWeightKg) || 0,
  unitPrice: Number(transaction.unitPrice) || 0,
  totalAmount: Number(transaction.saleAmount) || 0,
  grossAmount: Number(transaction.grossAmount) || 0,
  discountAmount: Number(transaction.discountAmount) || 0,
  paymentAmount: Number(transaction.paymentAmount) || 0,
  customerNewDue: Number(transaction.dueAmount) || 0,
  cratesReturned: Number(transaction.cratesReturned) || 0,
  paymentOperationType: transaction.paymentType || '',
  paymentType: transaction.paymentType || transaction.description || '',
  paymentMethod: transaction.paymentMethod || '',
  note: transaction.description || '',
});

const mapCustomerProfile = (profile) => ({
  account: mapCustomerAccount(profile.account || {}),
  transactions: asArray(profile.transactions).map(mapTransaction),
});

const mapSupplierProfile = (profile) => ({
  account: {
    ...mapSupplierAccount(profile.account || {}),
    todaySale: roundMoney(Number(profile.todaySale) || 0),
    todayCommission: roundMoney(Number(profile.todayCommission) || 0),
    totalSales: roundMoney(Number(profile.totalSale ?? profile.account?.totalSales) || 0),
    totalCommissionEarned: roundMoney(Number(profile.totalCommission ?? profile.account?.totalCommissionEarned) || 0),
    amountDue: roundMoney(Number(profile.supplierDue ?? profile.account?.currentDue) || 0),
  },
  transactions: asArray(profile.transactions).map(mapTransaction),
});

export const DataProvider = ({ children }) => {
  const { admin, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const wholesalerId = admin?.wholesalerId;
  const initialState = createDefaultState();

  // ──────────────────────────────────────────────────────────────────────────
  // Invalidation helpers — every write below calls one of these so any tab
  // using useQuery picks up the change next time it renders.
  // ──────────────────────────────────────────────────────────────────────────
  const invalidate = {
    transactions: () => queryClient.invalidateQueries({ queryKey: queryKeys.transactions.root(wholesalerId) }),
    inventory:    () => queryClient.invalidateQueries({ queryKey: queryKeys.inventory.root(wholesalerId) }),
    shipments:    () => queryClient.invalidateQueries({ queryKey: queryKeys.shipments.list(wholesalerId) }),
    crates:       () => queryClient.invalidateQueries({ queryKey: queryKeys.crates.root(wholesalerId) }),
    shopExpenses: () => queryClient.invalidateQueries({ queryKey: queryKeys.shopExpenses.root(wholesalerId) }),
    dashboard:    () => queryClient.invalidateQueries({ queryKey: ['dashboardSummary', wholesalerId] }),
    salesAggregate: () => queryClient.invalidateQueries({ queryKey: ['salesAggregate', wholesalerId] }),
    suppliers:    () => queryClient.invalidateQueries({ queryKey: ['suppliers', wholesalerId] }),
    customers:    () => queryClient.invalidateQueries({ queryKey: ['customers', wholesalerId] }),
    profile: (which, accountId) => {
      if (which === 'customer') queryClient.invalidateQueries({ queryKey: queryKeys.parties.customerProfile(wholesalerId, accountId) });
      if (which === 'supplier') queryClient.invalidateQueries({ queryKey: queryKeys.parties.supplierProfile(wholesalerId, accountId) });
    },
    // "Money event" = a write that moves money or due. Touches transaction feed,
    // dashboard rollup, and the sales aggregate (commission earned changes).
    cash:         () => queryClient.invalidateQueries({ queryKey: queryKeys.cash.root(wholesalerId) }),
    moneyEvent: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.root(wholesalerId) });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary', wholesalerId] });
      queryClient.invalidateQueries({ queryKey: ['salesAggregate', wholesalerId] });
    },
  };

  const [suppliers, setSuppliers] = useState(initialState.suppliers);
  const [customers, setCustomers] = useState(initialState.customers);
  const [transactions, setTransactions] = useState(initialState.transactions);
  const [supplierProducts, setSupplierProducts] = useState(initialState.supplierProducts);
  const [shipments, setShipments] = useState(initialState.shipments);
  const [catalogProducts, setCatalogProducts] = useState(initialState.catalogProducts);
  const [subCategories, setSubCategories] = useState(initialState.subCategories);
  const [crateInventory, setCrateInventory] = useState(initialState.crateInventory);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    if (!isAuthenticated || admin?.role !== 'WHOLESALER' || !admin?.wholesalerId) {
      Promise.resolve().then(() => {
        setSuppliers([]);
        setCustomers([]);
        setTransactions([]);
        setSupplierProducts([]);
        setShipments([]);
        setCatalogProducts([]);
        setSubCategories([]);
        setCrateInventory(createDefaultState().crateInventory);
        setDataError('');
        setIsLoading(false);
      });
      return;
    }

    let isActive = true;
    const loadWholesalerData = async () => {
      setIsLoading(true);
      setDataError('');
      try {
        const [supplierAccounts, customerAccounts, productCatalog, subCatalog, inventoryItems, boxDashboard, transactionItems, shipmentItems] = await Promise.all([
          loadSection('Suppliers', () => postJson(apiPaths.wholesalerSuppliersList(admin.wholesalerId)), []),
          loadSection('Customers', () => postJson(apiPaths.wholesalerCustomersList(admin.wholesalerId)), []),
          loadSection('Products', () => postJson(apiPaths.productsList), []),
          loadSection('SubCategories', () => postJson(apiPaths.adminSubCategoriesList), []),
          loadSection('Inventory', () => postJson(apiPaths.inventoryList(admin.wholesalerId)), []),
          loadSection('Crates', () => postJson(apiPaths.cratesDashboard(admin.wholesalerId)), EMPTY_CRATE_INVENTORY),
          loadSection('Transactions', () => postJson(apiPaths.transactionsList(admin.wholesalerId)), []),
          loadSection('Shipments', () => postJson(apiPaths.supplierDeliveriesList(admin.wholesalerId)), []),
        ]);

        if (!isActive) return;
        setSuppliers(asArray(supplierAccounts.data).map(mapSupplierAccount));
        setCustomers(asArray(customerAccounts.data).map(mapCustomerAccount));
        setTransactions(asArray(transactionItems.data).map(mapTransaction));
        setSupplierProducts(asArray(inventoryItems.data).map(mapInventoryItem));
        setShipments(asArray(shipmentItems.data).map(mapShipment));
        setCatalogProducts(asArray(productCatalog.data));
        setSubCategories(asArray(subCatalog.data));
        setCrateInventory(mapCrateDashboard(boxDashboard.data));
        setDataError('');
      } catch (error) {
        if (isActive) {
          setDataError(error.message || 'Failed to load wholesaler data.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadWholesalerData();

    return () => {
      isActive = false;
    };
  }, [admin?.role, admin?.wholesalerId, isAuthenticated]);

  const addSupplier = async (supplierData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const payload = {
      name: supplierData.name,
      businessName: supplierData.businessName || null,
      phone: supplierData.contact || supplierData.phone,
      location: supplierData.location || null,
      commissionRate: Number(supplierData.commissionRate) || 0,
      openingDue: Number(supplierData.openingDue) || 0,
    };

    const account = await postJson(apiPaths.wholesalerSuppliersCreate(admin.wholesalerId), payload);
    const newSupplier = mapSupplierAccount(account);
    setSuppliers((prev) => [...prev, newSupplier]);
    invalidate.suppliers();
    return newSupplier;
  };

  const updateSupplier = async (supplierData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const payload = {
      accountId: Number(supplierData.id),
      name: supplierData.name,
      businessName: supplierData.businessName || null,
      location: supplierData.location || null,
      commissionRate: Number(supplierData.commissionRate) || 0,
    };
    const account = await postJson(apiPaths.wholesalerSuppliersUpdate(admin.wholesalerId), payload);
    const updated = mapSupplierAccount(account);
    setSuppliers((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    return updated;
  };

  const reloadSuppliers = async (includeDisabled = false) => {
    if (!admin?.wholesalerId) return;
    try {
      const data = await postJson(apiPaths.wholesalerSuppliersList(admin.wholesalerId), { includeDisabled });
      setSuppliers(asArray(data).map(mapSupplierAccount));
    } catch { /* keep existing */ }
  };

  const reloadCustomers = async (includeDisabled = false) => {
    if (!admin?.wholesalerId) return;
    try {
      const data = await postJson(apiPaths.wholesalerCustomersList(admin.wholesalerId), { includeDisabled });
      setCustomers(asArray(data).map(mapCustomerAccount));
    } catch { /* keep existing */ }
  };

  const setSupplierStatus = async (supplierAccountId, enable) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const path = enable ? apiPaths.wholesalerSuppliersEnable : apiPaths.wholesalerSuppliersDisable;
    const account = await postJson(path(admin.wholesalerId), { accountId: Number(supplierAccountId) });
    const updated = mapSupplierAccount(account);
    setSuppliers((prev) => {
      const exists = prev.some((s) => s.id === updated.id);
      if (exists) return prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s));
      return [...prev, updated];
    });
    return updated;
  };

  const setCustomerStatus = async (customerAccountId, enable) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const path = enable ? apiPaths.wholesalerCustomersEnable : apiPaths.wholesalerCustomersDisable;
    const account = await postJson(path(admin.wholesalerId), { accountId: Number(customerAccountId) });
    const updated = mapCustomerAccount(account);
    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === updated.id);
      if (exists) return prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c));
      return [...prev, updated];
    });
    return updated;
  };

  const addSupplierProduct = async (productData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const supplierId = Number(productData.supplierId);
    const productId = productData.productId ? Number(productData.productId) : null;
    const unit = String(productData.unit || '').trim().toUpperCase();
    const supplier = suppliers.find((item) => item.id === supplierId);

    if (!supplier) throw new Error('Supplier not found.');
    if (!productId) throw new Error('Please pick a product from the catalog.');
    if (!unit) throw new Error('Please pick a unit (KG, PCS, CRATE, DOZEN, BAG, MOUND).');

    // Build items[] from lines. Each line: { categoryId, subCategoryId, quantity }.
    const rawLines = Array.isArray(productData.lines) ? productData.lines : [];
    const items = rawLines
      .map((line) => ({
        categoryId: line.categoryId ? Number(line.categoryId) : null,
        subCategoryId: line.subCategoryId ? Number(line.subCategoryId) : null,
        quantity: toPositiveNumber(line.quantity),
      }))
      .filter((it) => it.quantity > 0);
    if (items.length === 0) throw new Error('Add at least one line with a quantity.');

    const shipmentName = String(productData.name || '').trim();
    if (!shipmentName) throw new Error('Shipment name is required.');

    const delivery = await postJson(apiPaths.supplierDeliveriesCreate(admin.wholesalerId), {
      wholesalerSupplierId: supplierId,
      name: shipmentName,
      estimatedValue: Number(productData.estimatedValue) || 0,
      advancePaid: Number(productData.advancePaid) || 0,
      commissionRate: productData.commissionRate === '' || productData.commissionRate == null
        ? null
        : Number(productData.commissionRate),
      note: productData.note?.trim() || '',
      items: items.map((it) => ({
        productId,
        categoryId: it.categoryId,
        subCategoryId: it.subCategoryId,
        quantity: it.quantity,
        unit,
        note: productData.note?.trim() || '',
      })),
    });

    // Each delivery item becomes its own lot-scoped inventory row.
    const newProducts = (delivery.items || []).map((di) => ({
      id: di.inventoryId || getNextId(supplierProducts),
      inventoryId: di.inventoryId,
      deliveryItemId: di.id,
      deliveryId: delivery.id,
      deliveryDate: delivery.deliveryDate,
      productId: di.productId,
      categoryId: di.categoryId || null,
      subCategoryId: di.subCategoryId || null,
      subCategoryName: di.subCategoryName || '',
      supplierId,
      productName: di.productName,
      category: di.categoryName || 'No Category',
      unit: String(di.unit || unit).toLowerCase(),
      quantity: roundMoney(Number(di.inventoryQuantityOnHand) || Number(di.quantity) || 0),
      unitPrice: 0,
      totalValue: 0,
      dateReceived: delivery.deliveryDate?.split('T')[0] || getDateOnly(),
      status: Number(di.inventoryQuantityOnHand) > 0 ? 'in_stock' : 'sold_out',
    }));

    const newShipment = mapShipment(delivery);
    setShipments((prev) => [newShipment, ...prev]);
    setSupplierProducts((prev) => [...prev, ...newProducts]);

    const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
    const newTransaction = {
      id: getNextId(transactions),
      date: getDateOnly(),
      createdAt: new Date().toISOString(),
      transactionType: 'SupplierDelivery',
      supplier: supplier.name,
      supplierId: supplier.id,
      product: newProducts[0]?.productName || '',
      productId: newProducts[0]?.id,
      category: '',
      quantity: totalQty,
      unitPrice: 0,
      unit: unit.toLowerCase(),
      totalAmount: 0,
      note: productData.note?.trim() || '',
    };
    setTransactions((prev) => [...prev, newTransaction]);

    invalidate.shipments();
    invalidate.inventory();
    invalidate.transactions();
    invalidate.moneyEvent();
    return newProducts;
  };

  const getSupplierShipments = async (supplierAccountId) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.shipmentsBySupplier(admin.wholesalerId), {
      accountId: Number(supplierAccountId),
    });
    return asArray(data).map(mapShipment);
  };

  const setShipmentCommission = async (deliveryId, commissionRate) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.shipmentSetCommission(admin.wholesalerId), {
      deliveryId: Number(deliveryId),
      commissionRate: Number(commissionRate),
    });
    const updated = mapShipment(data);
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    invalidate.shipments();
    invalidate.salesAggregate();
    invalidate.dashboard();
    return updated;
  };

  const settleShipment = async (deliveryId, settled = true) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.shipmentSettle(admin.wholesalerId), {
      deliveryId: Number(deliveryId),
      settled,
    });
    const updated = mapShipment(data);
    setShipments((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    invalidate.shipments();
    invalidate.moneyEvent();
    return updated;
  };

  const writeOffStock = async ({ inventoryId, quantity, reason, note }) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const item = await postJson(apiPaths.inventoryWriteOff(admin.wholesalerId), {
      inventoryId: Number(inventoryId),
      quantity: Number(quantity),
      reason: reason?.trim() || null,
      note: note?.trim() || null,
    });
    const mapped = mapInventoryItem(item);
    setSupplierProducts((prev) => prev.map((p) => (p.id === mapped.id ? { ...p, ...mapped } : p)));
    invalidate.inventory();
    invalidate.transactions();
    return mapped;
  };

  const addCustomer = async (customerData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const payload = {
      name: customerData.name,
      ownerName: customerData.owner || customerData.ownerName,
      phone: customerData.phone,
      address: customerData.address,
      openingDue: Number(customerData.openingDue) || 0,
    };

    const account = await postJson(apiPaths.wholesalerCustomersCreate(admin.wholesalerId), payload);
    const newCustomer = mapCustomerAccount(account);
    setCustomers((prev) => [...prev, newCustomer]);
    invalidate.customers();
    return newCustomer;
  };

  const recordSale = async (saleData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const inventoryId = Number(saleData.productId);
    const quantity = toPositiveNumber(saleData.quantity);
    const unitPrice = toPositiveNumber(saleData.unitPrice);
    const discountAmount = roundMoney(Math.max(0, Number(saleData.discountAmount) || 0));
    const paymentAmount = roundMoney(Math.max(0, Number(saleData.paymentAmount) || 0));
    const selectedInventory = supplierProducts.find((product) => product.id === inventoryId);

    if (!inventoryId || !quantity || !unitPrice) {
      throw new Error('Please provide valid product, quantity and unit price.');
    }
    if (!selectedInventory) {
      throw new Error('Product not found.');
    }
    if (selectedInventory.quantity < quantity) {
      throw new Error('Insufficient stock for ' + selectedInventory.productName + '. Available: ' + selectedInventory.quantity + ', required: ' + quantity + '.');
    }

    const weightRaw = saleData.saleWeightKg;
    const saleWeightKg = weightRaw === '' || weightRaw == null
      ? null
      : Number(weightRaw) > 0 ? Number(weightRaw) : null;

    const response = await postJson(apiPaths.salesCreate(admin.wholesalerId), {
      wholesalerCustomerId: Number(saleData.customerId) || null,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      inventoryId,
      quantity,
      saleWeightKg,
      unitPrice,
      discountAmount,
      paymentAmount,
      crateType: saleData.crateType || null,
      cratesGiven: Number(saleData.cratesGiven) || 0,
      paymentMethod: saleData.paymentMethod || null,
    });

    setSupplierProducts((prev) =>
      prev.map((product) =>
        product.id === inventoryId
          ? {
              ...product,
              quantity: roundMoney(Number(response.inventoryQuantityOnHand) || 0),
              status: Number(response.inventoryQuantityOnHand) > 0 ? 'in_stock' : 'sold_out',
            }
          : product,
      ),
    );

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === response.wholesalerCustomerId
          ? {
              ...customer,
              amountDue: roundMoney(Number(response.customerDueBalance) || 0),
              totalPurchases: roundMoney((customer.totalPurchases || 0) + Number(response.netAmount || 0)),
              totalPaid: roundMoney((customer.totalPaid || 0) + Number(response.paidAmount || 0)),
              totalCratesHolding: roundMoney((customer.totalCratesHolding || 0) + Number(response.cratesGiven || 0)),
            }
          : customer,
      ),
    );

    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === response.wholesalerSupplierId
          ? {
              ...supplier,
              amountDue: roundMoney(Number(response.supplierDueBalance ?? supplier.amountDue) || 0),
              totalSales: roundMoney((supplier.totalSales || 0) + Number(response.netAmount || 0)),
              totalCommissionEarned: roundMoney((supplier.totalCommissionEarned || 0) + Number(response.commissionAmount || 0)),
            }
          : supplier,
      ),
    );

    if (Number(response.cratesGiven || 0) > 0) {
      const crateCount = Number(response.cratesGiven || 0);
      const type = String(response.crateType || '').trim().toUpperCase();
      setCrateInventory((prev) => {
        const prevType = prev.byType?.[type] || {};
        return {
          ...prev,
          cratesInShop: Math.max((prev.cratesInShop || 0) - crateCount, 0),
          cratesWithCustomers: (prev.cratesWithCustomers || 0) + crateCount,
          byType: {
            ...prev.byType,
            [type]: {
              ...prevType,
              inShop: Math.max((prevType.inShop || 0) - crateCount, 0),
              withCustomers: (prevType.withCustomers || 0) + crateCount,
            },
          },
        };
      });
    }

    const transaction = {
      id: response.transactionId || response.saleId,
      date: getDateOnly(),
      createdAt: response.saleDate || new Date().toISOString(),
      transactionType: 'Sale',
      customerId: response.wholesalerCustomerId,
      supplier: response.supplierName,
      supplierId: response.wholesalerSupplierId,
      product: response.productName,
      productId: response.inventoryId,
      quantity: Number(response.quantity) || quantity,
      unitPrice: Number(response.unitPrice) || unitPrice,
      totalAmount: Number(response.netAmount) || 0,
      grossAmount: Number(response.grossAmount) || 0,
      discountAmount: Number(response.discountAmount) || 0,
      paymentAmount: Number(response.paidAmount) || 0,
      customer: response.customerName || null,
      customerPhone: response.customerPhone || null,
      customerType: response.customerType || 'PERMANENT',
      customerNewDue: Number(response.customerDueBalance) || 0,
      commissionAmount: Number(response.commissionAmount) || 0,
      crateType: response.crateType || null,
      cratesGiven: Number(response.cratesGiven) || 0,
    };

    setTransactions((prev) => [...prev, transaction]);
    invalidate.inventory();
    invalidate.moneyEvent();
    invalidate.crates();
    return transaction;
  };

  const recordCustomerPayment = (customerId, amount) => {
    const payment = toPositiveNumber(amount);
    if (!payment) return 0;

    let appliedAmount = 0;
    setCustomers((prev) =>
      prev.map((customer) => {
        if (customer.id !== customerId) return customer;
        appliedAmount = roundMoney(Math.min(customer.amountDue || 0, payment));
        return {
          ...customer,
          amountDue: roundMoney(Math.max((customer.amountDue || 0) - appliedAmount, 0)),
          totalPaid: roundMoney((customer.totalPaid || 0) + appliedAmount),
        };
      }),
    );
    return appliedAmount;
  };

  const recordSupplierPayment = (supplierId, amount) => {
    const payment = toPositiveNumber(amount);
    if (!payment) return 0;

    let appliedAmount = 0;
    setSuppliers((prev) =>
      prev.map((supplier) => {
        if (supplier.id !== supplierId) return supplier;
        appliedAmount = roundMoney(Math.min(supplier.amountDue || 0, payment));
        return {
          ...supplier,
          amountDue: roundMoney(Math.max((supplier.amountDue || 0) - appliedAmount, 0)),
          advancePaymentsMade: roundMoney((supplier.advancePaymentsMade || 0) + appliedAmount),
          lastSettlementDate: getDateOnly(),
        };
      }),
    );
    return appliedAmount;
  };

  const getCustomerProfile = async (customerId) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const profile = await postJson(apiPaths.wholesalerCustomersProfile(admin.wholesalerId), {
      accountId: Number(customerId),
    });
    return mapCustomerProfile(profile);
  };

  const getSupplierProfile = async (supplierId) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const profile = await postJson(apiPaths.wholesalerSuppliersProfile(admin.wholesalerId), {
      accountId: Number(supplierId),
    });
    return mapSupplierProfile(profile);
  };

  const updateBoxInventory = (updates) => {
    setCrateInventory((prev) => ({ ...prev, ...updates }));
  };

  const refreshTransactions = async () => {
    if (!admin?.wholesalerId) return;
    try {
      const data = await postJson(apiPaths.transactionsList(admin.wholesalerId));
      setTransactions(asArray(data).map(mapTransaction));
    } catch {
      /* keep existing transactions on failure */
    }
  };

  const fetchDashboardSummary = async (period = 'today', from = null, to = null) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const body = { period };
    if (period === 'custom') {
      if (!from || !to) throw new Error('Custom period needs both from and to.');
      body.from = from;
      body.to = to;
    }
    return postJson(apiPaths.dashboardSummary(admin.wholesalerId), body);
  };

  const fetchSalesAggregate = async (filters = {}) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    return postJson(apiPaths.salesAggregate(admin.wholesalerId), filters);
  };

  const fetchTransactionsRange = async (from = null, to = null) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    return postJson(apiPaths.transactionsList(admin.wholesalerId), { from, to });
  };

  const cancelSale = async (saleId, reason = '') => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.salesCancel(admin.wholesalerId, saleId), { reason });
    await refreshTransactions();
    invalidate.moneyEvent();
    invalidate.inventory();
    invalidate.crates();
    return response;
  };

  const cancelCustomerPayment = async (paymentId, reason = '') => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.paymentsCustomerCancel(admin.wholesalerId, paymentId), { reason });
    await refreshTransactions();
    invalidate.moneyEvent();
    invalidate.crates();
    return response;
  };

  const cancelSupplierSettlement = async (settlementId, reason = '') => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.paymentsSupplierCancel(admin.wholesalerId, settlementId), { reason });
    await refreshTransactions();
    invalidate.moneyEvent();
    return response;
  };

  const fetchShopExpenseCategories = async () => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    return postJson(apiPaths.shopExpenseCategories(admin.wholesalerId));
  };

  const fetchShopExpenses = async (from = null, to = null) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    return postJson(apiPaths.shopExpenseList(admin.wholesalerId), { from, to });
  };

  const createShopExpense = async (payload) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.shopExpenseCreate(admin.wholesalerId), payload);
    invalidate.shopExpenses();
    invalidate.dashboard();
    return response;
  };

  const cancelShopExpense = async (expenseId, reason = '') => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.shopExpenseCancel(admin.wholesalerId, expenseId), { reason });
    invalidate.shopExpenses();
    invalidate.dashboard();
    return response;
  };

  const fetchDailyCash = async (date = null) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    return postJson(apiPaths.cashDaily(admin.wholesalerId), { date });
  };

  const closeCashDay = async (payload) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.cashClose(admin.wholesalerId), payload);
    invalidate.cash();
    return response;
  };

  const reopenCashDay = async (date = null) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const response = await postJson(apiPaths.cashReopen(admin.wholesalerId), { date });
    invalidate.cash();
    return response;
  };

  // Read-side fetchers exposed so callers can wrap them in useQuery while still
  // using the same response mapping the eager DataContext fetch uses.
  const fetchShipments = async () => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.supplierDeliveriesList(admin.wholesalerId));
    return asArray(data).map(mapShipment);
  };

  // Edit a shipment's label fields (name / note) only.
  const updateShipment = async (deliveryId, { name, note }) => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.supplierDeliveriesUpdate(admin.wholesalerId), {
      deliveryId: Number(deliveryId),
      name,
      note,
    });
    invalidate.shipments();
    return mapShipment(data);
  };

  const fetchInventoryList = async () => {
    if (!admin?.wholesalerId) throw new Error('Wholesaler profile not found.');
    const data = await postJson(apiPaths.inventoryList(admin.wholesalerId));
    return asArray(data).map(mapInventoryItem);
  };

  const addCrates = async (crateType, quantityInput, unitPriceInput) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return mapCrateDashboard(null);

    const unitPrice = Number(unitPriceInput);
    if (unitPriceInput === '' || unitPriceInput == null || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      throw new Error('Cost per crate is required.');
    }

    const dashboard = await postJson(apiPaths.cratesPurchaseCreate(admin.wholesalerId), {
      crateType: String(crateType || '').toUpperCase(),
      quantity,
      unitPrice,
      note: 'Manual crate purchase',
    });
    const mapped = mapCrateDashboard(dashboard);
    setCrateInventory(mapped);
    refreshTransactions();
    invalidate.crates();
    invalidate.transactions();
    return mapped;
  };

  /**
   * Sell crates (capital-asset disposal). If `customerAccountId` is provided, the customer's
   * account is debited (receivable). If null/empty, treated as a walk-in cash sale — no
   * account ledger entry, but the SOLD movement still posts and P&L picks up the profit.
   */
  const sellCrates = async ({ crateType, quantity, unitSalePrice, customerAccountId, note }) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const qty = Math.max(0, Math.floor(Number(quantity) || 0));
    if (!qty) throw new Error('Quantity must be greater than zero.');
    const price = Number(unitSalePrice);
    if (!Number.isFinite(price) || price <= 0) throw new Error('Sale price per crate is required.');

    const payload = {
      crateType: String(crateType || '').toUpperCase(),
      quantity: qty,
      unitSalePrice: price,
      note: note || null,
    };
    if (customerAccountId) {
      payload.customerAccountId = Number(customerAccountId);
    }

    const dashboard = await postJson(apiPaths.cratesSell(admin.wholesalerId), payload);
    const mapped = mapCrateDashboard(dashboard);
    setCrateInventory(mapped);
    refreshTransactions();
    invalidate.crates();
    invalidate.transactions();
    if (customerAccountId) invalidate.moneyEvent();
    return mapped;
  };

  // Permanent customer borrows one or more crate types in a single record.
  // lines: [{ crateType, quantity }]; depositAmount = optional refundable security money.
  const borrowCustomerCrates = async (customerId, lines, note, depositAmount = 0) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const crates = (lines || [])
      .map((l) => ({ crateType: String(l.crateType || '').toUpperCase(), quantity: Math.max(0, Math.floor(Number(l.quantity) || 0)) }))
      .filter((l) => l.crateType && l.quantity > 0);
    if (crates.length === 0) throw new Error('Add at least one crate line.');
    await postJson(apiPaths.paymentsCustomerCrateBorrow(admin.wholesalerId), {
      wholesalerCustomerId: Number(customerId),
      crates,
      depositAmount: Math.max(0, Number(depositAmount) || 0),
      note: note || null,
    });
    invalidate.crates();
    invalidate.transactions();
    invalidate.moneyEvent();
  };

  /** Mark crates lost/damaged. Loss is always absorbed against crate capital at WAC. */
  const markCratesLost = async (crateType, quantityInput, reason = 'lost') => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return mapCrateDashboard(null);

    const dashboard = await postJson(apiPaths.cratesLostDamagedCreate(admin.wholesalerId), {
      crateType: String(crateType || '').toUpperCase(),
      quantity,
      reason,
      note: 'Manual crate loss/damage update',
    });
    const mapped = mapCrateDashboard(dashboard);
    setCrateInventory(mapped);
    refreshTransactions();
    invalidate.crates();
    invalidate.transactions();
    return mapped;
  };

  /** Set the per-crate purchase cost. Used to value lost/damaged crates in P&L. */
  const setCratePrice = async (crateType, purchasePrice) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const dashboard = await postJson(apiPaths.cratesTypeSetPrice(admin.wholesalerId), {
      crateType: String(crateType || '').toUpperCase(),
      purchasePrice: Number(purchasePrice),
    });
    const mapped = mapCrateDashboard(dashboard);
    setCrateInventory(mapped);
    invalidate.crates();
    return mapped;
  };

  return (
    <DataContext.Provider
      value={{
        suppliers,
        customers,
        transactions,
        supplierProducts,
        shipments,
        crateInventory,
        catalogProducts,
        subCategories,
        isLoading,
        dataError,
        addSupplier,
        updateSupplier,
        setSupplierStatus,
        reloadSuppliers,
        refreshTransactions,
        addCustomer,
        setCustomerStatus,
        reloadCustomers,
        addTransaction: recordSale,
        recordSale,
        recordCustomerPayment,
        recordSupplierPayment,
        addSupplierProduct,
        getSupplierShipments,
        setShipmentCommission,
        settleShipment,
        writeOffStock,
        updateBoxInventory,
        addCrates,
        markCratesLost,
        setCratePrice,
        sellCrates,
        borrowCustomerCrates,
        getCustomerProfile,
        getSupplierProfile,
        fetchDashboardSummary,
        fetchSalesAggregate,
        fetchTransactionsRange,
        cancelSale,
        cancelCustomerPayment,
        cancelSupplierSettlement,
        fetchShopExpenseCategories,
        fetchShopExpenses,
        createShopExpense,
        cancelShopExpense,
        fetchDailyCash,
        closeCashDay,
        reopenCashDay,
        fetchShipments,
        updateShipment,
        fetchInventoryList,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};
