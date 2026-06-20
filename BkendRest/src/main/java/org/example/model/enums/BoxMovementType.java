package org.example.model.enums;

public enum BoxMovementType {
    PURCHASE,
    GIVEN_TO_CUSTOMER,
    RETURNED_FROM_CUSTOMER,
    // Leg 2 — the customer's own crates moving in/out of the wholesaler's custody.
    RECEIVED_FROM_CUSTOMER,
    RETURNED_TO_CUSTOMER,
    GIVEN_TO_SUPPLIER,
    RETURNED_FROM_SUPPLIER,
    // Leg 2 — the supplier's own crates moving in/out of the wholesaler's custody.
    RECEIVED_FROM_SUPPLIER,
    RETURNED_TO_SUPPLIER,
    LOST,
    DAMAGED,
    SOLD,
    WALK_IN_REFUND,
    ADJUSTMENT
}
