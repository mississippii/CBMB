-- Leg 2 of the supplier crate relationship: the SUPPLIER's crates that the
-- wholesaler is currently holding (wholesaler owes them back). This is a pure
-- liability — these crates are NOT the wholesaler's, so they never touch
-- box_inventory. Leg 1 (the wholesaler's crates a supplier holds) already lives
-- in box_balances and is unchanged. The two legs never net.
CREATE TABLE `supplier_crate_holdings` (
    `id` bigint unsigned NOT NULL AUTO_INCREMENT,
    `wholesaler_id` bigint unsigned NOT NULL,
    `wholesaler_supplier_id` bigint unsigned NOT NULL,
    `box_type_id` bigint unsigned NOT NULL,
    `quantity` int NOT NULL DEFAULT 0,
    `version` bigint NOT NULL DEFAULT 0,
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_sch_party_type` (`wholesaler_id`, `wholesaler_supplier_id`, `box_type_id`),
    KEY `idx_sch_supplier` (`wholesaler_supplier_id`),
    CONSTRAINT `chk_sch_qty_nonneg` CHECK (`quantity` >= 0),
    CONSTRAINT `fk_sch_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`),
    CONSTRAINT `fk_sch_supplier` FOREIGN KEY (`wholesaler_supplier_id`) REFERENCES `wholesaler_suppliers` (`id`),
    CONSTRAINT `fk_sch_box_type` FOREIGN KEY (`box_type_id`) REFERENCES `box_types` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
