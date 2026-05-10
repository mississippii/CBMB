import React, { createContext, useState, useContext } from 'react';

const DataContext = createContext();

// Dummy initial data
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
    // Account details
    totalSales: 50000,
    totalCommissionEarned: 2500,
    advancePaymentsMade: 1000,
    amountDue: 1500,
    lastSettlementDate: '2024-05-08',
    balance: -1500, // Negative means they owe us
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
    // Account details
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
    paymentType: 'Credit',
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

export const DataProvider = ({ children }) => {
  const [suppliers, setSuppliers] = useState(DUMMY_SUPPLIERS);
  const [customers, setCustomers] = useState(DUMMY_CUSTOMERS);
  const [transactions, setTransactions] = useState(DUMMY_TRANSACTIONS);
  const [supplierProducts, setSupplierProducts] = useState(DUMMY_SUPPLIER_PRODUCTS);
  const [boxInventory, setBoxInventory] = useState(DUMMY_BOX_INVENTORY);

  const addSupplier = (supplierData) => {
    const newSupplier = {
      id: suppliers.length + 1,
      ...supplierData,
      totalSales: 0,
      totalCommissionEarned: 0,
      advancePaymentsMade: 0,
      amountDue: 0,
      lastSettlementDate: new Date().toISOString().split('T')[0],
      balance: 0,
      boxesHoldingWooden: 0,
      boxesHoldingPlastic: 0,
      totalBoxesHolding: 0,
    };
    setSuppliers([...suppliers, newSupplier]);
    return newSupplier;
  };

  const addSupplierProduct = (productData) => {
    const newProduct = {
      id: supplierProducts.length + 1,
      ...productData,
      dateReceived: new Date().toISOString().split('T')[0],
      status: 'in_stock',
    };
    setSupplierProducts([...supplierProducts, newProduct]);
    return newProduct;
  };

  const addCustomer = (customerData) => {
    const newCustomer = {
      id: customers.length + 1,
      ...customerData,
      totalPurchases: 0,
      totalPaid: 0,
      amountDue: 0,
      boxesHoldingWooden: 0,
      boxesHoldingPlastic: 0,
      totalBoxesHolding: 0,
    };
    setCustomers([...customers, newCustomer]);
    return newCustomer;
  };

  const addTransaction = (transactionData) => {
    const newTransaction = {
      id: transactions.length + 1,
      date: new Date().toISOString().split('T')[0],
      ...transactionData,
    };
    setTransactions([...transactions, newTransaction]);
    return newTransaction;
  };

  const updateBoxInventory = (updates) => {
    setBoxInventory({ ...boxInventory, ...updates });
  };

  const addBoxes = (boxType, quantity) => {
    const updated = { ...boxInventory };
    if (boxType === 'wooden') {
      updated.wooden.total += quantity;
      updated.wooden.inShop += quantity;
      updated.totalBoxesOwned += quantity;
      updated.boxesInShop += quantity;
    } else if (boxType === 'plastic') {
      updated.plastic.total += quantity;
      updated.plastic.inShop += quantity;
      updated.totalBoxesOwned += quantity;
      updated.boxesInShop += quantity;
    }
    setBoxInventory(updated);
  };

  const markBoxesLost = (boxType, quantity) => {
    const updated = { ...boxInventory };
    if (boxType === 'wooden') {
      updated.wooden.total -= quantity;
      updated.wooden.lost += quantity;
      updated.totalBoxesOwned -= quantity;
      updated.boxesLostDamaged += quantity;
    } else if (boxType === 'plastic') {
      updated.plastic.total -= quantity;
      updated.plastic.lost += quantity;
      updated.totalBoxesOwned -= quantity;
      updated.boxesLostDamaged += quantity;
    }
    setBoxInventory(updated);
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
        addTransaction,
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
