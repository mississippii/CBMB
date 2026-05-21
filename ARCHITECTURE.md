# CBTrading Architecture

This document is the **single source of truth** for the CBTrading data model and the business rules the backend must enforce. It contains both the design overview (pseudo‑schema) and the authoritative MySQL DDL for every table. `DatabaseSchema.sql` is generated from the live database and should match this document — when it does not, this document is the design intent and the DDL/code must be brought back in line.

## Purpose

CBTrading is a wholesaler operating system for commission‑based trading. The current product is a web portal where an admin creates wholesaler accounts, and each wholesaler manages their own suppliers, customers, stock, sales, payments, crate movement, supplier expenses, and transaction history.

The system is intentionally wholesaler‑scoped. Supplier and customer identities may be reused globally by phone, but all business data belongs to a specific wholesaler account.

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
  - supplier expense workflow (planned — entities exist, API not yet exposed)
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

ExpenseController (planned)
  /wholesalers/{wholesalerId}/expense-categories/list
  /wholesalers/{wholesalerId}/expense-categories/create
  /wholesalers/{wholesalerId}/supplier-expenses/create
  /wholesalers/{wholesalerId}/supplier-expenses/list
```

Service classes contain business rules. Repositories provide JPA access. Controllers should stay thin.

## Core Data Principles

```text
1.  Every business row is scoped by wholesaler_id.
2.  Supplier/customer phone is global identity, but account state is wholesaler-specific.
3.  Link tables are the real business accounts:
      - wholesaler_suppliers
      - wholesaler_customers
4.  Inventory belongs to a wholesaler and supplier account.
5.  Sales are source records. Transaction rows are reporting/history rows.
6.  Payments are source records for customer due/crate settlement.
7.  Supplier settlements are source records for supplier money operations.
8.  Supplier expenses are source records for non-product money owed to/from a supplier.
9.  Box ledger is source history for crate movement.
10. Balance tables are current summaries for fast UI reads.
11. High-volume history tables (payments, transactions) are partitioned by created_at.
12. Every row that changes a balance MUST also write a ledger row, AND every ledger
    row MUST set reference_id to the source row's id (sale_id, payment_id,
    settlement_id, expense_id, etc.). A balance change without a linked ledger row
    is a bug.
13. Every sale/payment/settlement/crate movement MUST also write a transactions row
    that links back to the source via sale_id, payment_id, or settlement_id.
    Crate-only movements still write a zero-money transactions row.
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

wholesalers 1:N expense_categories
expense_categories 1:N supplier_expenses
expense_categories 1:N other_due_balances
wholesaler_suppliers 1:N supplier_expenses
wholesaler_suppliers 1:N other_due_balances

wholesalers 1:N box_types
box_types 1:1 box_inventory per wholesaler
box_types 1:N box_ledger
box_types 1:N box_balances

wholesalers 1:N transactions
sales 0..1:1 transactions
payments 0..1:1 transactions
supplier_settlements 0..1:1 transactions
```

## Schema Reference

The sections below show, for each table:

1. A short pseudo‑schema describing intent.
2. The authoritative `CREATE TABLE` DDL (verbatim from `DatabaseSchema.sql`).

CHARSET/COLLATION boilerplate is `utf8mb4 / utf8mb4_unicode_ci` for every table and is elided from the DDL examples for readability — the live DDL keeps them.

### Identity And Access

```text
users
  id PK
  name
  email UK
  password_hash      -- BCrypt only; no plaintext fallback permitted
  role ADMIN | WHOLESALER
  status ACTIVE | DISABLED
  created_at, updated_at

wholesalers
  id PK
  user_id FK UK      -- one wholesaler row per WHOLESALER user
  business_name
  phone UK
  address
  status
  created_at, updated_at
```

```sql
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('ADMIN','WHOLESALER') NOT NULL,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role_status` (`role`,`status`)
) ENGINE=InnoDB;

CREATE TABLE `wholesalers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `business_name` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesalers_user_id` (`user_id`),
  UNIQUE KEY `uk_wholesalers_phone` (`phone`),
  CONSTRAINT `fk_wholesalers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### Supplier And Customer Accounts

```text
suppliers
  id PK
  name
  phone UK
  address
  status
  created_at, updated_at

wholesaler_suppliers
  id PK
  wholesaler_id FK
  supplier_id FK
  commission_rate   -- percent: decimal(5,2). 5.00 means 5%.
  opening_due
  status
  created_at, updated_at
  UNIQUE (wholesaler_id, supplier_id)

customers
  id PK
  name
  owner_name
  phone UK
  address
  status
  created_at, updated_at

wholesaler_customers
  id PK
  wholesaler_id FK
  customer_id FK
  opening_due
  jamanot_balance      -- denormalized; the source of truth is account_ledger entries
  status
  created_at, updated_at
  UNIQUE (wholesaler_id, customer_id)
```

```sql
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_suppliers_phone` (`phone`)
) ENGINE=InnoDB;

