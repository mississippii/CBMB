-- ---------------------------------------------------------------------------
-- Shipment-wise consignment accounting.
--
-- A shipment (supplier_deliveries row) becomes the unit of account:
--   * estimated_value  – estimated product price of the lot
--   * advance_paid      – product money paid to supplier up front (running total)
--   * commission_rate   – negotiated AFTER the sell, per shipment (nullable until set)
--   * settlement_status – OPEN until the lot is cleared
--
-- Inventory and sold lines are scoped to the shipment they belong to, so each
-- shipment's "total sold" and commission can be calculated independently.
-- ---------------------------------------------------------------------------

ALTER TABLE `supplier_deliveries`
  ADD COLUMN `estimated_value`   decimal(14,2) NOT NULL DEFAULT '0.00' AFTER `total_quantity`,
  ADD COLUMN `advance_paid`      decimal(14,2) NOT NULL DEFAULT '0.00' AFTER `estimated_value`,
  ADD COLUMN `commission_rate`   decimal(5,2)  DEFAULT NULL            AFTER `advance_paid`,
  ADD COLUMN `settlement_status` enum('OPEN','SETTLED') NOT NULL DEFAULT 'OPEN' AFTER `commission_rate`;

-- Lot-scope inventory to a shipment.
ALTER TABLE `inventory`
  ADD COLUMN `delivery_id` bigint unsigned DEFAULT NULL AFTER `wholesaler_supplier_id`,
  ADD KEY `idx_inventory_delivery` (`delivery_id`),
  ADD CONSTRAINT `fk_inventory_delivery`
    FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `inventory` DROP KEY `uk_inventory_item`;
ALTER TABLE `inventory`
  ADD UNIQUE KEY `uk_inventory_item`
    (`wholesaler_id`,`wholesaler_supplier_id`,`delivery_id`,`product_id`,`category_id`,`unit`);

-- Attribute each sold line to the shipment it draws from.
ALTER TABLE `sale_items`
  ADD COLUMN `delivery_id` bigint unsigned DEFAULT NULL AFTER `wholesaler_supplier_id`,
  ADD KEY `idx_sale_items_delivery` (`delivery_id`),
  ADD CONSTRAINT `fk_sale_items_delivery`
    FOREIGN KEY (`delivery_id`) REFERENCES `supplier_deliveries` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
