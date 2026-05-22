package org.example.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record InventoryItemResponse(
        Long inventoryId,
        Long wholesalerId,
        Long wholesalerSupplierId,
        Long supplierId,
        String supplierName,
        String supplierPhone,
        Long productId,
        String productName,
        Long categoryId,
        String categoryName,
        String grade,
        BigDecimal quantityOnHand,
        String unit,
        String status,
        Long deliveryId,            // shipment (lot) this stock belongs to
        LocalDateTime deliveryDate,
        LocalDateTime updatedAt
) {
}