CREATE TABLE `wholesaler_suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `opening_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesaler_supplier` (`wholesaler_id`,`supplier_id`),
  KEY `idx_ws_supplier` (`supplier_id`),
  KEY `idx_ws_wholesaler_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_ws_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_ws_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `owner_name` varchar(150) DEFAULT NULL,
  `phone` varchar(30) NOT NULL,
  `address` text,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_phone` (`phone`)
) ENGINE=InnoDB;

CREATE TABLE `wholesaler_customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `opening_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `jamanot_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesaler_customer` (`wholesaler_id`,`customer_id`),
  KEY `idx_wc_customer` (`customer_id`),
  KEY `idx_wc_wholesaler_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_wc_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wc_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### Product And Stock

Products are global catalog rows. Categories belong to products. A supplier delivery chooses an existing product and optional category, then inventory is created or increased under the wholesaler and supplier account.

```text
products
  id PK
  name UK
  default_unit   -- PCS|KG|DOZEN|BOX|BAG|MOUND
  unit_type      -- COUNT|WEIGHT (default_unit must be consistent with this)
  status
  created_at, updated_at

categories
  id PK
  product_id FK
  name
  grade
  status
  created_at, updated_at
  UNIQUE (product_id, name, grade)

supplier_deliveries
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  delivery_date
  total_quantity
  note
  status POSTED | CANCELLED
  created_at, updated_at

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
  status ACTIVE | STOCK_OUT | DISABLED
  created_at, updated_at
  UNIQUE (wholesaler_id, wholesaler_supplier_id, product_id, category_id, unit)

stock_ledger
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  product_id FK
  category_id FK nullable
  reference_type SUPPLIER_DELIVERY | SALE | ADJUSTMENT
  reference_id      -- NOT NULL; always points to source row
  direction IN | OUT
  quantity
  note
  created_at
```

```sql
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `default_unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `unit_type` enum('COUNT','WEIGHT') NOT NULL DEFAULT 'COUNT',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_name` (`name`),
  KEY `idx_products_status_name` (`status`,`name`),
  CONSTRAINT `chk_products_unit_type` CHECK (
    (`unit_type` = 'WEIGHT' AND `default_unit` IN ('KG','MOUND'))
    OR
    (`unit_type` = 'COUNT' AND `default_unit` IN ('PCS','DOZEN','BOX','BAG'))
  )
) ENGINE=InnoDB;

CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `grade` varchar(80) NOT NULL DEFAULT '',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_product_name_grade` (`product_id`,`name`,`grade`),
  KEY `idx_categories_product_status` (`product_id`,`status`),
  CONSTRAINT `fk_categories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `supplier_deliveries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `delivery_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `note` text,
  `status` enum('POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_deliveries_wholesaler_date` (`wholesaler_id`,`delivery_date`),
  KEY `idx_supplier_deliveries_supplier_date` (`wholesaler_supplier_id`,`delivery_date`),
  CONSTRAINT `fk_supplier_deliveries_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_deliveries_wholesaler_supplier`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_supplier_deliveries_total_quantity_nonnegative`
    CHECK (`total_quantity` >= 0)
) ENGINE=InnoDB;

CREATE TABLE `supplier_delivery_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `delivery_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delivery_items_delivery` (`delivery_id`),
  KEY `idx_delivery_items_wholesaler_product` (`wholesaler_id`,`product_id`),
  KEY `idx_delivery_items_wholesaler_category` (`wholesaler_id`,`category_id`),
  CONSTRAINT `fk_delivery_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_delivery_items_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB;

CREATE TABLE `inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `quantity_on_hand` decimal(14,3) NOT NULL DEFAULT '0.000',
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `status` enum('ACTIVE','STOCK_OUT','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventory_item`
    (`wholesaler_id`,`wholesaler_supplier_id`,`product_id`,`category_id`,`unit`),
  KEY `idx_inventory_wholesaler_status` (`wholesaler_id`,`status`),
  KEY `idx_inventory_supplier` (`wholesaler_supplier_id`),
  KEY `idx_inventory_product_category` (`product_id`,`category_id`),
  CONSTRAINT `fk_inventory_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_wholesaler_supplier`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_quantity_nonnegative` CHECK (`quantity_on_hand` >= 0)
) ENGINE=InnoDB;

CREATE TABLE `stock_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `reference_type` enum('SUPPLIER_DELIVERY','SALE','ADJUSTMENT') NOT NULL,
  `reference_id` bigint unsigned NOT NULL,
  `direction` enum('IN','OUT') NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_ledger_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`created_at`),
  KEY `idx_stock_ledger_category_date` (`wholesaler_id`,`category_id`,`created_at`),
  KEY `idx_stock_ledger_product_date` (`wholesaler_id`,`product_id`,`created_at`),
  CONSTRAINT `fk_stock_ledger_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_ws` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_ledger_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB;
