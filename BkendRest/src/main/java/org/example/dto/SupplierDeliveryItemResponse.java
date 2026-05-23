package org.example.dto;

import java.math.BigDecimal;

public record SupplierDeliveryItemResponse(
        Long id,
        Long inventoryId,
        Long productId,
        String productName,
        Long categoryId,
        String categoryName,
        Long subCategoryId,
        String subCategoryName,
        BigDecimal quantity,
        String unit,
        BigDecimal inventoryQuantityOnHand,
        String note
) {
}
