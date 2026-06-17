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
        'WALK_IN_REFUND',
        'ADJUSTMENT'
    ) NOT NULL;
