/**
 * Backend is bound to localhost only. Override at build time with
 * `VITE_API_BASE_URL=https://api.example.com` if you ever need to point elsewhere.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
  adminWholesalersSearch: '/admin/wholesalers/search',
  adminWholesalersCreate: '/admin/wholesalers/create',
  adminWholesalerResetPassword: (wholesalerId) => '/admin/wholesalers/' + wholesalerId + '/reset-password',
  adminProductsList: '/admin/products/list',
  adminProductsCreate: '/admin/products/create',
  adminCategoriesCreate: '/admin/categories/create',
  adminCategoriesUpdate: '/admin/categories/update',
  adminSubCategoriesList: '/admin/sub-categories/list',
  adminCrateTypesList: '/admin/crate-types/list',
  adminCrateTypesCreate: '/admin/crate-types/create',
  adminCrateTypesUpdate: '/admin/crate-types/update',
  productsList: '/products/list',
  crateTypesList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/types/catalog',
  wholesalerSuppliersList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/list',
  wholesalerSuppliersCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/create',
  wholesalerSuppliersProfile: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/profile',
  wholesalerSuppliersUpdate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/update',
  expenseCategories: (wholesalerId) => '/wholesalers/' + wholesalerId + '/expenses/categories',
  expenseCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/expenses/create',
  expenseList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/expenses/list',
  supplierStatement: (wholesalerId) => '/wholesalers/' + wholesalerId + '/expenses/statement',
  wholesalerSuppliersDisable: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/disable',
  wholesalerSuppliersEnable: (wholesalerId) => '/wholesalers/' + wholesalerId + '/suppliers/enable',
  wholesalerCustomersDisable: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/disable',
  wholesalerCustomersEnable: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/enable',
  wholesalerCustomersList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/list',
  wholesalerCustomersCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/create',
  wholesalerCustomersProfile: (wholesalerId) => '/wholesalers/' + wholesalerId + '/customers/profile',
  supplierDeliveriesCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/supplier-deliveries/create',
  supplierDeliveriesUpdate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/supplier-deliveries/update',
  supplierDeliveriesList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/supplier-deliveries/list',
  shipmentsBySupplier: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shipments/by-supplier',
  shipmentSetCommission: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shipments/set-commission',
  shipmentSettle: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shipments/settle',
  inventoryList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/inventory/list',
  inventoryWriteOff: (wholesalerId) => '/wholesalers/' + wholesalerId + '/inventory/write-off',
  transactionsList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/transactions/list',
  salesCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/sales/create',
  salesAggregate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/sales/aggregate',
  salesCancel: (wholesalerId, saleId) => '/wholesalers/' + wholesalerId + '/sales/' + saleId + '/cancel',
  dashboardSummary: (wholesalerId) => '/wholesalers/' + wholesalerId + '/dashboard/summary',
  paymentsCustomerCancel: (wholesalerId, paymentId) => '/wholesalers/' + wholesalerId + '/payments/customer/' + paymentId + '/cancel',
  paymentsSupplierCancel: (wholesalerId, settlementId) => '/wholesalers/' + wholesalerId + '/payments/supplier/' + settlementId + '/cancel',
  cratesDashboard: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/dashboard',
  cratesPurchaseCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/purchase/create',
  cratesLostDamagedCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/lost-damaged/create',
  cratesLossStats: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/loss-stats',
  cratesTypeSetPrice: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/types/set-price',
  cratesLossCompensate: (wholesalerId, boxLedgerId) => '/wholesalers/' + wholesalerId + '/crates/loss/' + boxLedgerId + '/compensate',
  cratesSell: (wholesalerId) => '/wholesalers/' + wholesalerId + '/crates/sell',
  reportsPnL: (wholesalerId) => '/wholesalers/' + wholesalerId + '/reports/pnl',
  paymentsCustomerSettle: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/customer/settle',
  paymentsCustomerCrateBorrow: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/customer/crate-borrow',
  paymentsSupplierProductPay: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/product-pay',
  paymentsSupplierCommissionReceive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/commission-receive',
  paymentsSupplierExpenseReceive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/expense-receive',
  paymentsSupplierCrateGive: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/crate-give',
  paymentsSupplierCrateReturn: (wholesalerId) => '/wholesalers/' + wholesalerId + '/payments/supplier/crate-return',
  shopExpenseCategories: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shop-expenses/categories',
  shopExpenseCreate: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shop-expenses/create',
  shopExpenseList: (wholesalerId) => '/wholesalers/' + wholesalerId + '/shop-expenses/list',
  shopExpenseCancel: (wholesalerId, expenseId) => '/wholesalers/' + wholesalerId + '/shop-expenses/' + expenseId + '/cancel',
  cashDaily: (wholesalerId) => '/wholesalers/' + wholesalerId + '/cash/daily',
  cashClose: (wholesalerId) => '/wholesalers/' + wholesalerId + '/cash/close',
  cashReopen: (wholesalerId) => '/wholesalers/' + wholesalerId + '/cash/reopen',
};
