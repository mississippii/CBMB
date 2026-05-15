/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useState, useContext } from 'react';

const DataContext = createContext();
const DATA_STORAGE_KEY = 'cbtrading-data-v1';

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

const DUMMY_SUPPLIERS = [
  {
    id: 1,
    name: 'Mango Farm XYZ',
    contact: '0171-1234567',
    location: 'Chapainawabganj',
    bankDetails: 'Account: 12345678',
    commissionRate: 5,
    boxesHoldingWooden: 8,
    boxesHoldingPlastic: 0,
    totalBoxesHolding: 8,
    totalSales: 50000,
    totalCommissionEarned: 2500,
    advancePaymentsMade: 1000,
    amountDue: 1500,
    lastSettlementDate: '2024-05-08',
    balance: -1500,
  },
  {
    id: 2,
    name: 'Pineapple Co',
    contact: '0181-7654321',
    location: 'Kushtia',
    bankDetails: 'Account: 87654321',
    commissionRate: 4,
    boxesHoldingWooden: 4,
    boxesHoldingPlastic: 2,
    totalBoxesHolding: 6,
    totalSales: 30000,
    totalCommissionEarned: 1200,
    advancePaymentsMade: 500,
    amountDue: 700,
    lastSettlementDate: '2024-05-09',
    balance: -700,
  },
];

const DUMMY_SUPPLIER_PRODUCTS = [
  {
    id: 1,
    supplierId: 1,
    productName: 'Himsagar Mango',
    category: 'Mango',
    quantity: 200,
    unit: 'pcs',
    unitPrice: 100,
    totalValue: 20000,
    dateReceived: '2024-05-09',
    status: 'in_stock',
  },
  {
    id: 2,
    supplierId: 1,
    productName: 'Fazli Mango',
    category: 'Mango',
    quantity: 150,
    unit: 'pcs',
    unitPrice: 80,
    totalValue: 12000,
    dateReceived: '2024-05-08',
    status: 'in_stock',
  },
  {
    id: 3,
    supplierId: 2,
    productName: 'Yellow Pineapple',
    category: 'Pineapple',
    quantity: 100,
    unit: 'pcs',
    unitPrice: 150,
    totalValue: 15000,
    dateReceived: '2024-05-10',
    status: 'in_stock',
  },
];

const DUMMY_CUSTOMERS = [
  {
    id: 1,
    name: 'Doly Store',
    owner: 'Dolly Ahmed',
    phone: '0181-1111111',
    address: 'Dhaka',
    type: 'Permanent',
    totalPurchases: 5000,
    totalPaid: 3000,
    amountDue: 2000,
    boxJamanot: 1000,
    boxesHoldingWooden: 5,
    boxesHoldingPlastic: 2,
    totalBoxesHolding: 7,
  },
  {
    id: 2,
    name: 'Karim Shop',
    owner: 'Karim Ahmed',
    phone: '0171-2222222',
    address: 'Chittagong',
    type: 'Permanent',
    totalPurchases: 8000,
    totalPaid: 6000,
    amountDue: 2000,
    boxJamanot: 500,
    boxesHoldingWooden: 3,
    boxesHoldingPlastic: 2,
    totalBoxesHolding: 5,
  },
  {
    id: 3,
    name: 'Cash Buyer',
    owner: 'Cash Customer',
    phone: '0191-3333333',
    address: 'Rajshahi',
    type: 'Cash',
    totalPurchases: 2000,
    totalPaid: 2000,
    amountDue: 0,
    boxJamanot: 0,
    boxesHoldingWooden: 2,
    boxesHoldingPlastic: 1,
    totalBoxesHolding: 3,
  },
];

