package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ReceiveSupplierDeliveryRequest(
        Long wholesalerSupplierId,
        String name,                 // wholesaler-given lot name, e.g. "Lakhna70Lot"
        LocalDateTime deliveryDate,
        BigDecimal estimatedValue,  // estimated product price of this lot
        BigDecimal advancePaid,     // product money paid to supplier up front (optional)
        BigDecimal commissionRate,  // optional — usually negotiated later
        String note,
        List<ReceiveSupplierDeliveryItemRequest> items
) {
}
