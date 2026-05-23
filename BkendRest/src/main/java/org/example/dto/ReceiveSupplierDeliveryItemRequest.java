package org.example.dto;

import java.math.BigDecimal;

/**
 * One line on a shipment.
 *   productId       — product picked from catalog (required).
 *   categoryId      — variety picked from catalog (optional if product has none).
 *   subCategoryId   — lot picked from Lot1..LotN (REQUIRED when category.usesLots = true).
 *   quantity, unit  — chosen per line.
 */
public record ReceiveSupplierDeliveryItemRequest(
        Long productId,
        Long categoryId,
        Long subCategoryId,
        BigDecimal quantity,
        String unit,
        String note
) {
}
