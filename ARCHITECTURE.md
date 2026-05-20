# CBTrading Architecture

## Purpose

CBTrading is a wholesaler operating system for commission-based trading. The current product is a web portal where an admin creates wholesaler accounts, and each wholesaler manages their own suppliers, customers, stock, sales, payments, crate movement, and transaction history.

The system is intentionally wholesaler-scoped. Supplier and customer identities may be reused globally by phone, but all business data belongs to a specific wholesaler account.

## Current Applications

```text
Portal/      React + Vite wholesaler/admin UI
BkendRest/   Spring Boot REST API
MySQL 8      Primary transactional database
```

### Roles

```text
ADMIN
  Creates wholesaler users and wholesaler business profiles.
  Sees admin dashboard and wholesaler list.

WHOLESALER
  Uses the operating portal.
  Can only access data under their own wholesalers.id.
```

### Current Portal Scope

```text
Admin dashboard
  - admin info
  - wholesaler list
  - add wholesaler

Wholesaler dashboard
  - store inventory landing page
  - add supplier
  - add customer
  - receive supplier products into inventory
  - create sale
  - customer/supplier payment operations
  - crate dashboard
  - supplier profile
  - customer profile
  - transaction ledger and export
```

## Backend Shape

Controllers are grouped by business area and currently use POST endpoints consistently.

```text
AuthController
  /auth/login

AdminController
  /admin/wholesalers/list
  /admin/wholesalers/create

WholesalerController
  /wholesalers/{wholesalerId}/suppliers/list
  /wholesalers/{wholesalerId}/suppliers/create
  /wholesalers/{wholesalerId}/customers/list
  /wholesalers/{wholesalerId}/customers/create
  /wholesalers/{wholesalerId}/supplier-deliveries/create

ProductController
  /products/list

InventoryController
  /wholesalers/{wholesalerId}/inventory/list

SaleController
  /wholesalers/{wholesalerId}/sales/create

PaymentController
  /wholesalers/{wholesalerId}/payments/customer/settle
  /wholesalers/{wholesalerId}/payments/supplier/product-pay
  /wholesalers/{wholesalerId}/payments/supplier/commission-receive
  /wholesalers/{wholesalerId}/payments/supplier/expense-receive
  /wholesalers/{wholesalerId}/payments/supplier/crate-give
  /wholesalers/{wholesalerId}/payments/supplier/crate-return

BoxController
  /wholesalers/{wholesalerId}/boxes/dashboard
  /wholesalers/{wholesalerId}/boxes/purchase/create
  /wholesalers/{wholesalerId}/boxes/lost-damaged/create

TransactionController
  /wholesalers/{wholesalerId}/transactions/list
```

Service classes contain business rules. Repositories provide JPA access. Controllers should stay thin.

## Core Data Principles

```text
1. Every business row is scoped by wholesaler_id.
2. Supplier/customer phone is global identity, but account state is wholesaler-specific.
3. Link tables are the real business accounts:
   - wholesaler_suppliers
   - wholesaler_customers
4. Inventory belongs to a wholesaler and supplier account.
5. Sales are source records. Transaction rows are reporting/history rows.
6. Payments are source records for customer due/crate settlement.
7. Supplier settlements are source records for supplier money operations.
8. Box ledger is source history for crate movement.
9. Balance tables are current summaries for fast UI reads.
10. High-volume history tables should remain partition-friendly.
```

## Cardinality Overview

```text
users 1:0..1 wholesalers

wholesalers 1:N wholesaler_suppliers
suppliers 1:N wholesaler_suppliers

wholesalers 1:N wholesaler_customers
customers 1:N wholesaler_customers

products 1:N categories
products 1:N inventory
categories 1:N inventory

wholesalers 1:N supplier_deliveries
wholesaler_suppliers 1:N supplier_deliveries
supplier_deliveries 1:N supplier_delivery_items

wholesalers 1:N sales
wholesaler_customers 1:N sales (nullable for one-time customer sales)
sales 1:N sale_items
wholesaler_suppliers 1:N sale_items
products 1:N sale_items
categories 1:N sale_items

wholesalers 1:N payments
wholesaler_customers 1:N payments

wholesalers 1:N supplier_settlements
wholesaler_suppliers 1:N supplier_settlements

wholesalers 1:N box_types
box_types 1:1 box_inventory per wholesaler
box_types 1:N box_ledger
box_types 1:N box_balances

wholesalers 1:N transactions
sales 0..1:1 transactions
payments 0..1:1 transactions
```

## Current MySQL Schema Groups

### Identity And Access