```

### Sales

A permanent customer sale references `wholesaler_customers.id`. A one‑time customer sale has no customer account and stores customer name/phone snapshot only.

Sale price is not stored on product or inventory because market price can change daily. The sale‑time price is stored in `sale_items.unit_price`.

```text
sales
  id PK
  wholesaler_id FK
  wholesaler_customer_id FK nullable
  customer_name_snapshot   -- required for ONE_TIME, ignored for PERMANENT
  customer_phone_snapshot
  customer_type PERMANENT | ONE_TIME   -- CHECK-enforced; backed by an enum at model layer
  sale_date
  sale_type PAY_INSTANT | PAY_LATER
  gross_amount, discount_amount, net_amount
  paid_amount, due_amount
  boxes_given
  jamanot_amount
  note
  status POSTED | CANCELLED
  created_at, updated_at

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
  commission_rate     -- percent value at time of sale, copied from wholesaler_suppliers
  commission_amount   -- = ROUND(line_total * commission_rate / 100, 2)
  created_at
```

**Sale rules (MUST):**

```text
Permanent customer:
  - may pay full, partial, or 0 of net_amount
  - customer due (account_balances) increases by (net_amount - paid_amount)
  - paid_amount MUST NOT exceed net_amount; settling prior due requires a
    separate /payments/customer/settle call so the source row lives in `payments`
  - if any sale_items.unit = BOX, crate due and jamanot are updated and
    box_ledger/box_inventory/box_balances are touched
  - jamanot mutations MUST also write an account_ledger row (reference_type=SALE)
    so the change is auditable from the ledger alone

One-time customer:
  - paid_amount MUST equal net_amount (no due)
  - wholesaler_customer_id MUST be NULL
  - customer_name_snapshot is required, customer_phone_snapshot is recommended
  - crate fields (boxes_given, jamanot_amount) MUST be 0; the request is rejected
    if a one-time sale carries crate data

