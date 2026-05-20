/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';
import { useAuth } from './AuthContext';
import { apiPaths, postJson } from '../services/apiClient';

const DataContext = createContext();

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const toPositiveNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
};
const getDateOnly = () => new Date().toISOString().split('T')[0];

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

const EMPTY_BOX_INVENTORY = {
  totalBoxesOwned: 0,
  boxesInShop: 0,
  boxesWithSuppliers: 0,
  boxesWithCustomers: 0,
  boxesLostDamaged: 0,
  bangla: {
    total: 0,
    inShop: 0,
    withSuppliers: 0,
    withCustomers: 0,
    lost: 0,
  },
  china: {
    total: 0,
    inShop: 0,
    withSuppliers: 0,
    withCustomers: 0,
    lost: 0,
  },
};

const createDefaultState = () => ({
  suppliers: [],
  customers: [],
  transactions: [],
  supplierProducts: [],
  shipments: [],
  catalogProducts: [],
  boxInventory: EMPTY_BOX_INVENTORY,
});


const normalizeBoxType = (value) => String(value || '').trim().toUpperCase() === 'CHINA' ? 'china' : 'bangla';

const createBoxTypeState = () => ({
  total: 0,
  inShop: 0,
  withSuppliers: 0,
  withCustomers: 0,
  lost: 0,
});

const mapBoxDashboard = (dashboard) => {
  const next = {
    totalBoxesOwned: Number(dashboard?.totalBoxesOwned) || 0,
    boxesInShop: Number(dashboard?.boxesInShop) || 0,
    boxesWithSuppliers: Number(dashboard?.boxesWithSuppliers) || 0,
    boxesWithCustomers: Number(dashboard?.boxesWithCustomers) || 0,
    boxesLostDamaged: Number(dashboard?.boxesLostDamaged) || 0,
    bangla: createBoxTypeState(),
    china: createBoxTypeState(),
  };

  (dashboard?.boxTypes || []).forEach((item) => {
    const key = normalizeBoxType(item.boxType);
    next[key] = {
      total: Number(item.total) || 0,
      inShop: Number(item.inHand) || 0,
      withSuppliers: Number(item.withSuppliers) || 0,
      withCustomers: Number(item.withCustomers) || 0,
      lost: Number(item.lostDamaged) || 0,
    };
  });

  return next;
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
  dateReceived: item.updatedAt?.split('T')[0] || getDateOnly(),
  status: Number(item.quantityOnHand) > 0 ? 'in_stock' : 'sold_out',
});

const mapSupplierAccount = (account) => ({
  id: account.id,
  supplierId: account.supplierId,
  wholesalerId: account.wholesalerId,
  name: account.name,
  contact: account.phone,
  phone: account.phone,
  location: account.address || '',
  address: account.address || '',
  bankDetails: '',
  commissionRate: Number(account.commissionRate) || 0,
  totalSales: roundMoney(Number(account.totalSales) || 0),
  totalCommissionEarned: roundMoney(Number(account.totalCommissionEarned) || 0),
  advancePaymentsMade: 0,
  amountDue: roundMoney(Number(account.currentDue ?? account.openingDue) || 0),
  lastSettlementDate: account.createdAt?.split('T')[0] || getDateOnly(),
  balance: -roundMoney(Number(account.currentDue ?? account.openingDue) || 0),
  boxesHoldingWooden: Number(account.banglaCratesDue) || 0,
  boxesHoldingPlastic: Number(account.chinaCratesDue) || 0,
  totalBoxesHolding: Number(account.totalCratesDue) || 0,
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
  boxJamanot: roundMoney(Number(account.jamanotBalance) || 0),
  boxesHoldingWooden: Number(account.banglaCratesDue) || 0,
  boxesHoldingPlastic: Number(account.chinaCratesDue) || 0,
  totalBoxesHolding: Number(account.totalCratesDue) || 0,
});


