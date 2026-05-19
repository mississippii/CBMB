package org.example.dto;

import java.time.LocalDateTime;
import java.util.List;

public record ReceiveSupplierDeliveryRequest(
        Long wholesalerSupplierId,
        LocalDateTime deliveryDate,
        String note,
        List<ReceiveSupplierDeliveryItemRequest> items
) {
}
