-- ---------------------------------------------------------------------------
-- CBTrading — single-file schema (consolidates V1 + V3 + V4 + V5 + V6).
-- MySQL 8 / InnoDB. Run on an empty database.
--
-- If you intend to keep using Flyway afterwards, also baseline it so it
-- doesn't try to re-apply the migrations:
--   spring.flyway.baseline-on-migrate = true
--   spring.flyway.baseline-version    = 6
-- ---------------------------------------------------------------------------

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS      = 0;

-- =============================================================
-- Users / wholesalers / parties
-- =============================================================

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

-- V3 added `business_name`.
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `business_name` varchar(160) DEFAULT NULL,
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
  `version` bigint NOT NULL DEFAULT '0',
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

-- =============================================================
-- Product catalog
-- =============================================================

-- Product is just a name now. Unit is chosen per shipment / sale line.
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_name` (`name`),
  KEY `idx_products_status_name` (`status`,`name`)
) ENGINE=InnoDB;

-- Level-2: a variety under a product (e.g. Mango → Amrapali).
-- A variety can optionally "use lots" — if so, every sale/inventory row under it
-- carries a sub_category_id pointing to one of the system-fixed Lot1..LotN rows.
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `uses_lots` tinyint(1) NOT NULL DEFAULT '0',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_product_name` (`product_id`,`name`),
  KEY `idx_categories_product_status` (`product_id`,`status`),
  CONSTRAINT `fk_categories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Level-3: system-fixed enumeration shared across every variety that uses lots.
-- Seeded once at install with Lot1..Lot200. Admin never modifies these.
CREATE TABLE `sub_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sub_categories_name` (`name`),
  KEY `idx_sub_categories_sort` (`sort_order`)
) ENGINE=InnoDB;

-- =============================================================
-- Shipments (V4 added estimated_value/advance_paid/commission_rate/settlement_status,
-- V6 added the name column)
-- =============================================================

CREATE TABLE `supplier_deliveries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `name` varchar(120) DEFAULT NULL,
  `delivery_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `estimated_value` decimal(14,2) NOT NULL DEFAULT '0.00',
  `advance_paid` decimal(14,2) NOT NULL DEFAULT '0.00',
  `commission_rate` decimal(5,2) DEFAULT NULL,
  `settlement_status` enum('OPEN','SETTLED') NOT NULL DEFAULT 'OPEN',
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
  `sub_category_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` enum('PCS','KG','DOZEN','CRATE','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delivery_items_delivery` (`delivery_id`),
  KEY `idx_delivery_items_wholesaler_product` (`wholesaler_id`,`product_id`),
  KEY `idx_delivery_items_wholesaler_category` (`wholesaler_id`,`category_id`),
  KEY `idx_delivery_items_sub_category` (`sub_category_id`),
  CONSTRAINT `fk_delivery_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_delivery_items_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB;

-- Inventory is lot-scoped (delivery_id) AND lot-numbered (sub_category_id when the variety uses lots).
CREATE TABLE `inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `delivery_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `sub_category_id` bigint unsigned DEFAULT NULL,
  `quantity_on_hand` decimal(14,3) NOT NULL DEFAULT '0.000',
  `unit` enum('PCS','KG','DOZEN','CRATE','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `status` enum('ACTIVE','STOCK_OUT','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `version` bigint NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventory_item`
    (`wholesaler_id`,`wholesaler_supplier_id`,`delivery_id`,`product_id`,`category_id`,`sub_category_id`,`unit`),
  KEY `idx_inventory_wholesaler_status` (`wholesaler_id`,`status`),
  KEY `idx_inventory_supplier` (`wholesaler_supplier_id`),
  KEY `idx_inventory_delivery` (`delivery_id`),
  KEY `idx_inventory_product_category` (`product_id`,`category_id`),
  KEY `idx_inventory_sub_category` (`sub_category_id`),
  CONSTRAINT `fk_inventory_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
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

-- Partitioned monthly. FK constraints removed: MySQL InnoDB does NOT support FOREIGN
-- KEY on partitioned tables. Referential integrity is enforced by the service layer
-- (every insert uses an id loaded via its own repository in the same transaction).
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
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_stock_ledger_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`created_at`),
  KEY `idx_stock_ledger_category_date` (`wholesaler_id`,`category_id`,`created_at`),
  KEY `idx_stock_ledger_product_date` (`wholesaler_id`,`product_id`,`created_at`),
  CONSTRAINT `chk_stock_ledger_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION p202607 VALUES LESS THAN ('2026-08-01'),
  PARTITION p202608 VALUES LESS THAN ('2026-09-01'),
  PARTITION p202609 VALUES LESS THAN ('2026-10-01'),
  PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
  PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
  PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
  PARTITION p202701 VALUES LESS THAN ('2027-02-01'),
  PARTITION p202702 VALUES LESS THAN ('2027-03-01'),
  PARTITION p202703 VALUES LESS THAN ('2027-04-01'),
  PARTITION p202704 VALUES LESS THAN ('2027-05-01'),
  PARTITION p202705 VALUES LESS THAN ('2027-06-01'),
  PARTITION p202706 VALUES LESS THAN ('2027-07-01'),
  PARTITION p202707 VALUES LESS THAN ('2027-08-01'),
  PARTITION p202708 VALUES LESS THAN ('2027-09-01'),
  PARTITION p202709 VALUES LESS THAN ('2027-10-01'),
  PARTITION p202710 VALUES LESS THAN ('2027-11-01'),
  PARTITION p202711 VALUES LESS THAN ('2027-12-01'),
  PARTITION p202712 VALUES LESS THAN ('2028-01-01'),
  PARTITION p202801 VALUES LESS THAN ('2028-02-01'),
  PARTITION p202802 VALUES LESS THAN ('2028-03-01'),
  PARTITION p202803 VALUES LESS THAN ('2028-04-01'),
  PARTITION p202804 VALUES LESS THAN ('2028-05-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

-- =============================================================
-- Sales / Payments
-- =============================================================

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

-- V4: sale_items.delivery_id (each sold line is tagged with the lot).
CREATE TABLE `sale_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `delivery_id` bigint unsigned DEFAULT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned DEFAULT NULL,
  `sub_category_id` bigint unsigned DEFAULT NULL,
  `quantity` decimal(14,3) NOT NULL,
  -- Optional sale weight in kg. When NULL, the product is priced per pack
  -- (line_total = quantity * unit_price). When set, the product is priced per kg
  -- (line_total = sale_weight_kg * unit_price, where unit_price = per-kg rate).
  -- Inventory deduction always uses `quantity` (pack count).
  `sale_weight_kg` decimal(14,3) DEFAULT NULL,
  `unit` enum('PCS','KG','DOZEN','CRATE','BAG','MOUND') NOT NULL DEFAULT 'PCS',
  `unit_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `commission_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale` (`sale_id`),
  KEY `idx_sale_items_supplier` (`wholesaler_id`,`wholesaler_supplier_id`),
  KEY `idx_sale_items_delivery` (`delivery_id`),
  KEY `idx_sale_items_product` (`wholesaler_id`,`product_id`),
  KEY `idx_sale_items_category` (`wholesaler_id`,`category_id`),
  KEY `idx_sale_items_sub_category` (`sub_category_id`),
  CONSTRAINT `fk_sale_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_sub_category` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
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

CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_customer_id` bigint unsigned NOT NULL,
  `payment_type` enum('CASH_RECEIVE','CRATE_RETURN','CASH_AND_CRATE_RETURN') NOT NULL,
  `cash_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `boxes_returned` int NOT NULL DEFAULT '0',
  `jamanot_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_jamanot` decimal(14,2) NOT NULL DEFAULT '0.00',
  `jamanot_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER','NONE') NOT NULL DEFAULT 'CASH',
  `status` enum('POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
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
    (`payment_type` = 'CRATE_RETURN'           AND `cash_amount` = 0 AND `boxes_returned` > 0 AND `jamanot_amount` >= 0)
    OR
    (`payment_type` = 'CASH_AND_CRATE_RETURN'  AND `cash_amount` > 0 AND `boxes_returned` > 0 AND `jamanot_amount` >= 0)
  )
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION p202607 VALUES LESS THAN ('2026-08-01'),
  PARTITION p202608 VALUES LESS THAN ('2026-09-01'),
  PARTITION p202609 VALUES LESS THAN ('2026-10-01'),
  PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
  PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
  PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
  PARTITION p202701 VALUES LESS THAN ('2027-02-01'),
  PARTITION p202702 VALUES LESS THAN ('2027-03-01'),
  PARTITION p202703 VALUES LESS THAN ('2027-04-01'),
  PARTITION p202704 VALUES LESS THAN ('2027-05-01'),
  PARTITION p202705 VALUES LESS THAN ('2027-06-01'),
  PARTITION p202706 VALUES LESS THAN ('2027-07-01'),
  PARTITION p202707 VALUES LESS THAN ('2027-08-01'),
  PARTITION p202708 VALUES LESS THAN ('2027-09-01'),
  PARTITION p202709 VALUES LESS THAN ('2027-10-01'),
  PARTITION p202710 VALUES LESS THAN ('2027-11-01'),
  PARTITION p202711 VALUES LESS THAN ('2027-12-01'),
  PARTITION p202712 VALUES LESS THAN ('2028-01-01'),
  PARTITION p202801 VALUES LESS THAN ('2028-02-01'),
  PARTITION p202802 VALUES LESS THAN ('2028-03-01'),
  PARTITION p202803 VALUES LESS THAN ('2028-04-01'),
  PARTITION p202804 VALUES LESS THAN ('2028-05-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

-- =============================================================
-- Supplier settlements, expenses, balances
-- =============================================================

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
  `status` enum('POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
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

CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` varchar(120) NOT NULL,
  `kind` enum('SUPPLIER','SHOP','BOTH') NOT NULL DEFAULT 'BOTH',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_category_wh_name` (`wholesaler_id`,`name`),
  KEY `idx_expense_category_status` (`wholesaler_id`,`status`),
  KEY `idx_expense_category_kind` (`wholesaler_id`,`kind`),
  CONSTRAINT `fk_expense_categories_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- Shop overhead expenses (pure outflow — wholesaler bears these)
-- =============================================================
-- Examples: employee salary, guest hospitality, owner/employee lunch, rent,
-- utilities. Nobody reimburses. Reduces cash and profit. Distinct from
-- supplier_expenses which are recoverable from the supplier.
CREATE TABLE `shop_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER') NOT NULL DEFAULT 'CASH',
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `note` text,
  `status` enum('POSTED','CANCELLED') NOT NULL DEFAULT 'POSTED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_shop_expense_wh_date` (`wholesaler_id`,`expense_date`),
  KEY `idx_shop_expense_category` (`wholesaler_id`,`category_id`),
  CONSTRAINT `fk_shop_expenses_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_shop_expenses_category`
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_shop_expense_amount_positive` CHECK (`amount` > 0)
) ENGINE=InnoDB;

-- V5: supplier_expenses.delivery_id (attach an expense to a shipment).
CREATE TABLE `supplier_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `delivery_id` bigint unsigned DEFAULT NULL,
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
  KEY `idx_supplier_expenses_delivery` (`delivery_id`),
  CONSTRAINT `fk_supplier_expenses_category`
    FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_expenses_delivery`
    FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
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

-- =============================================================
-- Crates (boxes)
-- =============================================================

CREATE TABLE `box_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` varchar(80) NOT NULL,
  -- Wholesaler's purchase cost per crate. Used by P&L to value uncompensated losses.
  `purchase_price` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_types_wholesaler_name` (`wholesaler_id`,`name`),
  CONSTRAINT `chk_box_types_price_nonnegative` CHECK (`purchase_price` >= 0),
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
  -- Running weighted-average cost of crates currently in stock (in_hand + with_customers + with_suppliers).
  -- Recomputed on PURCHASE; consumed (no recompute) on SOLD/LOST/DAMAGED.
  `weighted_avg_cost` decimal(14,2) NOT NULL DEFAULT '0.00',
  `version` bigint NOT NULL DEFAULT '0',
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
  `version` bigint NOT NULL DEFAULT '0',
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

-- Partitioned monthly. FK constraints removed (see note on stock_ledger above).
CREATE TABLE `box_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER','WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned DEFAULT NULL,
  `movement_type` enum('PURCHASE','GIVEN_TO_CUSTOMER','RETURNED_FROM_CUSTOMER',
                       'GIVEN_TO_SUPPLIER','RETURNED_FROM_SUPPLIER',
                       'LOST','DAMAGED','SOLD','ADJUSTMENT') NOT NULL,
  `quantity` int NOT NULL,
  -- Per-batch cost snapshot at the moment of recording:
  --   PURCHASE   -> price paid for THIS batch
  --   LOST/DAMAGED -> weighted-average cost at the moment of loss (P&L value)
  --   SOLD       -> weighted-average cost basis for COGS calc (sale_price - this = profit)
  -- NULL on movement types where cost isn't tracked.
  `unit_cost_snapshot` decimal(14,2) DEFAULT NULL,
  -- SOLD only: sale price per crate. Net profit = quantity * (unit_sale_price - unit_cost_snapshot).
  `unit_sale_price` decimal(14,2) DEFAULT NULL,
  -- LOST/DAMAGED only: account_ledger.id of the receivable raised when a party
  -- was charged for the loss. NULL = wholesaler absorbed (counts as P&L expense).
  `compensation_account_ledger_id` bigint unsigned DEFAULT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_DELIVERY','MANUAL') NOT NULL DEFAULT 'MANUAL',
  `reference_id` bigint unsigned DEFAULT NULL,
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_box_ledger_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_box_ledger_party` (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_box_ledger_type_date` (`wholesaler_id`,`box_type_id`,`created_at`),
  KEY `idx_box_ledger_reference` (`reference_type`,`reference_id`),
  -- Fast P&L lookup: uncompensated losses in a period for one wholesaler.
  KEY `idx_box_ledger_loss_pnl` (`wholesaler_id`,`movement_type`,`compensation_account_ledger_id`,`created_at`),
  CONSTRAINT `chk_box_ledger_party` CHECK (
    (`party_type` = 'WHOLESALER' AND `party_account_id` IS NULL)
    OR
    (`party_type` IN ('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER')
      AND `party_account_id` IS NOT NULL)
  ),
  CONSTRAINT `chk_box_ledger_quantity_positive` CHECK (`quantity` > 0)
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION p202607 VALUES LESS THAN ('2026-08-01'),
  PARTITION p202608 VALUES LESS THAN ('2026-09-01'),
  PARTITION p202609 VALUES LESS THAN ('2026-10-01'),
  PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
  PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
  PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
  PARTITION p202701 VALUES LESS THAN ('2027-02-01'),
  PARTITION p202702 VALUES LESS THAN ('2027-03-01'),
  PARTITION p202703 VALUES LESS THAN ('2027-04-01'),
  PARTITION p202704 VALUES LESS THAN ('2027-05-01'),
  PARTITION p202705 VALUES LESS THAN ('2027-06-01'),
  PARTITION p202706 VALUES LESS THAN ('2027-07-01'),
  PARTITION p202707 VALUES LESS THAN ('2027-08-01'),
  PARTITION p202708 VALUES LESS THAN ('2027-09-01'),
  PARTITION p202709 VALUES LESS THAN ('2027-10-01'),
  PARTITION p202710 VALUES LESS THAN ('2027-11-01'),
  PARTITION p202711 VALUES LESS THAN ('2027-12-01'),
  PARTITION p202712 VALUES LESS THAN ('2028-01-01'),
  PARTITION p202801 VALUES LESS THAN ('2028-02-01'),
  PARTITION p202802 VALUES LESS THAN ('2028-03-01'),
  PARTITION p202803 VALUES LESS THAN ('2028-04-01'),
  PARTITION p202804 VALUES LESS THAN ('2028-05-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

-- =============================================================
-- Account ledger / balances / transactions log
-- =============================================================

CREATE TABLE `account_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `version` bigint NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_balance_party` (`wholesaler_id`,`party_type`,`party_account_id`),
  CONSTRAINT `fk_account_balances_wholesaler`
    FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Partitioned monthly. FK constraints removed (see note on stock_ledger above).
CREATE TABLE `account_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_COMMISSION','SUPPLIER_EXPENSE',
                        'SUPPLIER_SETTLEMENT','DUE_ADJUSTMENT','OPENING_DUE',
                        'CRATE_LOSS_COMPENSATION','CRATE_SALE') NOT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `debit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_account_ledger_wh_party_date`
    (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_account_ledger_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `chk_account_ledger_debit_credit` CHECK (
    (`debit`  > 0 AND `credit` = 0)
    OR
    (`credit` > 0 AND `debit`  = 0)
  )
) ENGINE=InnoDB
PARTITION BY RANGE COLUMNS(created_at) (
  PARTITION p202605 VALUES LESS THAN ('2026-06-01'),
  PARTITION p202606 VALUES LESS THAN ('2026-07-01'),
  PARTITION p202607 VALUES LESS THAN ('2026-08-01'),
  PARTITION p202608 VALUES LESS THAN ('2026-09-01'),
  PARTITION p202609 VALUES LESS THAN ('2026-10-01'),
  PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
  PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
  PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
  PARTITION p202701 VALUES LESS THAN ('2027-02-01'),
  PARTITION p202702 VALUES LESS THAN ('2027-03-01'),
  PARTITION p202703 VALUES LESS THAN ('2027-04-01'),
  PARTITION p202704 VALUES LESS THAN ('2027-05-01'),
  PARTITION p202705 VALUES LESS THAN ('2027-06-01'),
  PARTITION p202706 VALUES LESS THAN ('2027-07-01'),
  PARTITION p202707 VALUES LESS THAN ('2027-08-01'),
  PARTITION p202708 VALUES LESS THAN ('2027-09-01'),
  PARTITION p202709 VALUES LESS THAN ('2027-10-01'),
  PARTITION p202710 VALUES LESS THAN ('2027-11-01'),
  PARTITION p202711 VALUES LESS THAN ('2027-12-01'),
  PARTITION p202712 VALUES LESS THAN ('2028-01-01'),
  PARTITION p202801 VALUES LESS THAN ('2028-02-01'),
  PARTITION p202802 VALUES LESS THAN ('2028-03-01'),
  PARTITION p202803 VALUES LESS THAN ('2028-04-01'),
  PARTITION p202804 VALUES LESS THAN ('2028-05-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

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
  PARTITION p202607 VALUES LESS THAN ('2026-08-01'),
  PARTITION p202608 VALUES LESS THAN ('2026-09-01'),
  PARTITION p202609 VALUES LESS THAN ('2026-10-01'),
  PARTITION p202610 VALUES LESS THAN ('2026-11-01'),
  PARTITION p202611 VALUES LESS THAN ('2026-12-01'),
  PARTITION p202612 VALUES LESS THAN ('2027-01-01'),
  PARTITION p202701 VALUES LESS THAN ('2027-02-01'),
  PARTITION p202702 VALUES LESS THAN ('2027-03-01'),
  PARTITION p202703 VALUES LESS THAN ('2027-04-01'),
  PARTITION p202704 VALUES LESS THAN ('2027-05-01'),
  PARTITION p202705 VALUES LESS THAN ('2027-06-01'),
  PARTITION p202706 VALUES LESS THAN ('2027-07-01'),
  PARTITION p202707 VALUES LESS THAN ('2027-08-01'),
  PARTITION p202708 VALUES LESS THAN ('2027-09-01'),
  PARTITION p202709 VALUES LESS THAN ('2027-10-01'),
  PARTITION p202710 VALUES LESS THAN ('2027-11-01'),
  PARTITION p202711 VALUES LESS THAN ('2027-12-01'),
  PARTITION p202712 VALUES LESS THAN ('2028-01-01'),
  PARTITION p202801 VALUES LESS THAN ('2028-02-01'),
  PARTITION p202802 VALUES LESS THAN ('2028-03-01'),
  PARTITION p202803 VALUES LESS THAN ('2028-04-01'),
  PARTITION p202804 VALUES LESS THAN ('2028-05-01'),
  PARTITION pmax VALUES LESS THAN (MAXVALUE)
);

-- =============================================================
-- JPA id generator backing table (seeds for hi-lo / table generators)
-- =============================================================

CREATE TABLE `jpa_id_generators` (
  `sequence_name` varchar(255) NOT NULL,
  `next_val` bigint NOT NULL,
  PRIMARY KEY (`sequence_name`)
) ENGINE=InnoDB;

INSERT INTO `jpa_id_generators` (`sequence_name`, `next_val`) VALUES
  ('payments', 0),
  ('transactions', 0),
  ('box_ledger', 0),
  ('stock_ledger', 0),
  ('account_ledger', 0);

-- =============================================================
-- Seed Lot1..Lot200 (system-fixed Level-3 enumeration).
-- Generated via a recursive CTE so we don't have 200 inline values.
-- =============================================================
INSERT INTO `sub_categories` (`name`, `sort_order`)
WITH RECURSIVE lots(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM lots WHERE n < 200
)
SELECT CONCAT('Lot', n), n FROM lots;

SET UNIQUE_CHECKS      = 1;
SET FOREIGN_KEY_CHECKS = 1;
