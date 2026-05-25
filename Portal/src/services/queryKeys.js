/**
 * Centralized cache keys for TanStack Query.
 *
 * Rules:
 *  - Every query has its key here so writes can invalidate confidently.
 *  - Most keys are parameterised by `wholesalerId` because every read is tenant-scoped.
 *  - Use the array form so partial-key invalidation works: invalidate `inventory.root(wid)`
 *    wipes all inventory variants for that wholesaler.
 */
export const queryKeys = {
  dashboardSummary: (wholesalerId, period, from, to) =>
    ['dashboardSummary', wholesalerId, period, from || null, to || null],

  inventory: {
    root: (wholesalerId) => ['inventory', wholesalerId],
    list: (wholesalerId) => ['inventory', wholesalerId, 'list'],
  },

  transactions: {
    root: (wholesalerId) => ['transactions', wholesalerId],
    list: (wholesalerId, from, to) => ['transactions', wholesalerId, from || null, to || null],
  },

  sales: {
    aggregate: (wholesalerId, filters) => ['salesAggregate', wholesalerId, filters],
  },

  shipments: {
    list: (wholesalerId) => ['shipments', wholesalerId, 'list'],
    bySupplier: (wholesalerId, supplierAccountId) => ['shipments', wholesalerId, 'by-supplier', supplierAccountId],
  },

  crates: {
    root: (wholesalerId) => ['crates', wholesalerId],
    dashboard: (wholesalerId) => ['crates', wholesalerId, 'dashboard'],
    lossStats: (wholesalerId, months) => ['crates', wholesalerId, 'loss-stats', months],
  },

  shopExpenses: {
    root: (wholesalerId) => ['shopExpenses', wholesalerId],
    list: (wholesalerId, from, to) => ['shopExpenses', wholesalerId, from || null, to || null],
    categories: (wholesalerId) => ['shopExpenses', wholesalerId, 'categories'],
  },

  expenses: {
    statement: (wholesalerId, supplierAccountId, period) => ['expenseStatement', wholesalerId, supplierAccountId, period],
  },

  parties: {
    suppliers: (wholesalerId, includeDisabled = false) => ['suppliers', wholesalerId, includeDisabled],
    customers: (wholesalerId, includeDisabled = false) => ['customers', wholesalerId, includeDisabled],
    customerProfile: (wholesalerId, accountId) => ['customerProfile', wholesalerId, accountId],
    supplierProfile: (wholesalerId, accountId) => ['supplierProfile', wholesalerId, accountId],
  },
};
