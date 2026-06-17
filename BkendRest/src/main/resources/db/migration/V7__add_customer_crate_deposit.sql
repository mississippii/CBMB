-- Refundable crate deposit (security money) for PERMANENT customers.
-- Money taken when crates are borrowed and returned when crates come back; it is a
-- liability, never income — it does not touch product due or P&L.

-- Running balance of deposit money currently held for the customer.
ALTER TABLE `wholesaler_customers`
    ADD COLUMN `crate_deposit_held` decimal(14,2) NOT NULL DEFAULT 0 AFTER `opening_due`;

-- Audit trail + the source the Cash Book reads. amount > 0 = taken (cash in),
-- amount < 0 = refunded (cash out).
CREATE TABLE `crate_deposit_movements` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `wholesaler_id` bigint unsigned NOT NULL,
    `wholesaler_customer_id` bigint unsigned NOT NULL,
    `amount` decimal(14,2) NOT NULL,
    `movement_type` varchar(20) NOT NULL,
    `sale_id` bigint unsigned NULL,
    `payment_id` bigint unsigned NULL,
    `note` varchar(255) NULL,
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_cdm_wholesaler_date` (`wholesaler_id`, `created_at`),
    KEY `idx_cdm_customer` (`wholesaler_customer_id`),
    CONSTRAINT `fk_cdm_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`),
    CONSTRAINT `fk_cdm_customer` FOREIGN KEY (`wholesaler_customer_id`) REFERENCES `wholesaler_customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
