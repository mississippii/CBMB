package org.example.dto;

import java.math.BigDecimal;

/** Set / update the negotiated commission rate for one shipment. */
public record SetShipmentCommissionRequest(
        Long deliveryId,
        BigDecimal commissionRate
) {
}