Supplier accounting:
  - full sale amount (sum of sale_items.line_total) is added to supplier payable
    (account_balances party=WHOLESALER_SUPPLIER) even if the customer bought on due
  - one account_ledger row per supplier appearing on the sale (sum of that
    supplier's lines), reference_type=SALE, reference_id=sales.id
  - commission is computed per sale_items line and stored on the line; supplier
    commission_rate is snapshotted onto sale_items.commission_rate at write time
    so later rate changes don't rewrite history
```

```sql
CREATE TABLE `sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_customer_id` bigint unsigned DEFAULT NULL,
  `sale_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sale_type` enum('PAY_INSTANT','PAY_LATER') NOT NULL,
  `gross_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `boxes_given` int NOT NULL DEFAULT '0',
  `jamanot_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text,
  `status` enum('POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `customer_name_snapshot` varchar(160) DEFAULT NULL,
  `customer_phone_snapshot` varchar(30) DEFAULT NULL,
  `customer_type` varchar(20) NOT NULL DEFAULT 'PERMANENT',
  PRIMARY KEY (`id`),
  KEY `idx_sales_wholesaler_date` (`wholesaler_id`,`sale_date`),
  KEY `idx_sales_customer_date` (`wholesaler_customer_id`,`sale_date`),
  KEY `idx_sales_wh_customer_date` (`wholesaler_id`,`wholesaler_customer_id`,`sale_date`),
  KEY `idx_sales_customer_phone` (`wholesaler_id`,`customer_phone_snapshot`,`sale_date`),
  CONSTRAINT `fk_sales_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_wholesaler_customer`
    FOREIGN KEY (`wholesaler_customer_id`) REFERENCES `wholesaler_customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sales_amounts_nonnegative` CHECK (
    `gross_amount` >= 0 AND `discount_amount` >= 0 AND `net_amount` >= 0
    AND `paid_amount` >= 0 AND `due_amount` >= 0
    AND `boxes_given` >= 0 AND `jamanot_amount` >= 0
  ),
  CONSTRAINT `chk_sales_customer_type` CHECK (`customer_type` IN ('PERMANENT','ONE_TIME'))
) ENGINE=InnoDB;

CREATE TABLE `sale_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `unit_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `commission_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_supplier` (`wholesaler_id`,`wholesaler_supplier_id`),
  KEY `idx_sale_items_product` (`wholesaler_id`,`product_id`),
  KEY `idx_sale_items_category` (`wholesaler_id`,`category_id`),
  CONSTRAINT `fk_sale_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_wholesaler_supplier`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sale_items_amounts_nonnegative` CHECK (
    `unit_price` >= 0 AND `line_total` >= 0
    AND `commission_rate` >= 0 AND `commission_amount` >= 0
  ),
  CONSTRAINT `chk_sale_items_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB;
```

### Payment And Settlement

Customer payment source rows live in `payments`. Supplier money source rows live in `supplier_settlements`. Supplier non‑product money owed to/from the supplier lives in `supplier_expenses` (see next section). Every source row in this section MUST also create:

- one or more `account_ledger` rows with `reference_id` set to the source row's id,
- exactly one `transactions` row that joins back via `payment_id` or `settlement_id`.

```text
payments
  id, created_at  -> COMPOSITE PK (partitioned by created_at, MONTHLY)
  wholesaler_id FK
  wholesaler_customer_id FK
  payment_type CASH_RECEIVE | BOX_RETURN | CASH_AND_BOX_RETURN
  cash_amount
  boxes_returned
  jamanot_amount
  previous_due, due_after_payment           -- snapshot on the payment row
  previous_jamanot, jamanot_after_payment
  payment_method CASH | BANK | BKASH | NAGAD | OTHER | NONE
  note
  created_at

supplier_settlements
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  settlement_date
  settlement_type PRODUCT_PAYMENT | COMMISSION_RECEIVE | EXPENSE_RECEIVE
                | ADVANCE_PAYMENT | ADJUSTMENT
  amount        -- always > 0
  previous_due, due_after_settlement   -- only meaningful for PRODUCT_PAYMENT/ADVANCE/ADJUSTMENT
  payment_method CASH | BANK | BKASH | NAGAD | OTHER   -- note: NONE NOT permitted here
  note
  created_at, updated_at
```

**Payment operation rules (MUST):**

```text
Customer due receive (CASH_RECEIVE / CASH_AND_BOX_RETURN cash leg):
  - decreases customer current due (account_balances)
  - writes one payments row
  - writes one account_ledger row (reference_type=PAYMENT, reference_id=payment.id)
  - writes one transactions row (transaction_type=PAYMENT, payment_id=payment.id)

Customer crate return (BOX_RETURN / CASH_AND_BOX_RETURN crate leg):
  - decreases customer crate due (box_balances)
  - increases wholesaler crate in_hand (box_inventory)
  - decreases box_inventory.with_customers by the same amount
  - may settle/refund jamanot; jamanot delta MUST also write an account_ledger row
  - writes box_ledger row (movement_type=RETURNED_FROM_CUSTOMER, reference_type=PAYMENT,
    reference_id=payment.id)
  - writes one transactions row even if cash_amount = 0

Supplier product pay (settlement_type=PRODUCT_PAYMENT):
  - decreases supplier payable (account_balances)
  - writes supplier_settlements row
  - writes one account_ledger row (reference_type=SUPPLIER_SETTLEMENT,
    reference_id=settlement.id)
  - writes one transactions row (transaction_type=PAYMENT, settlement_id=settlement.id)

Supplier commission receive (settlement_type=COMMISSION_RECEIVE):
  - records money received from supplier as commission
  - does NOT reduce product payable
  - writes one account_ledger row (reference_type=SUPPLIER_COMMISSION,
    reference_id=settlement.id) so the receipt is auditable
  - writes one transactions row

Supplier expense receive (settlement_type=EXPENSE_RECEIVE):
  - records money received from supplier for other costs such as labour/transport
  - decreases supplier_expenses.due_amount and increases paid_amount for the matched
    supplier_expenses row (if the settlement targets a specific expense), OR is
    booked against other_due_balances for the (supplier, expense_category) pair
  - writes one account_ledger row (reference_type=SUPPLIER_EXPENSE,
    reference_id=settlement.id)
  - writes one transactions row

Supplier crate give/return:
  - writes box_ledger and updates box_inventory/box_balances
  - writes a zero-money transactions row (transaction_type=PAYMENT,
    sale_amount=0, payment_amount=0, due_amount=0); leaves payment_id and
    settlement_id NULL and instead populates description plus
    wholesaler_supplier_id so the row is identifiable
```

```sql
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_customer_id` bigint unsigned NOT NULL,
  `payment_type` enum('CASH_RECEIVE','BOX_RETURN','CASH_AND_BOX_RETURN') NOT NULL,
  `cash_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `boxes_returned` int NOT NULL DEFAULT '0',
  `jamanot_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_jamanot` decimal(14,2) NOT NULL DEFAULT '0.00',
  `jamanot_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER','NONE') NOT NULL DEFAULT 'CASH',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_payments_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_payments_customer_date` (`wholesaler_id`,`wholesaler_customer_id`,`created_at`),
  KEY `idx_payments_type_date` (`wholesaler_id`,`payment_type`,`created_at`),
  CONSTRAINT `chk_payments_nonnegative` CHECK (
    `cash_amount` >= 0 AND `boxes_returned` >= 0 AND `jamanot_amount` >= 0
    AND `previous_due` >= 0 AND `due_after_payment` >= 0
    AND `previous_jamanot` >= 0 AND `jamanot_after_payment` >= 0
  ),
  CONSTRAINT `chk_payments_type_values` CHECK (
    (`payment_type` = 'CASH_RECEIVE'         AND `cash_amount` > 0 AND `boxes_returned` = 0 AND `jamanot_amount` = 0)
    OR
    (`payment_type` = 'BOX_RETURN'           AND `cash_amount` = 0 AND `boxes_returned` > 0 AND `jamanot_amount` >= 0)
    OR
    (`payment_type` = 'CASH_AND_BOX_RETURN'  AND `cash_amount` > 0 AND `boxes_returned` > 0 AND `jamanot_amount` >= 0)
  )
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION pmax    VALUES LESS THAN (MAXVALUE)
);

