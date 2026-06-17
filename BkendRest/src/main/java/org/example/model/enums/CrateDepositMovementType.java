package org.example.model.enums;

/** Direction of a customer crate-deposit movement. */
public enum CrateDepositMovementType {
    /** Deposit money received when the customer borrows crates (cash in). */
    TAKEN,
    /** Deposit money returned when the customer returns crates (cash out). */
    REFUNDED
}
