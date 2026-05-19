package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SupplierDeliveryResponse(
        Long id,
        Long wholesalerId,
        Long wholesalerSupplierId,
        LocalDateTime deliveryDate,
        BigDecimal totalQuantity,
        String status,
        String note,
        List<SupplierDeliveryItemResponse> items
) {
}
