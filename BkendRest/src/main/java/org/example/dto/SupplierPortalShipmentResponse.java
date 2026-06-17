package org.example.dto;

/**
 * A shipment as seen from the supplier portal: the standard delivery payload
 * tagged with which wholesaler holds the lot.
 */
public record SupplierPortalShipmentResponse(
        Long wholesalerId,
        String wholesalerBusinessName,
        SupplierDeliveryResponse shipment
) {
}
