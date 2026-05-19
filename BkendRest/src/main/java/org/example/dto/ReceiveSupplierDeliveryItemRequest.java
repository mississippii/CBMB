package org.example.dto;

import java.math.BigDecimal;

public record ReceiveSupplierDeliveryItemRequest(
        Long productId,
        Long categoryId,
        String productName,
        String categoryName,
        String grade,
        BigDecimal quantity,
        String unit,
        String note
) {
}