const mapShipment = (shipment) => ({
  id: shipment.id,
  wholesalerId: shipment.wholesalerId,
  supplierId: shipment.wholesalerSupplierId,
  deliveryDate: shipment.deliveryDate,
  date: shipment.deliveryDate?.split('T')[0] || getDateOnly(),
  totalQuantity: roundMoney(Number(shipment.totalQuantity) || 0),
  status: shipment.status || 'POSTED',
  note: shipment.note || '',
  items: (shipment.items || []).map((item) => ({
    id: item.id,
    inventoryId: item.inventoryId,
    productId: item.productId,
    productName: item.productName,
    categoryId: item.categoryId || null,
    categoryName: item.categoryName || 'No Category',
    grade: item.grade || '',
    quantity: roundMoney(Number(item.quantity) || 0),
    unit: String(item.unit || '').toLowerCase(),
    note: item.note || '',
  })),
});

const mapTransaction = (transaction) => ({
  id: transaction.id,
  date: transaction.createdAt?.split('T')[0] || getDateOnly(),
  createdAt: transaction.createdAt || new Date().toISOString(),
  transactionType: transaction.transactionType === 'PAYMENT' ? 'Payment' : 'Sale',
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
  quantity: Number(transaction.quantity) || 0,
  unit: String(transaction.unit || '').toLowerCase(),
  unitPrice: Number(transaction.unitPrice) || 0,
  totalAmount: Number(transaction.saleAmount) || 0,
  paymentAmount: Number(transaction.paymentAmount) || 0,
  customerNewDue: Number(transaction.dueAmount) || 0,
  boxesReturned: Number(transaction.boxesReturned) || 0,
  boxJamanotChange: Number(transaction.jamanotAmount) ? -Number(transaction.jamanotAmount) : 0,
  paymentOperationType: transaction.paymentType || '',
  paymentType: transaction.paymentType || transaction.description || '',
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
    commissionDue: roundMoney(Number(profile.commissionDue) || 0),
    amountDue: roundMoney(Number(profile.supplierDue ?? profile.account?.currentDue) || 0),
    otherExpense: roundMoney(Number(profile.otherExpense) || 0),
  },
  transactions: asArray(profile.transactions).map(mapTransaction),
});