const DUMMY_TRANSACTIONS = [
  {
    id: 1,
    date: '2024-05-10',
    customer: 'Doly Store',
    supplier: 'Mango Farm XYZ',
    product: 'Himsagar Mango',
    quantity: 50,
    unitPrice: 100,
    totalAmount: 5000,
    paymentType: 'Credit',
    paymentAmount: 0,
    customerPreviousDue: 2000,
    customerNewDue: 7000,
    commissionRate: 5,
    commissionAmount: 250,
  },
  {
    id: 2,
    date: '2024-05-09',
    customer: 'Karim Shop',
    supplier: 'Pineapple Co',
    product: 'Yellow Pineapple',
    quantity: 30,
    unitPrice: 200,
    totalAmount: 6000,
    paymentType: 'Partial',
    paymentAmount: 4000,
    customerPreviousDue: 2000,
    customerNewDue: 4000,
    commissionRate: 4,
    commissionAmount: 240,
  },
  {
    id: 3,
    date: '2024-05-09',
    customer: 'Cash Buyer',
    supplier: 'Mango Farm XYZ',
    product: 'Fazli Mango',
    quantity: 20,
    unitPrice: 80,
    totalAmount: 1600,
    paymentType: 'Cash',
    paymentAmount: 1600,
    customerPreviousDue: 0,
    customerNewDue: 0,
    commissionRate: 5,
    commissionAmount: 80,
  },
];

const DUMMY_BOX_INVENTORY = {
  totalBoxesOwned: 300,
  boxesInShop: 85,
  boxesWithSuppliers: 14,
  boxesWithCustomers: 201,
  boxesLostDamaged: 0,
  wooden: {
    total: 200,
    inShop: 50,
    withSuppliers: 8,
    withCustomers: 140,
    lost: 2,
  },
  plastic: {
    total: 100,
    inShop: 35,
    withSuppliers: 6,
    withCustomers: 61,
    lost: 0,
  },
};

const createDefaultState = () => ({
  suppliers: DUMMY_SUPPLIERS,
  customers: DUMMY_CUSTOMERS,
  transactions: DUMMY_TRANSACTIONS,
  supplierProducts: DUMMY_SUPPLIER_PRODUCTS,
  boxInventory: DUMMY_BOX_INVENTORY,
});

const loadInitialState = () => {
  if (typeof window === 'undefined') {
    return createDefaultState();
  }

  const rawState = window.localStorage.getItem(DATA_STORAGE_KEY);
  if (!rawState) {
    return createDefaultState();
  }

  try {
    return { ...createDefaultState(), ...JSON.parse(rawState) };
  } catch (error) {
    console.error('Failed to parse data state from localStorage:', error);
    return createDefaultState();
  }
};

