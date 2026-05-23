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
        String categoryName,        // variety name, e.g. "Amrapali"
        Long subCategoryId,         // null if variety doesn't use lots
        String subCategoryName,     // e.g. "Lot5"
        BigDecimal quantityOnHand,
        String unit,
        String status,
        Long deliveryId,            // shipment (lot) this stock belongs to
        LocalDateTime deliveryDate,
        LocalDateTime updatedAt
) {
}
