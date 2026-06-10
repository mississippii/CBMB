-- Day-end cash drawer reconciliation.
-- Stores only the opening float, the physically counted cash and the close
-- decision per business day; all debit/credit movements are derived live from
-- sales, payments, supplier settlements and shop expenses.
CREATE TABLE `cash_reconciliations` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `wholesaler_id` BIGINT UNSIGNED NOT NULL,
  `business_date` DATE          NOT NULL,
  `opening_cash`  DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  `counted_cash`  DECIMAL(14,2) NULL,
  `note`          TEXT          NULL,
  `status`        ENUM('OPEN','CLOSED') NOT NULL DEFAULT 'CLOSED',
  `closed_at`     DATETIME      NULL,
  `created_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cash_recon_wh_date` (`wholesaler_id`, `business_date`),
  KEY `idx_cash_recon_wh_date` (`wholesaler_id`, `business_date`),
  CONSTRAINT `fk_cash_recon_wholesaler` FOREIGN KEY (`wholesaler_id`) REFERENCES `wholesalers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