export const DataProvider = ({ children }) => {
  const initialState = loadInitialState();
  const [suppliers, setSuppliers] = useState(initialState.suppliers);
  const [customers, setCustomers] = useState(initialState.customers);
  const [transactions, setTransactions] = useState(initialState.transactions);
  const [supplierProducts, setSupplierProducts] = useState(initialState.supplierProducts);
  const [boxInventory, setBoxInventory] = useState(initialState.boxInventory);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.localStorage.setItem(
      DATA_STORAGE_KEY,
      JSON.stringify({
        suppliers,
        customers,
        transactions,
        supplierProducts,
        boxInventory,
      }),
    );
  }, [suppliers, customers, transactions, supplierProducts, boxInventory]);

  const addSupplier = (supplierData) => {
    const newSupplier = {
      id: getNextId(suppliers),
      ...supplierData,
      commissionRate: Number(supplierData.commissionRate) || 5,
      totalSales: 0,
      totalCommissionEarned: 0,
      advancePaymentsMade: 0,
      amountDue: 0,
      lastSettlementDate: getDateOnly(),
      balance: 0,
      boxesHoldingWooden: 0,
      boxesHoldingPlastic: 0,
      totalBoxesHolding: 0,
    };
    setSuppliers((prev) => [...prev, newSupplier]);
    return newSupplier;
  };

  const addSupplierProduct = (productData) => {
    const supplierId = Number(productData.supplierId);
    const quantity = toPositiveNumber(productData.quantity);
    const unitPrice = toPositiveNumber(productData.unitPrice);
    const supplier = suppliers.find((item) => item.id === supplierId);

    if (!supplier) {
      throw new Error('Supplier not found.');
    }
    if (!productData.productName?.trim() || !productData.category?.trim()) {
      throw new Error('Please provide product name and category.');
    }
    if (!quantity || !unitPrice) {
      throw new Error('Please provide valid quantity and unit price.');
    }

    const productName = productData.productName.trim();
    const category = productData.category.trim();
    const unit = productData.unit || 'pcs';
    const existingProduct = supplierProducts.find(
      (product) =>
        product.supplierId === supplierId &&
        product.productName.trim().toLowerCase() === productName.toLowerCase() &&
        product.category.trim().toLowerCase() === category.toLowerCase() &&
        (product.unit || 'pcs') === unit,
    );

    const productAfterDelivery = existingProduct
      ? {
          ...existingProduct,
          quantity: roundMoney((Number(existingProduct.quantity) || 0) + quantity),
          unitPrice,
          totalValue: roundMoney(
            ((Number(existingProduct.quantity) || 0) + quantity) * unitPrice,
          ),
          dateReceived: getDateOnly(),
          status: 'in_stock',
        }
      : {
          id: getNextId(supplierProducts),
          ...productData,
          supplierId,
          productName,
          category,
          unit,
          quantity,
          unitPrice,
          totalValue: roundMoney(quantity * unitPrice),
          dateReceived: getDateOnly(),
          status: 'in_stock',
        };

    const deliveryValue = roundMoney(quantity * unitPrice);
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
      unitPrice,
      unit: productAfterDelivery.unit,
      totalAmount: deliveryValue,
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

  const addCustomer = (customerData) => {
    const newCustomer = {
      id: getNextId(customers),
      ...customerData,
      type: 'Permanent',
      totalPurchases: 0,
      totalPaid: 0,
      amountDue: 0,
      boxJamanot: roundMoney(Number(customerData.boxJamanot) || 0),
      boxesHoldingWooden: 0,
      boxesHoldingPlastic: 0,
      totalBoxesHolding: 0,
    };
    setCustomers((prev) => [...prev, newCustomer]);
    return newCustomer;
  };

  const recordSale = (saleData) => {
    const supplierId = Number(saleData.supplierId);
    const productId = Number(saleData.productId);
    const quantity = toPositiveNumber(saleData.quantity);
    const unitPrice = toPositiveNumber(saleData.unitPrice);
    const paymentAmount = roundMoney(Math.max(0, Number(saleData.paymentAmount) || 0));

    if (!supplierId || !productId || !quantity || !unitPrice) {
      throw new Error('Please provide valid supplier, product, quantity and unit price.');
    }

    const workingSuppliers = [...suppliers];
    const workingCustomers = [...customers];
    const workingProducts = [...supplierProducts];

    const supplierIndex = workingSuppliers.findIndex((supplier) => supplier.id === supplierId);
    if (supplierIndex === -1) {
      throw new Error('Supplier not found.');
    }

    const productIndex = workingProducts.findIndex(
      (product) => product.id === productId && product.supplierId === supplierId,
    );
    if (productIndex === -1) {
      throw new Error('Product not found for selected supplier.');
    }

    const product = workingProducts[productIndex];
    if (product.quantity < quantity) {
      throw new Error(
        `Insufficient stock for ${product.productName}. Available: ${product.quantity}, required: ${quantity}.`,
      );
    }

    let customerIndex = workingCustomers.findIndex(
      (customer) => customer.id === Number(saleData.customerId),
    );

    if (customerIndex === -1) {
      const name = saleData.customerName?.trim();
      const phone = saleData.customerPhone?.trim();
      if (!name || !phone) {
        throw new Error('Please provide one-time customer name and phone.');
      }

      const newCustomer = {
        id: getNextId(workingCustomers),
        name,
        owner: name,
        phone,
        address: saleData.customerAddress || '',
        type: 'Cash',
        totalPurchases: 0,
        totalPaid: 0,
        amountDue: 0,
        boxJamanot: 0,
        boxesHoldingWooden: 0,
        boxesHoldingPlastic: 0,
        totalBoxesHolding: 0,
      };
      workingCustomers.push(newCustomer);
      customerIndex = workingCustomers.length - 1;
    }

    const customer = workingCustomers[customerIndex];
    const supplier = workingSuppliers[supplierIndex];

    const totalAmount = roundMoney(quantity * unitPrice);
    const customerPreviousDue = roundMoney(customer.amountDue || 0);
    const totalOutstanding = roundMoney(customerPreviousDue + totalAmount);
    const customerNewDue = roundMoney(Math.max(totalOutstanding - paymentAmount, 0));

    let paymentType = 'Credit';
    if (paymentAmount > 0 && customerNewDue > 0) {
      paymentType = 'Partial';
    }
    if (customerNewDue === 0) {
      paymentType = 'Cash';
    }

    const commissionRate = Number(supplier.commissionRate) || 5;
    const commissionAmount = roundMoney(totalAmount * (commissionRate / 100));

    workingCustomers[customerIndex] = {
      ...customer,
      totalPurchases: roundMoney((customer.totalPurchases || 0) + totalAmount),
      totalPaid: roundMoney((customer.totalPaid || 0) + paymentAmount),
      amountDue: customerNewDue,
    };

    workingSuppliers[supplierIndex] = {
      ...supplier,
      totalSales: roundMoney((supplier.totalSales || 0) + totalAmount),
      totalCommissionEarned: roundMoney((supplier.totalCommissionEarned || 0) + commissionAmount),
      amountDue: roundMoney((supplier.amountDue || 0) + commissionAmount),
    };

    const remainingQuantity = roundMoney(product.quantity - quantity);
    workingProducts[productIndex] = {
      ...product,
      quantity: remainingQuantity,
      totalValue: roundMoney(remainingQuantity * Number(product.unitPrice || 0)),
      status: remainingQuantity > 0 ? 'in_stock' : 'sold_out',
    };

    const newTransaction = {
      id: getNextId(transactions),
      date: getDateOnly(),
      createdAt: new Date().toISOString(),
      transactionType: 'Sale',
      customer: workingCustomers[customerIndex].name,
      customerId: workingCustomers[customerIndex].id,
      supplier: supplier.name,
      supplierId: supplier.id,
      product: product.productName,
      productId: product.id,
      quantity,
      unitPrice,
      totalAmount,
      paymentType,
      paymentAmount,
      customerPreviousDue,
      customerNewDue,
      commissionRate,
      commissionAmount,
    };

    setCustomers(workingCustomers);
    setSuppliers(workingSuppliers);
    setSupplierProducts(workingProducts);
    setTransactions((prev) => [...prev, newTransaction]);

    return newTransaction;
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
      wooden: {
        ...prev.wooden,
        inShop: prev.wooden.inShop + appliedWooden,
        withCustomers: Math.max(prev.wooden.withCustomers - appliedWooden, 0),
      },
      plastic: {
        ...prev.plastic,
        inShop: prev.plastic.inShop + appliedPlastic,
        withCustomers: Math.max(prev.plastic.withCustomers - appliedPlastic, 0),
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
      wooden: {
        ...prev.wooden,
        inShop: prev.wooden.inShop + appliedWooden,
        withSuppliers: Math.max(prev.wooden.withSuppliers - appliedWooden, 0),
      },
      plastic: {
        ...prev.plastic,
        inShop: prev.plastic.inShop + appliedPlastic,
        withSuppliers: Math.max(prev.plastic.withSuppliers - appliedPlastic, 0),
      },
    }));

    return { wooden: appliedWooden, plastic: appliedPlastic };
  };

  const recordAccountTransaction = (transactionData) => {
    const partyType = transactionData.partyType === 'supplier' ? 'supplier' : 'customer';
    const paymentType = transactionData.paymentType === 'Due' ? 'Due' : 'Cash';
    const partyId = Number(transactionData.partyId);
    const inputAmount = roundMoney(Math.max(0, Number(transactionData.amount) || 0));
    const woodenReturn = Math.max(0, Math.floor(Number(transactionData.woodenReturn) || 0));
    const plasticReturn = Math.max(0, Math.floor(Number(transactionData.plasticReturn) || 0));
    const boxJamanotChange = roundMoney(Number(transactionData.boxJamanotChange) || 0);

    if (!partyId) {
      throw new Error('Please select a valid customer or supplier.');
    }
    if (!inputAmount && !woodenReturn && !plasticReturn && !boxJamanotChange) {
      throw new Error('Enter at least one update: cash/due amount, box return, or box jamanot.');
    }

    const workingCustomers = [...customers];
    const workingSuppliers = [...suppliers];
    const workingBoxInventory = {
      ...boxInventory,
      wooden: { ...boxInventory.wooden },
      plastic: { ...boxInventory.plastic },
    };

    let partyName;
    let appliedPayment = 0;
    let dueChange = 0;
    let appliedWooden = 0;
    let appliedPlastic = 0;
    let appliedJamanot = 0;

    if (partyType === 'customer') {
      const customerIndex = workingCustomers.findIndex((customer) => customer.id === partyId);
      if (customerIndex === -1) {
        throw new Error('Customer not found.');
      }

      const customer = { ...workingCustomers[customerIndex] };
      partyName = customer.name;

      if (paymentType === 'Cash' && inputAmount > 0) {
        appliedPayment = roundMoney(Math.min(inputAmount, customer.amountDue || 0));
        customer.amountDue = roundMoney(Math.max((customer.amountDue || 0) - appliedPayment, 0));
        customer.totalPaid = roundMoney((customer.totalPaid || 0) + appliedPayment);
      } else if (paymentType === 'Due' && inputAmount > 0) {
        dueChange = inputAmount;
        customer.amountDue = roundMoney((customer.amountDue || 0) + dueChange);
      }

      if (woodenReturn || plasticReturn) {
        appliedWooden = Math.min(woodenReturn, customer.boxesHoldingWooden || 0);
        appliedPlastic = Math.min(plasticReturn, customer.boxesHoldingPlastic || 0);

        customer.boxesHoldingWooden = Math.max(
          (customer.boxesHoldingWooden || 0) - appliedWooden,
          0,
        );
        customer.boxesHoldingPlastic = Math.max(
          (customer.boxesHoldingPlastic || 0) - appliedPlastic,
          0,
        );
        customer.totalBoxesHolding = Math.max(
          (customer.totalBoxesHolding || 0) - (appliedWooden + appliedPlastic),
          0,
        );

        workingBoxInventory.boxesInShop += appliedWooden + appliedPlastic;
        workingBoxInventory.boxesWithCustomers = Math.max(
          workingBoxInventory.boxesWithCustomers - (appliedWooden + appliedPlastic),
          0,
        );
        workingBoxInventory.wooden.inShop += appliedWooden;
        workingBoxInventory.wooden.withCustomers = Math.max(
          workingBoxInventory.wooden.withCustomers - appliedWooden,
          0,
        );
        workingBoxInventory.plastic.inShop += appliedPlastic;
        workingBoxInventory.plastic.withCustomers = Math.max(
          workingBoxInventory.plastic.withCustomers - appliedPlastic,
          0,
        );
      }

      if (boxJamanotChange) {
        const nextJamanot = roundMoney((customer.boxJamanot || 0) + boxJamanotChange);
        if (nextJamanot < 0) {
          throw new Error('Box jamanot cannot go below 0.');
        }
        customer.boxJamanot = nextJamanot;
        appliedJamanot = boxJamanotChange;
      }

      workingCustomers[customerIndex] = customer;
    } else {
      const supplierIndex = workingSuppliers.findIndex((supplier) => supplier.id === partyId);
      if (supplierIndex === -1) {
        throw new Error('Supplier not found.');
      }

      const supplier = { ...workingSuppliers[supplierIndex] };
      partyName = supplier.name;

      if (paymentType === 'Cash' && inputAmount > 0) {
        appliedPayment = roundMoney(Math.min(inputAmount, supplier.amountDue || 0));
        supplier.amountDue = roundMoney(Math.max((supplier.amountDue || 0) - appliedPayment, 0));
        supplier.advancePaymentsMade = roundMoney(
          (supplier.advancePaymentsMade || 0) + appliedPayment,
        );
        supplier.lastSettlementDate = getDateOnly();
      } else if (paymentType === 'Due' && inputAmount > 0) {
        dueChange = inputAmount;
        supplier.amountDue = roundMoney((supplier.amountDue || 0) + dueChange);
      }

      if (woodenReturn || plasticReturn) {
        appliedWooden = Math.min(woodenReturn, supplier.boxesHoldingWooden || 0);
        appliedPlastic = Math.min(plasticReturn, supplier.boxesHoldingPlastic || 0);

        supplier.boxesHoldingWooden = Math.max(
          (supplier.boxesHoldingWooden || 0) - appliedWooden,
          0,
        );
        supplier.boxesHoldingPlastic = Math.max(
          (supplier.boxesHoldingPlastic || 0) - appliedPlastic,
          0,
        );
        supplier.totalBoxesHolding = Math.max(
          (supplier.totalBoxesHolding || 0) - (appliedWooden + appliedPlastic),
          0,
        );

        workingBoxInventory.boxesInShop += appliedWooden + appliedPlastic;
        workingBoxInventory.boxesWithSuppliers = Math.max(
          workingBoxInventory.boxesWithSuppliers - (appliedWooden + appliedPlastic),
          0,
        );
        workingBoxInventory.wooden.inShop += appliedWooden;
        workingBoxInventory.wooden.withSuppliers = Math.max(
          workingBoxInventory.wooden.withSuppliers - appliedWooden,
          0,
        );
        workingBoxInventory.plastic.inShop += appliedPlastic;
        workingBoxInventory.plastic.withSuppliers = Math.max(
          workingBoxInventory.plastic.withSuppliers - appliedPlastic,
          0,
        );
      }

      workingSuppliers[supplierIndex] = supplier;
    }

    if (!appliedPayment && !dueChange && !appliedWooden && !appliedPlastic && !appliedJamanot) {
      throw new Error('No effective change applied. Check due amount or box holdings.');
    }

    const newTransaction = {
      id: getNextId(transactions),
      date: getDateOnly(),
      createdAt: new Date().toISOString(),
      transactionType: 'Payment',
      partyType: partyType === 'customer' ? 'Customer' : 'Supplier',
      partyName,
      partyId,
      paymentType,
      totalAmount: inputAmount,
      paymentAmount: appliedPayment,
      dueAmountChange: dueChange,
      customerNewDue: null,
      boxReturnWooden: appliedWooden,
      boxReturnPlastic: appliedPlastic,
      boxJamanotChange: appliedJamanot,
      note: transactionData.note?.trim() || '',
    };

    setCustomers(workingCustomers);
    setSuppliers(workingSuppliers);
    setBoxInventory(workingBoxInventory);
    setTransactions((prev) => [...prev, newTransaction]);

    return newTransaction;
  };

  const updateBoxInventory = (updates) => {
    setBoxInventory((prev) => ({ ...prev, ...updates }));
  };

  const addBoxes = (boxType, quantityInput) => {
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return;

    setBoxInventory((prev) => {
      if (boxType !== 'wooden' && boxType !== 'plastic') {
        return prev;
      }

      const updated = {
        ...prev,
        totalBoxesOwned: prev.totalBoxesOwned + quantity,
        boxesInShop: prev.boxesInShop + quantity,
        [boxType]: {
          ...prev[boxType],
          total: prev[boxType].total + quantity,
          inShop: prev[boxType].inShop + quantity,
        },
      };

      return updated;
    });
  };

  const markBoxesLost = (boxType, quantityInput) => {
    const quantity = Math.max(0, Math.floor(Number(quantityInput) || 0));
    if (!quantity) return 0;
    if (boxType !== 'wooden' && boxType !== 'plastic') return 0;

    let removed = 0;
    setBoxInventory((prev) => {
      const maxLoss = prev[boxType].inShop;
      removed = Math.min(quantity, maxLoss);
      if (!removed) return prev;

      return {
        ...prev,
        totalBoxesOwned: prev.totalBoxesOwned - removed,
        boxesInShop: prev.boxesInShop - removed,
        boxesLostDamaged: prev.boxesLostDamaged + removed,
        [boxType]: {
          ...prev[boxType],
          total: prev[boxType].total - removed,
          inShop: prev[boxType].inShop - removed,
          lost: prev[boxType].lost + removed,
        },
      };
    });
    return removed;
  };

  return (
    <DataContext.Provider
      value={{
        suppliers,
        customers,
        transactions,
        supplierProducts,
        boxInventory,
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