```text
users
  id PK
  name
  email UK
  password_hash
  role ADMIN, WHOLESALER
  status ACTIVE, DISABLED
  created_at
  updated_at

wholesalers
  id PK
  user_id FK UK
  business_name
  phone UK
  address
  status
  created_at
  updated_at
```

### Supplier And Customer Accounts

```text
suppliers
  id PK
  name
  phone UK
  address
  status
  created_at
  updated_at

wholesaler_suppliers
  id PK
  wholesaler_id FK
  supplier_id FK
  commission_rate
  opening_due
  status
  created_at
  updated_at

customers
  id PK
  name
  owner_name
  phone UK
  address
  status
  created_at
  updated_at

wholesaler_customers
  id PK
  wholesaler_id FK
  customer_id FK
  opening_due
  jamanot_balance
  status
  created_at
  updated_at
```

### Product And Stock

Products are global catalog rows. Categories belong to products. A supplier delivery chooses an existing product and optional category, then inventory is created or increased under the wholesaler and supplier account.

```text
products
  id PK
  name UK
  default_unit
  unit_type
  status
  created_at
  updated_at

categories
  id PK
  product_id FK
  name
  grade
  status
  created_at
  updated_at

supplier_deliveries
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  delivery_date
  total_quantity
  note
  status
  created_at
  updated_at

supplier_delivery_items
  id PK
  wholesaler_id FK
  delivery_id FK
  product_id FK
  category_id FK nullable
  quantity
  unit
  note
  created_at

inventory
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  product_id FK
  category_id FK nullable
  quantity_on_hand
  unit
  status ACTIVE, STOCK_OUT, DISABLED
  created_at
  updated_at

stock_ledger
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  product_id FK
  category_id FK nullable
  reference_type
  reference_id
  direction IN, OUT
  quantity
  note
  created_at
```

### Sales

A permanent customer sale references `wholesaler_customers.id`. A one-time customer sale has no customer account and stores customer name/phone snapshot only.

Sale price is not stored on product or inventory because market price can change daily. The sale-time price is stored in `sale_items.unit_price`.

```text
sales
  id PK
  wholesaler_id FK
  wholesaler_customer_id FK nullable
  customer_name_snapshot
  customer_phone_snapshot
  customer_type PERMANENT, ONE_TIME
  sale_date
  sale_type PAY_INSTANT, PAY_LATER
  gross_amount
  discount_amount
  net_amount
  paid_amount
  due_amount
  boxes_given
  jamanot_amount
  note
  status POSTED, CANCELLED
  created_at
  updated_at

sale_items
  id PK
  wholesaler_id FK
  sale_id FK
  wholesaler_supplier_id FK
  product_id FK
  category_id FK nullable
  quantity
  unit
  unit_price
  line_total
  commission_rate
  commission_amount
  created_at
```

Sale rules:

```text
Permanent customer:
  - can pay full, partial, or full due
  - customer due balance increases by net_amount - paid_amount
  - if inventory unit is BOX, crate due and jamanot are updated

One-time customer:
  - must pay full sale amount immediately
  - no customer account is created
  - no crate/Jamanot transaction is allowed

Supplier accounting:
  - full sale amount is added to supplier payable even if the customer bought on due
  - commission is calculated from sale item line total and supplier commission rate
```

### Payment And Settlement

Customer payment source rows live in `payments`. Supplier money source rows live in `supplier_settlements`. Both create transaction history rows.

```text
payments
  id PK composite with created_at
  wholesaler_id FK
  wholesaler_customer_id FK
  payment_type CASH_RECEIVE, BOX_RETURN, CASH_AND_BOX_RETURN
  cash_amount
  boxes_returned
  jamanot_amount
  previous_due
  due_after_payment
  previous_jamanot
  jamanot_after_payment
  payment_method
  note
  created_at
```

```text
supplier_settlements
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  settlement_date
  settlement_type PRODUCT_PAYMENT, COMMISSION_RECEIVE, EXPENSE_RECEIVE, ADVANCE_PAYMENT, ADJUSTMENT
  amount
  previous_due
  due_after_settlement
  payment_method
  note
  created_at
  updated_at
```

Payment operation rules:

```text
Customer due receive:
  - decreases customer current due
  - writes payments, account_ledger, transactions

Customer crate return:
  - decreases customer crate due
  - increases wholesaler crate in_hand
  - can refund/settle jamanot, including zero jamanot
  - writes payments, box_ledger, transactions

Supplier product pay:
  - decreases supplier payable
  - writes supplier_settlements, account_ledger, transactions

Supplier commission receive:
  - records money received from supplier as commission
  - does not reduce product payable unless a future commission receivable balance is added

Supplier expense receive:
  - records money received from supplier for other costs such as labour/transport

Supplier crate give/return:
  - writes box_ledger and updates box balances/inventory
  - writes a zero-money transaction history row
```