export const DataProvider = ({ children }) => {
  const { admin, isAuthenticated } = useAuth();
  const initialState = createDefaultState();
  const [suppliers, setSuppliers] = useState(initialState.suppliers);
  const [customers, setCustomers] = useState(initialState.customers);
  const [transactions, setTransactions] = useState(initialState.transactions);
  const [supplierProducts, setSupplierProducts] = useState(initialState.supplierProducts);
  const [shipments, setShipments] = useState(initialState.shipments);
  const [catalogProducts, setCatalogProducts] = useState(initialState.catalogProducts);
  const [boxInventory, setBoxInventory] = useState(initialState.boxInventory);
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
        setBoxInventory(createDefaultState().boxInventory);
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
        const [supplierAccounts, customerAccounts, productCatalog, inventoryItems, boxDashboard, transactionItems, shipmentItems] = await Promise.all([
          loadSection('Suppliers', () => postJson(apiPaths.wholesalerSuppliersList(admin.wholesalerId)), []),
          loadSection('Customers', () => postJson(apiPaths.wholesalerCustomersList(admin.wholesalerId)), []),
          loadSection('Products', () => postJson(apiPaths.productsList), []),
          loadSection('Inventory', () => postJson(apiPaths.inventoryList(admin.wholesalerId)), []),
          loadSection('Crates', () => postJson(apiPaths.boxesDashboard(admin.wholesalerId)), EMPTY_BOX_INVENTORY),
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
        setBoxInventory(mapBoxDashboard(boxDashboard.data));

        const failedSections = [supplierAccounts, customerAccounts, productCatalog, inventoryItems, boxDashboard, transactionItems, shipmentItems]
          .filter((section) => section.error)
          .map((section) => section.label);
        setDataError(failedSections.length ? 'Unable to load: ' + failedSections.join(', ') + '.' : '');
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
      phone: supplierData.contact || supplierData.phone,
      address: supplierData.location || supplierData.address,
      commissionRate: Number(supplierData.commissionRate) || 0,
      openingDue: Number(supplierData.openingDue) || 0,
    };

    const account = await postJson(apiPaths.wholesalerSuppliersCreate(admin.wholesalerId), payload);
    const newSupplier = mapSupplierAccount(account);
    setSuppliers((prev) => [...prev, newSupplier]);
    return newSupplier;
  };

  const addSupplierProduct = async (productData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const supplierId = Number(productData.supplierId);
    const productId = Number(productData.productId);
    const categoryId = productData.categoryId ? Number(productData.categoryId) : null;
    const quantity = toPositiveNumber(productData.quantity);
    const supplier = suppliers.find((item) => item.id === supplierId);
    const catalogProduct = catalogProducts.find((item) => Number(item.id) === productId);
    const productCategories = catalogProduct?.categories || [];
    const category = categoryId
      ? productCategories.find((item) => Number(item.id) === categoryId)
      : null;

    if (!supplier) {
      throw new Error('Supplier not found.');
    }
    if (!catalogProduct) {
      throw new Error('Please select a valid product.');
    }
    if (productCategories.length > 0 && !category) {
      throw new Error('Please select a valid category for this product.');
    }
    if (!quantity) {
      throw new Error('Please provide valid quantity.');
    }

    const unit = String(catalogProduct.defaultUnit || 'PCS').toLowerCase();
    const delivery = await postJson(apiPaths.supplierDeliveriesCreate(admin.wholesalerId), {
      wholesalerSupplierId: supplierId,
      note: productData.note?.trim() || '',
      items: [
        {
          productId,
          categoryId,
          quantity,
          note: productData.note?.trim() || '',
        },
      ],
    });

    const deliveryItem = delivery.items?.[0];
    const inventoryQuantity = roundMoney(Number(deliveryItem?.inventoryQuantityOnHand) || quantity);
    const productName = deliveryItem?.productName || catalogProduct.name;
    const categoryName = deliveryItem?.categoryName || category?.name || 'No Category';
    const existingProduct = supplierProducts.find(
      (product) =>
        product.supplierId === supplierId &&
        Number(product.productId) === productId &&
        (product.categoryId || null) === categoryId,
    );

    const productAfterDelivery = existingProduct
      ? {
          ...existingProduct,
          deliveryItemId: deliveryItem?.id || existingProduct.deliveryItemId,
          quantity: inventoryQuantity,
          totalValue: 0,
          dateReceived: delivery.deliveryDate?.split('T')[0] || getDateOnly(),
          status: 'in_stock',
        }
      : {
          id: deliveryItem?.inventoryId || getNextId(supplierProducts),
          deliveryItemId: deliveryItem?.id,
          productId,
          categoryId,
          supplierId,
          productName,
          category: categoryName,
          unit,
          quantity: inventoryQuantity,
          unitPrice: 0,
          totalValue: 0,
          dateReceived: delivery.deliveryDate?.split('T')[0] || getDateOnly(),
          status: 'in_stock',
        };

    const newShipment = mapShipment(delivery);
    setShipments((prev) => [newShipment, ...prev]);

    const newTransaction = {
      id: getNextId(transactions),
      date: getDateOnly(),
      createdAt: new Date().toISOString(),
      transactionType: 'SupplierDelivery',
      supplier: supplier.name,
      supplierId: supplier.id,
      product: productAfterDelivery.productName,
      productId: productAfterDelivery.id,
      category: productAfterDelivery.category,
      quantity,
      unitPrice: 0,
      unit: productAfterDelivery.unit,
      totalAmount: 0,
      note: productData.note?.trim() || '',
    };

    setSupplierProducts((prev) =>
      existingProduct
        ? prev.map((product) =>
            product.id === existingProduct.id ? productAfterDelivery : product,
          )
        : [...prev, productAfterDelivery],
    );
    setTransactions((prev) => [...prev, newTransaction]);
    return productAfterDelivery;
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
      jamanotBalance: Number(customerData.boxJamanot) || 0,
    };

    const account = await postJson(apiPaths.wholesalerCustomersCreate(admin.wholesalerId), payload);
    const newCustomer = mapCustomerAccount(account);
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  const recordSale = async (saleData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const inventoryId = Number(saleData.productId);
    const quantity = toPositiveNumber(saleData.quantity);
    const unitPrice = toPositiveNumber(saleData.unitPrice);
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

    const response = await postJson(apiPaths.salesCreate(admin.wholesalerId), {
      wholesalerCustomerId: Number(saleData.customerId) || null,
      customerName: saleData.customerName,
      customerPhone: saleData.customerPhone,
      inventoryId,
      quantity,
      unitPrice,
      paymentAmount,
      cratesGiven: Number(saleData.cratesGiven) || 0,
      banglaCratesGiven: Number(saleData.banglaCratesGiven) || 0,
      chinaCratesGiven: Number(saleData.chinaCratesGiven) || 0,
      jamanotAmount: Number(saleData.jamanotAmount) || 0,
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
              boxJamanot: roundMoney(Number(response.customerJamanotBalance ?? customer.boxJamanot) || 0),
              boxesHoldingWooden: roundMoney((customer.boxesHoldingWooden || 0) + Number(response.banglaCratesGiven || 0)),
              boxesHoldingPlastic: roundMoney((customer.boxesHoldingPlastic || 0) + Number(response.chinaCratesGiven || 0)),
              totalBoxesHolding: roundMoney((customer.totalBoxesHolding || 0) + Number(response.cratesGiven || 0)),
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
      const banglaCount = Number(response.banglaCratesGiven || 0);
      const chinaCount = Number(response.chinaCratesGiven || 0);
      const crateCount = banglaCount + chinaCount;
      setBoxInventory((prev) => ({
        ...prev,
        boxesInShop: Math.max((prev.boxesInShop || 0) - crateCount, 0),
        boxesWithCustomers: (prev.boxesWithCustomers || 0) + crateCount,
        bangla: {
          ...prev.bangla,
          inShop: Math.max((prev.bangla?.inShop || 0) - banglaCount, 0),
          withCustomers: (prev.bangla?.withCustomers || 0) + banglaCount,
        },
        china: {
          ...prev.china,
          inShop: Math.max((prev.china?.inShop || 0) - chinaCount, 0),
          withCustomers: (prev.china?.withCustomers || 0) + chinaCount,
        },
      }));
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
      paymentAmount: Number(response.paidAmount) || 0,
      customer: response.customerName || null,
      customerPhone: response.customerPhone || null,
      customerType: response.customerType || 'PERMANENT',
      customerNewDue: Number(response.customerDueBalance) || 0,
      commissionAmount: Number(response.commissionAmount) || 0,
      cratesGiven: Number(response.cratesGiven) || 0,
      banglaCratesGiven: Number(response.banglaCratesGiven) || 0,
      chinaCratesGiven: Number(response.chinaCratesGiven) || 0,
      jamanotAmount: Number(response.jamanotAmount) || 0,
    };

    setTransactions((prev) => [...prev, transaction]);
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

  const recordCustomerBoxReturn = (customerId, woodenReturn, plasticReturn) => {
    const wooden = Math.max(0, Math.floor(Number(woodenReturn) || 0));
    const plastic = Math.max(0, Math.floor(Number(plasticReturn) || 0));

    if (!wooden && !plastic) return { wooden: 0, plastic: 0 };

    let appliedWooden = 0;
    let appliedPlastic = 0;

    const targetCustomer = customers.find((customer) => customer.id === customerId);
    if (!targetCustomer) return { wooden: 0, plastic: 0 };

    appliedWooden = Math.min(wooden, targetCustomer.boxesHoldingWooden || 0);
    appliedPlastic = Math.min(plastic, targetCustomer.boxesHoldingPlastic || 0);

    if (!appliedWooden && !appliedPlastic) return { wooden: 0, plastic: 0 };

    setCustomers((prev) =>
      prev.map((customer) =>
        customer.id === customerId
          ? {
              ...customer,
              boxesHoldingWooden: Math.max((customer.boxesHoldingWooden || 0) - appliedWooden, 0),
              boxesHoldingPlastic: Math.max((customer.boxesHoldingPlastic || 0) - appliedPlastic, 0),
              totalBoxesHolding: Math.max(
                (customer.totalBoxesHolding || 0) - (appliedWooden + appliedPlastic),
                0,
              ),
            }
          : customer,
      ),
    );

    setBoxInventory((prev) => ({
      ...prev,
      boxesInShop: prev.boxesInShop + appliedWooden + appliedPlastic,
      boxesWithCustomers: Math.max(prev.boxesWithCustomers - (appliedWooden + appliedPlastic), 0),
      bangla: {
        ...prev.bangla,
        inShop: prev.bangla.inShop + appliedWooden,
        withCustomers: Math.max(prev.bangla.withCustomers - appliedWooden, 0),
      },
      china: {
        ...prev.china,
        inShop: prev.china.inShop + appliedPlastic,
        withCustomers: Math.max(prev.china.withCustomers - appliedPlastic, 0),
      },
    }));

    return { wooden: appliedWooden, plastic: appliedPlastic };
  };

  const recordSupplierBoxReturn = (supplierId, woodenReturn, plasticReturn) => {
    const wooden = Math.max(0, Math.floor(Number(woodenReturn) || 0));
    const plastic = Math.max(0, Math.floor(Number(plasticReturn) || 0));

    if (!wooden && !plastic) return { wooden: 0, plastic: 0 };

    let appliedWooden = 0;
    let appliedPlastic = 0;

    const targetSupplier = suppliers.find((supplier) => supplier.id === supplierId);
    if (!targetSupplier) return { wooden: 0, plastic: 0 };

    appliedWooden = Math.min(wooden, targetSupplier.boxesHoldingWooden || 0);
    appliedPlastic = Math.min(plastic, targetSupplier.boxesHoldingPlastic || 0);

    if (!appliedWooden && !appliedPlastic) return { wooden: 0, plastic: 0 };

    setSuppliers((prev) =>
      prev.map((supplier) =>
        supplier.id === supplierId
          ? {
              ...supplier,
              boxesHoldingWooden: Math.max((supplier.boxesHoldingWooden || 0) - appliedWooden, 0),
              boxesHoldingPlastic: Math.max((supplier.boxesHoldingPlastic || 0) - appliedPlastic, 0),
              totalBoxesHolding: Math.max(
                (supplier.totalBoxesHolding || 0) - (appliedWooden + appliedPlastic),
                0,
              ),
            }
          : supplier,
      ),
    );

    setBoxInventory((prev) => ({
      ...prev,
      boxesInShop: prev.boxesInShop + appliedWooden + appliedPlastic,
      boxesWithSuppliers: Math.max(prev.boxesWithSuppliers - (appliedWooden + appliedPlastic), 0),
      bangla: {
        ...prev.bangla,
        inShop: prev.bangla.inShop + appliedWooden,
        withSuppliers: Math.max(prev.bangla.withSuppliers - appliedWooden, 0),
      },
      china: {
        ...prev.china,
        inShop: prev.china.inShop + appliedPlastic,
        withSuppliers: Math.max(prev.china.withSuppliers - appliedPlastic, 0),
      },
    }));

    return { wooden: appliedWooden, plastic: appliedPlastic };
  };

  const recordAccountTransaction = async (transactionData) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }

    const partyType = transactionData.partyType === 'supplier' ? 'supplier' : 'customer';
    const partyId = Number(transactionData.partyId);
    const inputAmount = roundMoney(Math.max(0, Number(transactionData.amount) || 0));
    const banglaCrates = Math.max(0, Math.floor(Number(transactionData.woodenReturn) || 0));
    const chinaCrates = Math.max(0, Math.floor(Number(transactionData.plasticReturn) || 0));
    const jamanotAmount = roundMoney(Math.max(0, Number(transactionData.boxJamanotChange) || 0));
    const includesCash = inputAmount > 0;
    const includesCrates = banglaCrates + chinaCrates > 0;

    if (!partyId) {
      throw new Error('Please select a valid customer or supplier.');
    }
    if (!includesCash && !includesCrates) {
      throw new Error('Enter at least one update: cash amount or crate quantity.');
    }

    let response;
    let partyName = '';
    let operationLabel = 'Payment';

    if (partyType === 'customer') {
      const customer = customers.find((item) => item.id === partyId);
      if (!customer) {
        throw new Error('Customer not found.');
      }
      if (inputAmount > Number(customer.amountDue || 0)) {
        throw new Error('Cash received cannot exceed customer due.');
      }
      if (jamanotAmount > Number(customer.boxJamanot || 0)) {
        throw new Error('Jamanot refund cannot exceed customer jamanot balance.');
      }

      partyName = customer.name;
      response = await postJson(apiPaths.paymentsCustomerSettle(admin.wholesalerId), {
        wholesalerCustomerId: partyId,
        cashAmount: includesCash ? inputAmount : 0,
        banglaCratesReturned: includesCrates ? banglaCrates : 0,
        chinaCratesReturned: includesCrates ? chinaCrates : 0,
        jamanotAmount: includesCrates ? jamanotAmount : 0,
        paymentMethod: 'CASH',
        note: transactionData.note?.trim() || '',
      });

      setCustomers((prev) =>
        prev.map((customerItem) =>
          customerItem.id === partyId
            ? {
                ...customerItem,
                amountDue: roundMoney(Number(response.dueAfter) || 0),
                totalPaid: roundMoney((customerItem.totalPaid || 0) + Number(response.cashAmount || 0)),
                boxJamanot: roundMoney(Number(response.jamanotAfter ?? customerItem.boxJamanot) || 0),
                boxesHoldingWooden: Math.max((customerItem.boxesHoldingWooden || 0) - Number(response.banglaCrates || 0), 0),
                boxesHoldingPlastic: Math.max((customerItem.boxesHoldingPlastic || 0) - Number(response.chinaCrates || 0), 0),
                totalBoxesHolding: Math.max(
                  (customerItem.totalBoxesHolding || 0) - Number(response.banglaCrates || 0) - Number(response.chinaCrates || 0),
                  0,
                ),
              }
            : customerItem,
        ),
      );

      setBoxInventory((prev) => ({
        ...prev,
        boxesInShop: (prev.boxesInShop || 0) + Number(response.banglaCrates || 0) + Number(response.chinaCrates || 0),
        boxesWithCustomers: Math.max(
          (prev.boxesWithCustomers || 0) - Number(response.banglaCrates || 0) - Number(response.chinaCrates || 0),
          0,
        ),
        bangla: {
          ...prev.bangla,
          inShop: (prev.bangla?.inShop || 0) + Number(response.banglaCrates || 0),
          withCustomers: Math.max((prev.bangla?.withCustomers || 0) - Number(response.banglaCrates || 0), 0),
        },
        china: {
          ...prev.china,
          inShop: (prev.china?.inShop || 0) + Number(response.chinaCrates || 0),
          withCustomers: Math.max((prev.china?.withCustomers || 0) - Number(response.chinaCrates || 0), 0),
        },
      }));
    } else {
      const supplier = suppliers.find((item) => item.id === partyId);
      if (!supplier) {
        throw new Error('Supplier not found.');
      }
      partyName = supplier.name;

      if (includesCash) {
        const supplierPaymentKind = transactionData.supplierPaymentKind || 'PRODUCT_PAYMENT';
        const pathByKind = {
          PRODUCT_PAYMENT: apiPaths.paymentsSupplierProductPay,
          COMMISSION_RECEIVE: apiPaths.paymentsSupplierCommissionReceive,
          EXPENSE_RECEIVE: apiPaths.paymentsSupplierExpenseReceive,
        };
        const endpoint = pathByKind[supplierPaymentKind] || apiPaths.paymentsSupplierProductPay;
        response = await postJson(endpoint(admin.wholesalerId), {
          wholesalerSupplierId: partyId,
          amount: inputAmount,
          paymentMethod: 'CASH',
          note: transactionData.note?.trim() || '',
        });
        operationLabel = supplierPaymentKind;

        setSuppliers((prev) =>
          prev.map((supplierItem) =>
            supplierItem.id === partyId
              ? {
                  ...supplierItem,
                  amountDue: roundMoney(Number(response.dueAfter ?? supplierItem.amountDue) || 0),
                  advancePaymentsMade:
                    supplierPaymentKind === 'PRODUCT_PAYMENT'
                      ? roundMoney((supplierItem.advancePaymentsMade || 0) + Number(response.cashAmount || 0))
                      : supplierItem.advancePaymentsMade,
                  lastSettlementDate: getDateOnly(),
                }
              : supplierItem,
          ),
        );
      }

      if (includesCrates) {
        const crateDirection = transactionData.supplierCrateDirection === 'give' ? 'give' : 'return';
        const endpoint = crateDirection === 'give' ? apiPaths.paymentsSupplierCrateGive : apiPaths.paymentsSupplierCrateReturn;
        const crateResponse = await postJson(endpoint(admin.wholesalerId), {
          wholesalerSupplierId: partyId,
          banglaCrates,
          chinaCrates,
          note: transactionData.note?.trim() || '',
        });
        response = response || crateResponse;
        operationLabel = crateDirection === 'give' ? 'SUPPLIER_CRATE_GIVE' : 'SUPPLIER_CRATE_RETURN';
        const sign = crateDirection === 'give' ? 1 : -1;
        const inventorySign = crateDirection === 'give' ? -1 : 1;

        setSuppliers((prev) =>
          prev.map((supplierItem) =>
            supplierItem.id === partyId
              ? {
                  ...supplierItem,
                  boxesHoldingWooden: Math.max((supplierItem.boxesHoldingWooden || 0) + sign * banglaCrates, 0),
                  boxesHoldingPlastic: Math.max((supplierItem.boxesHoldingPlastic || 0) + sign * chinaCrates, 0),
                  totalBoxesHolding: Math.max((supplierItem.totalBoxesHolding || 0) + sign * (banglaCrates + chinaCrates), 0),
                }
              : supplierItem,
          ),
        );
        setBoxInventory((prev) => ({
          ...prev,
          boxesInShop: Math.max((prev.boxesInShop || 0) + inventorySign * (banglaCrates + chinaCrates), 0),
          boxesWithSuppliers: Math.max((prev.boxesWithSuppliers || 0) - inventorySign * (banglaCrates + chinaCrates), 0),
          bangla: {
            ...prev.bangla,
            inShop: Math.max((prev.bangla?.inShop || 0) + inventorySign * banglaCrates, 0),
            withSuppliers: Math.max((prev.bangla?.withSuppliers || 0) - inventorySign * banglaCrates, 0),
          },
          china: {
            ...prev.china,
            inShop: Math.max((prev.china?.inShop || 0) + inventorySign * chinaCrates, 0),
            withSuppliers: Math.max((prev.china?.withSuppliers || 0) - inventorySign * chinaCrates, 0),
          },
        }));
      }
    }

    const newTransaction = {
      id: response.transactionId || getNextId(transactions),
      date: getDateOnly(),
      createdAt: response.createdAt || new Date().toISOString(),
      transactionType: 'Payment',
      partyType: partyType === 'customer' ? 'Customer' : 'Supplier',
      partyName,
      partyId,
      paymentType: operationLabel,
      totalAmount: inputAmount,
      paymentAmount: Number(response.cashAmount || inputAmount || 0),
      dueAmountChange: 0,
      customerNewDue: partyType === 'customer' ? Number(response.dueAfter || 0) : null,
      boxReturnWooden: banglaCrates,
      boxReturnPlastic: chinaCrates,
      boxJamanotChange: partyType === 'customer' ? -jamanotAmount : 0,
      note: transactionData.note?.trim() || '',
    };

    setTransactions((prev) => [...prev, newTransaction]);
    return newTransaction;
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
    setBoxInventory((prev) => ({ ...prev, ...updates }));
  };

  const addBoxes = async (boxType, quantityInput) => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return mapBoxDashboard(null);

    const dashboard = await postJson(apiPaths.boxesPurchaseCreate(admin.wholesalerId), {
      boxType: String(boxType || '').toUpperCase(),
      quantity,
      note: 'Manual box purchase',
    });
    const mapped = mapBoxDashboard(dashboard);
    setBoxInventory(mapped);
    return mapped;
  };

  const markBoxesLost = async (boxType, quantityInput, reason = 'lost') => {
    if (!admin?.wholesalerId) {
      throw new Error('Wholesaler profile not found for this user.');
    }
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return mapBoxDashboard(null);

    const dashboard = await postJson(apiPaths.boxesLostDamagedCreate(admin.wholesalerId), {
      boxType: String(boxType || '').toUpperCase(),
      quantity,
      reason,
      note: 'Manual box loss/damage update',
    });
    const mapped = mapBoxDashboard(dashboard);
    setBoxInventory(mapped);
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
        boxInventory,
        catalogProducts,
        isLoading,
        dataError,
        addSupplier,
        addCustomer,
        addTransaction: recordSale,
        recordSale,
        recordAccountTransaction,
        recordCustomerPayment,
        recordSupplierPayment,
        recordCustomerBoxReturn,
        recordSupplierBoxReturn,
        addSupplierProduct,
        updateBoxInventory,
        addBoxes,
        markBoxesLost,
        getCustomerProfile,
        getSupplierProfile,
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
