-- Payment method for crate purchases (and any future cash-bearing box_ledger rows).
-- Only CASH purchases reduce the Cash Book drawer; bank/bKash/etc. do not. Null on
-- non-purchase rows and on purchases recorded before this column existed (those stay
-- out of the cash flow so historical reconciliations are undisturbed).
ALTER TABLE `box_ledger`
    ADD COLUMN `payment_method` varchar(20) NULL AFTER `unit_sale_price`;