CREATE TABLE `supplier_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `settlement_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settlement_type` enum('PRODUCT_PAYMENT','COMMISSION_RECEIVE','EXPENSE_RECEIVE',
                        'ADVANCE_PAYMENT','ADJUSTMENT') NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_after_settlement` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER') NOT NULL DEFAULT 'CASH',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_settlement_supplier_date`
    (`wholesaler_id`,`wholesaler_supplier_id`,`settlement_date`),
  CONSTRAINT `fk_supplier_settlements_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_settlements_ws`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_supplier_settlements_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB;
```

> **PaymentMethod enum divergence (by design).**
> `payments.payment_method` allows `NONE` (e.g. a pure crate return with no cash).
> `supplier_settlements.payment_method` does NOT allow `NONE` because supplier
> settlements always involve money. The Java model layer keeps the union as a
> single `PaymentMethod` enum for convenience but the service layer MUST reject
> `NONE` before writing a `supplier_settlements` row.

### Supplier Expenses (non‑product money)

Captures money the wholesaler owes a supplier for non‑product costs (labour, transport, etc.) and tracks payments against those expenses. `expense_categories` is the per‑wholesaler catalog; `supplier_expenses` are the source rows; `other_due_balances` is the rollup used by Supplier Profile reads.

```text
expense_categories
  id PK
  wholesaler_id FK
  name           -- e.g. Labour, Transport
  status
  created_at, updated_at
  UNIQUE (wholesaler_id, name)

supplier_expenses
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  category_id FK -> expense_categories.id
  amount         -- total expense incurred
  paid_amount    -- amount paid so far (<= amount, CHECK enforced)
  due_amount     -- outstanding
  note
  expense_date
  created_at, updated_at

other_due_balances
  id PK
  wholesaler_id FK
  wholesaler_supplier_id FK
  category_id FK -> expense_categories.id
  due_amount     -- rollup over supplier_expenses for fast supplier-profile reads
  updated_at
  UNIQUE (wholesaler_id, wholesaler_supplier_id, category_id)
```

**Expense rules (MUST):**

```text
Add supplier expense (POST /supplier-expenses/create):
  - writes a supplier_expenses row with paid_amount=0, due_amount=amount
  - increments other_due_balances.due_amount for that (supplier, category)
  - writes one account_ledger row (reference_type=SUPPLIER_EXPENSE,
    reference_id=supplier_expenses.id, party_type=WHOLESALER_SUPPLIER, debit=amount)
  - writes one transactions row (transaction_type=PAYMENT, payment_amount=0,
    sale_amount=0, due_amount=amount; settlement_id NULL, sale_id NULL,
    wholesaler_supplier_id set, description references the expense)

Settle supplier expense (via /payments/supplier/expense-receive or its inverse):
  - flows through supplier_settlements with settlement_type=EXPENSE_RECEIVE
    (money received from supplier) or PRODUCT_PAYMENT-like flow for paying out
  - applies amount to one or more supplier_expenses (FIFO by expense_date unless
    a specific expense id is targeted)
  - decreases other_due_balances accordingly
```

```sql
CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_category_wh_name` (`wholesaler_id`,`name`),
  KEY `idx_expense_category_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_expense_categories_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `supplier_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text,
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_expense_supplier_date`
    (`wholesaler_id`,`wholesaler_supplier_id`,`expense_date`),
  KEY `idx_supplier_expense_category_date`
    (`wholesaler_id`,`category_id`,`expense_date`),
  CONSTRAINT `fk_supplier_expenses_category`
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_expenses_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_expenses_ws`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_supplier_expenses_amounts` CHECK (
    `amount` >= 0 AND `paid_amount` >= 0 AND `due_amount` >= 0
    AND `paid_amount` <= `amount`
  )
) ENGINE=InnoDB;

CREATE TABLE `other_due_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_other_due_supplier_category`
    (`wholesaler_id`,`wholesaler_supplier_id`,`category_id`),
  CONSTRAINT `fk_other_due_category`
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_other_due_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_other_due_ws`
    FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;
```

### Crate Tracking

The business term in UI is **crate**. The database uses `box_*` names. Current crate types are seeded per wholesaler:

```text
Bangla
China
```

The wholesaler owns crates. Customers and suppliers only hold/borrow them.

