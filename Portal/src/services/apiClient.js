const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.0.177:8080';

const buildUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  return API_BASE_URL + normalizedPath;
};

export const postJson = async (path, body = undefined) => {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };

  if (body !== undefined) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path), options);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed.');
  }

  return payload;
};

export const apiPaths = {
  authLogin: '/auth/login',
  adminWholesalersList: '/admin/wholesalers/list',
  adminWholesalersCreate: '/admin/wholesalers/create',
  productsList: '/products/list',
  wholesalerSuppliersList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/list',
  wholesalerSuppliersCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/create',
  wholesalerCustomersList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/list',
  wholesalerCustomersCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/create',
  supplierDeliveriesCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/supplier-deliveries/create',
  inventoryList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/inventory/list',
  transactionsList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/transactions/list',
  salesCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/sales/create',
  boxesDashboard: (wholesalerId) => '/wholesalers/' + wholesalerId + '/boxes/dashboard',
  boxesPurchaseCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/boxes/purchase/create',
  boxesLostDamagedCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/boxes/lost-damaged/create',
  paymentsCustomerSettle: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/customer/settle',
  paymentsSupplierProductPay: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/product-pay',
  paymentsSupplierCommissionReceive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/commission-receive',
  paymentsSupplierExpenseReceive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/expense-receive',
  paymentsSupplierCrateGive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/crate-give',
  paymentsSupplierCrateReturn: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/crate-return',
};
