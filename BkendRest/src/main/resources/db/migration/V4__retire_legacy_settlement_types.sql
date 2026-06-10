-- Retire the legacy supplier-settlement types.
--
-- Business model is now: a supplier's net due = opening + sold - commission
-- - expense - product payments. Commission and shipment expenses are DEDUCTIONS
-- from that due, never cash the supplier hands back; an "advance" is simply an
-- early product payment that pushes the due negative. So COMMISSION_RECEIVE,
-- EXPENSE_RECEIVE and ADVANCE_PAYMENT no longer exist as distinct flows.
--
-- Re-map any existing rows BEFORE shrinking the enum (MySQL would otherwise blank
-- out values that fall outside the new definition):
--   * ADVANCE_PAYMENT behaved exactly like PRODUCT_PAYMENT (reduced the payable),
--     so fold it in and keep the balance effect intact.
--   * COMMISSION_RECEIVE / EXPENSE_RECEIVE were cash-in events that never touched
--     the canonical due; neutralise them as CANCELLED ADJUSTMENTs so the audit
--     trail survives without affecting any balance.

UPDATE `supplier_settlements`
   SET `settlement_type` = 'PRODUCT_PAYMENT'
 WHERE `settlement_type` = 'ADVANCE_PAYMENT';

UPDATE `supplier_settlements`
   SET `settlement_type` = 'ADJUSTMENT',
       `status` = 'CANCELLED',
       `note` = CONCAT(COALESCE(`note`, ''), ' [V4: legacy receive type retired]')
 WHERE `settlement_type` IN ('COMMISSION_RECEIVE', 'EXPENSE_RECEIVE');

ALTER TABLE `supplier_settlements`
  MODIFY COLUMN `settlement_type`
  enum('PRODUCT_PAYMENT', 'ADJUSTMENT') NOT NULL;