### Crate Tracking

The business term in UI is crate. The database may still use `box_*` names. Current crate types are fixed for business use:

```text
Bangla
China
```

The wholesaler owns crates. Customers and suppliers only hold/borrow them.

```text
box_types
  id PK
  wholesaler_id FK
  name BANGLA, CHINA
  status
  created_at
  updated_at

box_inventory
  id PK
  wholesaler_id FK
  box_type_id FK
  total_owned
  in_hand
  with_customers
  with_suppliers
  lost_damaged
  updated_at

box_balances
  id PK
  wholesaler_id FK
  box_type_id FK
  party_type WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER
  party_account_id
  boxes_due
  updated_at

box_ledger
  id PK
  wholesaler_id FK
  box_type_id FK
  party_type
  party_account_id nullable
  movement_type PURCHASE, GIVEN_TO_CUSTOMER, RETURNED_FROM_CUSTOMER, GIVEN_TO_SUPPLIER, RETURNED_FROM_SUPPLIER, LOST, DAMAGED, ADJUSTMENT
  quantity
  reference_type SALE, PAYMENT, SUPPLIER_DELIVERY, MANUAL
  reference_id nullable
  note
  created_at
```

Crate formulas:

```text
total_owned = in_hand + with_customers + with_suppliers + lost_damaged
customer/supplier crate due = sum(box_balances.boxes_due by party account)
```

### Balances And Ledger

```text
account_balances
  id PK
  wholesaler_id FK
  party_type WHOLESALER_CUSTOMER, WHOLESALER_SUPPLIER
  party_account_id
  balance
  updated_at

account_ledger
  id PK
  wholesaler_id FK
  party_type
  party_account_id
  reference_type SALE, PAYMENT, SUPPLIER_COMMISSION, SUPPLIER_EXPENSE, SUPPLIER_SETTLEMENT, DUE_ADJUSTMENT, OPENING_DUE
  reference_id
  debit
  credit
  note
  created_at
```

Interpretation:

```text
Customer balance > 0 means customer owes wholesaler.
Supplier balance > 0 means wholesaler owes supplier.
```

### Transaction History

`transactions` is a unified reporting/history table. It is not the only source of truth. Details remain in `sales`, `payments`, `supplier_settlements`, `box_ledger`, and ledger tables.

```text
transactions
  id PK composite with created_at
  wholesaler_id FK
  transaction_type SALE, PAYMENT
  sale_id FK nullable
  payment_id FK nullable
  wholesaler_customer_id FK nullable
  wholesaler_supplier_id FK nullable
  sale_amount
  payment_amount
  due_amount
  description
  created_at
```

Query rules:

```text
Filter by wholesaler_id first.
Filter date ranges by created_at.
For customer/supplier phone search, join through wholesaler_customer/wholesaler_supplier accounts.
One-time customer sale phone comes from sales.customer_phone_snapshot.
```

## Current Read Models Used By Portal

The Portal expects list APIs to return already-computed current values:

```text
Supplier account list:
  currentDue
  totalSales
  totalCommissionEarned
  banglaCratesDue
  chinaCratesDue
  totalCratesDue

Customer account list:
  currentDue
  totalPurchases
  totalPaid
  jamanotBalance
  banglaCratesDue
  chinaCratesDue
  totalCratesDue

Transaction list:
  sale/payment id
  supplier/customer names and phones
  sale/payment/due amounts
  createdAt
```

## Operational Guarantees

All write operations that affect more than one table must be wrapped in a database transaction.

Examples:

```text
Sale create:
  sales
  sale_items
  inventory
  stock_ledger
  account_balances
  account_ledger
  box_inventory/box_balances/box_ledger when crate sale
  transactions

Customer settlement:
  payments
  account_balances/account_ledger when cash received
  box_inventory/box_balances/box_ledger when crates returned
  wholesaler_customers.jamanot_balance when jamanot changes
  transactions

Supplier product payment:
  supplier_settlements
  account_balances/account_ledger
  transactions
```

## Current Performance Notes

```text
Use indexes that start with wholesaler_id for tenant-scoped reads.
Keep transactions/payments partitioned by created_at for high volume.
Use account_balances and box_balances for dashboard/profile reads.
Use source tables and ledgers for audit/reconciliation.
Do not calculate current balances only from the frontend.
```

## Near-Term Gaps

```text
1. Add date-range transaction API for server-side filtering/export.
2. Add cancellation/reversal flows for sales and payments.
3. Add richer supplier expense source table workflow if expense categories are required.
4. Add authentication token/session hardening.
5. Add automated service tests for sale/payment/crate balance updates.

```
