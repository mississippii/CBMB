package org.example.dto;

/** Close (settle) or re-open a shipment once its formalities are done. */
public record SettleShipmentRequest(
        Long deliveryId,
        Boolean settled   // true = mark settled/closed, false = re-open
) {
}