```text
box_types
  id PK
  wholesaler_id FK
  name              -- BANGLA, CHINA
  status
  created_at, updated_at
  UNIQUE (wholesaler_id, name)

box_inventory
  id PK
  wholesaler_id FK
  box_type_id FK
  total_owned        -- = in_hand + with_customers + with_suppliers + lost_damaged
                     --   (CHECK constraint enforces this at the DB)
  in_hand
  with_customers
  with_suppliers
  lost_damaged
  updated_at
  UNIQUE (wholesaler_id, box_type_id)

box_balances
  id PK
  wholesaler_id FK
  box_type_id FK
  party_type WHOLESALER_CUSTOMER | WHOLESALER_SUPPLIER
  party_account_id      -- wholesaler_customers.id OR wholesaler_suppliers.id
  boxes_due
  updated_at
  UNIQUE (wholesaler_id, party_type, party_account_id, box_type_id)

box_ledger
  id PK
  wholesaler_id FK
  box_type_id FK
  party_type WHOLESALER | WHOLESALER_CUSTOMER | WHOLESALER_SUPPLIER
  party_account_id nullable   -- NULL only when party_type=WHOLESALER (purchase/lost)
  movement_type PURCHASE | GIVEN_TO_CUSTOMER | RETURNED_FROM_CUSTOMER
              | GIVEN_TO_SUPPLIER | RETURNED_FROM_SUPPLIER
              | LOST | DAMAGED | ADJUSTMENT
  quantity            -- > 0; direction is implied by movement_type
  reference_type SALE | PAYMENT | SUPPLIER_DELIVERY | MANUAL
  reference_id nullable
  note
  created_at
```

**Crate formulas:**

```text
total_owned = in_hand + with_customers + with_suppliers + lost_damaged
   -- enforced by box_inventory CHECK constraint

customer crate due  = sum(box_balances.boxes_due WHERE party_type=WHOLESALER_CUSTOMER, party_account_id=wc.id)
supplier crate due  = sum(box_balances.boxes_due WHERE party_type=WHOLESALER_SUPPLIER, party_account_id=ws.id)
```

**Crate operation rules (MUST):**

```text
- A crate movement MUST never silently clamp counts to zero. If the count would
  go negative, reject the request — the data is inconsistent and clamping would
  break total_owned = in_hand + with_customers + with_suppliers + lost_damaged.
- Every crate movement writes exactly one box_ledger row.
- Purchases and lost/damaged events MUST also write a transactions row
  (zero-money, sale_amount=0, payment_amount=0, due_amount=0, description set).
- Crate dashboard's totalOwned read MUST equal in_hand + with_customers
  + with_suppliers + lost_damaged. Computing totalOwned without lost_damaged
  is a bug.
```

```sql
CREATE TABLE `box_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_types_wholesaler_name` (`wholesaler_id`,`name`),
  CONSTRAINT `fk_box_types_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `box_inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `total_owned` int NOT NULL DEFAULT '0',
  `in_hand` int NOT NULL DEFAULT '0',
  `with_customers` int NOT NULL DEFAULT '0',
  `with_suppliers` int NOT NULL DEFAULT '0',
  `lost_damaged` int NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_inventory_wholesaler_type` (`wholesaler_id`,`box_type_id`),
  CONSTRAINT `fk_box_inventory_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_inventory_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_inventory_nonnegative` CHECK (
    `total_owned` >= 0 AND `in_hand` >= 0 AND `with_customers` >= 0
    AND `with_suppliers` >= 0 AND `lost_damaged` >= 0
  ),
  CONSTRAINT `chk_box_inventory_total` CHECK (
    `total_owned` = (`in_hand` + `with_customers` + `with_suppliers` + `lost_damaged`)
  )
) ENGINE=InnoDB;

CREATE TABLE `box_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `boxes_due` int NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_balances_party_type`
    (`wholesaler_id`,`party_type`,`party_account_id`,`box_type_id`),
  KEY `idx_box_balances_wholesaler_type` (`wholesaler_id`,`box_type_id`),
  CONSTRAINT `fk_box_balances_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_balances_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_balances_due_nonnegative` CHECK (`boxes_due` >= 0)
) ENGINE=InnoDB;

