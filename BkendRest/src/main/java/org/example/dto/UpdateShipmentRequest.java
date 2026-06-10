package org.example.dto;

/** Edit a shipment's label fields (name / note). Quantities and lines are not editable here. */
public record UpdateShipmentRequest(
        Long deliveryId,
        String name,
        String note
) {
}
