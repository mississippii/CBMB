package org.example.model.enums;

/**
 * Lifecycle of a shipment's consignment settlement.
 * OPEN   – still selling / negotiating / clearing dues.
 * SETTLED – fully cleared with the supplier.
 */
public enum SettlementStatus {
    OPEN,
    SETTLED
}