CREATE TABLE `box_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER','WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned DEFAULT NULL,
  `movement_type` enum('PURCHASE','GIVEN_TO_CUSTOMER','RETURNED_FROM_CUSTOMER',
                       'GIVEN_TO_SUPPLIER','RETURNED_FROM_SUPPLIER',
                       'LOST','DAMAGED','ADJUSTMENT') NOT NULL,
  `quantity` int NOT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_DELIVERY','MANUAL') NOT NULL DEFAULT 'MANUAL',
  `reference_id` bigint unsigned DEFAULT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_box_ledger_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_box_ledger_party` (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_box_ledger_type_date` (`wholesaler_id`,`box_type_id`,`created_at`),
  CONSTRAINT `fk_box_ledger_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_ledger_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_ledger_party` CHECK (
    (`party_type` = 'WHOLESALER' AND `party_account_id` IS NULL)
    OR
    (`party_type` IN ('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER')
      AND `party_account_id` IS NOT NULL)
  ),
  CONSTRAINT `chk_box_ledger_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB;
```

### Balances And Ledger

```text
account_balances
  id PK
  wholesaler_id FK
  party_type WHOLESALER_CUSTOMER | WHOLESALER_SUPPLIER
  party_account_id          -- wholesaler_customers.id OR wholesaler_suppliers.id
  balance                   -- signed semantics: see below
  updated_at
  UNIQUE (wholesaler_id, party_type, party_account_id)

account_ledger
  id PK
  wholesaler_id FK
  party_type
  party_account_id
  reference_type SALE | PAYMENT | SUPPLIER_COMMISSION | SUPPLIER_EXPENSE
              | SUPPLIER_SETTLEMENT | DUE_ADJUSTMENT | OPENING_DUE
  reference_id              -- MUST be set whenever the source row id is known
  debit                     -- mutually exclusive with credit (CHECK enforced)
  credit
  note
  created_at
```

**Sign conventions:**

```text
For party_type = WHOLESALER_CUSTOMER:
  balance > 0  =>  customer owes wholesaler money
  debit on a customer row  -> increases customer due
  credit on a customer row -> decreases customer due

For party_type = WHOLESALER_SUPPLIER:
  balance > 0  =>  wholesaler owes supplier money (supplier payable)
  debit on a supplier row  -> wholesaler pays supplier / reduces payable
  credit on a supplier row -> sale or expense increases payable
```

**Ledger rules (MUST):**

```text
- Every change to account_balances.balance MUST be accompanied by an
  account_ledger row whose (debit - credit) equals the delta.
- Every account_ledger row MUST set reference_id to the source row's id
  unless reference_type = OPENING_DUE (a virtual seed row).
- Jamanot mutations (sales and customer crate returns that touch
  wholesaler_customers.jamanot_balance) MUST write a ledger row so the change
  is visible from the ledger alone.
- The first balance change for a customer/supplier whose account_balances row
  does not yet exist MUST first materialize the opening balance with a single
  OPENING_DUE ledger row before applying the new movement.
```

```sql
CREATE TABLE `account_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_balance_party` (`wholesaler_id`,`party_type`,`party_account_id`),
  CONSTRAINT `fk_account_balances_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE `account_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_COMMISSION','SUPPLIER_EXPENSE',
                        'SUPPLIER_SETTLEMENT','DUE_ADJUSTMENT','OPENING_DUE') NOT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `debit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_ledger_wh_party_date`
    (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_account_ledger_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_account_ledger_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_account_ledger_debit_credit` CHECK (
    (`debit`  > 0 AND `credit` = 0)
    OR
    (`credit` > 0 AND `debit`  = 0)
  )
) ENGINE=InnoDB;
```

### Transaction History

`transactions` is a unified reporting/history table. It is not the only source of truth. Details remain in `sales`, `payments`, `supplier_settlements`, `supplier_expenses`, `box_ledger`, and ledger tables.

```text
transactions
  id, created_at  -> COMPOSITE PK (partitioned by created_at, MONTHLY)
  wholesaler_id FK
  transaction_type SALE | PAYMENT
  sale_id FK nullable
  payment_id FK nullable
  wholesaler_customer_id FK nullable
  wholesaler_supplier_id FK nullable
  sale_amount
  payment_amount
  due_amount      -- semantics: the per-row movement amount, NOT a running balance
  description
  created_at
```

**Transaction rules (MUST):**

```text
- Every row in sales, payments, and supplier_settlements MUST produce exactly
  one matching transactions row in the same DB transaction.
- For SALE rows:                   sale_id set,        payment_id NULL
- For customer PAYMENT rows:        payment_id set,     sale_id NULL
- For supplier_settlements rows:    settlement_id (via dedicated FK column once added),
                                   sale_id NULL, payment_id NULL.
- For supplier crate-only events:   all of sale_id/payment_id NULL, but
                                   wholesaler_supplier_id MUST be set so the row
                                   can be filtered to its supplier; sale_amount,
                                   payment_amount, due_amount are 0; description is required.
- transactions.due_amount stores the per-event delta, not a running balance.
  Running balance reads must aggregate from account_balances / account_ledger.

Query rules:
- Filter by wholesaler_id first.
- Filter date ranges by created_at.
- For customer/supplier phone search, join through wholesaler_customer /
  wholesaler_supplier accounts.
- One-time customer sale phone comes from sales.customer_phone_snapshot.
```

> **Schema TODO.** `transactions` currently has no `settlement_id` column; the
> service layer joins back to `supplier_settlements` via `wholesaler_supplier_id`
> + `created_at` heuristics. Adding `settlement_id bigint unsigned DEFAULT NULL`
> (plus index) is in the Near‑Term Gaps list.

```sql
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `transaction_type` enum('SALE','PAYMENT') NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `payment_id` bigint unsigned DEFAULT NULL,
  `wholesaler_customer_id` bigint unsigned DEFAULT NULL,
  `wholesaler_supplier_id` bigint unsigned DEFAULT NULL,
  `sale_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `description` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_transactions_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_transactions_type_date` (`wholesaler_id`,`transaction_type`,`created_at`),
  KEY `idx_transactions_customer_date` (`wholesaler_id`,`wholesaler_customer_id`,`created_at`),
  KEY `idx_transactions_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`created_at`),
  KEY `idx_transactions_sale` (`sale_id`),
  KEY `idx_transactions_payment` (`payment_id`)
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION pmax    VALUES LESS THAN (MAXVALUE)
);
```

### Infrastructure

```text
jpa_id_generators
  sequence_name PK
  next_val
