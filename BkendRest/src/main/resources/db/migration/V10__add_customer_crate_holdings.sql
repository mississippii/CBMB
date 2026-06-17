-- Leg 2 of the customer crate relationship: the CUSTOMER's own crates that the
-- wholesaler is currently holding (wholesaler owes them back). Pure liability —
-- not the wholesaler's crates, so it never touches box_inventory. Leg 1 (the
-- wholesaler's crates a customer holds) already lives in box_balances. The two
-- legs never net. Mirrors supplier_crate_holdings (V8).
CREATE TABLE `customer_crate_holdings` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `wholesaler_id` bigint unsigned NOT NULL,
    `wholesaler_customer_id` bigint unsigned NOT NULL,
    `box_type_id` bigint unsigned NOT NULL,
    `quantity` int NOT NULL DEFAULT 0,
    `version` bigint NOT NULL DEFAULT 0,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_cch_party_type` (`wholesaler_id`, `wholesaler_customer_id`, `box_type_id`),
    KEY `idx_cch_customer` (`wholesaler_customer_id`),
    CONSTRAINT `chk_cch_qty_nonneg` CHECK (`quantity` >= 0),
    CONSTRAINT `fk_cch_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`),
    CONSTRAINT `fk_cch_customer` FOREIGN KEY (`wholesaler_customer_id`) REFERENCES `wholesaler_customers` (`id`),
    CONSTRAINT `fk_cch_box_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- box_ledger.movement_type is a MySQL ENUM; add the two leg-2 customer movements.
ALTER TABLE `box_ledger`
    MODIFY COLUMN `movement_type` enum(
        'PURCHASE',
        'GIVEN_TO_CUSTOMER',
        'RETURNED_FROM_CUSTOMER',
        'RECEIVED_FROM_CUSTOMER',
        'RETURNED_TO_CUSTOMER',
        'GIVEN_TO_SUPPLIER',
        'RETURNED_FROM_SUPPLIER',
        'RECEIVED_FROM_SUPPLIER',
        'RETURNED_TO_SUPPLIER',
        'LOST',
        'DAMAGED',
        'SOLD',
        'ADJUSTMENT'
    ) NOT NULL;
