package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record ReceiveSupplierDeliveryRequest(
        Long wholesalerSupplierId,
        LocalDateTime deliveryDate,
        BigDecimal estimatedValue,  // estimated product price of this lot
        BigDecimal advancePaid,     // product money paid to supplier up front (optional)
        BigDecimal commissionRate,  // optional — usually negotiated later
        String note,
        List<ReceiveSupplierDeliveryItemRequest> items
) {
}