```

Hibernate `@TableGenerator` backing for entities whose primary key is part of a composite key (`payments`, `transactions`) — `IDENTITY` strategy cannot be combined with composite IDs on partitioned tables, so a table generator is used instead.

```sql
CREATE TABLE `jpa_id_generators` (
  `sequence_name` varchar(255) NOT NULL,
  `next_val` bigint NOT NULL,
  PRIMARY KEY (`sequence_name`)
) ENGINE=InnoDB;
```

## Current Read Models Used By Portal

The Portal expects list APIs to return already‑computed current values:

```text
Supplier account list:
  currentDue
  totalSales
  totalCommissionEarned
  banglaCratesDue
  chinaCratesDue
  totalCratesDue
  otherDue                -- sum(other_due_balances.due_amount) for this supplier

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

All write operations that affect more than one table MUST be wrapped in a single database transaction (`@Transactional` at the service method). If any step fails, the whole operation rolls back.

```text
Sale create:
  sales
  sale_items (one row per supplier line)
  inventory (decrement, with optimistic/pessimistic locking)
  stock_ledger
  account_balances (customer due + supplier payable, one row per affected party)
  account_ledger (one row per affected party + extra row for jamanot delta)
  box_inventory + box_balances + box_ledger (when any line.unit = BOX)
  wholesaler_customers.jamanot_balance (when jamanot involved)
  transactions

Customer settlement (/payments/customer/settle):
  payments
  account_balances + account_ledger (when cash received)
  box_inventory + box_balances + box_ledger (when crates returned)
  wholesaler_customers.jamanot_balance + account_ledger (when jamanot changes)
  transactions

Supplier product payment:
  supplier_settlements
  account_balances + account_ledger
  transactions

Supplier expense create:
  supplier_expenses
  other_due_balances
  account_ledger
  transactions

Supplier crate give/return:
  box_inventory + box_balances + box_ledger
  transactions (zero-money row)

Crate purchase / lost-damaged:
  box_inventory + box_ledger
  transactions (zero-money row)
```

## Security Guarantees

```text
- Every endpoint except /auth/login MUST be authenticated.
- Authenticated principal carries { userId, role, wholesalerId }
  (wholesalerId null for ADMIN).
- /admin/** requires role = ADMIN.
- /wholesalers/{wholesalerId}/** requires role = WHOLESALER AND
  principal.wholesalerId == {wholesalerId} from the path. Mismatch -> 403.
- Repository finders that take an entity id (sale, payment, inventory, etc.)
  MUST use a scoped variant such as findByIdAndWholesaler_Id; unscoped
  JpaRepository findById may only be used when the wholesaler is the natural
  top of the lookup.
- Password storage is BCrypt only. No plaintext fallback.
- DB credentials and Actuator endpoints MUST NOT be exposed in committed config.
```

## Performance Notes

```text
Use indexes that start with wholesaler_id for tenant-scoped reads.
payments and transactions are partitioned by created_at (monthly) - keep
  partition maintenance jobs running (add next month's partition before pmax fills).
Use account_balances, box_balances, box_inventory, and other_due_balances
  for dashboard/profile reads.
Use source tables and ledgers for audit/reconciliation.
Do not calculate current balances only from the frontend.
Inventory.quantity_on_hand and wholesaler_customers.jamanot_balance are
  high-contention hot rows. Service code MUST use optimistic locking (@Version)
  or SELECT ... FOR UPDATE when decrementing, to prevent lost updates under
  concurrent sale/payment writes.
```

## Near-Term Gaps

```text
1.  Wire up Spring Security: real authentication filter, role-based access,
    /wholesalers/{wholesalerId}/** ownership check from the principal.
2.  Issue a signed token (JWT) from /auth/login; client must present it on
    every subsequent request.
3.  Remove the plaintext-password fallback in AuthService.
4.  Restrict @CrossOrigin to the Portal origin(s); secure Actuator.
5.  Move application.yaml secrets to environment variables.
6.  Multi-line sale support in CreateSaleRequest and SaleService (the schema
    already supports 1:N sale_items; only the request and service loop need it).
7.  Enforce paid_amount <= net_amount on create-sale; settle prior due
    through /payments/customer/settle so a payment source row exists.
8.  Add settlement_id column to transactions and backfill; until then,
    join supplier_settlements to transactions by (wholesaler_supplier_id, created_at).
9.  Wire ExpenseController endpoints; today expense_categories, supplier_expenses,
    and other_due_balances exist as entities but have no controller.
10. Sale/payment cancellation/reversal flows (status -> CANCELLED with full
    reversing ledger entries; never delete history rows).
11. Date-range transaction API for server-side filtering/export.
12. Automated service tests for sale/payment/crate balance updates and
    end-of-day invariants (sum of ledger == account_balances).
13. Partition maintenance job for payments and transactions; add pmax-1
    monthly partition automatically.
14. Optimistic locking (@Version) on inventory and wholesaler_customers;
    pessimistic SELECT ... FOR UPDATE on box_inventory rows.
```
