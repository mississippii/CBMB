-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: CBM_Schema
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_balances`
--

DROP TABLE IF EXISTS `account_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_account_balance_party` (`wholesaler_id`,`party_type`,`party_account_id`),
  CONSTRAINT `fk_account_balances_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `account_ledger`
--

DROP TABLE IF EXISTS `account_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_COMMISSION','SUPPLIER_EXPENSE','SUPPLIER_SETTLEMENT','DUE_ADJUSTMENT','OPENING_DUE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` bigint unsigned DEFAULT NULL,
  `debit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `credit` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_account_ledger_wh_party_date` (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_account_ledger_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_account_ledger_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_account_ledger_debit_credit` CHECK ((((`debit` > 0) and (`credit` = 0)) or ((`credit` > 0) and (`debit` = 0))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `box_balances`
--

DROP TABLE IF EXISTS `box_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `box_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `party_account_id` bigint unsigned NOT NULL,
  `boxes_due` int NOT NULL DEFAULT '0',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_balances_party_type` (`wholesaler_id`,`party_type`,`party_account_id`,`box_type_id`),
  KEY `idx_box_balances_wholesaler_type` (`wholesaler_id`,`box_type_id`),
  KEY `fk_box_balances_type` (`box_type_id`),
  CONSTRAINT `fk_box_balances_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_balances_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_balances_due_nonnegative` CHECK ((`boxes_due` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `box_inventory`
--

DROP TABLE IF EXISTS `box_inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
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
  KEY `fk_box_inventory_type` (`box_type_id`),
  CONSTRAINT `fk_box_inventory_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_inventory_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_inventory_nonnegative` CHECK (((`total_owned` >= 0) and (`in_hand` >= 0) and (`with_customers` >= 0) and (`with_suppliers` >= 0) and (`lost_damaged` >= 0))),
  CONSTRAINT `chk_box_inventory_total` CHECK ((`total_owned` = (((`in_hand` + `with_customers`) + `with_suppliers`) + `lost_damaged`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `box_ledger`
--

DROP TABLE IF EXISTS `box_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `box_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `box_type_id` bigint unsigned NOT NULL,
  `party_type` enum('WHOLESALER','WHOLESALER_CUSTOMER','WHOLESALER_SUPPLIER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `party_account_id` bigint unsigned DEFAULT NULL,
  `movement_type` enum('PURCHASE','GIVEN_TO_CUSTOMER','RETURNED_FROM_CUSTOMER','GIVEN_TO_SUPPLIER','RETURNED_FROM_SUPPLIER','LOST','DAMAGED','ADJUSTMENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `reference_type` enum('SALE','PAYMENT','SUPPLIER_DELIVERY','MANUAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUAL',
  `reference_id` bigint unsigned DEFAULT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_box_ledger_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_box_ledger_party` (`wholesaler_id`,`party_type`,`party_account_id`,`created_at`),
  KEY `idx_box_ledger_type_date` (`wholesaler_id`,`box_type_id`,`created_at`),
  KEY `fk_box_ledger_type` (`box_type_id`),
  CONSTRAINT `fk_box_ledger_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_box_ledger_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_box_ledger_party` CHECK ((((`party_type` = _utf8mb4'WHOLESALER') and (`party_account_id` is null)) or ((`party_type` in (_utf8mb4'WHOLESALER_CUSTOMER',_utf8mb4'WHOLESALER_SUPPLIER')) and (`party_account_id` is not null)))),
  CONSTRAINT `chk_box_ledger_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `box_types`
--

DROP TABLE IF EXISTS `box_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `box_types` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` enum('BANGLA','CHINA') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','DISABLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_box_types_wholesaler_name` (`wholesaler_id`,`name`),
  CONSTRAINT `fk_box_types_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `product_id` bigint unsigned NOT NULL,
  `name` varchar(120) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade` varchar(80) COLLATE utf8mb4_bin NOT NULL DEFAULT '',
  `status` enum('ACTIVE','DISABLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_categories_product_name_grade` (`product_id`,`name`,`grade`),
  KEY `idx_categories_product_status` (`product_id`,`status`),
  CONSTRAINT `fk_categories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner_name` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expense_categories`
--

DROP TABLE IF EXISTS `expense_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `expense_categories` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_expense_category_wh_name` (`wholesaler_id`,`name`),
  KEY `idx_expense_category_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_expense_categories_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `inventory`
--

DROP TABLE IF EXISTS `inventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `quantity_on_hand` decimal(14,3) NOT NULL DEFAULT '0.000',
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
  `status` enum('ACTIVE','STOCK_OUT','DISABLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_inventory_item` (`wholesaler_id`,`wholesaler_supplier_id`,`product_id`,`category_id`,`unit`),
  KEY `idx_inventory_wholesaler_status` (`wholesaler_id`,`status`),
  KEY `idx_inventory_supplier` (`wholesaler_supplier_id`),
  KEY `idx_inventory_product_category` (`product_id`,`category_id`),
  KEY `fk_inventory_category` (`category_id`),
  CONSTRAINT `fk_inventory_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_inventory_wholesaler_supplier` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_inventory_quantity_nonnegative` CHECK ((`quantity_on_hand` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `other_due_balances`
--

DROP TABLE IF EXISTS `other_due_balances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `other_due_balances` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_other_due_supplier_category` (`wholesaler_id`,`wholesaler_supplier_id`,`category_id`),
  KEY `fk_other_due_ws` (`wholesaler_supplier_id`),
  KEY `fk_other_due_category` (`category_id`),
  CONSTRAINT `fk_other_due_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_other_due_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_other_due_ws` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_customer_id` bigint unsigned NOT NULL,
  `payment_type` enum('CASH_RECEIVE','BOX_RETURN','CASH_AND_BOX_RETURN') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `cash_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `boxes_returned` int NOT NULL DEFAULT '0',
  `jamanot_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_jamanot` decimal(14,2) NOT NULL DEFAULT '0.00',
  `jamanot_after_payment` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER','NONE') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_payments_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_payments_customer_date` (`wholesaler_id`,`wholesaler_customer_id`,`created_at`),
  KEY `idx_payments_type_date` (`wholesaler_id`,`payment_type`,`created_at`),
  CONSTRAINT `chk_payments_nonnegative` CHECK (((`cash_amount` >= 0) and (`boxes_returned` >= 0) and (`jamanot_amount` >= 0) and (`previous_due` >= 0) and (`due_after_payment` >= 0) and (`previous_jamanot` >= 0) and (`jamanot_after_payment` >= 0))),
  CONSTRAINT `chk_payments_type_values` CHECK ((((`payment_type` = _utf8mb4'CASH_RECEIVE') and (`cash_amount` > 0) and (`boxes_returned` = 0) and (`jamanot_amount` = 0)) or ((`payment_type` = _utf8mb4'BOX_RETURN') and (`cash_amount` = 0) and (`boxes_returned` > 0) and (`jamanot_amount` > 0)) or ((`payment_type` = _utf8mb4'CASH_AND_BOX_RETURN') and (`cash_amount` > 0) and (`boxes_returned` > 0) and (`jamanot_amount` > 0))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
/*!50500 PARTITION BY RANGE  COLUMNS(created_at)
(PARTITION p202605 VALUES LESS THAN ('2026-06-01') ENGINE = InnoDB,
 PARTITION p202606 VALUES LESS THAN ('2026-07-01') ENGINE = InnoDB,
 PARTITION pmax VALUES LESS THAN (MAXVALUE) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `name` varchar(160) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
  `status` enum('ACTIVE','DISABLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_supplier_name_unit` (`wholesaler_supplier_id`,`name`,`unit`),
  KEY `idx_products_wholesaler_status` (`wholesaler_id`,`status`),
  KEY `idx_products_supplier` (`wholesaler_supplier_id`),
  CONSTRAINT `fk_products_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_products_wholesaler_supplier` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sale_items`
--

DROP TABLE IF EXISTS `sale_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sale_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `sale_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
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
  KEY `fk_sale_items_wholesaler_supplier` (`wholesaler_supplier_id`),
  KEY `fk_sale_items_product` (`product_id`),
  KEY `fk_sale_items_category` (`category_id`),
  CONSTRAINT `fk_sale_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_wholesaler_supplier` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sale_items_amounts_nonnegative` CHECK (((`unit_price` >= 0) and (`line_total` >= 0) and (`commission_rate` >= 0) and (`commission_amount` >= 0))),
  CONSTRAINT `chk_sale_items_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_customer_id` bigint unsigned NOT NULL,
  `sale_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sale_type` enum('PAY_INSTANT','PAY_LATER') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gross_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `net_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `boxes_given` int NOT NULL DEFAULT '0',
  `jamanot_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('POSTED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POSTED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_wholesaler_date` (`wholesaler_id`,`sale_date`),
  KEY `idx_sales_customer_date` (`wholesaler_customer_id`,`sale_date`),
  CONSTRAINT `fk_sales_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_wholesaler_customer` FOREIGN KEY (`wholesaler_customer_id`) REFERENCES `wholesaler_customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sales_amounts_nonnegative` CHECK (((`gross_amount` >= 0) and (`discount_amount` >= 0) and (`net_amount` >= 0) and (`paid_amount` >= 0) and (`due_amount` >= 0) and (`boxes_given` >= 0) and (`jamanot_amount` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `stock_ledger`
--

DROP TABLE IF EXISTS `stock_ledger`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock_ledger` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `reference_type` enum('SUPPLIER_DELIVERY','SALE','ADJUSTMENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_id` bigint unsigned NOT NULL,
  `direction` enum('IN','OUT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_ledger_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`created_at`),
  KEY `idx_stock_ledger_category_date` (`wholesaler_id`,`category_id`,`created_at`),
  KEY `idx_stock_ledger_product_date` (`wholesaler_id`,`product_id`,`created_at`),
  KEY `fk_stock_ledger_ws` (`wholesaler_supplier_id`),
  KEY `fk_stock_ledger_product` (`product_id`),
  KEY `fk_stock_ledger_category` (`category_id`),
  CONSTRAINT `fk_stock_ledger_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_ledger_ws` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_ledger_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_deliveries`
--

DROP TABLE IF EXISTS `supplier_deliveries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_deliveries` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `delivery_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `total_quantity` decimal(14,3) NOT NULL DEFAULT '0.000',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` enum('POSTED','CANCELLED') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'POSTED',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_deliveries_wholesaler_date` (`wholesaler_id`,`delivery_date`),
  KEY `idx_supplier_deliveries_supplier_date` (`wholesaler_supplier_id`,`delivery_date`),
  CONSTRAINT `fk_supplier_deliveries_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_deliveries_wholesaler_supplier` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_supplier_deliveries_total_quantity_nonnegative` CHECK ((`total_quantity` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_delivery_items`
--

DROP TABLE IF EXISTS `supplier_delivery_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_delivery_items` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `delivery_id` bigint unsigned NOT NULL,
  `product_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `quantity` decimal(14,3) NOT NULL,
  `unit` enum('PCS','KG','DOZEN','BOX','BAG','MOUND') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PCS',
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_delivery_items_delivery` (`delivery_id`),
  KEY `idx_delivery_items_wholesaler_product` (`wholesaler_id`,`product_id`),
  KEY `idx_delivery_items_wholesaler_category` (`wholesaler_id`,`category_id`),
  KEY `fk_delivery_items_product` (`product_id`),
  KEY `fk_delivery_items_category` (`category_id`),
  CONSTRAINT `fk_delivery_items_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_delivery` FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_delivery_items_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_delivery_items_quantity_positive` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_expenses`
--

DROP TABLE IF EXISTS `supplier_expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_expenses` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `category_id` bigint unsigned NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `note` text COLLATE utf8mb4_unicode_ci,
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_expense_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`expense_date`),
  KEY `idx_supplier_expense_category_date` (`wholesaler_id`,`category_id`,`expense_date`),
  KEY `fk_supplier_expenses_ws` (`wholesaler_supplier_id`),
  KEY `fk_supplier_expenses_category` (`category_id`),
  CONSTRAINT `fk_supplier_expenses_category` FOREIGN KEY (`category_id`) REFERENCES `expense_categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_expenses_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_expenses_ws` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `supplier_settlements`
--

DROP TABLE IF EXISTS `supplier_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplier_settlements` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `wholesaler_supplier_id` bigint unsigned NOT NULL,
  `settlement_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `settlement_type` enum('COMMISSION_PAYOUT','EXPENSE_PAYOUT','ADVANCE_PAYMENT','ADJUSTMENT') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `previous_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_after_settlement` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `note` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_settlement_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`settlement_date`),
  KEY `fk_supplier_settlements_ws` (`wholesaler_supplier_id`),
  CONSTRAINT `fk_supplier_settlements_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_supplier_settlements_ws` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_suppliers_phone` (`phone`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `transaction_type` enum('SALE','PAYMENT') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `sale_id` bigint unsigned DEFAULT NULL,
  `payment_id` bigint unsigned DEFAULT NULL,
  `wholesaler_customer_id` bigint unsigned DEFAULT NULL,
  `wholesaler_supplier_id` bigint unsigned DEFAULT NULL,
  `sale_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `payment_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `due_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`,`created_at`),
  KEY `idx_transactions_wholesaler_date` (`wholesaler_id`,`created_at`),
  KEY `idx_transactions_type_date` (`wholesaler_id`,`transaction_type`,`created_at`),
  KEY `idx_transactions_customer_date` (`wholesaler_id`,`wholesaler_customer_id`,`created_at`),
  KEY `idx_transactions_supplier_date` (`wholesaler_id`,`wholesaler_supplier_id`,`created_at`),
  KEY `idx_transactions_sale` (`sale_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
/*!50500 PARTITION BY RANGE  COLUMNS(created_at)
(PARTITION p202605 VALUES LESS THAN ('2026-06-01') ENGINE = InnoDB,
 PARTITION p202606 VALUES LESS THAN ('2026-07-01') ENGINE = InnoDB,
 PARTITION pmax VALUES LESS THAN (MAXVALUE) ENGINE = InnoDB) */;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(190) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('ADMIN','WHOLESALER') COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role_status` (`role`,`status`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wholesaler_customers`
--

DROP TABLE IF EXISTS `wholesaler_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wholesaler_customers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `customer_id` bigint unsigned NOT NULL,
  `opening_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `jamanot_balance` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesaler_customer` (`wholesaler_id`,`customer_id`),
  KEY `idx_wc_customer` (`customer_id`),
  KEY `idx_wc_wholesaler_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_wc_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_wc_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wholesaler_suppliers`
--

DROP TABLE IF EXISTS `wholesaler_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wholesaler_suppliers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `wholesaler_id` bigint unsigned NOT NULL,
  `supplier_id` bigint unsigned NOT NULL,
  `commission_rate` decimal(5,2) NOT NULL DEFAULT '0.00',
  `opening_due` decimal(14,2) NOT NULL DEFAULT '0.00',
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesaler_supplier` (`wholesaler_id`,`supplier_id`),
  KEY `idx_ws_supplier` (`supplier_id`),
  KEY `idx_ws_wholesaler_status` (`wholesaler_id`,`status`),
  CONSTRAINT `fk_ws_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `wholesaler_suppliers_ibfk_1` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wholesalers`
--

DROP TABLE IF EXISTS `wholesalers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wholesalers` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `business_name` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `status` enum('ACTIVE','DISABLED') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_wholesalers_user_id` (`user_id`),
  UNIQUE KEY `uk_wholesalers_phone` (`phone`),
  CONSTRAINT `fk_wholesalers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-19  3:45:09
