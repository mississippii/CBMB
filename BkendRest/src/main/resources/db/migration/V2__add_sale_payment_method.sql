-- Store how the at-sale payment was made (Cash / Bank / bKash / Nagad / …).
-- NONE = no payment taken at sale time (full due).
ALTER TABLE `sales`
  ADD COLUMN `payment_method` enum('CASH','BANK','BKASH','NAGAD','OTHER','NONE')
  NOT NULL DEFAULT 'NONE' AFTER `paid_amount`;
