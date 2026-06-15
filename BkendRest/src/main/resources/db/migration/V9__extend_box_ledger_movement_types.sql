-- box_ledger.movement_type is a MySQL ENUM; add the two leg-2 supplier crate
-- movements so RECEIVED_FROM_SUPPLIER / RETURNED_TO_SUPPLIER can be stored.
ALTER TABLE `box_ledger`
    MODIFY COLUMN `movement_type` enum(
        'PURCHASE',
        'GIVEN_TO_CUSTOMER',
        'RETURNED_FROM_CUSTOMER',
        'GIVEN_TO_SUPPLIER',
        'RETURNED_FROM_SUPPLIER',
        'RECEIVED_FROM_SUPPLIER',
        'RETURNED_TO_SUPPLIER',
        'LOST',
        'DAMAGED',
        'SOLD',
        'ADJUSTMENT'
    ) NOT NULL;
